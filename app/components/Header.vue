<script setup lang="ts">
import type { DropdownMenuItem } from "@nuxt/ui";

const beatmapState = useBeatmapStateStore();

const menuBarItems = computed<{ label: string; options: DropdownMenuItem[] }[]>(
  () => [
    {
      label: "File",
      options: [
        { label: "Import Map", kbds: ["Ctrl", "O"] },
        { label: "Export Map", kbds: ["Ctrl", "Shift", "S"] },

        { type: "separator" },

        { label: "Import Song", kbds: ["Ctrl", "I"], onSelect: triggerImport },
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
const fileInput = ref<HTMLInputElement>();

/** Trigger a file import dialog. */
function triggerImport() {
  fileInput.value?.click();
}

/**
 * Import a new audio file.
 *
 * @param e - The event properties.
 */
function onFileSelected(e: Event) {
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
  "Ctrl+I": triggerImport,
});
</script>

<template>
  <UHeader>
    <input
      ref="fileInput"
      type="file"
      accept="audio/*"
      class="hidden"
      @change="onFileSelected"
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
