<script setup lang="ts">
const open = defineModel<boolean>("open");

const beatmapState = useBeatmapStateStore();

/** The exported level chart in JSON format. */
const exportedChart = computed(() => {
  // TODO: use the native hex format instead of this JSON format for exporting later (spec to be defined)
  const sorted = [...beatmapState.notes].sort(
    (a, b) => a.peakFrame - b.peakFrame,
  );

  let prevFrame = 0;
  return sorted.map((n) => {
    const frameDelta = n.peakFrame - n.chargeFrames - prevFrame;
    prevFrame = n.peakFrame;

    return {
      type: n.type,
      direction: n.direction,
      gridX: n.gridX,
      gridY: n.gridY,
      frameDelta,
      chargeFrames: n.chargeFrames,
      holdFrames: n.type === NoteType.HOLD ? n.holdFrames : undefined,
    };
  });
});
</script>

<template>
  <LazyUSlideover v-model:open="open" title="Exported Chart Data">
    <template #body>
      <div class="p-1">
        <p class="mb-3 text-xs text-dimmed">
          Below are the notes in the current beatmap sorted chronologically in
          JSON format.
        </p>
        <pre
          class="overflow-auto p-3 max-h-96 text-xs rounded-md bg-elevated"
          >{{ JSON.stringify(exportedChart, null, 2) }}</pre
        >
      </div>
    </template>
  </LazyUSlideover>
</template>
