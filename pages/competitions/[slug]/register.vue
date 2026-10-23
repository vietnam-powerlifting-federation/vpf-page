<template>
  <div>
    <PageHeader
      :kicker="registration.eligibility?.meet.meetName ?? $t('meets.kicker')"
      :title="$t('competitionRegistration.title')"
      :lede="registration.eligibility ? $t('competitionRegistration.subtitle', { meet: registration.eligibility.meet.meetName }) : undefined"
      compact
    />

    <PageSection class="max-w-3xl">
      <RegistrationFlow />
    </PageSection>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: "default", middleware: "auth" })
usePageTitle("competitionRegistration.title")

const { registration, ready } = useRegistrationPage(useRoute().params.slug as string)
await ready
</script>
