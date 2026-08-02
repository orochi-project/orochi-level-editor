import {
  pxDeltaToFrame,
  containerRelativePos,
  rowIndexAtY,
  frameToPx,
} from "~~/utils/timeline";

export function useTimelineInteractions(
  rowsContainer: Ref<HTMLElement | undefined>,
) {
  const beatmapState = useBeatmapStateStore();
  const timelineUi = useTimelineUiStore();
  const timelineHistory = useTimelineHistoryStore();

  /** Information about notes currently being dragged across the timeline. */
  const dragging = ref<{
    /** The peak frame of each dragged note at the start of the drag, keyed by note ID. */
    origFrames: Map<string, number>;
    /** The client x-position when dragging started. */
    startClientX: number;
    /** Whether or not the notes moved enough to count as a drag instead of a click. */
    moved: boolean;
    /** Modifier keys when the pointer was pressed. */
    modifiers: {
      /** Whether or not the shift key is being held. */
      shiftKey: boolean;
      /** Whether or not the meta key is being held. */
      metaKey: boolean;
      /** Whether or not the control key is being held. */
      ctrlKey: boolean;
    };
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
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    const idsToMove = timelineUi.selectedNoteIds.has(note.id)
      ? timelineUi.selectedNoteIds
      : new Set([note.id]);

    const origFrames = new Map<string, number>();
    for (const id of idsToMove) {
      const n = beatmapState.notes.find((nn: Note) => nn.id === id);
      if (n) origFrames.set(id, n.peakFrame);
    }

    dragging.value = {
      origFrames,
      startClientX: e.clientX,
      moved: false,
      modifiers: {
        shiftKey: e.shiftKey,
        metaKey: e.metaKey,
        ctrlKey: e.ctrlKey,
      },
      snapshot: timelineHistory.cloneNotes(beatmapState.notes),
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

    const delta = pxDeltaToFrame(
      e.clientX - dragging.value.startClientX,
      timelineUi.pixelsPerFrame,
      timelineUi.snapFrames,
    );

    for (const [id, origFrame] of dragging.value.origFrames) {
      const n = beatmapState.notes.find((nn: Note) => nn.id === id);
      if (n)
        Object.assign(
          n,
          timelineHistory.clampNoteToTimeline({
            ...n,
            peakFrame: origFrame + delta,
          }),
        );
    }
  }

  /**
   * End note dragging.
   *
   * Records the interaction to the undo stack if anything actually moved.
   */
  function onNoteUp() {
    if (!dragging.value) return;

    const drag = dragging.value;

    if (drag.moved) {
      timelineHistory.pushUndoSnapshot(drag.snapshot);
    } else {
      const noteId = [...drag.origFrames.keys()][0]!;

      if (
        drag.modifiers.shiftKey ||
        drag.modifiers.metaKey ||
        drag.modifiers.ctrlKey
      )
        timelineUi.toggleSelect(noteId);
      else timelineUi.selectOnly(noteId);
    }

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

    resizingRight.value = {
      note,
      startX: e.clientX,
      origHold: note.holdFrames ?? 0,
      moved: false,
      snapshot: timelineHistory.cloneNotes(beatmapState.notes),
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
    const delta = pxDeltaToFrame(
      e.clientX - startX,
      timelineUi.pixelsPerFrame,
      timelineUi.snapFrames,
    );
    const newHold = Math.max(timelineUi.snapFrames, origHold + delta);

    if (newHold !== note.holdFrames) resizingRight.value.moved = true;

    Object.assign(
      note,
      timelineHistory.clampNoteToTimeline({
        ...note,
        holdFrames: newHold,
      }),
    );
  }

  /**
   * End hold note resizing from the right edge.
   *
   * Records it to the undo stack if it actually changed anything.
   */
  function onHoldResizeRightUp() {
    if (resizingRight.value?.moved)
      timelineHistory.pushUndoSnapshot(resizingRight.value.snapshot);
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

    resizingLeft.value = {
      note,
      startX: e.clientX,
      origStart: note.peakFrame,
      origHold: note.holdFrames ?? 0,
      moved: false,
      snapshot: timelineHistory.cloneNotes(beatmapState.notes),
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

    const delta = pxDeltaToFrame(
      e.clientX - startX,
      timelineUi.pixelsPerFrame,
      timelineUi.snapFrames,
    );
    const end = origStart + origHold;
    const newStart = Math.max(
      0,
      Math.min(end - timelineUi.snapFrames, origStart + delta),
    );

    if (newStart !== note.peakFrame) resizingLeft.value.moved = true;

    Object.assign(
      note,
      timelineHistory.clampNoteToTimeline({
        ...note,
        peakFrame: newStart,
        holdFrames: end - newStart,
      }),
    );
  }

  /**
   * End hold note resizing from the left edge.
   *
   * Records it to the undo stack if it actually changed anything.
   */
  function onHoldResizeLeftUp() {
    if (resizingLeft.value?.moved)
      timelineHistory.pushUndoSnapshot(resizingLeft.value.snapshot);
    resizingLeft.value = null;
  }

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
   * Start either a rectangle selection or a click-to-place note interaction.
   *
   * A plain click places a note, while a drag past the movement threshold activates a rectangle select instead.
   * Notes themselves call stopPropagation() on pointerdown, so this should only fire for clicks/drags on empty track background.
   *
   * @param e - The pointer event properties.
   */
  function onRowsPointerDown(e: PointerEvent) {
    if (!rowsContainer.value) return;
    const { x, y } = containerRelativePos(e, rowsContainer.value);

    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

    marquee.value = {
      startX: x,
      startY: y,
      curX: x,
      curY: y,
      startClientX: e.clientX,
      startClientY: e.clientY,
      additive: e.shiftKey,
      moved: false,
      noteType: NOTE_TYPES[rowIndexAtY(y)]!.key,
    };
  }

  /**
   * Update whichever drag interaction is in progress: note dragging, hold-note resizing, and rectangle selection all go through this.
   *
   * @param e - The pointer event properties.
   */
  function onRowsPointerMove(e: PointerEvent) {
    onNoteMove(e);
    onHoldResizeRightMove(e);
    onHoldResizeLeftMove(e);

    if (!marquee.value || !rowsContainer.value) return;

    const { x, y } = containerRelativePos(e, rowsContainer.value);
    marquee.value.curX = x;
    marquee.value.curY = y;

    if (
      Math.abs(e.clientX - marquee.value.startClientX) > 3 ||
      Math.abs(e.clientY - marquee.value.startClientY) > 3
    )
      marquee.value.moved = true;
  }

  /**
   * Commit whichever interaction was in progress.
   *
   * Could be a note drag, hold-note resize, rectangle select, or a click-to-place.
   */
  function onRowsPointerUp() {
    onNoteUp();
    onHoldResizeRightUp();
    onHoldResizeLeftUp();

    if (!marquee.value) return;

    if (marquee.value.moved) applyMarqueeSelection();
    else if (!marquee.value.additive)
      // a normal click on empty background places a note there
      timelineHistory.placeNoteAt(
        marquee.value.startX,
        marquee.value.noteType,
        timelineUi.directionForType(marquee.value.noteType),
      );
    // a shift-click with no drag on empty background should not do anything

    marquee.value = null;
  }

  /** Select every note whose bounding box intersects the current marquee rectangle. */
  function applyMarqueeSelection() {
    const m = marquee.value!;

    const trackLeft = Math.min(m.startX, m.curX);
    const trackRight = Math.max(m.startX, m.curX);
    const top = Math.min(m.startY, m.curY);
    const bottom = Math.max(m.startY, m.curY);

    const rowStart = rowIndexAtY(top);
    const rowEnd = rowIndexAtY(bottom);
    const typesInRange = new Set(
      NOTE_TYPES.slice(rowStart, rowEnd + 1).map((t) => t.key),
    );

    const hits = beatmapState.notes.filter((n: Note) => {
      if (!typesInRange.has(n.type)) return false;

      const noteLeft = frameToPx(
        n.peakFrame - (n.chargeFrames ?? 0),
        timelineUi.pixelsPerFrame,
      );
      const noteWidth =
        n.type === NoteType.HOLD
          ? frameToPx(
              (n.chargeFrames ?? 0) + (n.holdFrames ?? 0),
              timelineUi.pixelsPerFrame,
            )
          : Math.max(
              frameToPx(n.chargeFrames ?? 0, timelineUi.pixelsPerFrame),
              32,
            );

      return noteLeft + noteWidth >= trackLeft && noteLeft <= trackRight;
    });

    if (m.additive) {
      const next = new Set(timelineUi.selectedNoteIds);
      for (const n of hits) next.add(n.id);
      timelineUi.selectedNoteIds = next;
    } else timelineUi.selectedNoteIds = new Set(hits.map((n) => n.id));
  }

  return {
    marquee,
    onNoteDown,
    onHoldResizeLeftDown,
    onHoldResizeRightDown,
    onRowsPointerDown,
    onRowsPointerMove,
    onRowsPointerUp,
  };
}
