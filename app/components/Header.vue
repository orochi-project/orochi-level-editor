<script setup lang="ts">
import type { DropdownMenuItem } from "@nuxt/ui";

const menuBarItems = computed<{ label: string; options: DropdownMenuItem[] }[]>(
  () => [
    {
      label: "File",
      options: [
        { label: "Import Map", kbds: ["Ctrl", "O"] },
        { label: "Export Map", kbds: ["Ctrl", "Shift", "S"] },

        { type: "separator" },

        { label: "Import Song", kbds: ["Ctrl", "I"] },
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
</script>

<template>
  <UHeader>
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
      <UColorModeButton />

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
