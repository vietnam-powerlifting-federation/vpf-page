<template>
  <header class="profile-header border-b border-surface-700">
    <div class="container mx-auto px-4 flex items-center justify-between h-14">
      <NuxtLinkLocale to="/" class="flex items-center gap-2 text-primary font-semibold text-lg">
      <span>{{ $t("home.title") }}</span>
      </NuxtLinkLocale>

      <nav class="flex items-center gap-6">
      <NuxtLinkLocale
          to="/openvpf"
          class="text-surface-300 hover:text-surface-0 text-sm font-medium uppercase tracking-wide"
      >
          {{ $t("openvpf.headerNav.rankings") }}
      </NuxtLinkLocale>

      <NuxtLinkLocale
          to="/openvpf/records"
          class="text-surface-300 hover:text-surface-0 text-sm font-medium uppercase tracking-wide"
      >
          {{ $t("openvpf.headerNav.records") }}
      </NuxtLinkLocale>

      <NuxtLinkLocale
          to="/openvpf/competitions"
          class="text-surface-300 hover:text-surface-0 text-sm font-medium uppercase tracking-wide"
      >
          {{ $t("openvpf.headerNav.competitions") }}
      </NuxtLinkLocale>

      <NuxtLinkLocale
          to="/contact"
          class="text-surface-300 hover:text-surface-0 text-sm font-medium uppercase tracking-wide"
      >
          {{ $t("openvpf.headerNav.contact") }}
      </NuxtLinkLocale>
      </nav>

      <NuxtLinkLocale
      to="/login"
      class="bg-primary text-primary-contrast px-4 py-2 rounded font-medium text-sm hover:opacity-90"
      >
      {{ $t("login.loginButton") }}
      </NuxtLinkLocale>
    </div>
  </header>
</template>
