export const usePlaytesterUiStore = defineStore("playtesterUi", () => {
  /** Whether or not the grid overlay is visible. */
  const showGrid = ref(true);

  /** Whether or not the toolbar is open. */
  const toolbarOpen = ref(true);

  return { showGrid, toolbarOpen };
});
