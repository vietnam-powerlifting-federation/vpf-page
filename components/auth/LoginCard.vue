<template>
  <AuthCard :title="$t('login.title')" :subtitle="$t('login.subtitle')" :image="loginBg">
    <form ref="formEl" class="grid gap-5" novalidate @submit.prevent="onSubmit">
      <AppField v-slot="f" :label="$t('login.emailLabel')" :error="login.errors.vpfIdOrEmail">
        <AppInput
          :id="f.id"
          v-model="login.vpfIdOrEmail"
          :placeholder="$t('login.emailPlaceholder')"
          :invalid="f.invalid"
          :aria-describedby="f.describedBy"
          autocomplete="username"
          autocapitalize="none"
          spellcheck="false"
          class="w-full"
        />
      </AppField>

      <AppField v-slot="f" :label="$t('login.password')" :error="login.errors.password">
        <PasswordInput
          :id="f.id"
          v-model="login.password"
          :invalid="f.invalid"
          :aria-describedby="f.describedBy"
          autocomplete="current-password"
        />
      </AppField>

      <NuxtLinkLocale to="/forgot-password" class="justify-self-start text-sm font-semibold text-accent underline-offset-3 hover:underline">
        {{ $t("login.forgotPassword") }}
      </NuxtLinkLocale>

      <AppButton type="submit" block :loading="login.isLoading">{{ $t('login.loginButton') }}</AppButton>

      <button type="button" class="justify-self-start text-left text-sm text-muted-color underline underline-offset-3 hover:text-color" @click="showNoticeModal = true">
        {{ $t("login.noticeTitle") }}
      </button>
    </form>

    <template #footer>
      {{ $t("login.noAccount") }}
      <NuxtLinkLocale to="/register" class="font-semibold text-accent underline-offset-3 hover:underline">{{ $t("login.registerNow") }}</NuxtLinkLocale>
    </template>

    <AppDialog v-model:visible="showNoticeModal" :title="$t('login.noticeTitle')" :close-label="$t('login.close')">
      <p class="whitespace-pre-line">{{ $t("login.noticeContent") }}</p>
      <template #footer>
        <AppButton variant="secondary" @click="showNoticeModal = false">{{ $t('login.close') }}</AppButton>
      </template>
    </AppDialog>
  </AuthCard>
</template>

<script setup lang="ts">
import loginBg from "~/assets/img/login-bg.png"

/** The sign-in card: athlete ID or email, password, a link to reset it, and a link to sign up. */
const login = useLoginForm()
const { formEl, focusFirstInvalid } = useFormFocus()
const showNoticeModal = ref(false)

async function onSubmit() {
  if (!(await login.submit())) await focusFirstInvalid()
}
</script>
