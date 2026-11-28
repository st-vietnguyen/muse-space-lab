import { totalDurationMs, type Story } from "@musespace/story-schema";
import { positionAt, type Position } from "./timeline.js";

export type ClockStatus = "paused" | "playing" | "finished";
export type Reading = Position & { status: ClockStatus };

export type StoryClock = {
  read(): Reading;
  play(): void;
  pause(): void;
  seek(timeMs: number): void;
  restart(): void;
  onFinished(listener: () => void): () => void;
};

// Spec 003 FR-003 to FR-010: the master clock. It never reads the time source when it is created; a read or a
// command reads it at most once (`onFinished` and an ignored seek do not read it) and nothing is scheduled.
// The narration of the story has no effect on it. The story must be one that `parseStory` accepted: the clock does
// not validate it.
export function createStoryClock(story: Story, now: () => number): StoryClock {
  const length = totalDurationMs(story);
  const listeners = new Set<() => void>();
  let playing = false;
  let finished = false;
  // The anchor: the story time and the time-source value at which it held.
  let anchorMs = 0;
  let anchorSource = 0;

  // `at` is the one reading of the time source that a public call takes.
  const currentMs = (at: number): number => (playing && !finished ? anchorMs + (at - anchorSource) : anchorMs);

  const finish = (): void => {
    finished = true;
    anchorMs = length;
    // The listeners registered now that are still registered when their turn comes.
    for (const listener of [...listeners]) if (listeners.has(listener)) listener();
  };

  // Brings the clock up to date: if the end passed since the last call, it is reported first.
  const sync = (at: number): void => {
    if (!finished && playing && currentMs(at) >= length) finish();
  };

  const setTime = (timeMs: number, at: number): void => {
    anchorMs = Math.min(Math.max(timeMs, 0), length);
    anchorSource = at;
    if (anchorMs === length && !finished) finish();
  };

  return {
    read() {
      const at = now();
      sync(at);
      return { ...positionAt(story, currentMs(at)), status: finished ? "finished" : playing ? "playing" : "paused" };
    },
    play() {
      const at = now();
      sync(at);
      if (finished || playing) return;
      anchorSource = at;
      playing = true;
    },
    pause() {
      const at = now();
      sync(at);
      if (finished || !playing) return;
      anchorMs = currentMs(at);
      playing = false;
    },
    seek(timeMs) {
      if (typeof timeMs !== "number" || Number.isNaN(timeMs)) return;
      const at = now();
      sync(at);
      if (finished && timeMs < length) {
        finished = false;
        playing = false;
      }
      setTime(timeMs, at);
    },
    restart() {
      const at = now();
      sync(at);
      finished = false;
      playing = true;
      setTime(0, at);
    },
    onFinished(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
