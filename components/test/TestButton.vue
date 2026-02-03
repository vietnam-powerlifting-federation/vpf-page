
<template>
    <div class="card flex justify-center">
        <Button label="Show" @click="show()" />
    </div>
</template>

<script setup lang="ts">
import Button from "@/components/volt/Button.vue"
import { useToast } from "primevue/usetoast"

const toast = useToast()

const show = () => {
  toast.add({ severity: "info", summary: "Info", detail: "Message Content", life: 3000 })
}
</script>
