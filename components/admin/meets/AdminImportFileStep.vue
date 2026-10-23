<template>
  <!-- Step 1 — pick a file. -->
  <section class="rounded-md border border-surface-200 p-4 md:p-5 mb-6">
    <div class="flex flex-wrap items-center gap-3">
      <span class="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-contrast text-sm font-semibold">1</span>
      <h2 class="font-display text-lg font-bold tracking-[0.04em] uppercase flex-1">{{ $t("admin.import.step1") }}</h2>
      <input
        ref="fileInput"
        type="file"
        accept=".csv,text/csv"
        class="hidden"
        @change="importer.chooseFile(($event.target as HTMLInputElement).files?.[0] ?? null)"
      >
      <Button outlined @click="fileInput?.click()"><AppIcon name="lucide:file" class="size-4" />{{ $t('admin.import.chooseFile') }}</Button>
      <span v-if="importer.fileName" class="text-sm text-muted-color font-mono">{{ importer.fileName }}</span>
    </div>
    <p class="mt-3 text-sm text-muted-color">{{ $t("admin.import.step1Hint") }}</p>
  </section>
</template>

<script setup lang="ts">
/** Step 1: choose the results CSV exported from LiftingCast. */
const importer = useAdminResultsImport()
const fileInput = ref<HTMLInputElement | null>(null)
</script>
