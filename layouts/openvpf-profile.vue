<template>
  <div class="min-h-full flex flex-col dark-bg">
    <OpenVPFHeader/>

    <!-- 1:3 Layout Section -->
    <div class="flex-1 grid grid-cols-4 max-w-8xl w-full mx-auto">
      <!-- Sidebar (1 part) -->
      <aside class="col-span-1 pt-6 px-4">
        <nav class="flex flex-col gap-2">
          <Button
            v-for="tab in tabs"
            :key="tab.path"
            :severity="isActive(tab.path) ? 'primary' : 'secondary'"
            class="left-button justify-start"
            @click="navigateTo(tab.path)"
          >
            <i :class="['pi text-lg flex-shrink-0', tab.icon]" />
            <span>{{ $t(tab.label) }}</span>
          </Button>
        </nav>
      </aside>

      <!-- Main Content (3 parts) -->
      <main class="col-span-3 overflow-auto p-6">
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
import Toast from "@/components/volt/Toast.vue"
import Button from "primevue/button"
import Card from "primevue/card"

const route = useRoute()
const router = useRouter()

const tabs = [
  { path: "/openvpf/profile", label: "profile.tabs.personalInfo", icon: "pi-user" },
  { path: "/openvpf/profile/vip-benefits", label: "profile.tabs.vipBenefits", icon: "pi-star" },
  { path: "/openvpf/profile/competition-info", label: "profile.tabs.competitionInfo", icon: "pi-calendar" },
  { path: "/openvpf/profile/voucher", label: "profile.tabs.voucher", icon: "pi-gift" },
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
