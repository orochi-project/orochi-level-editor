export const useTimelineAudioStore = defineStore("timelineAudio", () => {
  /** The currently tracked playback frame. */
  const currentFrame = ref(0);

  return { currentFrame };
});
