<script setup lang="ts">
const props = defineProps<{ playing: boolean }>();
const emit = defineEmits<{
  (e: "play"): void;
  (e: "pause"): void;
}>();

const beatmapFile = useBeatmapFileStore();
const timelineUi = useTimelineUiStore();
const timelineHistory = useTimelineHistoryStore();
const { currentFrame } = storeToRefs(useTimelineAudioStore());

/** The possible frame snap options. */
const snapOptions = [
  { label: "1 frame", value: 1 },
  { label: "2 frames", value: 2 },
  { label: "4 frames", value: 4 },
  { label: "8 frames", value: 8 },
];
</script>

<template>
  <div class="overflow-x-auto shrink-0 border-b border-default w-full">
    <div
      class="flex justify-between px-4 py-2.5 min-w-max w-full whitespace-nowrap"
    >
      <div class="flex-2 flex justify-start items-center gap-4">
        <div class="shrink-0 flex items-center gap-2">
          <UTooltip v-if="!props.playing" text="Play">
            <UButton icon="i-lucide-play" size="sm" @click="$emit('play')" />
          </UTooltip>
          <UTooltip v-else text="Pause">
            <UButton
              icon="i-lucide-pause"
              size="sm"
              color="neutral"
              variant="soft"
              @click="$emit('pause')"
            />
          </UTooltip>

          <span class="ml-1 text-xs font-mono text-muted tabular-nums"
            >f{{ currentFrame }}</span
          >
        </div>

        <USeparator orientation="vertical" class="shrink-0 h-5" />

        <div class="shrink-0 flex items-center gap-1">
          <UTooltip text="Undo (Ctrl+Z)">
            <UButton
              icon="i-lucide-undo-2"
              size="sm"
              color="neutral"
              variant="soft"
              square
              :disabled="!timelineHistory.undoStack.length"
              @click="timelineHistory.undo"
            />
          </UTooltip>

          <UTooltip text="Redo (Ctrl+Shift+Z)">
            <UButton
              icon="i-lucide-redo-2"
              size="sm"
              color="neutral"
              variant="soft"
              square
              :disabled="!timelineHistory.redoStack.length"
              @click="timelineHistory.redo"
            />
          </UTooltip>
        </div>

        <USeparator orientation="vertical" class="shrink-0 h-5" />

        <span
          v-if="beatmapFile.beatmapFileName"
          class="flex items-center gap-1 text-xs text-dimmed"
        >
          <UIcon name="i-lucide-music-2" />
          {{ beatmapFile.beatmapFileName }}
        </span>
        <span v-else class="flex items-center gap-1 text-xs text-dimmed">
          <UIcon name="i-lucide-music-2" />
          New Chart
        </span>
      </div>

      <div class="flex-1 flex justify-end items-center gap-4">
        <template v-if="timelineUi.selectedNoteIds.size">
          <span class="shrink-0 text-xs text-dimmed">
            {{ timelineUi.selectedNoteIds.size }} selected
          </span>
          <USeparator orientation="vertical" class="shrink-0 h-5" />
        </template>

        <div class="shrink-0 flex items-center gap-2">
          <span class="text-xs text-dimmed">Snap</span>
          <USelect
            v-model.number="timelineUi.snapFrames"
            :items="snapOptions"
            option-attribute="label"
            value-attribute="value"
            size="sm"
            class="w-28"
          />
        </div>

        <USeparator orientation="vertical" class="shrink-0 h-5" />

        <div class="shrink-0 flex items-center gap-1">
          <span class="mr-1 text-xs text-dimmed">Zoom</span>

          <UTooltip text="Zoom Out (-)">
            <UButton
              icon="i-lucide-minus"
              size="sm"
              color="neutral"
              variant="soft"
              square
              @click="timelineUi.zoomOut"
            />
          </UTooltip>

          <span
            class="text-center w-12 text-xs font-mono text-muted tabular-nums"
            >{{ Math.round(timelineUi.pixelsPerFrame * 100) }}%</span
          >

          <UTooltip text="Zoom In (+/=)">
            <UButton
              icon="i-lucide-plus"
              size="sm"
              color="neutral"
              variant="soft"
              square
              @click="timelineUi.zoomIn"
            />
          </UTooltip>
        </div>
      </div>
    </div>
  </div>
</template>
