<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    /** The number of grid rows to display. */
    rows?: number;
    /** The number of grid columns to display. */
    cols?: number;
    /** Top-left corner of the grid, as a fraction (0-1) of the rendered image size. */
    origin?: { x: number; y: number };
    /** Bottom-right corner of the grid, as a fraction (0-1) of the rendered image size. */
    end?: { x: number; y: number };
  }>(),
  {
    rows: 5,
    cols: 8,
    origin: () => ({ x: 1 / 10, y: 5 / 32 }),
    end: () => ({ x: 9 / 10, y: 27 / 32 }),
  },
);

const imgEl = ref<HTMLImageElement>();

/** Rendered size of the image, in pixels. */
const imgSize = ref({ width: 0, height: 0 });

let observer: ResizeObserver | undefined;

onMounted(() => {
  if (!imgEl.value) return;

  observer = new ResizeObserver((entries) => {
    const entry = entries[0];
    if (!entry) return;

    const box = entry.contentRect;
    imgSize.value = { width: box.width, height: box.height };
  });

  observer.observe(imgEl.value);
});

onBeforeUnmount(() => observer?.disconnect());

/** The pixel bounding box of the grid. */
const gridBox = computed(() => {
  const left = props.origin.x * imgSize.value.width;
  const top = props.origin.y * imgSize.value.height;
  const width = (props.end.x - props.origin.x) * imgSize.value.width;
  const height = (props.end.y - props.origin.y) * imgSize.value.height;
  return { left, top, width, height };
});

/** The list of grid cells with their pixel position/size and index. */
const cells = computed(() => {
  const cellW = gridBox.value.width / props.cols;
  const cellH = gridBox.value.height / props.rows;

  const list: { index: number; left: number; top: number }[] = [];

  for (let r = 0; r < props.rows; r++)
    for (let c = 0; c < props.cols; c++)
      list.push({
        index: r * props.cols + c,
        left: c * cellW,
        top: r * cellH,
      });

  return { list, cellW, cellH };
});
</script>

<template>
  <div class="overflow-x-auto flex justify-center gap-4 w-full h-full">
    <div class="relative h-full shrink-0">
      <img
        ref="imgEl"
        class="h-full block"
        src="../../assets/graphics/backgrounds/level_background.png"
      />

      <div
        class="absolute"
        :style="{
          left: gridBox.left + 'px',
          top: gridBox.top + 'px',
          width: gridBox.width + 'px',
          height: gridBox.height + 'px',
        }"
      >
        <div
          v-for="cell in cells.list"
          :key="cell.index"
          class="group absolute border border-red-300/50 hover:border-red-300 hover:bg-red-400/20"
          :style="{
            left: cell.left + 'px',
            top: cell.top + 'px',
            width: cells.cellW + 'px',
            height: cells.cellH + 'px',
          }"
        >
          <div
            class="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 px-1.5 py-0.5 text-white text-xs whitespace-nowrap rounded bg-black/80 group-hover:opacity-100"
          >
            {{ cell.index }}
          </div>
        </div>
      </div>
    </div>

    <PlaytesterTapNote />
  </div>
</template>
