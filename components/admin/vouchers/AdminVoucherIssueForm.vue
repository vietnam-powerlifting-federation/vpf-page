<template>
  <form
    class="mb-8 border border-surface-200 rounded-md p-4 md:p-5 space-y-4"
    @submit.prevent="vouchers.issue"
  >
    <h2 class="font-display text-lg font-bold tracking-[0.04em] uppercase">{{ $t("adminVouchers.issueTitle") }}</h2>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="flex flex-col gap-1">
        <label for="vpfId" class="text-sm text-muted-color">{{ $t("adminVouchers.athlete") }}</label>
        <InputText id="vpfId" v-model="vouchers.form.vpfId" placeholder="VPF000123" required />
        <small class="text-muted-color">{{ $t("adminVouchers.athleteHint") }}</small>
      </div>

      <div class="flex flex-col gap-1">
        <label for="type" class="text-sm text-muted-color">{{ $t("adminVouchers.type") }}</label>
        <Select id="type" v-model="vouchers.form.type" :options="vouchers.typeOptions" option-label="label" option-value="value" />
      </div>

      <div class="flex flex-col gap-1">
        <label for="expiresAt" class="text-sm text-muted-color">{{ $t("adminVouchers.expiresAt") }}</label>
        <DatePicker id="expiresAt" v-model="vouchers.form.expiresAt" date-format="dd/mm/yy" :min-date="vouchers.today" show-icon />
      </div>

      <div class="flex flex-col gap-1">
        <label for="discountKind" class="text-sm text-muted-color">{{ $t("adminVouchers.discountKind") }}</label>
        <Select
          id="discountKind"
          v-model="vouchers.form.discountKind"
          :options="vouchers.discountKindOptions"
          option-label="label"
          option-value="value"
        />
      </div>

      <div class="flex flex-col gap-1">
        <label for="discountValue" class="text-sm text-muted-color">{{ $t("adminVouchers.discountValue") }}</label>
        <InputNumber
          id="discountValue"
          v-model="vouchers.form.discountValue"
          :min="1"
          :max="vouchers.form.discountKind === 'percent' ? 100 : undefined"
          :suffix="vouchers.form.discountKind === 'percent' ? ' %' : ' ₫'"
          :step="vouchers.form.discountKind === 'percent' ? 1 : 10000"
        />
      </div>

      <div class="flex flex-col gap-1">
        <label for="note" class="text-sm text-muted-color">{{ $t("adminVouchers.note") }}</label>
        <InputText id="note" v-model="vouchers.form.note" :placeholder="$t('adminVouchers.notePlaceholder')" />
      </div>
    </div>

    <!--
      Bulk issue (§8): a Tết promotion to 200 athletes is otherwise 200 clicks.
      Every recipient still gets their own code — a voucher is single-use and
      per-athlete, and a shared code could be neither.
    -->
    <div class="flex items-center gap-2">
      <Checkbox v-model="vouchers.bulkMode" input-id="bulkMode" binary />
      <label for="bulkMode" class="text-sm text-color">{{ $t("adminVouchers.bulkMode") }}</label>
    </div>

    <div v-if="vouchers.bulkMode" class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <AppField v-slot="f" :label="$t('adminVouchers.bulkAudience')">
        <Select
          v-model="vouchers.bulkAudience"
          :aria-labelledby="f.labelId"
          :options="vouchers.audienceOptions"
          option-label="label"
          option-value="value"
        />
      </AppField>
      <AppField v-if="vouchers.bulkAudience === 'list'" v-slot="f" :label="$t('adminVouchers.bulkIds')">
        <Textarea :id="f.id" v-model="vouchers.bulkIds" rows="3" :placeholder="$t('adminVouchers.bulkIdsHint')" />
      </AppField>
    </div>

    <Button
      v-if="vouchers.bulkMode"
      type="button"
      :label="$t('adminVouchers.bulkIssue')"
      :loading="vouchers.isIssuing"
      @click="vouchers.issueBulk"
    />
    <Button v-else type="submit" :label="$t('adminVouchers.issue')" :loading="vouchers.isIssuing" :disabled="!vouchers.canIssue" />
  </form>
</template>

<script setup lang="ts">
/** Issue a voucher to one athlete, or to many at once (a list of IDs, or every active member). */
const vouchers = useAdminVouchers()
</script>
