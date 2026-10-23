<template>
  <AuthCard :title="$t('register.title')" :subtitle="$t('register.subtitle')" :image="loginBg">
    <form ref="formEl" class="grid gap-5" novalidate @submit.prevent="onSubmit">
      <AppField v-slot="f" :label="$t('register.emailLabel')" :error="register.errors.email">
        <AppInput
          :id="f.id"
          v-model="register.email"
          type="email"
          :placeholder="$t('register.emailPlaceholder')"
          :invalid="f.invalid"
          :aria-describedby="f.describedBy"
          autocomplete="email"
          class="w-full"
        />
      </AppField>

      <AppField v-slot="f" :label="$t('register.password')" :hint="$t('register.passwordHint')" :error="register.errors.password">
        <PasswordInput
          :id="f.id"
          v-model="register.password"
          :invalid="f.invalid"
          :aria-describedby="f.describedBy"
          autocomplete="new-password"
        />
      </AppField>

      <AppField v-slot="f" :label="$t('register.confirmPassword')" :error="register.errors.confirmPassword">
        <PasswordInput
          :id="f.id"
          v-model="register.confirmPassword"
          :invalid="f.invalid"
          :aria-describedby="f.describedBy"
          autocomplete="new-password"
        />
      </AppField>

      <AppButton type="submit" block :loading="register.isLoading">{{ $t('register.registerButton') }}</AppButton>
    </form>

    <template #footer>
      {{ $t("register.haveAccount") }}
      <NuxtLinkLocale to="/login" class="font-semibold text-accent underline-offset-3 hover:underline">{{ $t("register.loginNow") }}</NuxtLinkLocale>
    </template>
  </AuthCard>
</template>

<script setup lang="ts">
import loginBg from "~/assets/img/login-bg.png"

/** The sign-up card: email, password and its confirmation, and a link to sign in. */
const register = useRegisterForm()
const { formEl, focusFirstInvalid } = useFormFocus()

async function onSubmit() {
  if (!(await register.submit())) await focusFirstInvalid()
}
</script>
