<template>
  <div>
    <PageHeader :kicker="$t('meets.kicker')" :title="$t('meets.title')" :lede="$t('meets.lede')" />

    <PageSection class="grid gap-10">
      <CompetitionList
        :upcoming="newMeets"
        :past="oldMeets"
        :loading="pending && !allMeets.length"
        :failed="!!error"
      />
    </PageSection>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: "default" })
usePageSeo("meets.title", "meets.lede")

const { allMeets, newMeets, oldMeets, pending, error } = useMeetsList()
</script>
