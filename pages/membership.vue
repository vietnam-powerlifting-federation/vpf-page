<template>
  <div class="min-h-screen">
    <section class="py-12 md:py-16">
      <div class="container mx-auto px-4">
        <h1 class="text-3xl md:text-4xl font-bold mb-4 text-center text-primary">{{ $t("membership.title") }}</h1>
        <p class="text-lg md:text-xl text-gray-600 mb-12 text-center">{{ $t("membership.description") }}</p>

        <div class="max-w-5xl mx-auto">
          <div class="mb-12">
            <h2 class="text-3xl md:text-4xl font-bold mb-8 text-primary">{{ $t("membership.benefits") }}</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
              <Card v-for="(benefit, index) in benefits" :key="index" class="custom-card p-4">
                <template #content>
                  <div class="flex items-center gap-2">
                    <i class="pi pi-check-circle text-secondary text-2xl"/>
                    <span>{{ benefit }}</span>
                  </div>
                </template>
              </Card>
            </div>
          </div>

          <div class="mt-12">
            <Card class="custom-card max-w-2xl mx-auto">
              <template #title>
                {{ $t("membership.joinNow") }}
              </template>
              <template #content>
                <p>{{ $t("membership.description") }}</p>
                <div class="flex flex-col gap-6 mt-6">
                  <div class="flex flex-col gap-2">
                    <label class="font-medium text-text">{{ $t("contact.name") }}</label>
                    <InputText v-model="form.name" class="w-full" />
                  </div>
                  <div class="flex flex-col gap-2">
                    <label class="font-medium text-text">{{ $t("contact.email") }}</label>
                    <InputText v-model="form.email" type="email" class="w-full" />
                  </div>
                  <Button :label="$t('membership.joinNow')" class="p-button-primary w-full" @click="handleJoin" />
                </div>
              </template>
            </Card>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref } from "vue"
import { useToast } from "primevue/usetoast"

const { t } = useI18n()
const toast = useToast()

const benefits = [
  t("membership.benefit1"),
  t("membership.benefit2"),
  t("membership.benefit3"),
  t("membership.benefit4"),
  t("membership.benefit5"),
]

const form = ref({
  name: "",
  email: "",
})

const handleJoin = () => {
  if (!form.value.name || !form.value.email) {
    toast.add({
      severity: "warn",
      summary: "Validation Error",
      detail: "Please fill in all fields",
      life: 3000,
    })
    return
  }

  toast.add({
    severity: "success",
    summary: "Application Submitted",
    detail: "Thank you for your interest! We'll contact you soon.",
    life: 3000,
  })

  form.value = {
    name: "",
    email: "",
  }
}
</script>
