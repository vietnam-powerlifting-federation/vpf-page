<template>
  <div class="min-h-screen">
    <section class="py-12 md:py-16">
      <div class="container mx-auto px-4">
        <h1 class="text-3xl md:text-4xl font-bold mb-4 text-center text-primary">{{ $t("contact.title") }}</h1>
        <p class="text-lg md:text-xl text-gray-600 mb-12 text-center">{{ $t("contact.description") }}</p>

        <div class="max-w-5xl mx-auto">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
            <!-- Contact Form -->
            <Card class="custom-card h-full">
              <template #title>
                {{ $t("contact.send") }}
              </template>
              <template #content>
                <div class="flex flex-col gap-6">
                  <div class="flex flex-col gap-2">
                    <label class="font-medium text-text">{{ $t("contact.name") }}</label>
                    <InputText v-model="form.name" class="w-full" />
                  </div>
                  <div class="flex flex-col gap-2">
                    <label class="font-medium text-text">{{ $t("contact.email") }}</label>
                    <InputText v-model="form.email" type="email" class="w-full" />
                  </div>
                  <div class="flex flex-col gap-2">
                    <label class="font-medium text-text">{{ $t("contact.message") }}</label>
                    <Textarea v-model="form.message" rows="5" class="w-full" />
                  </div>
                  <Button :label="$t('contact.send')" class="p-button-primary w-full" @click="handleSubmit" />
                </div>
              </template>
            </Card>

            <!-- Contact Information -->
            <Card class="custom-card h-full">
              <template #title>
                {{ $t("contact.title") }}
              </template>
              <template #content>
                <div class="flex flex-col gap-6">
                  <div class="flex flex-col gap-2">
                    <strong class="text-primary text-lg">{{ $t("contact.address") }}:</strong>
                    <p class="m-0 text-text" v-html="formattedAddress"/>
                  </div>
                  <div class="flex flex-col gap-2">
                    <strong class="text-primary text-lg">{{ $t("contact.phone") }}:</strong>
                    <p class="m-0 text-text">{{ CONTACT_INFO.phone }}</p>
                  </div>
                  <div class="flex flex-col gap-2">
                    <strong class="text-primary text-lg">{{ $t("contact.emailLabel") }}:</strong>
                    <p class="m-0 text-text">{{ CONTACT_INFO.email }}</p>
                  </div>
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
import { ref, computed } from "vue"
import { useToast } from "primevue/usetoast"
import { CONTACT_INFO } from "~/lib/config/contact"

const toast = useToast()

const formattedAddress = computed(() => {
  return CONTACT_INFO.address.formatted.replace(/\n/g, "<br>")
})

const form = ref({
  name: "",
  email: "",
  message: "",
})

const handleSubmit = () => {
  if (!form.value.name || !form.value.email || !form.value.message) {
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
    summary: "Message Sent",
    detail: "Thank you for your message. We'll get back to you soon!",
    life: 3000,
  })

  form.value = {
    name: "",
    email: "",
    message: "",
  }
}
</script>
