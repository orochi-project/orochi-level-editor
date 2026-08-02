import { FRAMES_PER_SECOND } from "~~/utils/constants";

export const useBeatmapStateStore = defineStore("beatmapState", () => {
  /** The audio source to play. */
  const audioSource = ref<string>();

  /** The currently loaded audio file. */
  const audioFile = ref<File>();

  /** The song duration. */
  const songDuration = ref<number>(0);

  /** The total number of frames in the current sequence. */
  const totalFrames = computed<number>(() =>
    Math.ceil(FRAMES_PER_SECOND * songDuration.value),
  );

  /** The reactive array storing every note currently placed in the timeline. */
  const notes = ref<Note[]>([]);

  return { audioSource, audioFile, songDuration, totalFrames, notes };
});
