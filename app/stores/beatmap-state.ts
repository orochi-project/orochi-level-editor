import { FRAMES_PER_SECOND } from "~~/utils/constants";

export const useBeatmapStateStore = defineStore("beatmapState", () => {
  /** The total number of frames in the current sequence. */
  const totalFrames = Math.ceil(60 * FRAMES_PER_SECOND * 3); // TODO: this is 3 minutes right now; change it later

  /** The reactive array storing every note currently placed in the timeline. */
  const notes = ref<Note[]>([]);

  return { totalFrames, notes };
});
