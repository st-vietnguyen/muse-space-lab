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

// Spec 003 FR-003 to FR-010: the master clock. It reads the time source only when it is read or commanded, once
// per call, and schedules nothing. The narration of the story has no effect on it.
export function createStoryClock(story: Story, now: () => number): StoryClock {
  const length = totalDurationMs(story);
  const listeners = new Set<() => void>();
  let playing = false;
  let finished = false;
  // The anchor: the story time and the time-source value at which it held.
  let anchorMs = 0;
  let anchorSource = now();

  // `at` is the one reading of the time source that a public call takes.
  const currentMs = (at: number): number => (playing && !finished ? anchorMs + (at - anchorSource) : anchorMs);

  const finish = (at: number): void => {
    finished = true;
    anchorMs = length;
    anchorSource = at;
    for (const listener of [...listeners]) listener();
  };

  // Brings the clock up to date: if the end passed since the last call, it is reported first.
  const sync = (at: number): void => {
    if (!finished && playing && currentMs(at) >= length) finish(at);
  };

  const setTime = (timeMs: number, at: number): void => {
    anchorMs = Math.min(Math.max(timeMs, 0), length);
    anchorSource = at;
    if (anchorMs === length && !finished) finish(at);
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
      anchorSource = at;
      playing = false;
    },
    seek(timeMs) {
      if (Number.isNaN(timeMs)) return;
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
