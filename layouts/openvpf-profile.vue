<template>
  <div class="min-h-full flex flex-col dark-bg">
    <OpenVPFHeader/>

    <div class="flex-1 flex flex-col lg:grid lg:grid-cols-4 max-w-8xl w-full mx-auto">
      <aside class="lg:col-span-1 lg:pt-6 lg:px-4 border-b border-surface-700 lg:border-b-0">
        <nav class="flex gap-2 overflow-x-auto px-4 py-3 lg:flex-col lg:overflow-visible lg:p-0">
          <Button
            v-for="tab in tabs"
            :key="tab.path"
            :severity="isActive(tab.path) ? 'primary' : 'secondary'"
            class="left-button shrink-0 whitespace-nowrap lg:w-full"
            @click="navigateTo(tab.path)"
          >
            <i :class="['pi text-lg flex-shrink-0', tab.icon]" />
            <span>{{ $t(tab.label) }}</span>
          </Button>
        </nav>
      </aside>

      <main class="min-w-0 lg:col-span-3 overflow-auto p-4 lg:p-6">
        <Card>
          <template #content>
            <slot />
          </template>
        </Card>
      </main>
    </div>

    <Toast />
  </div>
</template>

<script setup lang="ts">
import Toast from "primevue/toast"
import Button from "primevue/button"
import Card from "primevue/card"

const route = useRoute()
const router = useRouter()

const tabs = [
  { path: "/openvpf/profile", label: "profile.tabs.personalInfo", icon: "pi-user" },
  { path: "/openvpf/profile/vip-benefits", label: "profile.tabs.vipBenefits", icon: "pi-star" },
  { path: "/openvpf/profile/competition-info", label: "profile.tabs.competitionInfo", icon: "pi-calendar" },
  { path: "/openvpf/profile/voucher", label: "profile.tabs.voucher", icon: "pi-gift" },
  { path: "/openvpf/profile/payment-history", label: "profile.tabs.paymentHistory", icon: "pi-credit-card" },
  { path: "/openvpf/profile/change-password", label: "profile.tabs.changePassword", icon: "pi-lock" },
]

function isActive(path: string) {
  if (path === "/openvpf/profile/personal-info") {
    return route.path === "/openvpf/profile" || route.path === path
  }
  return route.path === path
}

function navigateTo(path: string) {
  router.push(path)
}

useProfileAthlete()
</script>

<style scoped>
.left-button {
  justify-content: flex-start;
}
.max-w-8xl {
  max-width: 90rem;
}
</style>
