import { sceneStartsMs, totalDurationMs, type Story } from "@musespace/story-schema";

export type Position = {
  timeMs: number;
  sceneIndex: number;
  sceneId: string;
  sceneProgress: number;
  storyProgress: number;
};

// Spec 003 FR-001, FR-002: where the story is at a time. Pure: the result depends only on the story and the time.
export function positionAt(story: Story, timeMs: number): Position {
  const length = totalDurationMs(story);
  const timeInStory = Math.min(Math.max(timeMs, 0), length);
  const starts = sceneStartsMs(story);
  // The last scene that has started: a boundary belongs to the scene starting there, the end to the last scene.
  const sceneIndex = starts.findLastIndex((start) => start <= timeInStory);
  const scene = story.scenes[sceneIndex]!;
  return {
    timeMs: timeInStory,
    sceneIndex,
    sceneId: scene.id,
    sceneProgress: (timeInStory - starts[sceneIndex]!) / scene.durationMs,
    storyProgress: timeInStory / length,
  };
}
