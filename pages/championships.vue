<template>
  <div class="min-h-screen">
    <section class="py-12 md:py-16">
      <div class="container mx-auto px-4">
        <h1 class="text-3xl md:text-4xl font-bold mb-4 text-center text-primary">{{ $t("championships.title") }}</h1>
        <p class="text-lg md:text-xl text-gray-600 mb-12 text-center">{{ $t("championships.description") }}</p>

        <div class="max-w-5xl mx-auto">
          <!-- Upcoming Championships -->
          <div class="mb-16">
            <h2 class="text-3xl md:text-4xl font-bold mb-8 text-primary">{{ $t("championships.upcoming") }}</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-8">
              <Card v-for="(championship, index) in upcomingChampionships" :key="index" class="custom-card">
                <template #title>
                  {{ championship.title }}
                </template>
                <template #content>
                  <div class="flex flex-col gap-2">
                    <p><strong>Date:</strong> {{ championship.date }}</p>
                    <p><strong>Location:</strong> {{ championship.location }}</p>
                    <p><strong>Categories:</strong> {{ championship.categories }}</p>
                    <p>{{ championship.description }}</p>
                  </div>
                </template>
                <template #footer>
                  <Button :label="$t('championships.register')" class="p-button-primary" />
                </template>
              </Card>
            </div>
          </div>

          <!-- Past Championships -->
          <div class="mb-16">
            <h2 class="text-3xl md:text-4xl font-bold mb-8 text-primary">{{ $t("championships.past") }}</h2>
            <DataTable :value="pastChampionships" class="mt-8">
              <Column field="title" :header="$t('championships.title')" />
              <Column field="date" header="Date" />
              <Column field="location" header="Location" />
              <Column field="winner" header="Winner" />
            </DataTable>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
const upcomingChampionships = [
  {
    title: "British Powerlifting Championships 2024",
    date: "June 15-17, 2024",
    location: "Manchester, UK",
    categories: "Open, Junior, Masters",
    description: "The premier powerlifting event of the year featuring the best athletes from across Great Britain.",
  },
  {
    title: "Regional Qualifiers",
    date: "April 20-22, 2024",
    location: "London, UK",
    categories: "All Categories",
    description: "Regional qualifiers for the national championships. Open to all registered members.",
  },
  {
    title: "Junior Championships",
    date: "May 10-12, 2024",
    location: "Birmingham, UK",
    categories: "Junior (Under 23)",
    description: "Showcasing the future stars of British Powerlifting.",
  },
]

const pastChampionships = [
  {
    title: "British Powerlifting Championships 2023",
    date: "June 2023",
    location: "London, UK",
    winner: "John Smith",
  },
  {
    title: "National Championships 2023",
    date: "September 2023",
    location: "Manchester, UK",
    winner: "Sarah Johnson",
  },
  {
    title: "Masters Championships 2023",
    date: "October 2023",
    location: "Birmingham, UK",
    winner: "Michael Brown",
  },
]
</script>
