<template>
  <div class="flex min-h-dvh flex-col">
    <SkipLink />
    <SiteHeader />
    <main id="main" tabindex="-1" class="flex-1 focus:outline-none">
      <PageHeader :kicker="$t('account.kicker')" :title="name || $t('account.title')" compact>
        <template v-if="vpfId" #lede>
          <span class="font-display text-xl font-semibold tracking-[0.04em] tabular-nums">{{ vpfId }}</span>
        </template>
      </PageHeader>
      <PageSection>
        <div class="grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-8">
          <nav :aria-label="$t('account.sections')" class="-mx-4 min-w-0 border-b border-surface-200 md:-mx-6 lg:mx-0 lg:border-b-0">
            <ul class="flex gap-1 overflow-x-auto px-4 md:px-6 lg:sticky lg:top-20 lg:flex-col lg:overflow-visible lg:px-0">
              <li v-for="tab in tabs" :key="tab.to" class="shrink-0">
                <NuxtLinkLocale
                  :to="tab.to"
                  :aria-current="isActive(tab.to) ? 'page' : undefined"
                  class="flex min-h-11 items-center gap-2.5 px-3 text-sm font-semibold whitespace-nowrap text-muted-color no-underline transition-colors duration-120 ease-snap hover:text-color aria-[current]:text-color aria-[current]:shadow-accent-under lg:rounded lg:hover:bg-surface-100 lg:aria-[current]:bg-surface-0 lg:aria-[current]:shadow-accent-left"
                >
                  <AppIcon :name="tab.icon" class="size-4" />
                  {{ $t(tab.label) }}
                </NuxtLinkLocale>
              </li>
            </ul>
          </nav>
          <div class="min-w-0">
            <slot />
          </div>
        </div>
      </PageSection>
    </main>
    <SiteFooter />
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const { data } = useProfileAthlete()

const name = computed(() => data.value?.athlete?.fullName ?? "")
const vpfId = computed(() => data.value?.athlete?.vpfId ?? "")

const tabs = [
  { to: "/profile", label: "profile.tabs.personalInfo", icon: "lucide:user" },
  { to: "/profile/vip-benefits", label: "profile.tabs.vipBenefits", icon: "lucide:star" },
  { to: "/profile/competition-info", label: "profile.tabs.competitionInfo", icon: "lucide:calendar" },
  { to: "/profile/voucher", label: "profile.tabs.voucher", icon: "lucide:ticket" },
  { to: "/profile/payment-history", label: "profile.tabs.paymentHistory", icon: "lucide:credit-card" },
  { to: "/profile/change-password", label: "profile.tabs.changePassword", icon: "lucide:lock" },
] as const

function isActive(to: string) {
  const path = route.path.replace(/^\/vi(?=\/|$)/, "")
  return path === to
}
</script>
