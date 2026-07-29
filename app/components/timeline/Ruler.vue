<script setup lang="ts">
import { RULER_HEIGHT } from "~~/utils/constants";

const props = defineProps<{
  timelineWidth: number;
  gridLines: { px: number; strong: boolean; label?: string }[];
}>();

const emit = defineEmits<{
  (e: "pointerdown", event: PointerEvent): void;
  (e: "pointermove", event: PointerEvent): void;
  (e: "pointerup", event: PointerEvent): void;
}>();
</script>

<template>
  <div class="z-30 sticky flex top-0">
    <div
      class="cursor-pointer overflow-visible relative border-b border-default bg-default"
      :style="{
        width: props.timelineWidth + 'px',
        height: RULER_HEIGHT + 'px',
      }"
      @pointerdown="$emit('pointerdown', $event)"
      @pointermove="$emit('pointermove', $event)"
      @pointerup="$emit('pointerup', $event)"
    >
      <div
        v-for="(line, i) in props.gridLines"
        :key="'tick-' + i"
        class="pointer-events-none absolute bottom-0 border-l"
        :class="
          line.strong ? 'border-default h-3 z-10' : 'border-muted h-1.5 z-0'
        "
        :style="{ left: line.px + 'px' }"
      />

      <div
        v-for="(line, i) in props.gridLines.filter((l) => l.strong && l.label)"
        :key="'label-' + i"
        class="pointer-events-none absolute top-0 text-xs text-dimmed whitespace-nowrap font-mono"
        :style="{
          left: line.px + 'px',
          transform: 'translateX(-50%)',
        }"
      >
        {{ line.label }}
      </div>
    </div>
  </div>
</template>
