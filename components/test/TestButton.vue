
<template>
    <div class="card flex justify-center">
        <Button :label="$t('test.show')" @click="show()" />
    </div>
</template>

<script setup lang="ts">

const toast = useToast()
const { t } = useI18n()

const show = () => {
  toast.add({ severity: "info", summary: t("test.info"), detail: t("test.messageContent"), life: 3000 })
  navigateTo("/openvpf")
}
</script>
