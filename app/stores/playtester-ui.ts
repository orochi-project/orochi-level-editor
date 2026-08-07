export const usePlaytesterUiStore = defineStore("playtesterUi", () => {
  /** Whether or not the grid overlay is visible. */
  const showGrid = ref(true);

  return { showGrid };
});
