<script setup lang="ts">
/** The thin bar above the header (Settings → Store: Announcement bar and its text). Shown only when the admin switched it on and gave it a text. */
const { settings } = useSettings()
const bar = computed(() => settings.value?.announcement)
</script>

<template>
  <div v-if="bar?.enabled && bar.text" class="bg-footer text-white" data-testid="announcement-bar">
    <p class="container-page py-2 text-center text-[11px] font-semibold uppercase leading-snug tracking-[0.16em] sm:text-[12px] sm:tracking-[0.2em]">{{ bar.text }}</p>
  </div>
</template>
