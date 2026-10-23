<template>
  <Dialog v-model:visible="editor.cloneOpen" modal :header="$t('admin.meets.cloneTitle')" class="w-full max-w-md">
    <p class="text-sm text-muted-color mb-4">{{ $t("admin.meets.cloneHint") }}</p>
    <div class="space-y-3">
      <AppField v-slot="f" :label="$t('admin.meets.name')">
        <InputText :id="f.id" v-model="editor.cloneForm.meetName" />
      </AppField>
      <AppField v-slot="f" :label="$t('admin.meets.systemYear')">
        <InputNumber v-model="editor.cloneForm.systemYear" :input-id="f.id" :use-grouping="false" />
      </AppField>
      <AppField v-slot="f" :label="$t('admin.meets.hostDate')">
        <DatePicker v-model="editor.cloneHostDate" :input-id="f.id" date-format="dd/mm/yy" show-icon show-button-bar />
      </AppField>
    </div>
    <template #footer>
      <Button text :label="$t('admin.common.cancel')" @click="editor.cloneOpen = false" />
      <Button :label="$t('admin.meets.clone')" :loading="editor.cloning" @click="editor.cloneMeet" />
    </template>
  </Dialog>

  <Dialog v-model:visible="editor.deleteOpen" modal :header="$t('admin.meets.deleteTitle')" class="w-full max-w-md">
    <Message severity="warn" size="small" class="mb-3">{{ $t("admin.meets.deleteWarning") }}</Message>
    <div class="space-y-3">
      <AppField v-slot="f" :label="$t('admin.meets.deleteConfirm', { name: editor.form.meetName })">
        <InputText :id="f.id" v-model="editor.deleteForm.confirmName" />
      </AppField>
      <AppField v-slot="f" :label="$t('admin.common.reason')">
        <InputText :id="f.id" v-model="editor.deleteForm.reason" />
      </AppField>
    </div>
    <template #footer>
      <Button text :label="$t('admin.common.cancel')" @click="editor.deleteOpen = false" />
      <Button
        severity="danger"
        :label="$t('admin.meets.delete')"
        :disabled="editor.deleteForm.confirmName !== editor.form.meetName || !editor.deleteForm.reason"
        :loading="editor.deleting"
        @click="editor.deleteMeet"
      />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
/** The dialogs to clone a meet into a new season, and to delete one (confirmed by typing its name, with a reason). */
const editor = useAdminMeetEditor()
</script>
