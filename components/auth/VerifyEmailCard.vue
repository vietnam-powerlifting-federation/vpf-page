<template>
  <AuthCard :title="$t('verifyEmail.title')" :subtitle="$t('verifyEmail.subtitle')">
    <form class="grid gap-5" novalidate @submit.prevent="verification.verify()">
      <AppField v-slot="f" :label="$t('verifyEmail.codeLabel')">
        <AppInput :id="f.id" v-model="verification.code" inputmode="numeric" autocomplete="one-time-code" class="w-full font-display text-xl tracking-[0.3em]" />
      </AppField>
      <AppButton type="submit" block :loading="verification.isLoading">{{ $t('verifyEmail.verifyButton') }}</AppButton>
      <p class="text-center text-sm text-muted-color">
        {{ $t("verifyEmail.noCode") }}
        <button type="button" class="min-h-11 cursor-pointer font-semibold text-accent underline-offset-3 hover:underline disabled:opacity-50" :disabled="verification.isResending" @click="verification.resend()">
          {{ $t("verifyEmail.resend") }}
        </button>
      </p>
    </form>
  </AuthCard>
</template>

<script setup lang="ts">
/** Email verification: enter the code that was emailed, or ask for a new one. */
const verification = useVerifyEmailForm()
</script>
