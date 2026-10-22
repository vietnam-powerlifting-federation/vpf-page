<template>
  <div class="flex min-h-dvh flex-col">
    <SkipLink />
    <SiteHeader />
    <div class="flex flex-1">
      <aside class="hidden w-60 shrink-0 border-r border-surface-200 bg-surface-0 lg:block">
        <div class="sticky top-16">
          <p class="border-b border-surface-200 px-4 py-4 font-display text-lg font-bold tracking-[0.06em] uppercase">
            {{ $t("admin.nav.console") }}
          </p>
          <AdminNav />
        </div>
      </aside>

      <Drawer v-model:visible="menuOpen" position="left" class="!w-72" :pt="{ header: { class: 'border-b border-surface-200 !py-3' }, content: { class: '!p-0' } }">
        <template #header>
          <strong class="font-display text-lg font-bold tracking-[0.06em] uppercase">{{ $t("admin.nav.console") }}</strong>
        </template>
        <AdminNav @navigate="menuOpen = false" />
      </Drawer>

      <main id="main" tabindex="-1" class="min-w-0 flex-1 focus:outline-none">
        <div class="border-b border-surface-200 px-4 py-2 lg:hidden">
          <Button severity="secondary" text :aria-expanded="menuOpen" @click="menuOpen = true">
            <AppIcon name="lucide:panel-left" class="size-5" />
            <span>{{ $t("admin.nav.openMenu") }}</span>
          </Button>
        </div>
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
const menuOpen = ref(false)
</script>
