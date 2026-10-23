<template>
  <Dialog v-model:visible="vouchers.editOpen" :header="$t('adminVouchers.editTitle')" modal class="w-full max-w-md">
    <p class="text-sm text-muted-color font-mono mb-4">{{ vouchers.editTarget?.code }}</p>
    <div class="space-y-3">
      <AppField v-slot="f" :label="$t('adminVouchers.discountKind')">
        <Select v-model="vouchers.editForm.discountKind" :aria-labelledby="f.labelId" :options="vouchers.discountKindOptions" option-label="label" option-value="value" />
      </AppField>
      <AppField v-slot="f" :label="$t('adminVouchers.discountValue')">
        <InputNumber
          v-model="vouchers.editForm.discountValue"
          :input-id="f.id"
          :min="1"
          :max="vouchers.editForm.discountKind === 'percent' ? 100 : undefined"
          :suffix="vouchers.editForm.discountKind === 'percent' ? ' %' : ' ₫'"
        />
      </AppField>
      <AppField v-slot="f" :label="$t('adminVouchers.expiresAt')">
        <DatePicker v-model="vouchers.editForm.expiresAt" :input-id="f.id" date-format="dd/mm/yy" show-icon />
      </AppField>
      <AppField v-slot="f" :label="$t('adminVouchers.note')">
        <InputText :id="f.id" v-model="vouchers.editForm.note" />
      </AppField>
    </div>
    <template #footer>
      <Button text :label="$t('adminVouchers.cancel')" @click="vouchers.editOpen = false" />
      <Button :label="$t('adminVouchers.saveEdit')" :loading="vouchers.isEditing" @click="vouchers.saveEdit" />
    </template>
  </Dialog>

  <Dialog v-model:visible="vouchers.revokeOpen" :header="$t('adminVouchers.revokeTitle')" modal class="w-full max-w-md">
    <p class="text-sm text-muted-color">
      {{ $t("adminVouchers.revokePrompt", { code: vouchers.revokeTarget?.code ?? "" }) }}
    </p>
    <template #footer>
      <Button :label="$t('adminVouchers.cancel')" text @click="vouchers.revokeOpen = false" />
      <Button
        :label="$t('adminVouchers.confirmRevoke')"
        severity="danger"
        :loading="vouchers.actingCode !== null"
        @click="vouchers.confirmRevoke"
      />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
/** The dialogs to edit a voucher's discount, expiry and note, and to revoke one. */
const vouchers = useAdminVouchers()
</script>
