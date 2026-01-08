<template>
  <div class="min-h-screen">
    <!-- Hero Section -->
    <section class="text-white py-20 md:py-24 relative">
      <div 
        class="absolute inset-0 bg-cover bg-center bg-no-repeat grayscale-25"
        :style="{ backgroundImage: `url(${heroBg})` }"
      />
      <div class="absolute inset-0 bg-gradient-to-br from-gray-400/0 to-gray-800/50" />
      <div class="container mx-auto px-4 relative z-10">
        <div class="text-center max-w-3xl mx-auto">
          <h1 class="text-4xl md:text-6xl font-bold mb-4 text-white text-shadow-lg text-gray-800">{{ $t("home.title") }}</h1>
          <p class="text-xl md:text-2xl mb-8 text-white/90 text-shadow-lg">{{ $t("home.subtitle") }}</p>
          <div class="flex flex-col md:flex-row gap-4 justify-center">
            <Button :label="$t('membership.joinNow')" class="p-button-primary" @click="navigateTo('/membership')" />
            <SecondaryButton :label="$t('home.viewAll')" class="p-button-secondary" @click="navigateTo('/news')" />
          </div>
        </div>
      </div>
    </section>

    <!-- Welcome Section -->
    <section class="py-12 md:py-16">
      <div class="container mx-auto px-4">
        <div class="text-center max-w-3xl mx-auto">
          <h2 class="text-3xl md:text-4xl font-bold mb-4 text-gray-800">{{ $t("home.welcome") }}</h2>
          <p class="text-lg md:text-xl text-gray-600 mb-12">{{ $t("home.description") }}</p>
        </div>
      </div>
    </section>

    <!-- Latest News Section -->
    <section class="py-12 md:py-16 bg-light-bg">
      <div class="container mx-auto px-4">
        <h2 class="text-3xl md:text-4xl font-bold mb-12 text-center text-gray-800">{{ $t("home.latestNews") }}</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-8">
          <Card v-for="(newsItem, index) in newsItems" :key="index" class="custom-card">
            <template #header>
              <div class="h-48 bg-gray-300 flex items-center justify-center text-gray-500">
                <span>News Image</span>
              </div>
            </template>
            <template #title>
              {{ newsItem.title }}
            </template>
            <template #content>
              <p>{{ newsItem.excerpt }}</p>
            </template>
            <template #footer>
              <Button :label="$t('home.readMore')" class="p-button-text" />
            </template>
          </Card>
        </div>
        <div class="text-center mt-8">
          <Button :label="$t('home.viewAll')" class="p-button-primary" @click="navigateTo('/news')" />
        </div>
      </div>
    </section>

    <!-- Upcoming Events Section -->
    <section class="py-12 md:py-16">
      <div class="container mx-auto px-4">
        <h2 class="text-3xl md:text-4xl font-bold mb-12 text-center text-gray-800">{{ $t("home.upcomingEvents") }}</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-8">
          <Card v-for="(event, index) in events" :key="index" class="custom-card">
            <template #title>
              {{ event.title }}
            </template>
            <template #content>
              <p><strong>{{ $t("championships.title") }}:</strong> {{ event.date }}</p>
              <p><strong>{{ $t("contact.address") }}:</strong> {{ event.location }}</p>
            </template>
            <template #footer>
              <Button :label="$t('championships.register')" class="p-button-primary" />
            </template>
          </Card>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import Button from "@/components/volt/Button.vue"
import SecondaryButton from "@/components/volt/SecondaryButton.vue"
import Card from "@/components/volt/Card.vue"
import heroBg from "~/assets/img/hero-bg.jpg"

const newsItems = [
  {
    title: "British Powerlifting Championships 2024",
    excerpt: "Join us for the biggest powerlifting event of the year. Registration is now open.",
  },
  {
    title: "New Training Facilities Open",
    excerpt: "We're excited to announce the opening of new state-of-the-art training facilities.",
  },
  {
    title: "Athlete Spotlight: Rising Stars",
    excerpt: "Meet the promising athletes making waves in British Powerlifting.",
  },
]

const events = [
  {
    title: "Regional Championships",
    date: "March 15, 2024",
    location: "London, UK",
  },
  {
    title: "National Championships",
    date: "June 20, 2024",
    location: "Manchester, UK",
  },
  {
    title: "Junior Championships",
    date: "September 10, 2024",
    location: "Birmingham, UK",
  },
]
</script>
