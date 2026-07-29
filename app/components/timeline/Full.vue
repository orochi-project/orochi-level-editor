<script setup lang="ts">
import {
  RULER_HEIGHT,
  ROW_HEIGHT,
  VIEW_PADDING_LEFT,
} from "~~/utils/constants";
import { frameToPx } from "~~/utils/timeline";

const beatmapState = useBeatmapStateStore();
const timelineUi = useTimelineUiStore();

/** The total width, in pixels, of the timeline based on the number of frames. */
const timelineWidth = computed(() =>
  frameToPx(beatmapState.totalFrames, timelineUi.pixelsPerFrame),
);

/** Whether or not to show the export panel. */
const showExportPanel = ref(false);

/** The timeline scrolling container. */
const scrollElement = ref<HTMLElement>();
/** The rows container element. Used as the coordinate origin for rectangle selection. */
const rowsContainer = ref<HTMLElement>();

const timelineInteractions = useTimelineInteractions(rowsContainer);
const timelineAudio = useTimelineAudio(scrollElement);

useTimelineKeyboard(timelineAudio.currentFrame);

/** The height of the timeline panel, in pixels. */
const panelHeight = ref(360);

/**
 * Start resizing the timeline panel.
 *
 * @param e - The pointer event properties.
 */
function onPanelResizeDown(e: PointerEvent) {
  const startY = e.clientY;
  const origHeight = panelHeight.value;

  /**
   * Move the panel based on the height.
   *
   * @param ev - The pointer event properties.
   */
  function move(ev: PointerEvent) {
    panelHeight.value = Math.min(
      360,
      Math.max(0, origHeight + (startY - ev.clientY)),
    );
  }

  /** Stop listening to pointer events on the timeline panel. */
  function up() {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
  }

  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
}

/** The grid lines array storing each line, their position in pixels, whether they are minor or major, and their frame number label. */
const gridLines = computed(() => {
  const lines: { px: number; strong: boolean; label?: string }[] = [];

  let minorStep = 12; // base frame intervals

  // This adjustment is done to prevent DOM lag when zooming out.
  // If the space between minor ticks drops below 6 pixels, scale the steps up.
  while (
    frameToPx(minorStep, timelineUi.pixelsPerFrame) < 12 &&
    minorStep < beatmapState.totalFrames
  )
    minorStep *= 2;

  const majorStep = minorStep * 5;
  const maxAllowedWidth = frameToPx(
    beatmapState.totalFrames,
    timelineUi.pixelsPerFrame,
  );

  const majorFrames: number[] = [];
  for (let f = 0; f <= beatmapState.totalFrames; f += majorStep)
    majorFrames.push(f);

  const lastMajorFrame = majorFrames[majorFrames.length - 1];

  for (let f = 0; f <= beatmapState.totalFrames; f += minorStep) {
    const isMajor = f % majorStep === 0;
    const px = frameToPx(f, timelineUi.pixelsPerFrame);

    let label: string | undefined = undefined;

    if (isMajor && px <= maxAllowedWidth && f !== lastMajorFrame)
      label = `f${f}`;

    lines.push({
      px,
      strong: isMajor,
      label,
    });
  }

  return lines;
});
</script>

