<script setup lang="ts">
/** Simple, self-drawn marks for the social platforms of the admin panel (no external icon font, nothing downloaded). */
defineProps<{ platform: string; size?: number }>()
</script>

<template>
  <svg :width="size ?? 18" :height="size ?? 18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
    <!-- facebook -->
    <path v-if="platform === 'facebook'" d="M13.5 21v-7.6h2.6l.4-3h-3V8.5c0-.9.3-1.5 1.5-1.5h1.6V4.3c-.3 0-1.2-.1-2.3-.1-2.3 0-3.8 1.4-3.8 3.9v2.3H7.9v3h2.6V21h3z" />
    <!-- instagram -->
    <g v-else-if="platform === 'instagram'" fill="none" stroke="currentColor" stroke-width="1.9"><rect x="3.5" y="3.5" width="17" height="17" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" /></g>
    <!-- youtube -->
    <g v-else-if="platform === 'youtube'"><path d="M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.3 5 12 5 12 5s-6.3 0-7.8.4A2.5 2.5 0 0 0 2.4 7.2C2 8.7 2 12 2 12s0 3.3.4 4.8a2.5 2.5 0 0 0 1.8 1.8C5.7 19 12 19 12 19s6.3 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8c.4-1.5.4-4.8.4-4.8s0-3.3-.4-4.8z" /><path d="M10 15l5-3-5-3z" fill="var(--c-footer, #04494c)" /></g>
    <!-- tiktok -->
    <path v-else-if="platform === 'tiktok'" d="M16.6 3h-2.8v11.3a2.5 2.5 0 1 1-2.5-2.5c.3 0 .5 0 .7.1V9a5.4 5.4 0 1 0 4.6 5.3V8.6a6.6 6.6 0 0 0 3.8 1.2V7.1A3.9 3.9 0 0 1 16.6 3z" />
    <!-- whatsapp -->
    <g v-else-if="platform === 'whatsapp'"><path d="M12 3a9 9 0 0 0-7.7 13.6L3 21l4.5-1.2A9 9 0 1 0 12 3zm0 1.8a7.2 7.2 0 1 1-3.7 13.4l-.3-.2-2.6.7.7-2.5-.2-.3A7.2 7.2 0 0 1 12 4.8z" /><path d="M9 8.5c.2-.4.4-.4.6-.4h.5c.2 0 .4 0 .5.4l.7 1.7c0 .2 0 .3-.1.5l-.4.5c-.1.1-.2.3 0 .5.5.9 1.4 1.7 2.5 2.1.2.1.4 0 .5-.1l.6-.7c.1-.2.3-.2.5-.1l1.6.8c.2.1.3.2.3.4 0 .5-.3 1.2-.9 1.5-.6.3-1.4.4-2.6 0-2.4-.8-4.1-2.6-4.8-4.4-.3-.9-.1-1.8.4-2.3z" /></g>
    <!-- x / twitter -->
    <path v-else-if="platform === 'x'" d="M17.7 3.5h2.9l-6.3 7.2 7.4 9.8h-5.8l-4.5-5.9-5.2 5.9H3.3l6.7-7.7-7.1-9.3h5.9l4.1 5.4 4.8-5.4zm-1 15.3h1.6L7.5 5.1H5.8l10.9 13.7z" />
    <!-- pinterest -->
    <path v-else-if="platform === 'pinterest'" d="M12 3a9 9 0 0 0-3.3 17.4c-.1-.7-.1-1.8 0-2.6l1-4.2s-.3-.5-.3-1.3c0-1.2.7-2.1 1.6-2.1.7 0 1.1.6 1.1 1.2 0 .7-.5 1.8-.7 2.8-.2.8.4 1.5 1.2 1.5 1.5 0 2.6-1.6 2.6-3.9 0-2-1.5-3.5-3.6-3.5a3.7 3.7 0 0 0-3.9 3.7c0 .7.3 1.5.6 1.9.1.1.1.2.1.3l-.2 1c0 .2-.1.2-.3.1-1-.5-1.6-2-1.6-3.2 0-2.6 1.9-5 5.5-5 2.9 0 5.1 2.1 5.1 4.8 0 2.9-1.8 5.2-4.3 5.2-.8 0-1.6-.4-1.9-1l-.5 2c-.2.7-.7 1.6-1 2.1A9 9 0 1 0 12 3z" />
    <!-- linkedin -->
    <path v-else-if="platform === 'linkedin'" d="M5.2 8.7h3V19h-3V8.7zM6.7 4a1.7 1.7 0 1 1 0 3.5 1.7 1.7 0 0 1 0-3.5zM10.3 8.7h2.9v1.4c.4-.8 1.5-1.7 3-1.7 3.2 0 3.8 2.1 3.8 4.8V19h-3v-5c0-1.2 0-2.7-1.7-2.7s-1.9 1.3-1.9 2.6V19h-3V8.7z" />
    <!-- any other site -->
    <g v-else fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17M12 3.5c2.5 2.6 3.5 5.4 3.5 8.5s-1 5.9-3.5 8.5c-2.5-2.6-3.5-5.4-3.5-8.5s1-5.9 3.5-8.5z" /></g>
  </svg>
</template>
