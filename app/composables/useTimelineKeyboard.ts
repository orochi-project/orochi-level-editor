export function useTimelineKeyboard() {
  const timelineUi = useTimelineUiStore();
  const timelineHistory = useTimelineHistoryStore();

  defineShortcuts({
    meta_z: timelineHistory.undo,
    meta_y: timelineHistory.redo,
    meta_x: timelineHistory.cutSelected,
    meta_c: timelineHistory.copySelected,
    meta_v: timelineHistory.pasteClipboard,
    meta_a: timelineUi.selectAllNotes,
    delete: timelineHistory.deleteSelected,
    "+": timelineUi.zoomIn,
    "=": timelineUi.zoomIn,
    "-": timelineUi.zoomOut,
    escape: timelineUi.clearSelection,
  });
}
