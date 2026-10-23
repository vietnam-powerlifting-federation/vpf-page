<template>
  <!-- Step 3 — commit. -->
  <section v-if="importer.preview && importer.preview.rows.length" class="rounded-md border border-surface-200 p-4 md:p-5">
    <div class="flex items-center gap-3 mb-4">
      <span class="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-contrast text-sm font-semibold">3</span>
      <h2 class="font-display text-lg font-bold tracking-[0.04em] uppercase">{{ $t("admin.import.step3") }}</h2>
    </div>

    <Message v-if="importer.preview.blocked" severity="error" size="small" class="mb-3">
      {{ $t("admin.import.blocked") }}
    </Message>
    <Message v-else severity="secondary" size="small" class="mb-3">
      {{ $t("admin.import.replaceWarning") }}
    </Message>

    <Button
      :label="$t('admin.import.confirm')"
      :disabled="importer.preview.blocked"
      :loading="importer.confirming"
      @click="importer.confirm"
    />
  </section>
</template>

<script setup lang="ts">
/** Step 3: write the previewed results. This replaces the meet's results with what the file says. */
const importer = useAdminResultsImport()
</script>
