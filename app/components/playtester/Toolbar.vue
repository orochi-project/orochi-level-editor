<script setup lang="ts">
const timelineUi = useTimelineUiStore();

const props = defineProps<{
  orientation: "horizontal" | "vertical";
  showGrid: boolean;
}>();
const emit = defineEmits<{ (e: "update:showGrid", value: boolean): void }>();

/** The directions allowed for the currently active note type, with their icon and label. */
const availableDirections = computed(() => {
  const allowed = NOTE_TYPES.find(
    (noteType) => noteType.key === timelineUi.activeType,
  )?.directions;

  if (!allowed) return [];
  return ALL_DIRECTIONS.filter((direction) => allowed.includes(direction.key));
});
</script>

<template>
  <div
    class="flex items-center gap-4 p-3 shrink-0"
    :class="
      props.orientation === 'horizontal'
        ? 'overflow-x-auto flex-row'
        : 'overflow-y-auto flex-col w-16 border-x border-default'
    "
  >
    <UTooltip text="Show Grid">
      <UButton
        icon="i-lucide-grid-3x3"
        :color="showGrid ? 'primary' : 'neutral'"
        :variant="showGrid ? 'solid' : 'ghost'"
        square
        class="justify-center size-8"
        @click="emit('update:showGrid', !showGrid)"
      />
    </UTooltip>

    <USeparator orientation="horizontal" />

    <div
      class="flex gap-1"
      :class="props.orientation === 'horizontal' ? 'flex-row' : 'flex-col'"
    >
      <UTooltip
        v-for="noteType in NOTE_TYPES"
        :key="noteType.key"
        :text="noteType.label"
      >
        <UButton
          :icon="noteType.icon"
          :color="
            timelineUi.activeType === noteType.key ? 'primary' : 'neutral'
          "
          :variant="timelineUi.activeType === noteType.key ? 'solid' : 'ghost'"
          square
          class="justify-center size-8"
          @click="timelineUi.activeType = noteType.key"
        />
      </UTooltip>
    </div>

    <USeparator orientation="horizontal" />

    <div
      v-if="availableDirections.length"
      class="flex gap-1"
      :class="props.orientation === 'horizontal' ? 'flex-row' : 'flex-col'"
    >
      <UTooltip
        v-for="direction in availableDirections"
        :key="direction.key"
        :text="direction.label"
      >
        <UButton
          :icon="direction.icon"
          :color="
            timelineUi.activeDirection === direction.key ? 'primary' : 'neutral'
          "
          :variant="
            timelineUi.activeDirection === direction.key ? 'solid' : 'ghost'
          "
          square
          class="justify-center size-8"
          @click="
            timelineUi.setDirectionForType(timelineUi.activeType, direction.key)
          "
        />
      </UTooltip>
    </div>
  </div>
</template>
