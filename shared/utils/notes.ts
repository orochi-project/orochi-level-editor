/** Represents the available note types in the timeline editor. */
export const enum NoteType {
  TAP,
  HOLD,
  REVERSE_A,
  REVERSE_B,
}

/** Represents the possible directions a note can point to. */
export const enum Direction {
  LEFT,
  RIGHT,
  UP,
  DOWN,
}

/** The types of notes and their specs. */
export const TYPES: {
  key: NoteType;
  label: string;
  directions?: Direction[];
}[] = [
  {
    key: NoteType.TAP,
    label: "Tap",
    directions: [Direction.LEFT, Direction.RIGHT],
  },
  {
    key: NoteType.HOLD,
    label: "Hold",
    directions: [Direction.UP, Direction.DOWN],
  },
  { key: NoteType.REVERSE_A, label: "Reverse A" },
  { key: NoteType.REVERSE_B, label: "Reverse B" },
];

/** The specs of all directions. */
export const ALL_DIRECTIONS: { key: Direction; icon: string; label: string }[] =
  [
    { key: Direction.LEFT, icon: "i-lucide-arrow-left", label: "Left" },
    { key: Direction.RIGHT, icon: "i-lucide-arrow-right", label: "Right" },
    { key: Direction.UP, icon: "i-lucide-arrow-up", label: "Up" },
    { key: Direction.DOWN, icon: "i-lucide-arrow-down", label: "Down" },
  ];
