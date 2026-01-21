<template>
  <header class="header">
    <div class="container mx-auto px-4">
      <div class="header-content">
        <div class="logo">
          <NuxtLinkLocale to="/" class="logo-link">
            <h1 class="logo-text">{{ $t("home.title") }}</h1>
          </NuxtLinkLocale>
        </div>
        <nav class="nav">
          <ul class="nav-list">
            <li v-for="item in menuItems" :key="item.to" class="nav-item">
              <NuxtLinkLocale :to="item.to" class="nav-link">
                {{ item.label }}
              </NuxtLinkLocale>
            </li>
          </ul>
        </nav>
        <div class="language-switcher">
          <Select
            :model-value="currentLocale"
            :options="localeOptions"
            option-label="label"
            option-value="code"
            class="language-select"
            @update:model-value="switchLocale"
          />
        </div>
      </div>
    </div>
  </header>
</template>

<script setup>
import { computed } from "vue"
import Select from "@/components/volt/Select.vue"

const { locale, locales, setLocale, t } = useI18n()

const currentLocale = computed(() => locale.value)

const menuItems = computed(() => [
  { label: t("nav.home"), to: "/" },
  { label: t("nav.about"), to: "/about" },
  { label: t("nav.membership"), to: "/membership" },
  { label: t("nav.championships"), to: "/championships" },
  { label: t("nav.news"), to: "/news" },
  { label: t("nav.contact"), to: "/contact" },
])

const localeOptions = computed(() => {
  return locales.value.map((loc) => ({
    code: loc.code,
    label: loc.code === "en" ? "English" : "Tiếng Việt",
  }))
})

const switchLocale = (newLocale) => {
  setLocale(newLocale)
}
</script>

<style scoped>
.header {
  background-color: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 1000;
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 0;
}

.logo-link {
  text-decoration: none;
  color: var(--p-primary-color);
}

.logo-text {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
}

.nav {
  flex: 1;
  display: flex;
  justify-content: center;
  overflow-x: scroll;
}

.nav-list {
  display: flex;
  list-style: none;
  margin: 0;
  padding: 0;
  gap: 1rem;
}

.nav-item {
  margin: 0;
}

.nav-link {
  padding: 0.5rem 1rem;
  text-decoration: none;
  color: var(--text-color);
  font-weight: 500;
  transition: color 0.3s ease;
  display: block;
}

.nav-link:hover {
  color: var(--secondary-color);
}

.language-switcher {
  min-width: 120px;
}

.language-select {
  width: 100%;
}

@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    gap: 1rem;
  }

  .nav {
    width: 100%;
  }
}
</style>
