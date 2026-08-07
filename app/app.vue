<script setup lang="ts">
const beatmapFile = useBeatmapFileStore();

useHead({
  meta: [{ name: "viewport", content: "width=device-width, initial-scale=1" }],
  link: [{ rel: "icon", href: "/favicon.ico" }],
  htmlAttrs: {
    lang: "en",
  },
});

const title = "Yamata";
const description = "The official beatmap editor for the Orochi rhythm game.";

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
});

/** A button to display on the model. */
interface ModalButton {
  label: string;
  color?:
    | "primary"
    | "secondary"
    | "success"
    | "info"
    | "warning"
    | "error"
    | "neutral";
  callback: () => any;
}

const modalOpen = ref<boolean>(false);
const modalTitle = ref<string>();
const modalDescription = ref<string>();
const modalBody = ref<string>();
const modalButtons = ref<ModalButton[]>();

/**
 * Display a modal with a title, description, body, and a list of buttons.
 *
 * @param title - The modal title.
 * @param description - The modal description (under the title).
 * @param body - The modal body text (under the heading).
 * @param buttons - The modal buttons.
 */
function showModal(
  title?: string,
  description?: string,
  body?: string,
  buttons?: ModalButton[],
) {
  modalOpen.value = true;
  modalTitle.value = title ?? "";
  modalDescription.value = description ?? "";
  modalBody.value = body ?? "";
  modalButtons.value = buttons ?? [];
}

onMounted(async () => {
  if (!beatmapFile.supported) {
    showModal(
      "Browser Restrictions",
      undefined,
      "Your browser does not support reading/writing directly to the file system. You can still manually import and save beatmaps.",
      [
        {
          label: "Understood!",
          color: "primary",
          callback: () => (modalOpen.value = false),
        },
      ],
    );
    return;
  }

  await beatmapFile.restoreHandle();
});
</script>

<template>
  <UApp>
    <UModal
      v-model:open="modalOpen"
      :title="modalTitle"
      :description="modalDescription"
      :ui="{ footer: 'justify-end' }"
    >
      <template #body>
        <p v-if="modalBody">{{ modalBody }}</p>
      </template>

      <template #footer>
        <UButton
          v-for="button in modalButtons"
          :key="button.label"
          :label="button.label"
          :color="button.color"
          @click="button.callback"
        />
      </template>
    </UModal>
    <NuxtPage />
  </UApp>
</template>
