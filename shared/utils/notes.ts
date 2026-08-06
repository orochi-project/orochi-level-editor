/** Represents the available note types in the timeline editor. */
export const enum NoteType {
  TAP,
  HOLD,
  REVERSE,
}

/** Represents the possible directions a note can point to. */
export const enum Direction {
  LEFT,
  RIGHT,
  UP,
  DOWN,
}

/** The types of notes and their specs. */
export const NOTE_TYPES: {
  key: NoteType;
  label: string;
  icon: string;
  directions?: Direction[];
}[] = [
  {
    key: NoteType.TAP,
    label: "Tap",
    icon: "i-lucide-circle",
    directions: [Direction.LEFT, Direction.RIGHT, Direction.UP, Direction.DOWN],
  },
  { key: NoteType.HOLD, icon: "i-lucide-rectangle-horizontal", label: "Hold" },
  { key: NoteType.REVERSE, icon: "i-lucide-diamond", label: "Reverse" },
];

/** The specs of all directions. */
export const ALL_DIRECTIONS: { key: Direction; icon: string; label: string }[] =
  [
    { key: Direction.LEFT, icon: "i-lucide-arrow-left", label: "Left" },
    { key: Direction.RIGHT, icon: "i-lucide-arrow-right", label: "Right" },
    { key: Direction.UP, icon: "i-lucide-arrow-up", label: "Up" },
    { key: Direction.DOWN, icon: "i-lucide-arrow-down", label: "Down" },
  ];
