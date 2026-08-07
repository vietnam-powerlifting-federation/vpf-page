<template>
  <div
    class="rounded-lg border p-4 flex flex-wrap items-center justify-between gap-4"
    :class="toneClass"
  >
    <div class="flex items-center gap-3 min-w-0">
      <i class="pi text-2xl shrink-0" :class="[iconClass, iconColorClass]" />
      <div class="min-w-0">
        <p class="font-semibold text-surface-0">{{ statusLabel }}</p>
        <p class="text-sm text-surface-400">{{ detailLabel }}</p>
      </div>
    </div>

    <Button
      v-if="showRenew"
      :label="active ? $t('profile.vipBenefits.renew') : $t('profile.vipBenefits.renewExpired')"
      :severity="expiringSoon || !active ? undefined : 'secondary'"
      :outlined="!expiringSoon && active"
      :class="expiringSoon || !active ? 'bg-primary text-primary-contrast' : ''"
      icon="pi pi-refresh"
      @click="emit('renew')"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { formatDateDMY } from "~/lib/utils/date"

/** Warn this far ahead of expiry, so renewals happen before the profile goes dark. */
const RENEWAL_WINDOW_DAYS = 30

const props = defineProps<{
  /** ISO date (YYYY-MM-DD), or null when VIP was never purchased. */
  expiresAt: string | null
  active: boolean
}>()

const emit = defineEmits<{ renew: [] }>()

const { t } = useI18n()

const daysLeft = computed(() => {
  if (!props.expiresAt) return null
  const expiry = Date.parse(`${props.expiresAt.slice(0, 10)}T00:00:00Z`)
  if (Number.isNaN(expiry)) return null
  const today = Date.parse(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`)
  return Math.round((expiry - today) / 86_400_000)
})

const expiringSoon = computed(
  () => props.active && daysLeft.value !== null && daysLeft.value <= RENEWAL_WINDOW_DAYS,
)

// Never purchased: the page shows the upsell instead, so there is nothing to renew.
const showRenew = computed(() => props.active || !!props.expiresAt)

const statusLabel = computed(() => {
  if (!props.active) return t("profile.vipBenefits.statusExpired")
  return expiringSoon.value
    ? t("profile.vipBenefits.statusExpiringSoon")
    : t("profile.vipBenefits.statusActive")
})

const detailLabel = computed(() => {
  if (!props.expiresAt) return t("profile.vipBenefits.statusNever")
  const date = formatDateDMY(props.expiresAt)
  if (!props.active) return t("profile.vipBenefits.statusExpiredOn", { date })
  if (daysLeft.value !== null && daysLeft.value <= RENEWAL_WINDOW_DAYS) {
    return t("profile.vipBenefits.statusDaysLeft", { date, days: daysLeft.value })
  }
  return t("profile.vipBenefits.statusUntil", { date })
})

const toneClass = computed(() => {
  if (!props.active) return "border-surface-600 bg-surface-800"
  if (expiringSoon.value) return "border-amber-500/50 bg-amber-500/10"
  return "border-primary/40 bg-primary/10"
})
const iconClass = computed(() => {
  if (!props.active) return "pi-times-circle"
  return expiringSoon.value ? "pi-exclamation-triangle" : "pi-star-fill"
})
const iconColorClass = computed(() => {
  if (!props.active) return "text-surface-400"
  return expiringSoon.value ? "text-amber-400" : "text-primary"
})
</script>
