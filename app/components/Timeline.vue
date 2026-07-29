<script setup lang="ts">
import {
  FRAMES_PER_SECOND,
  GRID_ROWS,
  GRID_COLS,
  ROW_HEIGHT,
  RULER_HEIGHT,
  LABEL_WIDTH,
} from "~~/utils/constants";

/** The number of pixels for each frame on the timeline track (a.k.a. the zoom factor). */
const pixelsPerFrame = ref(2);
/** The nearest multiple of frames that notes snap to when placed or dragged along the timeline. */
const snapFrames = ref(4);

/** The total number of frames in the current sequence. */
const totalFrames = Math.ceil(60 * FRAMES_PER_SECOND * 3); // TODO: this is 3 minutes right now; change it later

/**
 * Convert a frame number to pixels based on the defined pixelsPerFrame value.
 *
 * @param frame - The frame number to convert.
 *
 * @returns The calculated pixel value.
 */
function frameToPx(frame: number): number {
  return frame * pixelsPerFrame.value;
}

/**
 * Convert an absolute pixel position to a frame number.
 *
 * Used only for placing notes from a raw position.
 *
 * @param px - The pixel position on the timeline.
 * @param snap - Whether or not the result should snap to the frame grid.
 *
 * @returns The calculated the frame number.
 */
function pxToFrame(px: number, snap = true): number {
  const rawFrame = px / pixelsPerFrame.value;
  const snapAmount = Number(snapFrames.value) || 4;
  const frame = snap
    ? Math.round(rawFrame / snapAmount) * snapAmount
    : Math.round(rawFrame);

  return Math.max(0, frame);
}

/**
 * Convert a relative pixel delta (e.g. pointer movement during a drag) to a frame delta.
 *
 * Unlike pxToFrame, this does not clamp to zero. Deltas should be negative when dragging/resizing leftward. Any clamping of the resulting frame value should happen at the call site, after adding the delta to the original frame.
 *
 * @param px - The pixel delta to convert.
 *
 * @returns The calculated frame delta.
 */
function pxDeltaToFrame(px: number): number {
  const rawFrame = px / pixelsPerFrame.value;
  const snapAmount = Number(snapFrames.value) || 4;
  return Math.round(rawFrame / snapAmount) * snapAmount;
}

/** The total width, in pixels, of the timeline based on the number of frames. */
const timelineWidth = computed(() => frameToPx(totalFrames));

/** Increase the pixelsPerFrame value to zoom in horizontally in the timeline. */
function zoomIn() {
  pixelsPerFrame.value = Math.min(4, +(pixelsPerFrame.value + 0.2).toFixed(2));
}

/** Decrease the pixelsPerFrame value to zoom out horizontally in the timeline. */
function zoomOut() {
  pixelsPerFrame.value = Math.max(
    0.2,
    +(pixelsPerFrame.value - 0.2).toFixed(2),
  );
}

/** The reactive array storing every note currently placed in the timeline. */
const notes = ref<Note[]>([]);

/**
 * Get the full specs of a note type.
 *
 * @param noteType - The note type to get the metadata of.
 *
 * @returns The metadata/specs of the given note type.
 */
function getNoteTypeMetadata(noteType: NoteType) {
  return TYPES.find((t) => t.key === noteType)!;
}

/**
 * Get the icon indicator of a specific direction.
 *
 * @param direction - The direction to get the icon of.
 *
 * @returns The icon name of the direction, or undefined if not found.
 */
function getDirectionIcon(direction: Direction | null): string | undefined {
  return ALL_DIRECTIONS.find((d) => d.key === direction)?.icon;
}

/**
 * Get the label string of a specific direction.
 *
 * @param direction - The direction to get the label of.
 *
 * @returns The label of the direction.
 */
function getDirectionLabel(direction: Direction | null): string {
  return ALL_DIRECTIONS.find((d) => d.key === direction)?.label ?? "";
}

/**
 * Get the letter of a reverse note.
 *
 * @param noteType - The type of note.
 *
 * @returns "A" or "B", or an empty string if not a reverse note.
 */
function getReverseNoteLetter(noteType: NoteType): "A" | "B" | "" {
  return noteType === NoteType.REVERSE_A
    ? "A"
    : noteType === NoteType.REVERSE_B
      ? "B"
      : "";
}

/** The currently selected type in the timeline toolbar. */
const activeType = ref<NoteType>(NoteType.TAP);
/** Properties of the currently selected type. */
const activeTypeMeta = computed(() => getNoteTypeMetadata(activeType.value));
/** The currently selected direction in the timeline toolbar. */
const activeDirection = ref<Direction>(Direction.LEFT);

// When the currently active type changes (by user input),
// we should update the currently selected direction to the
// first allowed direction of the newly selected note type.
watch(activeType, (noteType) => {
  const allowedDirections = getNoteTypeMetadata(noteType).directions;
  if (
    allowedDirections?.length &&
    !allowedDirections.includes(activeDirection.value)
  )
    activeDirection.value = allowedDirections[0]!;
});

/** The default number of frames it takes for a tap or reverse note to become fully charged. */
const DEFAULT_CHARGE_FRAMES = 24;
/** The default number of frames a hold note should be held for. */
const DEFAULT_HOLD_FRAMES = 60;

/**
 * The IDs of all currently selected notes.
 *
 * Allows for multi-select via Shift/Ctrl-click or rectangle select.
 */
const selectedNoteIds = ref<Set<string>>(new Set());

/** The single selected note, used for the inspector panel when exactly one note is selected. */
const selectedNote = computed(() => {
  if (selectedNoteIds.value.size !== 1) return null;
  const [id] = selectedNoteIds.value;
  return notes.value.find((n: Note) => n.id === id) ?? null;
});

