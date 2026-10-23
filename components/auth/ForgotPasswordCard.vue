<template>
  <AuthCard
    :title="$t('forgotPassword.title')"
    :subtitle="reset.step === 'request' ? $t('forgotPassword.requestSubtitle') : $t('forgotPassword.resetSubtitle', { email: reset.email })"
  >
    <!-- Step 1: request a reset code -->
    <form v-if="reset.step === 'request'" class="grid gap-5" novalidate @submit.prevent="reset.requestCode()">
      <AppField v-slot="f" :label="$t('forgotPassword.emailLabel')">
        <AppInput :id="f.id" v-model="reset.email" type="email" autocomplete="email" class="w-full" />
      </AppField>
      <AppButton type="submit" block :loading="reset.isLoading">{{ $t('forgotPassword.sendCodeButton') }}</AppButton>
    </form>

    <!-- Step 2: enter the code and the new password -->
    <form v-else ref="formEl" class="grid gap-5" novalidate @submit.prevent="onReset">
      <AppField v-slot="f" :label="$t('forgotPassword.codeLabel')" :error="reset.errors.code">
        <AppInput
          :id="f.id"
          v-model="reset.code"
          inputmode="numeric"
          autocomplete="one-time-code"
          :invalid="f.invalid"
          :aria-describedby="f.describedBy"
          class="w-full font-display text-xl tracking-[0.3em]"
        />
      </AppField>
      <AppField v-slot="f" :label="$t('forgotPassword.newPassword')" :hint="$t('register.passwordHint')" :error="reset.errors.newPassword">
        <PasswordInput :id="f.id" v-model="reset.newPassword" :invalid="f.invalid" :aria-describedby="f.describedBy" autocomplete="new-password" />
      </AppField>
      <AppField v-slot="f" :label="$t('forgotPassword.confirmPassword')" :error="reset.errors.confirmPassword">
        <PasswordInput :id="f.id" v-model="reset.confirmPassword" :invalid="f.invalid" :aria-describedby="f.describedBy" autocomplete="new-password" />
      </AppField>
      <AppButton type="submit" block :loading="reset.isLoading">{{ $t('forgotPassword.resetButton') }}</AppButton>
      <p class="text-center text-sm text-muted-color">
        {{ $t("forgotPassword.noCode") }}
        <button type="button" class="min-h-11 cursor-pointer font-semibold text-accent underline-offset-3 hover:underline disabled:opacity-50" :disabled="reset.isResending" @click="reset.requestCode(true)">
          {{ $t("forgotPassword.resend") }}
        </button>
      </p>
    </form>

    <template #footer>
      <NuxtLinkLocale to="/login" class="font-semibold text-accent underline-offset-3 hover:underline">{{ $t("forgotPassword.backToLogin") }}</NuxtLinkLocale>
    </template>
  </AuthCard>
</template>

<script setup lang="ts">
/** Password reset: ask for an emailed code, then enter it with a new password. */
const reset = useForgotPasswordForm()
const { formEl, focusFirstInvalid } = useFormFocus()

async function onReset() {
  if (!(await reset.resetPassword())) await focusFirstInvalid()
}
</script>
