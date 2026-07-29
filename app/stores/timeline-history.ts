import { getNoteTypeMetadata, pxToFrame } from "~~/utils/timeline";
import { GRID_COLS, GRID_ROWS } from "~~/utils/constants";

export const useTimelineHistoryStore = defineStore("timelineHistory", () => {
  const beatmapState = useBeatmapStateStore();
  const uiStore = useTimelineUiStore();

  /** The default number of frames it takes for a tap or reverse note to become fully charged. */
  const DEFAULT_CHARGE_FRAMES = 90;
  /** The default number of frames a hold note should be held for. */
  const DEFAULT_HOLD_FRAMES = 60;

  /** The maximum number of history entries to retain for undo/redo. */
  const MAX_ACTION_HISTORY = 200;

  /** Snapshots of the notes array taken before each mutating action. */
  const undoStack = ref<Note[][]>([]);
  /** Snapshots that were undone and can be redone. */
  const redoStack = ref<Note[][]>([]);

  /** Notes currently copied to the in-app clipboard. */
  const clipboard = ref<Note[]>([]);

  /**
   * Deep-clone a note array so history snapshots aren't impacted by mutations later on.
   *
   * @param list - The note list to clone.
   *
   * @returns The cloned note list.
   */
  function cloneNotes(list: Note[]): Note[] {
    return list.map((n) => ({ ...n }));
  }

  /**
   * Snapshot the current notes state onto the undo stack.
   *
   * Must be called prior to a mutation.
   */
  function pushUndo() {
    pushUndoSnapshot(cloneNotes(beatmapState.notes));
  }

  /**
   * Push a pre-captured snapshot onto the undo stack.
   *
   * Used for dragging/resizing, where the "before" state must be captured at the start of the interaction rather than immediately before committing it.
   *
   * @param snapshot - The notes state to record as the undo point.
   */
  function pushUndoSnapshot(snapshot: Note[]) {
    undoStack.value.push(snapshot);
    if (undoStack.value.length > MAX_ACTION_HISTORY) undoStack.value.shift();
    redoStack.value = [];
  }

  /** Revert to the previous state in the undo stack, if any. */
  function undo() {
    if (!undoStack.value.length) return;

    const prev = undoStack.value.pop()!;
    redoStack.value.push(cloneNotes(beatmapState.notes));
    beatmapState.notes = prev;

    uiStore.clearSelection();
  }

  /** Switch back to a state that was previously undone, if any. */
  function redo() {
    if (!redoStack.value.length) return;

    const next = redoStack.value.pop()!;
    undoStack.value.push(cloneNotes(beatmapState.notes));
    beatmapState.notes = next;

    uiStore.clearSelection();
  }

  /** Copy the currently selected notes to the clipboard. */
  function copySelected() {
    if (!uiStore.selectedNoteIds.size) return;
    clipboard.value = cloneNotes(uiStore.selectedNotesList);
  }

  /** Copy selected notes and delete them from the chart. */
  function cutSelected() {
    if (!uiStore.selectedNoteIds.size) return;
    copySelected();
    deleteSelected();
  }

  /** Paste clipboard notes at the current playhead position. */
  function pasteClipboard(currentFrame: number) {
    if (!clipboard.value.length) return;

    pushUndo();

    const minFrame = Math.min(...clipboard.value.map((n) => n.peakFrame));
    const offset = currentFrame - minFrame;

    const pasted: Note[] = clipboard.value.map((n) =>
      clampNoteToTimeline({
        ...n,
        id: crypto.randomUUID(),
        peakFrame: Math.max(0, n.peakFrame + offset),
      }),
    );

    beatmapState.notes.push(...pasted);
    uiStore.selectedNoteIds = new Set(pasted.map((n) => n.id));
  }

  /**
   * Delete a single note by ID.
   *
   * @param noteId - The ID of the note to delete.
   */
  function deleteNote(noteId: string) {
    pushUndo();

    const idx = beatmapState.notes.findIndex((n: Note) => n.id === noteId);
    if (idx !== -1) beatmapState.notes.splice(idx, 1);

    if (uiStore.selectedNoteIds.has(noteId)) {
      const next = new Set(uiStore.selectedNoteIds);
      next.delete(noteId);
      uiStore.selectedNoteIds = next;
    }
  }

  /** Delete every currently selected note. */
  function deleteSelected() {
    if (!uiStore.selectedNoteIds.size) return;

    pushUndo();

    const ids = uiStore.selectedNoteIds;
    beatmapState.notes = beatmapState.notes.filter((n: Note) => !ids.has(n.id));
    uiStore.clearSelection();
  }

  /**
   * Place a note at a given track-relative pixel position (that is, excluding the label column).
   *
   * @param trackX - The x-position within the timeline track, in pixels.
   * @param noteType - The type of note to place.
   */
  function placeNoteAt(trackX: number, noteType: NoteType) {
    const peakFrame = pxToFrame(
      trackX,
      uiStore.pixelsPerFrame,
      uiStore.snapFrames,
    );

    if (
      beatmapState.notes.some(
        (n: Note) => n.type === noteType && n.peakFrame === peakFrame,
      )
    )
      return;

    pushUndo();

    const noteMetadata = getNoteTypeMetadata(noteType);

    // We must check if the user actually selected a valid direction for their note type.
    // If not, we should make it fall back to the first valid direction.
    // (Only applies to tap and hold notes.)
    let noteDirection: Direction | undefined = undefined;
    if (noteMetadata.directions?.length)
      noteDirection = noteMetadata.directions.includes(uiStore.activeDirection)
        ? uiStore.activeDirection
        : noteMetadata.directions[0];

    const note: Note = {
      id: crypto.randomUUID(),
      type: noteType,
      direction: noteDirection,
      gridX: Math.floor(GRID_COLS / 2), // center x
      gridY: Math.floor(GRID_ROWS / 2), // center y
      peakFrame,
      chargeFrames: DEFAULT_CHARGE_FRAMES,
      holdFrames: noteType === NoteType.HOLD ? DEFAULT_HOLD_FRAMES : 0,
    };

    const clampedNote = clampNoteToTimeline(note);

    beatmapState.notes.push(clampedNote);
    uiStore.selectOnly(clampedNote.id);
  }

  /**
   * Clamp a note so that its full duration stays inside the timeline.
   *
   * This includes charge frames before the peak and hold frames after it.
   *
   * @param note - The note to clamp.
   *
   * @returns The clamped note.
   */
  function clampNoteToTimeline(note: Note): Note {
    const chargeFrames = note.chargeFrames ?? 0;
    const holdFrames = note.type === NoteType.HOLD ? (note.holdFrames ?? 0) : 0;

    let peakFrame = note.peakFrame;

    if (peakFrame - chargeFrames < 0) peakFrame = chargeFrames;

    if (peakFrame + holdFrames > beatmapState.totalFrames)
      peakFrame = beatmapState.totalFrames - holdFrames;

    peakFrame = Math.max(
      chargeFrames,
      Math.min(peakFrame, beatmapState.totalFrames - holdFrames),
    );

    return {
      ...note,
      peakFrame,
    };
  }

  return {
    undoStack,
    redoStack,
    clipboard,
    cloneNotes,
    pushUndo,
    pushUndoSnapshot,
    undo,
    redo,
    copySelected,
    cutSelected,
    pasteClipboard,
    deleteNote,
    deleteSelected,
    placeNoteAt,
    clampNoteToTimeline,
  };
});
