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

  /**
   * The currently selected direction for each note type that supports directions.
   *
   * Keyed by NoteType so that, for example, Tap and Hold rows can each have their own independently-selected direction at the same time.
   */
  const directionByType = reactive<Partial<Record<NoteType, Direction>>>({});

  /**
   * Get the currently selected direction for a given note type, falling back
   * to that type's first allowed direction if none has been chosen yet.
   *
   * @param type - The note type to get the direction for.
   *
   * @returns The direction of the note type.
   */
  function directionForType(type: NoteType): Direction | undefined {
    const allowed = getNoteTypeMetadata(type).directions;
    if (!allowed?.length) return undefined;
    return directionByType[type] && allowed.includes(directionByType[type]!)
      ? directionByType[type]
      : allowed[0];
  }

  /**
   * Set the currently selected direction for a given note type.
   *
   * @param type - The note type to set the direction for.
   * @param direction - The direction to select.
   */
  function setDirectionForType(type: NoteType, direction: Direction) {
    const allowed = getNoteTypeMetadata(type).directions;
    if (!allowed?.includes(direction)) return;
    directionByType[type] = direction;
  }

  /** The direction to use when placing a note of the currently active type. */
  const activeDirection = computed(() => directionForType(activeType.value));

  /**
   * The IDs of all currently selected notes.
   *
   * Allows for multi-select via Shift/Ctrl-click or rectangle select.
   */
  const selectedNoteIds = ref<Set<string>>(new Set());

  /** The single selected note.
   *
   * Used for the inspector panel when exactly one note is selected.
   */
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
    directionForType,
    setDirectionForType,
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
