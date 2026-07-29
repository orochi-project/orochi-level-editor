import { getNoteTypeMetadata } from "~~/utils/timeline";

export const useTimelineUiStore = defineStore("timelineUi", () => {
  const beatmapState = useBeatmapStateStore();

  /** The number of pixels for each frame on the timeline track (a.k.a. the zoom factor). */
  const pixelsPerFrame = ref(1);
  /** The nearest multiple of frames that notes snap to when placed or dragged along the timeline. */
  const snapFrames = ref(4);

  /** The currently selected type in the timeline toolbar. */
  const activeType = ref<NoteType>(NoteType.TAP);
  /** Properties of the currently selected type. */
  const activeTypeMeta = computed(() => getNoteTypeMetadata(activeType.value));
  /** The currently selected direction in the timeline toolbar. */
  const activeDirection = ref<Direction>(Direction.LEFT);

  // When the currently active type changes (by user input), we should update the currently selected direction to the first allowed direction of the newly selected note type.
  watch(activeType, (noteType) => {
    const allowedDirections = getNoteTypeMetadata(noteType).directions;
    if (
      allowedDirections?.length &&
      !allowedDirections.includes(activeDirection.value)
    )
      activeDirection.value = allowedDirections[0]!;
  });

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
    return beatmapState.notes.find((n: Note) => n.id === id) ?? null;
  });

  /** The full list of currently selected note objects. */
  const selectedNotesList = computed(() =>
    beatmapState.notes.filter((n: Note) => selectedNoteIds.value.has(n.id)),
  );

  /** Increase the pixelsPerFrame value to zoom in horizontally in the timeline. */
  function zoomIn() {
    pixelsPerFrame.value = Math.min(
      4,
      +(pixelsPerFrame.value + 0.2).toFixed(2),
    );
  }

  /** Decrease the pixelsPerFrame value to zoom out horizontally in the timeline. */
  function zoomOut() {
    pixelsPerFrame.value = Math.max(
      0.2,
      +(pixelsPerFrame.value - 0.2).toFixed(2),
    );
  }

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
    selectedNoteIds.value = new Set(beatmapState.notes.map((n: Note) => n.id));
  }

  return {
    pixelsPerFrame,
    snapFrames,
    activeType,
    activeTypeMeta,
    activeDirection,
    selectedNoteIds,
    selectedNote,
    selectedNotesList,
    zoomIn,
    zoomOut,
    selectOnly,
    toggleSelect,
    clearSelection,
    selectAllNotes,
  };
});
