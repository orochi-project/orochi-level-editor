export function useTimelineKeyboard(currentFrame: Ref<number>) {
  const timelineUi = useTimelineUiStore();
  const timelineHistory = useTimelineHistoryStore();

  /**
   * Check whether a keyboard event's target is a text-input element.
   *
   * Stops shortcuts from running while the user is typing in an input.
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
   * Handle keyboard shortcuts.
   *
   * @param e - The keyboard event properties.
   */
  function onKeydown(e: KeyboardEvent) {
    if (isTypingTarget(e.target)) return;

    const mod = e.ctrlKey || e.metaKey;
    const key = e.key.toLowerCase();

    if (mod && key === "z" && e.shiftKey) {
      e.preventDefault();
      timelineHistory.redo();
      return;
    }

    if (mod && key === "z") {
      e.preventDefault();
      timelineHistory.undo();
      return;
    }

    if (mod && key === "y") {
      e.preventDefault();
      timelineHistory.redo();
      return;
    }

    if (mod && key === "a") {
      e.preventDefault();
      timelineUi.selectAllNotes();
      return;
    }

    if (mod && key === "c") {
      e.preventDefault();
      timelineHistory.copySelected();
      return;
    }

    if (mod && key === "x") {
      e.preventDefault();
      timelineHistory.cutSelected();
      return;
    }

    if (mod && key === "v") {
      e.preventDefault();
      timelineHistory.pasteClipboard(currentFrame.value);
      return;
    }

    if (e.key === "Delete") {
      e.preventDefault();
      timelineHistory.deleteSelected();
      return;
    }

    if (e.key === "+" || e.key === "=") {
      e.preventDefault();
      timelineUi.zoomIn();
      return;
    }

    if (e.key === "-") {
      e.preventDefault();
      timelineUi.zoomOut();
      return;
    }

    if (e.key === "Escape") {
      timelineUi.clearSelection();
      return;
    }
  }

  onMounted(() => window.addEventListener("keydown", onKeydown));
  onUnmounted(() => window.removeEventListener("keydown", onKeydown));
}
