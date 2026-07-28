<script setup lang="ts">
import type { DropdownMenuItem } from "@nuxt/ui";

const menuBarItems = computed<{ label: string; options: DropdownMenuItem[] }[]>(
  () => [
    {
      label: "File",
      options: [{ label: "Import Map" }, { label: "Export Map" }],
    },
    {
      label: "Edit",
      options: [
        { label: "Undo" },
        { label: "Redo" },
        { label: "Cut" },
        { label: "Copy" },
        { label: "Paste" },
        { label: "Delete" },
        { label: "Select All" },
      ],
    },
    {
      label: "View",
      options: [
        { label: "Zoom In" },
        { label: "Zoom Out" },
        { label: "Show Timeline" },
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
