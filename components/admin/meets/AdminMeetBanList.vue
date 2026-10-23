<template>
  <!-- Ban list (§5.3): meet-scoped, so it lives here rather than on a global screen. -->
  <section v-if="!editor.isNew" class="mt-10 rounded-md border border-surface-200 p-4 md:p-5">
    <h2 class="font-display text-lg font-bold tracking-[0.04em] uppercase">{{ $t("admin.banList.title") }}</h2>
    <p class="text-sm text-muted-color mb-4">{{ $t("admin.banList.subtitle") }}</p>

    <div class="grid grid-cols-1 md:grid-cols-[200px_1fr_auto] gap-3 items-end mb-4">
      <div class="flex flex-col gap-1">
        <label for="banVpfId" class="text-sm text-muted-color">{{ $t("admin.banList.athlete") }}</label>
        <InputText id="banVpfId" v-model="editor.bans.form.vpfId" placeholder="VPF000123" />
      </div>
      <div class="flex flex-col gap-1">
        <label for="banReason" class="text-sm text-muted-color">{{ $t("admin.banList.reason") }}</label>
        <InputText id="banReason" v-model="editor.bans.form.reason" :placeholder="$t('admin.banList.reasonPlaceholder')" />
      </div>
      <Button :label="$t('admin.banList.add')" :loading="editor.bans.saving" @click="editor.bans.add" />
    </div>

    <!--
      The reason is shown to the athlete verbatim, so the admin is authoring
      public-facing copy inside a data field. Preview it with the same i18n key
      the registration wizard uses, so the two can never drift.
    -->
    <Message v-if="editor.bans.form.reason" severity="info" size="small" class="mb-4">
      <span class="text-sm">{{ editor.bans.preview }}</span>
    </Message>

    <DataTable v-if="editor.bans.bans.length" :value="editor.bans.bans" size="small" class="border border-surface-200">
      <Column :header="$t('admin.banList.athlete')">
        <template #body="{ data }">
          <div class="font-medium">{{ data.userName }}</div>
          <div class="text-xs text-muted-color">{{ data.vpfId }}</div>
        </template>
      </Column>
      <Column :header="$t('admin.banList.reason')" field="reason" />
      <Column>
        <template #body="{ data }">
          <Button size="small" text severity="danger" :label="$t('admin.banList.remove')" @click="editor.bans.remove(data.vpfId)" />
        </template>
      </Column>
    </DataTable>
    <p v-else class="text-sm text-muted-color">{{ $t("admin.banList.empty") }}</p>
  </section>
</template>

<script setup lang="ts">
/** Athletes banned from this meet, with the reason shown to them previewed as they will read it. */
const editor = useAdminMeetEditor()
</script>
