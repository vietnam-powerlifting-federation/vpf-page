<template>
  <!-- Reasons registration cannot start, in the order they are checked. -->
  <Message v-if="reg.gate === 'closed'" severity="warn" :closable="false">
    {{ $t("competitionRegistration.notOpen") }}
  </Message>

  <Message v-else-if="reg.gate === 'registered'" severity="info" :closable="false">
    {{ $t("competitionRegistration.alreadyRegistered") }}
    <NuxtLinkLocale to="/profile/payment-history" class="ml-1 font-semibold underline">{{ $t("competitionRegistration.viewInProfile") }}</NuxtLinkLocale>
  </Message>

  <Message v-else-if="reg.gate === 'email'" severity="warn" :closable="false">
    {{ $t("competitionRegistration.emailNotVerified") }}
    <NuxtLinkLocale to="/verify-email" class="ml-1 font-semibold underline">{{ $t("competitionRegistration.verifyEmail") }}</NuxtLinkLocale>
  </Message>

  <Message v-else-if="reg.gate === 'blocked'" severity="error" :closable="false">
    <p class="font-semibold">{{ $t("competitionRegistration.blockedTitle") }}</p>
    <p class="mt-1">{{ reg.blockMessage }}</p>
  </Message>
</template>

<script setup lang="ts">
/** Why this athlete cannot register for the competition: it is closed, they already did, their email is unverified, or they are blocked. */
const reg = useRegistration()
</script>
