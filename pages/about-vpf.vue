<template>
  <div class="min-h-screen">
    <section class="py-12 md:py-16">
      <div class="container mx-auto px-4">
        <h1 class="text-3xl md:text-4xl font-bold mb-8 text-center text-primary">
          {{ page.title }}
        </h1>
        <div class="text-text mx-auto">
          <ContentRenderer v-if="page" :value="page" class="prose prose-2xl max-w-none"/>
          <div v-else class="text-center text-fg">
            {{ $t("aboutVpf.notFound") }}
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
const { data: page } = await useAsyncData("about-vpf", () => {
  return queryCollection("pages").path("/vi/about-vpf/about-vpf").first()
})
</script>
