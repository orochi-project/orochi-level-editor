export function useTimelineKeyboard(currentFrame: Ref<number>) {
  const timelineUi = useTimelineUiStore();
  const timelineHistory = useTimelineHistoryStore();

  defineShortcuts({
    meta_shift_z: timelineHistory.redo,
    meta_z: timelineHistory.undo,
    meta_y: timelineHistory.redo,
    meta_a: timelineUi.selectAllNotes,
    meta_c: timelineHistory.copySelected,
    meta_x: timelineHistory.cutSelected,
    meta_v: () => timelineHistory.pasteClipboard(currentFrame.value),
    delete: timelineHistory.deleteSelected,
    "+": timelineUi.zoomIn,
    "=": timelineUi.zoomIn,
    "-": timelineUi.zoomOut,
    escape: timelineUi.clearSelection,
  });
}
