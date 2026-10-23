<template>
  <AdminPage
    :title="$t('admin.import.title')"
    :subtitle="$t('admin.import.subtitle')"
    :back-to="`/admin/meets/${importer.meetId}`"
    :back-label="$t('admin.meets.title')"
  >
    <AdminImportFileStep />
    <AdminImportPreview />
    <AdminImportConfirm />
  </AdminPage>
</template>

<script setup lang="ts">
/** Import a meet's results from a LiftingCast CSV in three steps: choose the file, review the preview, confirm. */
const importer = useAdminResultsImportPage()
</script>
