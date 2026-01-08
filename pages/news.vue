<template>
  <div class="min-h-screen">
    <section class="py-12 md:py-16">
      <div class="container mx-auto px-4">
        <h1 class="text-3xl md:text-4xl font-bold mb-4 text-center text-primary">{{ $t("news.title") }}</h1>
        <p class="text-lg md:text-xl text-gray-600 mb-12 text-center">{{ $t("news.description") }}</p>

        <div class="max-w-5xl mx-auto">
          <div v-if="newsArticles.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-8">
            <Card v-for="(article, index) in newsArticles" :key="index" class="custom-card h-full flex flex-col">
              <template #header>
                <div class="h-48 bg-gray-300 flex items-center justify-center text-gray-500">
                  <span>News Image</span>
                </div>
              </template>
              <template #title>
                {{ article.title }}
              </template>
              <template #subtitle>
                {{ article.date }}
              </template>
              <template #content>
                <p>{{ article.excerpt }}</p>
              </template>
              <template #footer>
                <Button :label="$t('news.readMore')" class="p-button-text" />
              </template>
            </Card>
          </div>
          <div v-else class="text-center py-12 text-gray-600">
            <p>{{ $t("news.noNews") }}</p>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
const newsArticles = [
  {
    title: "British Powerlifting Championships 2024 Registration Open",
    date: "January 15, 2024",
    excerpt: "Registration for the 2024 British Powerlifting Championships is now open. Don't miss your chance to compete in the premier event of the year.",
  },
  {
    title: "New Training Facilities Open in London",
    date: "January 10, 2024",
    excerpt: "We're excited to announce the opening of new state-of-the-art training facilities in London, equipped with the latest powerlifting equipment.",
  },
  {
    title: "Athlete Spotlight: Rising Stars of 2024",
    date: "January 5, 2024",
    excerpt: "Meet the promising athletes making waves in British Powerlifting. These rising stars are setting new records and inspiring the next generation.",
  },
  {
    title: "Coaching Certification Program Launched",
    date: "December 20, 2023",
    excerpt: "British Powerlifting has launched a new coaching certification program to help develop the next generation of powerlifting coaches.",
  },
  {
    title: "2023 Year in Review",
    date: "December 15, 2023",
    excerpt: "A look back at the highlights and achievements of British Powerlifting in 2023, including record-breaking performances and major events.",
  },
  {
    title: "Partnership with Sports Equipment Manufacturer",
    date: "December 10, 2023",
    excerpt: "British Powerlifting has entered into a new partnership with a leading sports equipment manufacturer to provide better resources for athletes.",
  },
]
</script>
