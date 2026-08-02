import { onUnmounted } from "vue";
import { FRAMES_PER_SECOND, VIEW_PADDING_LEFT } from "~~/utils/constants";
import { pxToFrame } from "~~/utils/timeline";

export function useTimelineAudio(scrollElement: Ref<HTMLElement | undefined>) {
  const timelineUi = useTimelineUiStore();

  /** The main audio element for playback. */
  const audioElement = ref<HTMLAudioElement>();

  /** The currently tracked playback frame. */
  const currentFrame = ref(0);

  /** The ID of the animation frame loop. */
  let playbackRafId = 0;

  /** Whether or not the audio is playing. */
  const isPlaying = ref(false);

  /**
   * Bind or unbind the audio element reference from the template.
   *
   * @param el - The element instance, or null when unmounting.
   */
  function setAudioElement(el: Element | ComponentPublicInstance | null) {
    audioElement.value = (el as HTMLAudioElement) ?? undefined;
  }

  /** Calculate the current song position in GBC frames. */
  function syncPlayhead() {
    if (!audioElement.value) return;

    currentFrame.value = Math.max(
      0,
      Math.round(audioElement.value.currentTime * FRAMES_PER_SECOND),
    );

    playbackRafId = requestAnimationFrame(syncPlayhead);
  }

  /** Start updating the timeline position when audio starts playing. */
  function onPlay() {
    isPlaying.value = true;
    cancelAnimationFrame(playbackRafId);
    syncPlayhead();
  }

  /** Stop the update loop and set the final frame position. */
  function onPause() {
    isPlaying.value = false;

    cancelAnimationFrame(playbackRafId);

    if (audioElement.value) {
      currentFrame.value = Math.max(
        0,
        Math.round(audioElement.value.currentTime * FRAMES_PER_SECOND),
      );
    }
  }

  /** Resync the playhead after a seek. */
  function onSeeked() {
    if (!audioElement.value) return;

    currentFrame.value = Math.max(
      0,
      Math.round(audioElement.value.currentTime * FRAMES_PER_SECOND),
    );

    cancelAnimationFrame(playbackRafId);

    if (!audioElement.value.paused) syncPlayhead();
  }

  /** Whether or not the user is seeking the ruler through the timeline. */
  let scrubbing = false;

  /**
   * Seek the audio to a certain point in pixels.
   *
   * @param px - The pixel position to seek to.
   */
  function seekToPx(px: number) {
    const frame = pxToFrame(
      px,
      timelineUi.pixelsPerFrame,
      timelineUi.snapFrames,
      false,
    );

    currentFrame.value = frame;

    if (audioElement.value)
      audioElement.value.currentTime = frame / FRAMES_PER_SECOND;
  }

  /**
   * Seek using a pointer position relative to the scroll container.
   *
   * @param e - The pointer event properties.
   */
  function seekFromPointer(e: PointerEvent) {
    if (!scrollElement.value) return;

    const rect = scrollElement.value.getBoundingClientRect();

    seekToPx(
      e.clientX -
        rect.left +
        scrollElement.value.scrollLeft -
        VIEW_PADDING_LEFT,
    );
  }

  /**
   * Start scrubbing to seek to another point in the timeline.
   *
   * @param e - The pointer event properties.
   */
  function onRulerDown(e: PointerEvent) {
    scrubbing = true;

    seekFromPointer(e);

    window.addEventListener("pointermove", onRulerMove);
    window.addEventListener("pointerup", onRulerUp, { once: true });
  }

  /**
   * Seek to the position the ruler moves to.
   *
   * @param e - The pointer event properties.
   */
  function onRulerMove(e: PointerEvent) {
    if (!scrubbing) return;
    seekFromPointer(e);
  }

  /** Stop scrubbing via the timeline ruler. */
  function onRulerUp() {
    scrubbing = false;
    window.removeEventListener("pointermove", onRulerMove);
  }

  /** Remove pointer listeners when the composable is destroyed. */
  onUnmounted(() => {
    cancelAnimationFrame(playbackRafId);
    window.removeEventListener("pointermove", onRulerMove);
    window.removeEventListener("pointerup", onRulerUp);
  });

  return {
    audioElement,
    currentFrame,
    isPlaying,
    setAudioElement,
    onPlay,
    onPause,
    onSeeked,
    onRulerDown,
    onRulerMove,
    onRulerUp,
  };
}
