<template>
  <template v-if="meet">
    <div class="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 class="text-3xl md:text-4xl font-bold mb-4 text">
          {{ meet.meetName }}
        </h1>
        <div class="flex flex-wrap gap-4 text-sm text-surface-600">
          <span v-if="meet.hostDate">
            <strong>{{ $t("meets.date") }}:</strong> {{ formatMeetDate(meet.hostDate) }}
          </span>
          <span v-if="meet.city">
            <strong>{{ $t("meets.location") }}:</strong> {{ meet.city }}
          </span>
          <span v-if="meet.type">
            <strong>{{ $t("meets.type") }}:</strong> {{ formatMeetType(meet.type) }}
          </span>
          <span v-if="meet.systemYear">
            <strong>{{ $t("meets.year") }}:</strong> {{ meet.systemYear }}
          </span>
        </div>
      </div>
      <NuxtLinkLocale :to="registerPath" class="shrink-0">
        <Button :label="$t('meets.register')" icon="pi pi-user-plus" size="small" />
      </NuxtLinkLocale>
    </div>
  </template>

  <slot />
</template>

<script setup lang="ts">
import type { MeetType } from "~/types/union-types"
import { formatMeetDate } from "~/lib/utils/meet-formatters"
import { useMeetPayload } from "~/composables/useMeetData"

const props = defineProps<{
  slug: string
}>()

const localePath = useLocalePath()
const { t } = useI18n()

const { meet } = useMeetPayload(props.slug)

const registerPath = computed(() => localePath(`/openvpf/competitions/${props.slug}/register`))

const formatMeetType = (type: MeetType | null): string => {
  if (!type) return "-"
  const keyMap: Record<MeetType, string> = {
    national: "general.meetTypeNational",
    amateur: "general.meetTypeAmateur",
    professional: "general.meetTypeProfessional",
    national_qualifier: "general.meetTypeNationalQualifier",
    other: "general.meetTypeOther",
  }
  return t(keyMap[type] || "meets.type")
}
</script>
