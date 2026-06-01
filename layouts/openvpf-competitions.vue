<template>
  <div class="min-h-full flex flex-col dark-bg">
    <OpenVPFHeader/>
    <main class="flex-1 w-full mx-auto px-4 py-6">
      <Card>
        <template #content>
          <MeetCompetitionShell v-if="slug && !isTestRoute" :slug="slug">
            <slot />
          </MeetCompetitionShell>
          <slot v-else />
        </template>
      </Card>
    </main>

    <Toast />
  </div>
</template>

<script setup lang="ts">
import Toast from "primevue/toast"
import Card from "primevue/card"
import MeetCompetitionShell from "@/components/meets/MeetCompetitionShell.vue"
import { useMeetsList } from "~/composables/useMeetsList"

useMeetsList()

const route = useRoute()
const slug = computed(() => route.params.slug as string | undefined)
const isTestRoute = computed(() => route.path.endsWith("/test"))
</script>

<style scoped>
.max-w-5xl {
  max-width: 64rem;
}
</style>