<template>
  <div
    class="z-40 overflow-hidden fixed flex flex-col bottom-0 left-0 right-0"
    :style="{ height: panelHeight + 'px' }"
  >
    <div
      class="cursor-row-resize shrink-0 flex justify-center items-center h-2 border-t border-default hover:bg-primary/20 bg-default"
      @pointerdown="onPanelResizeDown"
    >
      <div class="w-10 h-1 rounded-full bg-accented" />
    </div>

    <audio
      ref="timelineAudio.audioElement"
      src="/wow-amazing-song.mp3"
      class="hidden"
      @play="timelineAudio.onPlay"
      @pause="timelineAudio.onPause"
      @seeked="timelineAudio.onPause"
    />

    <div
      class="flex-1 flex flex-col min-h-0 border-t border-default bg-default"
    >
      <TimelineToolbar
        :current-frame="timelineAudio.currentFrame.value"
        @play="timelineAudio.audioElement.value?.play()"
        @pause="timelineAudio.audioElement.value?.pause()"
        @export="showExportPanel = true"
      />

      <div class="flex-1 flex min-h-0">
        <div class="shrink-0 w-36 border-r border-default bg-default">
          <div
            class="border-b border-default"
            :style="{ height: RULER_HEIGHT + 'px' }"
          />

          <div
            v-for="t in NOTE_TYPES"
            :key="t.key"
            class="flex items-center justify-center border-b border-default"
            :style="{ height: ROW_HEIGHT + 'px' }"
          >
            <span class="text-xs text-toned font-medium">
              {{ t.label }}
            </span>
          </div>
        </div>

        <div
          ref="scrollElement"
          class="overflow-auto relative flex-1 min-w-0"
          :style="{ paddingLeft: VIEW_PADDING_LEFT + 'px' }"
        >
          <div
            class="relative"
            :style="{
              width: timelineWidth + 'px',
              height: RULER_HEIGHT + NOTE_TYPES.length * ROW_HEIGHT + 'px',
            }"
          >
            <TimelineRuler
              :timeline-width="timelineWidth"
              :grid-lines="gridLines"
              @pointerdown="timelineAudio.onRulerDown"
              @pointermove="timelineAudio.onRulerMove"
              @pointerup="timelineAudio.onRulerUp"
            />

            <div
              ref="rowsContainer"
              class="relative"
              @pointerdown="timelineInteractions.onRowsPointerDown"
              @pointermove="timelineInteractions.onRowsPointerMove"
              @pointerup="timelineInteractions.onRowsPointerUp"
            >
              <TimelineTrackRow
                v-for="t in NOTE_TYPES"
                :key="t.key"
                :type="t"
                :grid-lines="gridLines"
                :timeline-width="timelineWidth"
                @note-down="timelineInteractions.onNoteDown"
                @hold-resize-left="timelineInteractions.onHoldResizeLeftDown"
                @hold-resize-right="timelineInteractions.onHoldResizeRightDown"
              />

              <div
                v-if="
                  timelineInteractions.marquee.value &&
                  timelineInteractions.marquee.value.moved
                "
                class="pointer-events-none z-40 absolute border border-primary rounded-lg bg-primary/10"
                :style="{
                  left:
                    Math.min(
                      timelineInteractions.marquee.value.startX,
                      timelineInteractions.marquee.value.curX,
                    ) + 'px',
                  top:
                    Math.min(
                      timelineInteractions.marquee.value.startY,
                      timelineInteractions.marquee.value.curY,
                    ) + 'px',
                  width:
                    Math.abs(
                      timelineInteractions.marquee.value.curX -
                        timelineInteractions.marquee.value.startX,
                    ) + 'px',
                  height:
                    Math.abs(
                      timelineInteractions.marquee.value.curY -
                        timelineInteractions.marquee.value.startY,
                    ) + 'px',
                }"
              />
            </div>

            <div
              class="pointer-events-none z-50 absolute w-px bg-error"
              :style="{
                left:
                  frameToPx(
                    timelineAudio.currentFrame.value,
                    timelineUi.pixelsPerFrame,
                  ) + 'px',
                top: RULER_HEIGHT + 'px',
                bottom: 0,
              }"
            >
              <div class="-ml-1.5 -mt-1.5 rotate-45 size-3 bg-error" />
            </div>
          </div>
        </div>

        <TimelineInspector
          v-if="timelineUi.selectedNote || timelineUi.selectedNoteIds.size > 1"
        />
      </div>
    </div>

    <TimelineExportModal v-model:open="showExportPanel" />
  </div>
</template>
