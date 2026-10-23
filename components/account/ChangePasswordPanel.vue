<template>
  <PagePanel :title="$t('profile.tabs.changePassword')" ruled>
    <template #actions>
      <Tag severity="secondary" :value="$t('profile.demo')" />
    </template>
    <!-- Not wired to the API yet, so every control stays disabled. -->
    <form class="grid max-w-md gap-5" @submit.prevent>
      <AppField v-slot="f" :label="$t('profile.changePassword.currentPassword')">
        <Password v-model="currentPassword" :input-props="{ 'aria-expanded': undefined }" :input-id="f.id" autocomplete="current-password" :feedback="false" toggle-mask disabled class="w-full" input-class="w-full" />
      </AppField>
      <AppField v-slot="f" :label="$t('profile.changePassword.newPassword')">
        <Password v-model="newPassword" :input-props="{ 'aria-expanded': undefined }" :input-id="f.id" autocomplete="new-password" :feedback="false" toggle-mask disabled class="w-full" input-class="w-full" />
      </AppField>
      <AppField v-slot="f" :label="$t('profile.changePassword.confirmPassword')">
        <Password v-model="confirmPassword" :input-props="{ 'aria-expanded': undefined }" :input-id="f.id" autocomplete="new-password" :feedback="false" toggle-mask disabled class="w-full" input-class="w-full" />
      </AppField>
      <Button type="submit" :label="$t('profile.changePassword.submit')" disabled class="justify-self-start" />
    </form>
  </PagePanel>
</template>

<script setup lang="ts">
/** Change password. Not wired to the API yet, so it is shown as a disabled preview. */
const currentPassword = ref("")
const newPassword = ref("")
const confirmPassword = ref("")
</script>
