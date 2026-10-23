<template>
  <div>
    <PageHeader :kicker="$t('checkout.kicker')" :title="$t('checkout.title')" :lede="$t('checkout.lede')" compact />

    <PageSection class="grid gap-6">
      <CheckoutFlow :checkout="checkout" />
    </PageSection>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: "default", middleware: "auth" })
usePageTitle("checkout.title")

const checkout = useCheckoutPage()
</script>
