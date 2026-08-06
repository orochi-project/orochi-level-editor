export const useTimelineAudioStore = defineStore("timelineAudio", () => {
  /** The currently tracked playback frame. */
  const currentFrame = ref(0);

  /** Whether or not the audio is playing. */
  const isPlaying = ref(false);

  return { currentFrame, isPlaying };
});
