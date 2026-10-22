<template>
  <NuxtLayout name="default">
    <PageHeader
      :kicker="$t('error.kicker', { code: error.statusCode })"
      :title="notFound ? $t('error.notFoundTitle') : $t('error.genericTitle')"
      :lede="notFound ? $t('error.notFoundBody') : $t('error.genericBody')"
    >
      <template #actions>
        <Button @click="clearError({ redirect: localePath('/') })">{{ $t("error.home") }}</Button>
      </template>
    </PageHeader>
  </NuxtLayout>
</template>

<script setup lang="ts">
import type { NuxtError } from "#app"

const props = defineProps<{ error: NuxtError }>()
const localePath = useLocalePath()
const notFound = computed(() => props.error.statusCode === 404)
</script>
