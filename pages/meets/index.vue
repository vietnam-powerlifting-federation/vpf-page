<template>
  <div class="container mx-auto px-4 py-8">
    <div v-if="pending" class="flex items-center justify-center py-12">
      <div class="text-center">
        <div class="text-lg font-semibold mb-2 text-primary">{{ $t("meets.loadingMeets") }}</div>
        <div class="text-sm text-surface-500">{{ $t("general.pleaseWait") }}</div>
      </div>
    </div>

    <div v-else-if="error" class="text-center py-12">
      <div class="text-lg font-semibold mb-2 text-error">{{ $t("meets.errorLoadingMeets") }}</div>
      <div class="text-sm text-surface-500">{{ error }}</div>
    </div>

    <div v-else>
      <!-- New Meets Section -->
      <div v-if="newMeets.length > 0" class="mb-12">
        <h2 class="text-2xl md:text-3xl font-bold mb-6 text-primary">{{ $t("meets.upcomingCompetitions") }}</h2>
        <div class="w-full my-4">
          <div
            v-for="meet in newMeets"
            :key="meet.meetId"
            class="bg-surface-0 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
          >
            <!-- Image Placeholder -->
            <div class="w-full h-48 bg-surface-100 dark:bg-surface-800 flex items-center justify-center">
              <img
                v-if="meet.mediaLink"
                :src="meet.mediaLink"
                :alt="meet.meetName"
                class="w-full h-full object-cover"
              >
              <span v-else class="text-surface-500 dark:text-surface-400 text-sm">{{ $t("meets.placeholderImage") }}</span>
            </div>
            
            <!-- Meet Info -->
            <div class="flex flex-col p-4">
              <h3 class="text-lg font-semibold mb-3 text">
                {{ meet.meetName }}
              </h3>

              <!-- Stack on mobile, row on md+ -->
              <div class="flex flex-col md:flex-row md:items-start gap-4">
                <!-- Info -->
                <div
                  class="flex flex-wrap gap-x-4 gap-y-2 text-sm text-surface-600 dark:text-surface-400 flex-1"
                >
                  <span v-if="meet.city">
                    <strong>{{ $t("meets.location") }}:</strong> {{ meet.city }}
                  </span>
                  <span v-if="meet.hostDate">
                    <strong>{{ $t("meets.date") }}:</strong> {{ formatDate(meet.hostDate) }}
                  </span>
                  <span v-if="meet.closeRegistration">
                    <strong>{{ $t("meets.endRegistrationDate") }}:</strong> {{ formatDate(meet.closeRegistration) }}
                  </span>
                </div>

                <!-- Buttons (still flex) -->
                <div class="flex gap-2 shrink-0">
                  <Button
                    v-if="meet.allowSpotterRegistration"
                    :label="$t('meets.registerAsSpotter')"
                    outlined
                    @click.stop="handleSpotterRegistration(meet)"
                  />
                  <Button
                    :label="$t('meets.registerNow')"
                    @click.stop="handleRegistration(meet)"
                  />
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      <!-- Old Meets Section -->
      <div v-if="oldMeets.length > 0">
        <h2 class="text-2xl md:text-3xl font-bold mb-6 text-primary">{{ $t("meets.oldCompetitions") }}</h2>
        <div class="bg-surface-0 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-lg overflow-hidden">
          <ClientOnly>
            <div class="old-meets-table-wrapper">
              <DataTable
                ref="oldMeetsTable"
                :value="oldMeets"
                :loading="false"
                striped-rows
                class="w-full old-meets-table"
                show-gridlines
              >
                <Column field="meetName" :header="$t('meets.meetName')" :sortable="true" style="min-width: 200px">
                  <template #body="{ data }">
                    <span 
                      class="text-primary cursor-pointer" 
                      @click="handleRowClick(data)"
                    >
                      {{ data.meetName }}
                    </span>
                  </template>
                </Column>
                
                <Column field="city" :header="$t('meets.location')" :sortable="true" style="min-width: 150px">
                  <template #body="{ data }">
                    <span 
                      class="cursor-pointer" 
                      @click="handleRowClick(data)"
                    >
                      {{ data.city || "-" }}
                    </span>
                  </template>
                </Column>
                
                <Column field="hostDate" :header="$t('meets.date')" :sortable="true" style="min-width: 150px">
                  <template #body="{ data }">
                    <span 
                      class="cursor-pointer" 
                      @click="handleRowClick(data)"
                    >
                      {{ formatDate(data.hostDate) }}
                    </span>
                  </template>
                </Column>
                
                <Column field="type" :header="$t('meets.type')" :sortable="true" style="min-width: 120px">
                  <template #body="{ data }">
                    <span 
                      class="cursor-pointer" 
                      @click="handleRowClick(data)"
                    >
                      {{ formatMeetType(data.type) }}
                    </span>
                  </template>
                </Column>
                
                <Column field="systemYear" :header="$t('meets.year')" :sortable="true" style="min-width: 80px" align="right">
                  <template #body="{ data }">
                    <span 
                      class="cursor-pointer" 
                      @click="handleRowClick(data)"
                    >
                      {{ data.systemYear || "-" }}
                    </span>
                  </template>
                </Column>
              </DataTable>
            </div>
            <template #fallback>
              <div class="flex items-center justify-center py-12">
                <div class="text-center">
                  <div class="text-lg font-semibold mb-2 text-primary">{{ $t("meets.loadingTable") }}</div>
                </div>
              </div>
            </template>
          </ClientOnly>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="newMeets.length === 0 && oldMeets.length === 0" class="text-center py-12">
        <div class="text-lg font-semibold mb-2 text-primary">{{ $t("meets.noMeetsFound") }}</div>
        <div class="text-sm text-surface-500">{{ $t("meets.noMeetsAvailable") }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Button from "@/components/volt/Button.vue"
import DataTable from "primevue/datatable"
import Column from "primevue/column"
import type { MeetPublic } from "~/types/meets"
import type { ApiResponse } from "~/types/api"
import type { MeetType } from "~/types/union-types"

definePageMeta({
  layout: "with-footer",
  pageTransition: {
    name: "page",
    mode: "out-in"
  }
})

useSeoMeta({
  title: "VPF Meets",
  ogType: "website",
  ogTitle: "VPF Meets",
  ogDescription: "View all powerlifting meets organized by VPF (Vietnamese Powerlifting Federation)."
})

const { data: response, pending, error } = useFetch<ApiResponse<MeetPublic[]>>("/api/meets")

const allMeets = computed(() => {
  if (response.value?.success && response.value.data) {
    return response.value.data
  }
  return []
})

// Separate meets into new (open registration) and old (closed/past)
const newMeets = computed(() => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  return allMeets.value.filter(meet => {
    // Check if registration is currently open
    if (meet.startRegistration && meet.closeRegistration) {
      const startDate = new Date(meet.startRegistration)
      const endDate = new Date(meet.closeRegistration)
      startDate.setHours(0, 0, 0, 0)
      endDate.setHours(23, 59, 59, 999)
      
      return today >= startDate && today <= endDate
    }
    return false
  })
})

