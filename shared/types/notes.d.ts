export {};

declare global {
  /** Represents the features/properties of a note in the timeline. */
  interface Note {
    /**
     * The UUID of the note.
     *
     * Notes are labeled by UUID rather than a basic index so that deleted notes don't mess up the order.
     */
    id: string;
    /** The type of note. */
    type: NoteType;
    /**
     * The direction of the note.
     *
     * Only applies to tap or hold notes.
     * Tap notes can either point left or right, while hold notes can only point up or down.
     */
    direction?: Direction;
    /** The speed to set the scanline to. */
    speedModifier: number;
    /** The note's x-position on the game grid. */
    gridX: number;
    /** The note's y-position on the game grid. */
    gridY: number;
    /**
     * The exact frame at which the note is fully charged.
     *
     * For hold notes, this functions as the first frame, since hold notes do not need to be charged.
     */
    peakFrame: number;
    /** The number of frames it takes for the note to be fully charged. */
    chargeFrames: number;
    /**
     * The number of frames the note should be held for.
     *
     * Only used for hold notes.
     */
    holdFrames?: number;
  }
}
