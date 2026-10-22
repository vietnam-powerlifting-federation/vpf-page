<template>
  <div class="flex flex-wrap items-center justify-between gap-4 rounded-md border p-4" :class="toneClass">
    <div class="flex min-w-0 items-center gap-3">
      <AppIcon :name="icon" class="size-7 shrink-0" :class="iconColorClass" />
      <div class="min-w-0">
        <p class="font-semibold">{{ statusLabel }}</p>
        <p class="text-sm text-muted-color">{{ detailLabel }}</p>
      </div>
    </div>
    <Button v-if="showRenew" :severity="expiringSoon || !active ? undefined : 'secondary'" :variant="expiringSoon || !active ? undefined : 'outlined'" @click="emit('renew')">
      <AppIcon name="lucide:refresh-cw" class="size-4" />
      {{ active ? $t("profile.vipBenefits.renew") : $t("profile.vipBenefits.renewExpired") }}
    </Button>
  </div>
</template>

<script setup lang="ts">
import { formatDate } from "~/lib/domain/format"

/** Warn this far ahead of expiry, so renewals happen before the profile goes dark. */
const RENEWAL_WINDOW_DAYS = 30

const props = defineProps<{
  /** ISO date (YYYY-MM-DD), or null when VIP was never purchased. */
  expiresAt: string | null
  active: boolean
}>()

const emit = defineEmits<{ renew: [] }>()

const { t, locale } = useI18n()

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
  const date = formatDate(props.expiresAt, locale.value, "long")
  if (!props.active) return t("profile.vipBenefits.statusExpiredOn", { date })
  if (daysLeft.value !== null && daysLeft.value <= RENEWAL_WINDOW_DAYS) {
    return t("profile.vipBenefits.statusDaysLeft", { date, days: daysLeft.value })
  }
  return t("profile.vipBenefits.statusUntil", { date })
})

const toneClass = computed(() => {
  if (!props.active) return "border-surface-200 bg-surface-50"
  if (expiringSoon.value) return "border-warn bg-warn-soft"
  return "border-accent bg-accent-soft"
})
const icon = computed(() => {
  if (!props.active) return "lucide:circle-x"
  return expiringSoon.value ? "lucide:triangle-alert" : "lucide:star"
})
const iconColorClass = computed(() => {
  if (!props.active) return "text-muted-color"
  return expiringSoon.value ? "text-warn" : "text-accent"
})
</script>