const oldMeets = computed(() => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  return allMeets.value.filter(meet => {
    // If it has registration dates, check if registration is closed
    if (meet.startRegistration && meet.closeRegistration) {
      const endDate = new Date(meet.closeRegistration)
      endDate.setHours(23, 59, 59, 999)
      return today > endDate
    }
    // If no registration dates, consider it old if host date is in the past
    if (meet.hostDate) {
      const hostDate = new Date(meet.hostDate)
      hostDate.setHours(0, 0, 0, 0)
      return today > hostDate
    }
    // If no dates at all, include in old meets
    return true
  }).sort((a, b) => {
    // Sort by host date descending (most recent first)
    const dateA = a.hostDate ? new Date(a.hostDate).getTime() : 0
    const dateB = b.hostDate ? new Date(b.hostDate).getTime() : 0
    return dateB - dateA
  })
})

const formatDate = (date: string | null): string => {
  if (!date) return "-"
  try {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    })
  } catch {
    return date
  }
}

const formatMeetType = (type: MeetType | null): string => {
  if (!type) return "-"
  const typeMap: Record<MeetType, string> = {
    national: "National",
    amateur: "Amateur",
    professional: "Professional",
    national_qualifier: "National Qualifier",
    other: "Other"
  }
  return typeMap[type] || type
}

const handleRegistration = (meet: MeetPublic) => {
  // TODO: Implement registration logic
  navigateTo(`/meets/${meet.meetSlug}`)
}

const handleSpotterRegistration = (meet: MeetPublic) => {
  // TODO: Implement spotter registration logic
  navigateTo(`/meets/${meet.meetSlug}`)
}

const handleRowClick = (meet: MeetPublic) => {
  navigateTo(`/meets/${meet.meetSlug}`)
}
</script>

<style scoped>
:deep(.old-meets-table .p-datatable-tbody > tr) {
  cursor: pointer;
  transition: background-color 0.2s;
}

:deep(.old-meets-table .p-datatable-tbody > tr:hover) {
  background-color: rgb(var(--surface-100)) !important;
}

:deep(.dark .old-meets-table .p-datatable-tbody > tr:hover) {
  background-color: rgb(var(--surface-800)) !important;
}
</style>