
<template>
    <div class="card flex justify-center">
        <Button :label="$t('test.show')" @click="show()" />
    </div>
</template>

<script setup lang="ts">
import Button from "@/components/volt/Button.vue"
import { useToast } from "primevue/usetoast"

const toast = useToast()
const { t } = useI18n()

const show = () => {
  toast.add({ severity: "info", summary: t("test.info"), detail: t("test.messageContent"), life: 3000 })
}
</script>
