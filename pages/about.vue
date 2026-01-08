<template>
  <div class="min-h-screen">
    <section class="py-12 md:py-16">
      <div class="container mx-auto px-4">
        <h1 class="text-3xl md:text-4xl font-bold mb-4 text-center text-primary">{{ $t("about.title") }}</h1>
        <p class="text-lg md:text-xl text-gray-600 mb-12 text-center">{{ $t("home.description") }}</p>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
          <!-- Mission -->
          <Card class="custom-card">
            <template #title>
              {{ $t("about.mission") }}
            </template>
            <template #content>
              <p>{{ $t("about.missionText") }}</p>
            </template>
          </Card>

          <!-- Vision -->
          <Card class="custom-card">
            <template #title>
              {{ $t("about.vision") }}
            </template>
            <template #content>
              <p>{{ $t("about.visionText") }}</p>
            </template>
          </Card>
        </div>

        <!-- Values -->
        <div class="mt-16">
          <h2 class="text-3xl md:text-4xl font-bold mb-8 text-center text-primary">{{ $t("about.values") }}</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-8">
            <Card class="custom-card">
              <template #title>
                {{ $t("about.integrity") }}
              </template>
              <template #content>
                <p>{{ $t("about.integrityText") }}</p>
              </template>
            </Card>

            <Card class="custom-card">
              <template #title>
                {{ $t("about.excellence") }}
              </template>
              <template #content>
                <p>{{ $t("about.excellenceText") }}</p>
              </template>
            </Card>

            <Card class="custom-card">
              <template #title>
                {{ $t("about.inclusivity") }}
              </template>
              <template #content>
                <p>{{ $t("about.inclusivityText") }}</p>
              </template>
            </Card>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
</script>
