<script setup lang="ts">
/** A heading with a two-colour effect: the words between *asterisks* are shown in the accent colour (a banner title of the admin panel works the same way). */
const props = defineProps<{ text: string | null | undefined; accentClass?: string }>()
const parts = computed(() => {
  const out: { text: string; accent: boolean }[] = []
  const re = /\*([^*]+)\*/g
  const text = props.text ?? ''
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    if (m.index > last) out.push({ text: text.slice(last, m.index), accent: false })
    out.push({ text: m[1], accent: true })
    last = m.index + m[0].length
  }
  if (last < text.length) out.push({ text: text.slice(last), accent: false })
  return out
})
</script>

<template>
  <template v-for="(p, i) in parts" :key="i"><span v-if="p.accent" :class="accentClass ?? 'text-accent'">{{ p.text }}</span><template v-else>{{ p.text }}</template></template>
</template>