/** The full list of currently selected note objects. */
const selectedNotesList = computed(() =>
  notes.value.filter((n: Note) => selectedNoteIds.value.has(n.id)),
);

/**
 * Replace the selection with a single note.
 *
 * @param id - The ID of the note to select.
 */
function selectOnly(id: string) {
  selectedNoteIds.value = new Set([id]);
}

/**
 * Add or remove a note from the selection.
 *
 * @param id - The ID of the note to toggle.
 */
function toggleSelect(id: string) {
  const next = new Set(selectedNoteIds.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  selectedNoteIds.value = next;
}

/** Deselect every note. */
function clearSelection() {
  selectedNoteIds.value = new Set();
}

/** Select every note currently in the chart. */
function selectAllNotes() {
  selectedNoteIds.value = new Set(notes.value.map((n: Note) => n.id));
}

/** The maximum number of history entries to retain for undo/redo. */
const MAX_ACTION_HISTORY = 200;

/** Snapshots of the notes array taken before each mutating action. */
const undoStack = ref<Note[][]>([]);
/** Snapshots that were undone and can be redone. */
const redoStack = ref<Note[][]>([]);

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
  pushUndoSnapshot(cloneNotes(notes.value));
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
  redoStack.value.push(cloneNotes(notes.value));
  notes.value = prev;

  clearSelection();
}

/** Switch back to a state that was previously undone, if any. */
function redo() {
  if (!redoStack.value.length) return;

  const next = redoStack.value.pop()!;
  undoStack.value.push(cloneNotes(notes.value));
  notes.value = next;

  clearSelection();
}

/** Notes currently copied to the in-app clipboard. */
const clipboard = ref<Note[]>([]);

/** Copy the currently selected notes to the clipboard. */
function copySelected() {
  if (!selectedNoteIds.value.size) return;
  clipboard.value = cloneNotes(selectedNotesList.value);
}

/** Copy selected notes and delete them from the chart. */
function cutSelected() {
  if (!selectedNoteIds.value.size) return;

  copySelected();
  deleteSelected();
}

/** Paste clipboard notes at the current playhead position. */
function pasteClipboard() {
  if (!clipboard.value.length) return;

  pushUndo();

  const minFrame = Math.min(...clipboard.value.map((n) => n.peakFrame));
  const offset = currentFrame.value - minFrame;

  const pasted: Note[] = clipboard.value.map((n) => ({
    ...n,
    id: crypto.randomUUID(),
    peakFrame: Math.max(0, n.peakFrame + offset),
  }));

  notes.value.push(...pasted);
  selectedNoteIds.value = new Set(pasted.map((n) => n.id));
}

/**
 * Place a note at a given track-relative pixel position (that is, excluding the label column).
 *
 * @param trackX - The x-position within the timeline track, in pixels.
 * @param noteType - The type of note to place.
 */
