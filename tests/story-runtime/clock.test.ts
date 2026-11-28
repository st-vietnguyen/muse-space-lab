import { afterEach, describe, expect, test, vi } from "vitest";
import { createStoryClock } from "../../packages/story-runtime/src/index.js";
import { referenceTiming, withoutNarration } from "./stories.js";

// Spec 003 US1, US2, US4 / FR-003 to FR-010: the master clock, which runs on the time source alone.
// The tests use the story without narration, except the FR-010 test (the reference timing, narration from 5 000 ms).
// Time is a variable the test sets; no test waits. The story is 15 s + 25 s + 25 s = 65 000 ms.
function setup(start = 0) {
  let source = start;
  const clock = createStoryClock(withoutNarration, () => source);
  return {
    clock,
    advance: (ms: number) => {
      source += ms;
    },
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("a new clock", () => {
  test("should be paused at time 0 in scene 1 at progress 0", () => {
    const { clock } = setup(1_000);
    expect(clock.read()).toEqual({
      timeMs: 0,
      sceneIndex: 0,
      sceneId: "focus",
      sceneProgress: 0,
      storyProgress: 0,
      status: "paused",
    });
  });

  test("should not move while the time source moves", () => {
    const { clock, advance } = setup();
    advance(30_000);
    expect(clock.read().timeMs).toBe(0);
    expect(clock.read().status).toBe("paused");
  });
});

describe("play", () => {
  test.each([1, 1_000, 16.5])(
    "should advance the time by exactly %s ms when the source advances by that much",
    (ms) => {
      const { clock, advance } = setup(500);
      clock.play();
      advance(ms);
      const reading = clock.read();
      expect(reading.timeMs).toBe(ms);
      expect(reading.status).toBe("playing");
    },
  );

  test("should not shift the time when called on a playing clock", () => {
    const { clock, advance } = setup();
    clock.play();
    advance(2_000);
    clock.play();
    advance(1_000);
    expect(clock.read().timeMs).toBe(3_000);
  });

  test("should give the whole reading with literal values in the middle of a run", () => {
    const { clock, advance } = setup();
    clock.play();
    advance(27_500);
    expect(clock.read()).toEqual({
      timeMs: 27_500,
      sceneIndex: 1,
      sceneId: "memory",
      sceneProgress: 0.5,
      storyProgress: 27_500 / 65_000,
      status: "playing",
    });
  });

  test("should give the same time when read twice at the same source time", () => {
    const { clock, advance } = setup();
    clock.play();
    advance(16.5);
    expect(clock.read().timeMs).toBe(16.5);
    expect(clock.read().timeMs).toBe(16.5);
  });
});

describe("pause", () => {
  test("should move the position by 0 ms (within 50 ms) after a pause of 10 minutes", () => {
    const { clock, advance } = setup();
    clock.play();
    advance(12_345);
    clock.pause();
    advance(600_000);
    clock.play();
    const moved = Math.abs(clock.read().timeMs - 12_345);
    expect(moved).toBeLessThanOrEqual(50);
    expect(clock.read().timeMs).toBe(12_345);
    advance(1_000);
    expect(clock.read().timeMs).toBe(13_345);
  });

  test("should hold the time and status paused while the source moves", () => {
    const { clock, advance } = setup();
    clock.play();
    advance(7_000);
    clock.pause();
    advance(5_000);
    expect(clock.read().timeMs).toBe(7_000);
    expect(clock.read().status).toBe("paused");
  });

  test("should change nothing when called on a paused clock", () => {
    const { clock, advance } = setup();
    clock.play();
    advance(4_000);
    clock.pause();
    advance(1_000);
    clock.pause();
    advance(1_000);
    expect(clock.read().timeMs).toBe(4_000);
    expect(clock.read().status).toBe("paused");
  });

  test("should keep a new clock at 0 when paused", () => {
    const { clock, advance } = setup();
    clock.pause();
    advance(1_000);
    expect(clock.read().timeMs).toBe(0);
  });
});

describe("seek", () => {
  test.each([
    { target: 50_000, time: 50_000, index: 2 },
    { target: 15_000, time: 15_000, index: 1 },
    { target: -1, time: 0, index: 0 },
    { target: -Infinity, time: 0, index: 0 },
  ])("should put the clock at $time ms in scene index $index when sought to $target", ({ target, time, index }) => {
    const { clock, advance } = setup();
    clock.play();
    advance(10_000);
    clock.seek(target);
    const reading = clock.read();
    expect(reading.timeMs).toBe(time);
    expect(reading.sceneIndex).toBe(index);
    expect(reading.status).toBe("playing");
  });

  test("should ignore a target that is not a number", () => {
    const { clock, advance } = setup();
    clock.play();
    advance(10_000);
    clock.seek(Number.NaN);
    expect(clock.read().timeMs).toBe(10_000);
    expect(clock.read().status).toBe("playing");
    clock.pause();
    clock.seek(Number.NaN);
    expect(clock.read().timeMs).toBe(10_000);
    expect(clock.read().status).toBe("paused");
  });

  test("should keep advancing from the target when sought while playing", () => {
    const { clock, advance } = setup();
    clock.play();
    advance(10_000);
    clock.seek(30_000);
    advance(2_500);
    expect(clock.read().timeMs).toBe(32_500);
    expect(clock.read().status).toBe("playing");
  });

  test("should stay paused at the target when sought while paused", () => {
    const { clock, advance } = setup();
    clock.seek(20_000);
    advance(5_000);
    const reading = clock.read();
    expect(reading.timeMs).toBe(20_000);
    expect(reading.status).toBe("paused");
    expect(reading.sceneId).toBe("memory");
  });

  test("should be in scene 3 at scene progress 1 and story progress 1 when sought to the end", () => {
    const { clock } = setup();
    clock.seek(65_000);
    expect(clock.read().timeMs).toBe(65_000);
    expect(clock.read().sceneIndex).toBe(2);
    expect(clock.read().sceneProgress).toBe(1);
    expect(clock.read().storyProgress).toBe(1);
  });
});

describe("restart", () => {
  test("should play from 0 when the clock was playing", () => {
    const { clock, advance } = setup();
    clock.play();
    advance(20_000);
    clock.restart();
    expect(clock.read().timeMs).toBe(0);
    expect(clock.read().status).toBe("playing");
    advance(1_000);
    expect(clock.read().timeMs).toBe(1_000);
  });

  test("should play from 0 when the clock was paused", () => {
    const { clock, advance } = setup();
    clock.seek(20_000);
    advance(3_000);
    clock.restart();
    expect(clock.read().timeMs).toBe(0);
    expect(clock.read().status).toBe("playing");
    advance(500);
    expect(clock.read().timeMs).toBe(500);
  });

  test("should play from 0 when the clock was finished", () => {
    const { clock, advance } = setup();
    clock.seek(65_000);
    expect(clock.read().status).toBe("finished");
    clock.restart();
    expect(clock.read().timeMs).toBe(0);
    expect(clock.read().status).toBe("playing");
    advance(250);
    expect(clock.read().timeMs).toBe(250);
  });
});

describe("the end of the story", () => {
  test("should be finished at exactly 65 000 ms on both reads and call the listener once", () => {
    const { clock, advance } = setup();
    const listener = vi.fn();
    clock.onFinished(listener);
    clock.play();
    advance(64_000);
    clock.read();
    advance(5_000);
    const first = clock.read();
    const second = clock.read();
    expect(first.timeMs).toBe(65_000);
    expect(first.status).toBe("finished");
    expect(second.timeMs).toBe(65_000);
    expect(second.status).toBe("finished");
    expect(listener).toHaveBeenCalledTimes(1);
  });

  test("should call every listener when two are registered", () => {
    const { clock, advance } = setup();
    const a = vi.fn();
    const b = vi.fn();
    clock.onFinished(a);
    clock.onFinished(b);
    clock.play();
    advance(65_000);
    clock.read();
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });

  test("should not call a listener that was removed", () => {
    const { clock, advance } = setup();
    const removed = vi.fn();
    const kept = vi.fn();
    const remove = clock.onFinished(removed);
    clock.onFinished(kept);
    remove();
    clock.play();
    advance(70_000);
    clock.read();
    expect(removed).not.toHaveBeenCalled();
    expect(kept).toHaveBeenCalledTimes(1);
  });

  test.each([70_000, Infinity])("should finish at 65 000 ms when a playing clock is sought to %s", (target) => {
    const { clock, advance } = setup();
    const listener = vi.fn();
    clock.onFinished(listener);
    clock.play();
    advance(1_000);
    clock.seek(target);
    expect(clock.read().timeMs).toBe(65_000);
    expect(clock.read().status).toBe("finished");
    advance(5_000);
    expect(clock.read().timeMs).toBe(65_000);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  test.each([70_000, Infinity])("should finish at 65 000 ms when a paused clock is sought to %s", (target) => {
    const { clock } = setup();
    const listener = vi.fn();
    clock.onFinished(listener);
    clock.seek(target);
    expect(clock.read().timeMs).toBe(65_000);
    expect(clock.read().status).toBe("finished");
    expect(listener).toHaveBeenCalledTimes(1);
  });

  test("should ignore play and pause on a finished clock", () => {
    const { clock, advance } = setup();
    clock.seek(65_000);
    clock.play();
    advance(1_000);
    expect(clock.read()).toMatchObject({ timeMs: 65_000, status: "finished" });
    clock.pause();
    expect(clock.read()).toMatchObject({ timeMs: 65_000, status: "finished" });
  });

  test("should be paused at the target after a seek back and play should continue from there", () => {
    const { clock, advance } = setup();
    clock.play();
    advance(65_000);
    expect(clock.read().status).toBe("finished");
    clock.seek(30_000);
    advance(4_000);
    expect(clock.read()).toMatchObject({ timeMs: 30_000, status: "paused" });
    clock.play();
    advance(1_500);
    expect(clock.read()).toMatchObject({ timeMs: 31_500, status: "playing" });
  });

  test("should not call the listener again when a finished clock is sought to the end", () => {
    const { clock } = setup();
    const listener = vi.fn();
    clock.onFinished(listener);
    clock.seek(65_000);
    clock.seek(65_000);
    clock.seek(90_000);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(clock.read().status).toBe("finished");
  });

  test("should call the listener a second time when restarted and run to the end again", () => {
    const { clock, advance } = setup();
    const listener = vi.fn();
    clock.onFinished(listener);
    clock.play();
    advance(65_000);
    clock.read();
    expect(listener).toHaveBeenCalledTimes(1);
    clock.restart();
    advance(64_999);
    clock.read();
    expect(listener).toHaveBeenCalledTimes(1);
    advance(1);
    expect(clock.read()).toMatchObject({ timeMs: 65_000, status: "finished" });
    expect(listener).toHaveBeenCalledTimes(2);
  });

  test("should have the state set when the listener is called", () => {
    const { clock, advance } = setup();
    let seen: unknown;
    clock.onFinished(() => {
      seen = clock.read();
    });
    clock.play();
    advance(66_000);
    clock.read();
    expect(seen).toMatchObject({ timeMs: 65_000, status: "finished" });
  });
});

describe("readings far apart", () => {
  test("should report finished at exactly 65 000 ms once after one read long after the end", () => {
    const { clock, advance } = setup();
    const listener = vi.fn();
    clock.onFinished(listener);
    clock.play();
    advance(10 * 60 * 60 * 1_000);
    expect(clock.read()).toMatchObject({ timeMs: 65_000, status: "finished" });
    expect(clock.read().timeMs).toBe(65_000);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  test("should report the end first when pause arrives after the end passed", () => {
    const { clock, advance } = setup();
    const listener = vi.fn();
    clock.onFinished(listener);
    clock.play();
    advance(70_000);
    clock.pause();
    expect(listener).toHaveBeenCalledTimes(1);
    expect(clock.read()).toMatchObject({ timeMs: 65_000, status: "finished" });
  });

  test("should report the end first when a seek back arrives after the end passed", () => {
    const { clock, advance } = setup();
    const listener = vi.fn();
    clock.onFinished(listener);
    clock.play();
    advance(70_000);
    clock.seek(10_000);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(clock.read()).toMatchObject({ timeMs: 10_000, status: "paused" });
  });
});

// FR-010: the narration of a story has no effect on the clock.
describe("a story with narration from 5 000 ms", () => {
  test("should follow the source exactly and stay playing before, at and after 5 000 ms", () => {
    let source = 3_000;
    const clock = createStoryClock(referenceTiming, () => source);
    clock.play();
    for (const [step, time] of [
      [4_999, 4_999],
      [1, 5_000],
      [1, 5_001],
      [14_999, 20_000],
    ] as const) {
      source += step;
      expect(clock.read()).toMatchObject({ timeMs: time, status: "playing" });
    }
  });
});

describe("scene changes during a run", () => {
  test("should change scene at 15 000 ms and 40 000 ms", () => {
    const { clock, advance } = setup();
    clock.play();
    advance(14_999);
    expect(clock.read().sceneId).toBe("focus");
    advance(1);
    expect(clock.read().sceneId).toBe("memory");
    advance(24_999);
    expect(clock.read().sceneId).toBe("memory");
    advance(1);
    expect(clock.read().sceneId).toBe("reveal");
  });
});

describe("no timers", () => {
  test("should schedule no timer over a run with play, pause, seek, restart and the end", () => {
    vi.useFakeTimers();
    const { clock, advance } = setup();
    clock.onFinished(() => {});
    clock.play();
    expect(vi.getTimerCount()).toBe(0);
    advance(10_000);
    clock.read();
    clock.pause();
    advance(1_000);
    clock.play();
    clock.seek(40_000);
    advance(1_000);
    clock.restart();
    advance(65_000);
    expect(clock.read().status).toBe("finished");
    expect(vi.getTimerCount()).toBe(0);
  });
});

// FR-009 with a real time source, which moves on between two reads inside one call: here by 1 ms per read.
describe("a time source that moves on at every read", () => {
  // A playing clock whose next read of the source gives 1 ms before the end, and the one after it gives the end.
  function nearTheEnd() {
    let source = 100;
    const clock = createStoryClock(withoutNarration, () => source++);
    clock.play(); // anchored at 101
    source = 101 + 64_999;
    const listener = vi.fn();
    clock.onFinished(listener);
    return { clock, listener };
  }

  test("should say finished with one listener call when a read gives the length", () => {
    const { clock, listener } = nearTheEnd();
    const reading = clock.read();
    if (reading.timeMs === 65_000) {
      expect(reading.status).toBe("finished");
      expect(listener).toHaveBeenCalledTimes(1);
    } else {
      expect(reading.status).toBe("playing");
      expect(reading.timeMs).toBeLessThan(65_000);
    }
  });

  test("should be finished at the length with one listener call, or paused before it, after a pause near the end", () => {
    const { clock, listener } = nearTheEnd();
    clock.pause();
    const reading = clock.read();
    if (reading.timeMs === 65_000) {
      expect(reading.status).toBe("finished");
      expect(listener).toHaveBeenCalledTimes(1);
    } else {
      expect(reading.status).toBe("paused");
      expect(reading.timeMs).toBeLessThan(65_000);
    }
  });
});
