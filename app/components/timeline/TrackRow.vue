<script setup lang="ts">
import { ROW_HEIGHT } from "~~/utils/constants";
import {
  frameToPx,
  getNoteTypeMetadata,
  getDirectionIcon,
  getDirectionLabel,
  getReverseNoteLetter,
} from "~~/utils/timeline";

const props = defineProps<{
  type: { key: NoteType; label: string };
  timelineWidth: number;
  gridSpacing: { minorPx: number; majorPx: number };
}>();

const emit = defineEmits<{
  (e: "note-down", event: PointerEvent, note: Note): void;
  (e: "hold-resize-left", event: PointerEvent, note: Note): void;
  (e: "hold-resize-right", event: PointerEvent, note: Note): void;
}>();

const beatmapState = useBeatmapStateStore();
const timelineUi = useTimelineUiStore();
const timelineHistory = useTimelineHistoryStore();

/** Notes belonging to this row's note type. */
const rowNotes = computed(() =>
  beatmapState.notes.filter((n) => n.type === props.type.key),
);

/** CSS background creating minor/major grid lines without any DOM nodes. */
const gridBackground = computed(() => {
  const { minorPx, majorPx } = props.gridSpacing;

  return [
    // major lines
    `repeating-linear-gradient(
      to right,
      var(--ui-border-muted) 0,
      var(--ui-border-muted) 1px,
      transparent 1px,
      transparent ${majorPx}px
    )`,
    // minor lines
    `repeating-linear-gradient(
      to right,
      var(--ui-border) 0,
      var(--ui-border) 1px,
      transparent 1px,
      transparent ${minorPx}px
    )`,
  ].join(", ");
});
</script>

<template>
  <div
    class="relative border-b border-default hover:bg-elevated/30"
    :style="{
      width: props.timelineWidth + 'px',
      height: ROW_HEIGHT + 'px',
      backgroundImage: gridBackground,
    }"
  >
    <UTooltip
      v-for="note in rowNotes"
      :key="note.id"
      :text="
        note.direction !== undefined
          ? `${getNoteTypeMetadata(note.type).label} ${getDirectionLabel(note.direction)} (f${note.peakFrame})`
          : `${getNoteTypeMetadata(note.type).label} (f${note.peakFrame})`
      "
    >
      <div
        v-if="note.type === NoteType.HOLD"
        class="z-20 cursor-grab absolute top-1/2 -translate-y-1/2 h-9 active:cursor-grabbing"
        :style="{
          left:
            frameToPx(
              note.peakFrame - note.chargeFrames,
              timelineUi.pixelsPerFrame,
            ) + 'px',
          width:
            frameToPx(
              note.chargeFrames + note.holdFrames!,
              timelineUi.pixelsPerFrame,
            ) + 'px',
        }"
      >
        <div
          class="absolute inset-y-0 left-0 rounded-l-sm bg-yellow-400/25"
          :style="{
            width:
              frameToPx(note.chargeFrames, timelineUi.pixelsPerFrame) + 'px',
          }"
        />

        <div
          class="overflow-hidden absolute inset-y-0 rounded-r-md flex justify-center items-center ring-2 bg-yellow-400"
          :class="
            timelineUi.selectedNoteIds.has(note.id)
              ? 'ring-primary'
              : 'ring-transparent'
          "
          :style="{
            left:
              frameToPx(note.chargeFrames!, timelineUi.pixelsPerFrame) + 'px',
            width:
              frameToPx(note.holdFrames!, timelineUi.pixelsPerFrame) + 'px',
          }"
          @pointerdown="emit('note-down', $event, note)"
          @dblclick.stop="timelineHistory.deleteNote(note.id)"
        >
          <UIcon
            v-if="note.direction !== undefined"
            :name="getDirectionIcon(note.direction)!"
            class="size-3.5 text-yellow-950"
          />

          <div
            class="cursor-ew-resize absolute left-0 top-0 bottom-0 w-2.5 bg-black/15 hover:bg-black/25"
            @pointerdown.stop="emit('hold-resize-left', $event, note)"
          />

          <div
            class="cursor-ew-resize absolute right-0 top-0 bottom-0 w-2.5 bg-black/15 hover:bg-black/25"
            @pointerdown.stop="emit('hold-resize-right', $event, note)"
          />
        </div>
      </div>

      <div
        v-else
        class="cursor-grab z-20 absolute top-1/2 -translate-y-1/2 h-9 active:cursor-grabbing"
        :style="{
          left:
            frameToPx(
              note.peakFrame - note.chargeFrames!,
              timelineUi.pixelsPerFrame,
            ) + 'px',
          width:
            Math.max(
              frameToPx(note.chargeFrames!, timelineUi.pixelsPerFrame),
              32,
            ) + 'px',
        }"
        @pointerdown="emit('note-down', $event, note)"
        @dblclick.stop="timelineHistory.deleteNote(note.id)"
      >
        <div
          class="absolute inset-y-2 left-0 right-4 rounded-l-sm"
          :class="[
            note.type === NoteType.TAP
              ? 'bg-green-300/25'
              : note.type === NoteType.REVERSE_A
                ? 'bg-fuchsia-400/25'
                : 'bg-indigo-400/25',
          ]"
        />

        <div
          v-if="note.type === NoteType.TAP"
          class="absolute flex justify-center items-center right-0 top-1/2 -translate-y-1/2 size-8 rounded-full ring-2 bg-green-300"
          :class="
            timelineUi.selectedNoteIds.has(note.id)
              ? 'ring-primary'
              : 'ring-transparent'
          "
        >
          <UIcon
            v-if="note.direction !== undefined"
            :name="getDirectionIcon(note.direction)!"
            class="size-4 text-green-950"
          />
        </div>

        <div
          v-else
          class="absolute flex justify-center items-center right-0 top-1/2 -translate-y-1/2 size-8"
        >
          <div
            class="absolute inset-0 rotate-45 rounded-sm ring-2"
            :class="[
              note.type === NoteType.REVERSE_A
                ? 'bg-fuchsia-400'
                : 'bg-indigo-400',
              timelineUi.selectedNoteIds.has(note.id)
                ? 'ring-primary'
                : 'ring-transparent',
            ]"
          />

          <span class="relative text-xs text-white font-bold">
            {{ getReverseNoteLetter(note.type) }}
          </span>
        </div>
      </div>
    </UTooltip>
  </div>
</template>
