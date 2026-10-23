<template>
  <!-- Step 6: done -->
  <div v-if="purchase" class="grid gap-4">
    <h2 :ref="reg.wizard.setHeading" tabindex="-1" class="flex items-center gap-2 font-display text-2xl font-bold uppercase focus:outline-none">
      <AppIcon :name="purchase.identityVerified ? 'lucide:circle-check' : 'lucide:clock'" class="size-7" :class="purchase.identityVerified ? 'text-success' : 'text-info'" />
      {{ purchase.identityVerified ? $t("competitionRegistration.confirmedTitle") : $t("competitionRegistration.pendingTitle") }}
    </h2>
    <p>
      {{ purchase.identityVerified
        ? $t("competitionRegistration.confirmedBody", { meet: reg.eligibility?.meet.meetName })
        : $t("competitionRegistration.pendingBody", { meet: reg.eligibility?.meet.meetName }) }}
    </p>
    <AppButton to="/profile/competition-info" class="justify-self-start">{{ $t("profile.tabs.competitionInfo") }}</AppButton>
  </div>
</template>

<script setup lang="ts">
/** Step 6: the registration is confirmed, or submitted pending identity review. */
const reg = useRegistration()
const purchase = computed(() => reg.entry.purchase)
</script>