function placeNoteAt(trackX: number, noteType: NoteType) {
  const peakFrame = pxToFrame(trackX);

  if (
    notes.value.some(
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
    noteDirection = noteMetadata.directions.includes(activeDirection.value)
      ? activeDirection.value
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

  notes.value.push(note);
  selectOnly(note.id);
}

/**
 * Delete a single note by ID.
 *
 * @param noteId - The ID of the note to delete.
 */
function deleteNote(noteId: string) {
  pushUndo();

  const idx = notes.value.findIndex((n: Note) => n.id === noteId);
  if (idx !== -1) notes.value.splice(idx, 1);

  if (selectedNoteIds.value.has(noteId)) {
    const next = new Set(selectedNoteIds.value);
    next.delete(noteId);
    selectedNoteIds.value = next;
  }
}

/** Delete every currently selected note. */
function deleteSelected() {
  if (!selectedNoteIds.value.size) return;

  pushUndo();

  const ids = selectedNoteIds.value;
  notes.value = notes.value.filter((n: Note) => !ids.has(n.id));
  clearSelection();
}

/**
 * Toggle text selection on the whole page while a pointer-drag interaction (panel resize,
 * note drag, hold-note resize, marquee select, etc.) is in progress, so dragging the mouse
 * doesn't highlight surrounding text.
 *
 * @param disabled - Whether to disable text selection.
 */
function setUserSelect(disabled: boolean) {
  document.body.style.userSelect = disabled ? "none" : "";
}

/** Information about notes currently being dragged across the timeline. */
const dragging = ref<{
  /** The peak frame of each dragged note at the start of the drag, keyed by note ID. */
  origFrames: Map<string, number>;
  /** The client x-position when dragging started. */
  startClientX: number;
  /** Whether or not the notes moved enough to count as a drag instead of a click. */
  moved: boolean;
  /**
   * A pre-drag snapshot of the notes array.
   *
   * Only committed to the undo stack if something actually moved.
   */
  snapshot: Note[];
} | null>(null);

/**
 * Start dragging a note.
 *
 * If the note is already part of a multi-selection, the whole selection is dragged together.
 * Otherwise, only this note is selected and dragged.
 *
 * @param e - The pointer event properties.
 * @param note - The note being pressed down on.
 */
function onNoteDown(e: PointerEvent, note: Note) {
  e.stopPropagation(); // don't let the click mess up the timeline
  (e.target as HTMLElement).setPointerCapture(e.pointerId); // capture pointer to allow the drag to continue even if the cursor leaves the note
  setUserSelect(true);

  if (e.shiftKey || e.metaKey || e.ctrlKey) toggleSelect(note.id);
  else if (!selectedNoteIds.value.has(note.id)) selectOnly(note.id); // the note is already part of a multi-selection, so leave it for a group drag

  const idsToMove = selectedNoteIds.value.has(note.id)
    ? selectedNoteIds.value
    : new Set([note.id]);

  const origFrames = new Map<string, number>();
  for (const id of idsToMove) {
    const n = notes.value.find((nn: Note) => nn.id === id);
    if (n) origFrames.set(id, n.peakFrame);
  }

  dragging.value = {
    origFrames,
    startClientX: e.clientX,
    moved: false,
    snapshot: cloneNotes(notes.value),
  };
}

/**
 * Move every dragged note while dragging.
 *
 * Keeps the notes' relative spacing.
 *
 * @param e - The pointer event properties.
 */
function onNoteMove(e: PointerEvent) {
  if (!dragging.value) return;

  if (Math.abs(e.clientX - dragging.value.startClientX) > 3)
    // must have moved more than 3 px to count as moved
    dragging.value.moved = true;

  const delta = pxDeltaToFrame(e.clientX - dragging.value.startClientX);

  for (const [id, origFrame] of dragging.value.origFrames) {
    const n = notes.value.find((nn: Note) => nn.id === id);
    if (n) n.peakFrame = Math.max(0, origFrame + delta);
  }
}

/**
 * End note dragging.
 *
 * Records the interaction to the undo stack if anything actually moved.
 */
function onNoteUp() {
  if (dragging.value?.moved) pushUndoSnapshot(dragging.value.snapshot);
  dragging.value = null;
}

/** State for a hold note resize on the right edge. */
const resizingRight = ref<{
  note: Note;
  startX: number;
  origHold: number;
  moved: boolean;
  snapshot: Note[];
} | null>(null);

/**
 * Start resizing a hold note from the right edge.
 *
 * @param e - The pointer event properties.
 * @param note - The note to resize.
 */
function onHoldResizeRightDown(e: PointerEvent, note: Note) {
  e.stopPropagation();
  (e.target as HTMLElement).setPointerCapture(e.pointerId);
  setUserSelect(true);

  resizingRight.value = {
    note,
    startX: e.clientX,
    origHold: note.holdFrames ?? 0,
    moved: false,
    snapshot: cloneNotes(notes.value),
  };
}

/**
 * Resize the hold note based on the pointer movement on the right edge.
 *
 * @param e - The pointer event properties.
 */
function onHoldResizeRightMove(e: PointerEvent) {
  if (!resizingRight.value) return;

  const { note, startX, origHold } = resizingRight.value;
  const delta = pxDeltaToFrame(e.clientX - startX);
  const newHold = Math.max(snapFrames.value, origHold + delta);

  if (newHold !== note.holdFrames) resizingRight.value.moved = true;

  note.holdFrames = newHold;
}

/**
 * End hold note resizing from the right edge.
 *
 * Records it to the undo stack if it actually changed anything.
 */
function onHoldResizeRightUp() {
  if (resizingRight.value?.moved)
    pushUndoSnapshot(resizingRight.value.snapshot);
  resizingRight.value = null;
}

/** State for a hold note resize on the left edge. */
const resizingLeft = ref<{
  note: Note;
  startX: number;
  origStart: number;
  origHold: number;
  moved: boolean;
  snapshot: Note[];
} | null>(null);

/**
 * Start resizing a hold note from the left edge.
 *
 * @param e - The pointer event properties.
 * @param note - The note to resize.
 */
function onHoldResizeLeftDown(e: PointerEvent, note: Note) {
  e.stopPropagation();
  (e.target as HTMLElement).setPointerCapture(e.pointerId);
  setUserSelect(true);

  resizingLeft.value = {
    note,
    startX: e.clientX,
    origStart: note.peakFrame,
    origHold: note.holdFrames ?? 0,
    moved: false,
    snapshot: cloneNotes(notes.value),
  };
}

/**
 * Resize the hold note based on the pointer movement on the left edge.
 *
 * @param e - The pointer event properties.
 */
function onHoldResizeLeftMove(e: PointerEvent) {
  if (!resizingLeft.value) return;

  const { note, startX, origStart, origHold } = resizingLeft.value;

  const delta = pxDeltaToFrame(e.clientX - startX);
  const end = origStart + origHold;
  const newStart = Math.max(
    0,
    Math.min(end - snapFrames.value, origStart + delta),
  );

  if (newStart !== note.peakFrame) resizingLeft.value.moved = true;

  note.peakFrame = newStart;
  note.holdFrames = end - newStart;
}

/**
 * End hold note resizing from the left edge.
 *
 * Records it to the undo stack if it actually changed anything.
 */
function onHoldResizeLeftUp() {
  if (resizingLeft.value?.moved) pushUndoSnapshot(resizingLeft.value.snapshot);
  resizingLeft.value = null;
}

/**
 * The rows container element.
 *
 * Used as the coordinate origin for rectangle selection.
 */
const rowsContainer = ref<HTMLElement>();

/** State for an in-progress rectangle selection, or a pending click-to-place note. */
const marquee = ref<{
  startX: number;
  startY: number;
  curX: number;
  curY: number;
  startClientX: number;
  startClientY: number;
  additive: boolean;
  moved: boolean;
  noteType: NoteType;
} | null>(null);

/**
 * Get a pointer event's position relative to the rows container's current visual box.
 *
 * @param e - The pointer event properties.
 *
 * @returns The x-position and y-position relative to the rows container.
 */
function containerRelativePos(e: PointerEvent): { x: number; y: number } {
  const rect = rowsContainer.value!.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

/**
 * Get the note-type row index at a given container-relative y position.
 *
 * @param y - The y position relative to the rows container.
 *
 * @returns The clamped row index.
 */
function rowIndexAtY(y: number): number {
  return Math.max(0, Math.min(TYPES.length - 1, Math.floor(y / ROW_HEIGHT)));
}

/**
 * Start either a rectangle selection or a click-to-place note interaction.
 *
 * The two are disambiguated on pointer up: a plain click places a note, while a drag
 * past the movement threshold performs a rectangle select instead. Notes themselves
 * call stopPropagation() on pointerdown, so this handler only ever fires for
 * clicks/drags that land on empty track background.
 *
 * @param e - The pointer event properties.
 */
function onRowsPointerDown(e: PointerEvent) {
  const { x, y } = containerRelativePos(e);
  if (x < LABEL_WIDTH) return; // ignore clicks on the sticky row-label column

  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  setUserSelect(true);

  marquee.value = {
    startX: x,
    startY: y,
    curX: x,
    curY: y,
    startClientX: e.clientX,
    startClientY: e.clientY,
    additive: e.shiftKey,
    moved: false,
    noteType: TYPES[rowIndexAtY(y)]!.key,
  };
}

/**
 * Update whichever drag interaction is in progress: note dragging, hold-note
 * resizing, and rectangle selection all funnel through this single handler.
 *
 * @param e - The pointer event properties.
 */
function onRowsPointerMove(e: PointerEvent) {
  onNoteMove(e);
  onHoldResizeRightMove(e);
  onHoldResizeLeftMove(e);

  if (!marquee.value) return;

  const { x, y } = containerRelativePos(e);
  marquee.value.curX = x;
  marquee.value.curY = y;

  if (
    Math.abs(e.clientX - marquee.value.startClientX) > 3 ||
    Math.abs(e.clientY - marquee.value.startClientY) > 3
  )
    marquee.value.moved = true;
}

/** Commit whichever interaction was in progress: note drag, hold-note resize, rectangle select, or a click-to-place. */
function onRowsPointerUp() {
  setUserSelect(false);

  onNoteUp();
  onHoldResizeRightUp();
  onHoldResizeLeftUp();

  if (!marquee.value) return;

  if (marquee.value.moved) applyMarqueeSelection();
  else if (!marquee.value.additive)
    // a normal click on empty background places a note there
    placeNoteAt(marquee.value.startX - LABEL_WIDTH, marquee.value.noteType);
  // a shift-click with no drag on empty background should not do anything

  marquee.value = null;
}

/** Select every note whose bounding box intersects the current marquee rectangle. */
function applyMarqueeSelection() {
  const m = marquee.value!;

  const trackLeft = Math.min(m.startX, m.curX) - LABEL_WIDTH;
  const trackRight = Math.max(m.startX, m.curX) - LABEL_WIDTH;
  const top = Math.min(m.startY, m.curY);
  const bottom = Math.max(m.startY, m.curY);

  const rowStart = rowIndexAtY(top);
  const rowEnd = rowIndexAtY(bottom);
  const typesInRange = new Set(
    TYPES.slice(rowStart, rowEnd + 1).map((t) => t.key),
  );

  const hits = notes.value.filter((n: Note) => {
    if (!typesInRange.has(n.type)) return false;

    const noteLeft = frameToPx(n.peakFrame - (n.chargeFrames ?? 0));
    const noteWidth =
      n.type === NoteType.HOLD
        ? frameToPx((n.chargeFrames ?? 0) + (n.holdFrames ?? 0))
        : Math.max(frameToPx(n.chargeFrames ?? 0), 32);

    return noteLeft + noteWidth >= trackLeft && noteLeft <= trackRight;
  });

  if (m.additive) {
    const next = new Set(selectedNoteIds.value);
    for (const n of hits) next.add(n.id);
    selectedNoteIds.value = next;
  } else selectedNoteIds.value = new Set(hits.map((n) => n.id));
}

/** The exported level chart in JSON format. */
const exportedChart = computed(() => {
  // TODO: use the native hex format instead of this JSON format for exporting later (spec to be defined)
  const sorted = [...notes.value].sort((a, b) => a.peakFrame - b.peakFrame);

  let prevFrame = 0;
  return sorted.map((n) => {
    const frameDelta = n.peakFrame - prevFrame;
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

/** Whether or not to show the export panel. */
const showExportPanel = ref(false);

/** The timeline scrolling container. */
const scrollElement = ref<HTMLElement>();
/** The main audio element for playback. */
const audioElement = ref<HTMLAudioElement>();

/** The currently tracked playback frame. */
const currentFrame = ref(0);

/** The ID of the animation frame loop. */
let playbackRafId = 0;

/** Calculate the current song position in GBC frames. */
function syncPlayhead() {
  if (!audioElement.value) return;

  currentFrame.value = Math.max(
    0,
    Math.round(audioElement.value.currentTime * FRAMES_PER_SECOND),
  );
  playbackRafId = requestAnimationFrame(syncPlayhead);
}

/** Start updating the timeline position when audio starts playing. */
function onPlay() {
  cancelAnimationFrame(playbackRafId); // cancel any unfreed loops
  syncPlayhead();
}

/** Stop the update loop and set the final frame position. */
function onPause() {
  cancelAnimationFrame(playbackRafId);

  if (audioElement.value)
    currentFrame.value = Math.max(
      0,
      Math.round(audioElement.value.currentTime * FRAMES_PER_SECOND),
    );
}

/** Whether or not the user is seeking the ruler through the timeline. */
let scrubbing = false;

/**
 * Seek the audio to a certain point in pixels.
 *
 * @param px - The pixel position to seek to.
 */
function seekToPx(px: number) {
  const frame = pxToFrame(px, false);
  currentFrame.value = frame;

  if (audioElement.value)
    audioElement.value.currentTime = frame / FRAMES_PER_SECOND;
}

/**
 * Start scrubbing to seek to another point in the timeline.
 *
 * @param e - The pointer event properties.
 */
function onRulerDown(e: PointerEvent) {
  scrubbing = true;

  const rect = scrollElement.value!.getBoundingClientRect();
  seekToPx(
    e.clientX - rect.left + scrollElement.value!.scrollLeft - LABEL_WIDTH,
  );
}

/**
 * Seek to the position the ruler moves to.
 *
 * @param e - The pointer event properties.
 */
function onRulerMove(e: PointerEvent) {
  if (!scrubbing) return;

  const rect = scrollElement.value!.getBoundingClientRect();
  seekToPx(
    e.clientX - rect.left + scrollElement.value!.scrollLeft - LABEL_WIDTH,
  );
}

/** Stop scrubbing via the timeline ruler. */
function onRulerUp() {
  scrubbing = false;
}

/** The grid lines array storing each line, their position in pixels, whether they are minor or major, and their frame number label. */
const gridLines = computed(() => {
  const lines: { px: number; strong: boolean; label?: string }[] = [];

  let minorStep = 6; // base frame intervals

  // This adjustment is done to prevent DOM lag when zooming out.
  // If the space between minor ticks drops below 6 pixels, scale the steps up.
  while (frameToPx(minorStep) < 6 && minorStep < totalFrames) minorStep *= 2;

  const majorStep = minorStep * 5;

  for (let f = 0; f <= totalFrames; f += minorStep) {
    const isMajor = f % majorStep === 0;

    lines.push({
      px: frameToPx(f),
      strong: isMajor,
      label: isMajor ? `f${f}` : undefined,
    });
  }

  return lines;
});

/** The possible frame snap options. */
const snapOptions = [
  { label: "1 frame", value: 1 },
  { label: "2 frames", value: 2 },
  { label: "4 frames", value: 4 },
  { label: "8 frames", value: 8 },
];

/** The height of the timeline panel, in pixels. */
const panelHeight = ref(360);

/**
 * Start resizing the timeline panel.
 *
 * @param e - The pointer event properties.
 */
function onPanelResizeDown(e: PointerEvent) {
  const startY = e.clientY;
  const origHeight = panelHeight.value;
  setUserSelect(true);

  /**
   * Move the panel based on the height.
   *
   * @param e - The pointer event properties.
   */
  function move(ev: PointerEvent) {
    panelHeight.value = Math.min(
      360,
      Math.max(240, origHeight + (startY - ev.clientY)),
    );
  }

  /** Stop listening to pointer events on the timeline panel. */
  function up() {
    setUserSelect(false);
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
  }

  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
}

/** The width, in pixels, of the note inspector inside the timeline panel. */
const inspectorWidth = ref(288);

/**
 * Start resizing the note inspector.
 *
 * @param e - The pointer event properties.
 */
function onInspectorResizeDown(e: PointerEvent) {
  const startX = e.clientX;
  const origWidth = inspectorWidth.value;
  setUserSelect(true);

  /**
   * Move the inspector based on the width.
   *
   * @param e - The pointer event properties.
   */
  function move(ev: PointerEvent) {
    inspectorWidth.value = Math.min(
      440,
      Math.max(220, origWidth + (startX - ev.clientX)),
    );
  }

  /** Stop listening to pointer events on the inspector panel. */
  function up() {
    setUserSelect(false);
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
  }

  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
}

/**
 * Check whether a keyboard event's target is a text-entry element, so shortcuts don't run while the user is typing in an input.
 *
 * @param el - The event target to check.
 *
 * @returns Whether or not the target is a typing target.
 */
function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    el.isContentEditable
  );
}

/**
 * Global keyboard shortcut handler.
 *
 * @param e - The keyboard event properties.
 */
function onKeydown(e: KeyboardEvent) {
  if (isTypingTarget(e.target)) return;

  const mod = e.ctrlKey || e.metaKey;
  const key = e.key.toLowerCase();

  if (mod && key === "z" && e.shiftKey) {
    e.preventDefault();
    redo();
    return;
  }

  if (mod && key === "z") {
    e.preventDefault();
    undo();
    return;
  }

  if (mod && key === "y") {
    e.preventDefault();
    redo();
    return;
  }

  if (mod && key === "a") {
    e.preventDefault();
    selectAllNotes();
    return;
  }

  if (mod && key === "c") {
    e.preventDefault();
    copySelected();
    return;
  }

  if (mod && key === "x") {
    e.preventDefault();
    cutSelected();
    return;
  }

  if (mod && key === "v") {
    e.preventDefault();
    pasteClipboard();
    return;
  }

  if (e.key === "Delete") {
    e.preventDefault();
    deleteSelected();
    return;
  }

  if (e.key === "+" || e.key === "=") {
    e.preventDefault();
    zoomIn();
    return;
  }

  if (e.key === "-") {
    e.preventDefault();
    zoomOut();
    return;
  }

  if (e.key === "Escape") {
    clearSelection();
    return;
  }
}

onMounted(() => window.addEventListener("keydown", onKeydown));
onUnmounted(() => window.removeEventListener("keydown", onKeydown));
</script>

<template>
  <div
    class="z-40 overflow-hidden fixed flex flex-col bottom-0 left-0 right-0"
    :style="{ height: panelHeight + 'px' }"
  >
    <!-- Timeline panel resize indicator -->
    <div
      class="cursor-row-resize shrink-0 flex justify-center items-center h-2 border-t border-default hover:bg-primary/20 bg-default"
      @pointerdown="onPanelResizeDown"
    >
      <div class="w-10 h-1 rounded-full bg-accented" />
    </div>

    <!--
      TODO: replace this placeholder song
      ... also probably don't use .mp3 and use .uge instead
      ... unless I'm not ambitious enough to figure that out
    -->
    <audio
      ref="audioElement"
      src="/wow-amazing-song.mp3"
      class="hidden"
      @play="onPlay"
      @pause="onPause"
      @seeked="onPause"
    />

    <div
      class="flex-1 flex flex-col min-h-0 border-t border-default bg-default"
    >
      <div
        class="shrink-0 flex flex-wrap items-center gap-6 px-5 py-3 border-b border-default"
      >
        <div class="flex items-center gap-2">
          <!-- Play button -->
          <UTooltip text="Play">
            <UButton
              icon="i-lucide-play"
              size="sm"
              @click="audioElement?.play()"
            />
          </UTooltip>

          <!-- Pause button -->
          <UTooltip text="Pause">
            <UButton
              icon="i-lucide-pause"
              size="sm"
              color="neutral"
              variant="soft"
              @click="audioElement?.pause()"
            />
          </UTooltip>

          <!-- Frame indicator -->
          <span class="ml-1 text-xs font-mono text-muted tabular-nums"
            >f{{ currentFrame }}</span
          >
        </div>

        <USeparator orientation="vertical" class="h-6" />

        <div class="flex items-center gap-1">
          <!-- Undo button -->
          <UTooltip text="Undo (Ctrl+Z)">
            <UButton
              icon="i-lucide-undo-2"
              size="sm"
              color="neutral"
              variant="soft"
              square
              :disabled="!undoStack.length"
              @click="undo"
            />
          </UTooltip>

          <!-- Redo button -->
          <UTooltip text="Redo (Ctrl+Shift+Z)">
            <UButton
              icon="i-lucide-redo-2"
              size="sm"
              color="neutral"
              variant="soft"
              square
              :disabled="!redoStack.length"
              @click="redo"
            />
          </UTooltip>
        </div>

        <USeparator orientation="vertical" class="h-6" />

        <div class="flex items-center gap-2">
          <span class="text-xs text-dimmed">Place</span>
          <UButton
            v-for="t in TYPES"
            :key="t.key"
            size="sm"
            class="px-3"
            :color="activeType === t.key ? 'primary' : 'neutral'"
            :variant="activeType === t.key ? 'solid' : 'ghost'"
            @click="activeType = t.key"
          >
            {{ t.label }}
          </UButton>
        </div>

        <USeparator orientation="vertical" class="h-6" />

        <div
          v-if="activeTypeMeta.directions?.length"
          class="flex items-center gap-2"
        >
          <span class="text-xs text-dimmed">Direction</span>
          <UButton
            v-for="dir in ALL_DIRECTIONS.filter((d) =>
              activeTypeMeta.directions?.includes(d.key),
            )"
            :key="dir.key"
            size="sm"
            :icon="dir.icon"
            class="px-3 gap-1.5"
            :color="activeDirection === dir.key ? 'primary' : 'neutral'"
            :variant="activeDirection === dir.key ? 'solid' : 'ghost'"
            @click="activeDirection = dir.key"
          >
            {{ dir.label }}
          </UButton>
        </div>
        <span v-else class="text-xs text-dimmed"
          >Reverse notes have no direction.</span
        >

        <div class="flex-1" />

        <span v-if="selectedNoteIds.size" class="text-xs text-dimmed">
          {{ selectedNoteIds.size }} selected
        </span>

        <div class="flex items-center gap-2">
          <span class="text-xs text-dimmed">Snap</span>
          <USelect
            v-model.number="snapFrames"
            :items="snapOptions"
            option-attribute="label"
            value-attribute="value"
            size="sm"
            class="w-28"
          />
        </div>

        <div class="flex items-center gap-1">
          <span class="mr-1 text-xs text-dimmed">Zoom</span>

          <!-- Zoom out button -->
          <UTooltip text="Zoom Out (-)">
            <UButton
              icon="i-lucide-minus"
              size="sm"
              color="neutral"
              variant="soft"
              square
              @click="zoomOut"
            />
          </UTooltip>

          <span
            class="text-center w-12 text-xs font-mono text-muted tabular-nums"
            >{{ Math.round(pixelsPerFrame * 100) }}%</span
          >

          <!-- Zoom in button -->
          <UTooltip text="Zoom In (+/=)">
            <UButton
              icon="i-lucide-plus"
              size="sm"
              color="neutral"
              variant="soft"
              square
              @click="zoomIn"
            />
          </UTooltip>
        </div>

        <UButton
          icon="i-lucide-code"
          color="neutral"
          variant="soft"
          size="sm"
          class="px-3"
          @click="showExportPanel = true"
        >
          Export
        </UButton>
      </div>

      <div class="flex-1 flex min-h-0">
        <div ref="scrollElement" class="overflow-auto relative flex-1 min-w-0">
          <div
            class="relative"
            :style="{
              width: LABEL_WIDTH + timelineWidth + 'px',
              height: RULER_HEIGHT + TYPES.length * ROW_HEIGHT + 'px',
            }"
          >
            <div class="z-30 sticky flex top-0">
              <div
                class="shrink-0 sticky left-0 border-r border-b border-default bg-default"
                :style="{
                  width: LABEL_WIDTH + 'px',
                  height: RULER_HEIGHT + 'px',
                }"
              />
              <div
                class="cursor-pointer overflow-hidden relative border-b border-default bg-default"
                :style="{
                  width: timelineWidth + 'px',
                  height: RULER_HEIGHT + 'px',
                }"
                @pointerdown="onRulerDown"
                @pointermove="onRulerMove"
                @pointerup="onRulerUp"
              >
                <div
                  v-for="(line, i) in gridLines"
                  :key="'tick-' + i"
                  class="pointer-events-none absolute bottom-0 border-l"
                  :class="
                    line.strong
                      ? 'border-default h-3 z-10'
                      : 'border-muted h-1.5 z-0'
                  "
                  :style="{ left: line.px + 'px' }"
                />
                <div
                  v-for="(line, i) in gridLines.filter((l) => l.strong)"
                  :key="'label-' + i"
                  class="pointer-events-none absolute pl-1 top-0 text-xs text-dimmed font-mono"
                  :style="{ left: line.px + 'px' }"
                >
                  {{ line.label }}
                </div>
              </div>
            </div>

            <div
              ref="rowsContainer"
              class="relative"
              @pointerdown="onRowsPointerDown"
              @pointermove="onRowsPointerMove"
              @pointerup="onRowsPointerUp"
            >
              <div v-for="t in TYPES" :key="t.key" class="flex">
                <div
                  class="z-60 shrink-0 sticky flex justify-center items-center left-0 border-r border-b border-default bg-default"
                  :style="{
                    width: LABEL_WIDTH + 'px',
                    height: ROW_HEIGHT + 'px',
                  }"
                >
                  <span class="text-xs text-toned font-medium">{{
                    t.label
                  }}</span>
                </div>

                <div
                  class="relative border-b border-default hover:bg-elevated/30"
                  :style="{
                    width: timelineWidth + 'px',
                    height: ROW_HEIGHT + 'px',
                  }"
                >
                  <div
                    v-for="(line, i) in gridLines"
                    :key="'grid-' + i"
                    class="pointer-events-none absolute top-0 bottom-0 border-l"
                    :class="
                      line.strong
                        ? 'border-default z-10'
                        : 'border-muted opacity-50 z-0'
                    "
                    :style="{ left: line.px + 'px' }"
                  />

                  <UTooltip
                    v-for="note in notes.filter((n) => n.type === t.key)"
                    :key="note.id"
                    :text="
                      note.direction !== undefined
                        ? `${getNoteTypeMetadata(note.type).label} ${getDirectionLabel(note.direction)} (f${note.peakFrame})`
                        : `${getNoteTypeMetadata(note.type).label} (f${note.peakFrame})`
                    "
                  >
                    <!-- Hold note -->
                    <div
                      v-if="note.type === NoteType.HOLD"
                      class="z-20 cursor-grab absolute top-1/2 -translate-y-1/2 h-9 active:cursor-grabbing"
                      :style="{
                        left:
                          frameToPx(note.peakFrame - note.chargeFrames) + 'px',
                        width:
                          frameToPx(note.chargeFrames + note.holdFrames!) +
                          'px',
                      }"
                    >
                      <!-- Charge section -->
                      <div
                        class="absolute inset-y-0 left-0 rounded-l-sm bg-yellow-400/25"
                        :style="{ width: frameToPx(note.chargeFrames) + 'px' }"
                      />

                      <!-- Hold section -->
                      <div
                        class="overflow-hidden absolute inset-y-0 rounded-r-md flex justify-center items-center ring-2 bg-yellow-400"
                        :class="
                          selectedNoteIds.has(note.id)
                            ? 'ring-primary'
                            : 'ring-transparent'
                        "
                        :style="{
                          left: frameToPx(note.chargeFrames!) + 'px',
                          width: frameToPx(note.holdFrames!) + 'px',
                        }"
                        @pointerdown="onNoteDown($event, note)"
                        @dblclick.stop="deleteNote(note.id)"
                      >
                        <UIcon
                          v-if="note.direction !== undefined"
                          :name="getDirectionIcon(note.direction)!"
                          class="size-3.5 text-yellow-950"
                        />

                        <div
                          class="cursor-ew-resize absolute left-0 top-0 bottom-0 w-2.5 bg-black/15 hover:bg-black/25"
                          @pointerdown.stop="onHoldResizeLeftDown($event, note)"
                        />

                        <div
                          class="cursor-ew-resize absolute right-0 top-0 bottom-0 w-2.5 bg-black/15 hover:bg-black/25"
                          @pointerdown.stop="
                            onHoldResizeRightDown($event, note)
                          "
                        />
                      </div>
                    </div>

                    <!-- Non-hold note -->
                    <div
                      v-else
                      class="cursor-grab z-20 absolute top-1/2 -translate-y-1/2 h-9 active:cursor-grabbing"
                      :style="{
                        left:
                          frameToPx(note.peakFrame - note.chargeFrames!) + 'px',
                        width:
                          Math.max(frameToPx(note.chargeFrames!), 32) + 'px',
                      }"
                      @pointerdown="onNoteDown($event, note)"
                      @dblclick.stop="deleteNote(note.id)"
                    >
                      <!-- Charge section -->
                      <div
                        class="absolute inset-y-2 left-0 right-4 rounded-l-sm"
                        :class="[
                          note.type === NoteType.TAP
                            ? 'bg-green-300/25'
                            : note.type === NoteType.REVERSE_A
                              ? 'bg-fuchsia-400/25'
                              : 'bg-indigo-400/25',
                        ]"
                      />

                      <!-- Tap note -->
                      <div
                        v-if="note.type === NoteType.TAP"
                        class="absolute flex justify-center items-center right-0 top-1/2 -translate-y-1/2 size-8 rounded-full ring-2 bg-green-300"
                        :class="
                          selectedNoteIds.has(note.id)
                            ? 'ring-primary'
                            : 'ring-transparent'
                        "
                      >
                        <UIcon
                          v-if="note.direction !== undefined"
                          :name="getDirectionIcon(note.direction)!"
                          class="size-4 text-green-950"
                        />
                      </div>

                      <!-- Reverse note -->
                      <div
                        v-else
                        class="absolute flex justify-center items-center right-0 top-1/2 -translate-y-1/2 size-8"
                      >
                        <div
                          class="absolute inset-0 rotate-45 rounded-sm ring-2"
                          :class="[
                            note.type === NoteType.REVERSE_A
                              ? 'bg-fuchsia-400'
                              : 'bg-indigo-400',
                            selectedNoteIds.has(note.id)
                              ? 'ring-primary'
                              : 'ring-transparent',
                          ]"
                        />
                        <span class="relative text-xs text-white font-bold">{{
                          getReverseNoteLetter(note.type)
                        }}</span>
                      </div>
                    </div>
                  </UTooltip>
                </div>
              </div>

              <!-- Rectangle selection -->
              <div
                v-if="marquee && marquee.moved"
                class="pointer-events-none z-40 absolute border border-primary bg-primary/10"
                :style="{
                  left: Math.min(marquee.startX, marquee.curX) + 'px',
                  top: Math.min(marquee.startY, marquee.curY) + 'px',
                  width: Math.abs(marquee.curX - marquee.startX) + 'px',
                  height: Math.abs(marquee.curY - marquee.startY) + 'px',
                }"
              />
            </div>

            <div
              class="pointer-events-none z-50 absolute w-px bg-error"
              :style="{
                left: LABEL_WIDTH + frameToPx(currentFrame) + 'px',
                top: RULER_HEIGHT + 'px',
                bottom: 0,
              }"
            >
              <div class="-ml-1.5 -mt-1.5 rotate-45 size-3 bg-error" />
            </div>
          </div>
        </div>

        <!-- Inspector panel -->
        <div
          v-if="selectedNote || selectedNoteIds.size > 1"
          class="shrink-0 flex"
        >
          <div
            class="cursor-col-resize w-1.5 border-l border-default hover:bg-primary/20"
            @pointerdown="onInspectorResizeDown"
          />
          <div
            class="overflow-y-auto p-5 space-y-5"
            :style="{ width: inspectorWidth + 'px' }"
          >
            <template v-if="selectedNote">
              <div class="flex justify-between items-center">
                <span class="text-sm font-medium"
                  >{{ getNoteTypeMetadata(selectedNote.type).label }} Note</span
                >
                <!-- Delete button -->
                <UTooltip text="Delete Note (Delete)">
                  <UButton
                    icon="i-lucide-trash-2"
                    color="error"
                    variant="ghost"
                    size="xs"
                    @click="deleteNote(selectedNote.id)"
                  />
                </UTooltip>
              </div>

              <!-- Direction -->
              <div
                v-if="getNoteTypeMetadata(selectedNote.type).directions?.length"
              >
                <label class="block mb-1.5 text-xs text-dimmed font-medium"
                  >Direction</label
                >
                <USelect
                  v-model="selectedNote.direction"
                  :items="
                    ALL_DIRECTIONS.filter((d) =>
                      getNoteTypeMetadata(
                        selectedNote!.type,
                      ).directions?.includes(d.key),
                    ).map((d) => ({ label: d.label, value: d.key }))
                  "
                  option-attribute="label"
                  value-attribute="value"
                  class="w-full"
                />
              </div>

              <!-- Note position -->
              <div class="grid grid-cols-2 gap-4">
                <!-- Grid X -->
                <div>
                  <label class="block mb-1.5 text-xs text-dimmed font-medium"
                    >Grid X</label
                  >
                  <UInputNumber
                    v-model="selectedNote.gridX"
                    :min="0"
                    :max="GRID_COLS"
                    class="w-full"
                  />
                </div>

                <!-- Grid Y -->
                <div>
                  <label class="block mb-1.5 text-xs text-dimmed font-medium"
                    >Grid Y</label
                  >
                  <UInputNumber
                    v-model="selectedNote.gridY"
                    :min="0"
                    :max="GRID_ROWS"
                    class="w-full"
                  />
                </div>
              </div>

              <!-- Start/peak frame -->
              <div>
                <label class="block mb-1.5 text-xs text-dimmed font-medium">
                  {{
                    selectedNote.type === NoteType.HOLD
                      ? "Start Frame"
                      : "Peak Frame"
                  }}
                </label>
                <UInputNumber
                  v-model="selectedNote.peakFrame"
                  :min="0"
                  class="w-full"
                />
              </div>

              <!-- Charge frames -->
              <div>
                <label class="block mb-1.5 text-xs text-dimmed font-medium"
                  >Charge Frames</label
                >
                <UInputNumber
                  v-model="selectedNote.chargeFrames"
                  :min="1"
                  class="w-full"
                />
              </div>

              <!-- Hold frames -->
              <div v-if="selectedNote.type === NoteType.HOLD">
                <label class="block mb-1.5 text-xs text-dimmed font-medium"
                  >Hold Frames</label
                >
                <UInputNumber
                  v-model="selectedNote.holdFrames"
                  :min="1"
                  class="w-full"
                />
              </div>
            </template>

            <template v-else>
              <!-- Multiple selected notes -->
              <div class="flex justify-between items-center">
                <span class="text-sm font-medium"
                  >{{ selectedNoteIds.size }} Notes Selected</span
                >
                <UButton
                  icon="i-lucide-trash-2"
                  color="error"
                  variant="ghost"
                  size="xs"
                  @click="deleteSelected"
                />
              </div>
              <p class="text-xs text-dimmed">
                Drag any of the selected notes to move them together. Press
                Delete to remove them, Ctrl+C / Ctrl+X to copy or cut, and
                Ctrl+V to paste at the playhead.
              </p>
            </template>
          </div>
        </div>
      </div>
    </div>

    <USlideover v-model:open="showExportPanel" title="Exported Chart Data">
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
    </USlideover>
  </div>
</template>
