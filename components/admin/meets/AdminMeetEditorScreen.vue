<template>
  <AdminPage
    :title="editor.isNew ? $t('admin.meets.create') : editor.form.meetName"
    width="4xl"
    back-to="/admin/meets"
    :back-label="$t('admin.meets.title')"
  >
    <AdminMeetForm />
    <AdminMeetBanList />
    <AdminMeetDialogs />
  </AdminPage>
</template>

<script setup lang="ts">
/** Create or edit a meet: its details, its ban list, and cloning or deleting it. */
const { editor, ready } = useAdminMeetEditorPage()
await ready
</script>
