<script setup lang="ts">
import type { DropdownMenuItem } from "@nuxt/ui";

const beatmapFile = useBeatmapFileStore();
const beatmapState = useBeatmapStateStore();

const menuBarItems = computed<{ label: string; options: DropdownMenuItem[] }[]>(
  () => [
    {
      label: "File",
      options: [
        {
          label: "Open",
          kbds: ["Ctrl", "O"],
          onSelect: beatmapFile.openBeatmap,
        },

        { type: "separator" },

        {
          label: "Save",
          kbds: ["Ctrl", "S"],
          onSelect: beatmapFile.saveBeatmap,
        },
        { label: "Export (GBDK .c)", kbds: ["Ctrl", "Shift", "S"] },

        { type: "separator" },

        {
          label: "Import Song",
          kbds: ["Ctrl", "I"],
          onSelect: triggerAudioImport,
        },
      ],
    },
    {
      label: "Edit",
      options: [
        { label: "Undo", kbds: ["Ctrl", "Z"] },
        { label: "Redo", kbds: ["Ctrl", "Y"] },

        { type: "separator" },

        { label: "Cut", kbds: ["Ctrl", "X"] },
        { label: "Copy", kbds: ["Ctrl", "C"] },
        { label: "Paste", kbds: ["Ctrl", "V"] },

        { type: "separator" },

        { label: "Delete", kbds: ["Del"] },
        { label: "Select All", kbds: ["Ctrl", "A"] },
      ],
    },
    {
      label: "View",
      options: [
        { label: "Zoom In", kbds: ["Ctrl", "+"] },
        { label: "Zoom Out", kbds: ["Ctrl", "-"] },

        { type: "separator" },

        { label: "Show Timeline", kbds: ["T"] },
      ],
    },
  ],
);

/** The audio file input. */
const audioFileInput = ref<HTMLInputElement>();

/** Trigger a file import dialog. */
function triggerAudioImport() {
  audioFileInput.value?.click();
}

/**
 * Import a new audio file.
 *
 * @param e - The event properties.
 */
function onAudioFileSelected(e: Event) {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];

  if (file) {
    if (beatmapState.audioSource?.startsWith("blob:"))
      URL.revokeObjectURL(beatmapState.audioSource); // clean up old

    beatmapState.audioSource = URL.createObjectURL(file);
    beatmapState.audioFile = file;
  }

  target.value = ""; // reset
}

defineShortcuts({
  meta_o: () => beatmapFile.openBeatmap(),
  meta_s: () => beatmapFile.saveBeatmap(),
  meta_i: triggerAudioImport,
});
</script>

<template>
  <UHeader>
    <input
      ref="audioFileInput"
      type="file"
      accept="audio/*"
      class="hidden"
      @change="onAudioFileSelected"
    />

    <template #left>
      <UDropdownMenu
        v-for="item in menuBarItems"
        :items="item.options"
        content-orientation="vertical"
      >
        <UButton
          size="md"
          :label="item.label"
          color="neutral"
          variant="ghost"
        />
      </UDropdownMenu>
    </template>

    <template #right>
      <UTooltip text="Toggle Theme">
        <UColorModeButton />
      </UTooltip>

      <UTooltip text="Open on GitHub">
        <UButton
          color="neutral"
          variant="ghost"
          to="https://github.com/orochi-project"
          target="_blank"
          icon="i-simple-icons-github"
          aria-label="GitHub"
        />
      </UTooltip>
    </template>
  </UHeader>
</template>
