<template>
  <div>
    <CompetitionHeader :meet="competition.meet" />

    <PageSection>
      <CompetitionResults
        :state="competition.state"
        :tab="competition.tab"
        :sections="competition.sections"
        :rows="competition.rows"
        @update:tab="competition.setTab"
      />
    </PageSection>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: "default" })

const { t } = useI18n()
const competition = useCompetitionPage(useRoute().params.slug as string)

useSeoMeta({
  title: () => competition.meet?.meetName ?? t("meets.title"),
  ogType: "website",
  ogTitle: () => competition.meet?.meetName ?? t("meets.title"),
  description: () => (competition.meet ? t("meets.heldOn", { date: competition.meet.hostDate ?? "" }) : ""),
})
</script>
