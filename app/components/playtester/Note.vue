<script setup lang="ts">
import tapHorizontal from "~/assets/res/sprites/tap-note-horizontal.png";
import tapVertical from "~/assets/res/sprites/tap-note-vertical.png";
import holdNote from "~/assets/res/sprites/hold-note.png";
import reverseNote from "~/assets/res/sprites/reverse-note.png";

const props = defineProps<{
  note: Note;
  chargeProgress: number;
  holdProgress?: number;
  cellWidth: number;
  cellHeight: number;
}>();

/** The note sprite source image. */
const source = computed<string>(() => {
  switch (props.note.type) {
    case NoteType.REVERSE:
      return reverseNote;
    case NoteType.HOLD:
      return holdNote;
    case NoteType.TAP:
      return [Direction.LEFT, Direction.RIGHT].includes(props.note.direction!)
        ? tapHorizontal
        : tapVertical;
  }
});

/** * The mirror transform to apply for tap note directions. */
const flipTransform = computed<string>(() => {
  if (props.note.type !== NoteType.TAP) return "";

  if (props.note.direction === Direction.LEFT) return "scaleX(-1)";
  if (props.note.direction === Direction.DOWN) return "scaleY(-1)";

  return "";
});

/** The total number of frames in the note type's vertical spritesheet. */
const totalFrames = computed<number>(() =>
  props.note.type === NoteType.HOLD ? 9 : 5,
);

/** The note frame. */
const frame = computed<number>(() => {
  if ([NoteType.TAP, NoteType.REVERSE].includes(props.note.type))
    return Math.round(props.chargeProgress * 4); // 5 frames

  return Math.round(
    props.chargeProgress < 1
      ? props.chargeProgress * 4 // 5 frames (hold charge)
      : 5 + props.holdProgress! * 3, // 5 frames (from charge) + 4 frames (holding)
  );
});

const backgroundSize = computed(
  () => `${props.cellWidth}px ${props.cellHeight * totalFrames.value}px`,
);
const y = computed<number>(() => frame.value * props.cellHeight);
</script>

<template>
  <div
    class="bg-no-repeat"
    :style="{
      width: `${cellWidth}px`,
      height: `${cellHeight}px`,
      imageRendering: 'pixelated',
      backgroundImage: `url(${source})`,
      backgroundSize,
      backgroundPosition: `0px -${y}px`,
      transform: flipTransform,
    }"
  />
</template>
