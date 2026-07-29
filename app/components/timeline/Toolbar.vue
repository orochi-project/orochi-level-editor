<script setup lang="ts">
const props = defineProps<{ currentFrame: number }>();
const emit = defineEmits<{
  (e: "play"): void;
  (e: "pause"): void;
  (e: "export"): void;
}>();

const timelineUi = useTimelineUiStore();
const timelineHistory = useTimelineHistoryStore();

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
      class="flex justify-between items-center px-4 py-2.5 min-w-max w-full whitespace-nowrap"
    >
      <div class="shrink-0 flex items-center gap-2">
        <UTooltip text="Play">
          <UButton icon="i-lucide-play" size="sm" @click="$emit('play')" />
        </UTooltip>

        <UTooltip text="Pause">
          <UButton
            icon="i-lucide-pause"
            size="sm"
            color="neutral"
            variant="soft"
            @click="$emit('pause')"
          />
        </UTooltip>

        <span class="ml-1 text-xs font-mono text-muted tabular-nums"
          >f{{ props.currentFrame }}</span
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

      <div class="shrink-0 flex items-center gap-2">
        <span class="text-xs text-dimmed">Place</span>

        <UButton
          v-for="t in NOTE_TYPES"
          :key="t.key"
          size="sm"
          class="px-3"
          :color="timelineUi.activeType === t.key ? 'primary' : 'neutral'"
          :variant="timelineUi.activeType === t.key ? 'solid' : 'ghost'"
          @click="timelineUi.activeType = t.key"
        >
          {{ t.label }}
        </UButton>
      </div>

      <USeparator orientation="vertical" class="shrink-0 h-5" />

      <div
        v-if="timelineUi.activeTypeMeta.directions?.length"
        class="shrink-0 flex items-center gap-2"
      >
        <span class="text-xs text-dimmed">Direction</span>
        <UButton
          v-for="dir in ALL_DIRECTIONS.filter((d) =>
            timelineUi.activeTypeMeta.directions?.includes(d.key),
          )"
          :key="dir.key"
          size="sm"
          :icon="dir.icon"
          class="px-3 gap-1.5"
          :color="
            timelineUi.activeDirection === dir.key ? 'primary' : 'neutral'
          "
          :variant="timelineUi.activeDirection === dir.key ? 'solid' : 'ghost'"
          @click="timelineUi.activeDirection = dir.key"
        >
          {{ dir.label }}
        </UButton>
      </div>
      <span v-else class="shrink-0 text-xs text-dimmed"
        >Reverse notes have no direction.</span
      >

      <USeparator orientation="vertical" class="shrink-0 h-5" />

      <span
        v-if="timelineUi.selectedNoteIds.size"
        class="shrink-0 text-xs text-dimmed"
      >
        {{ timelineUi.selectedNoteIds.size }} selected
      </span>

      <USeparator orientation="vertical" class="shrink-0 h-5" />

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

        <span class="text-center w-12 text-xs font-mono text-muted tabular-nums"
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

      <USeparator orientation="vertical" class="shrink-0 h-5" />

      <UButton
        icon="i-lucide-code"
        color="neutral"
        variant="soft"
        size="sm"
        class="px-3 shrink-0"
        @click="$emit('export')"
      >
        Export
      </UButton>
    </div>
  </div>
</template>
