<template>
  <AdminPage :title="$t('adminVerifications.title')" :subtitle="$t('adminVerifications.subtitle')">
    <div class="mb-4 flex gap-2">
      <SelectButton
        v-model="queue.statusFilter"
        :options="queue.statusOptions"
        option-label="label"
        option-value="value"
        :allow-empty="false"
      />
      <Button outlined @click="queue.refresh"><AppIcon name="lucide:refresh-cw" class="size-4" />{{ $t('adminVerifications.refresh') }}</Button>
    </div>

    <div v-if="queue.pending" class="flex justify-center py-12">
      <ProgressSpinner />
    </div>
    <div v-else-if="!queue.rows.length" class="text-muted-color py-8">
      {{ $t("adminVerifications.empty") }}
    </div>
    <DataTable v-else :value="queue.rows" striped-rows class="w-full border border-surface-200">
      <Column :header="$t('adminVerifications.athlete')">
        <template #body="{ data }">
          <div class="font-medium text-color">{{ data.fullName }}</div>
          <div class="text-xs text-muted-color">{{ data.vpfId }} · {{ data.userEmail }}</div>
        </template>
      </Column>
      <Column field="nationalId" :header="$t('verification.nationalId')" />
      <Column field="dob" :header="$t('verification.dob')" />
      <Column field="phoneNumber" :header="$t('verification.phoneNumber')" />
      <Column :header="$t('adminVerifications.idCard')">
        <template #body="{ data }">
          <button
            v-if="data.idCardFrontUrl"
            type="button"
            class="text-accent hover:underline text-sm"
            @click="queue.openImage(data.idCardFrontUrl)"
          >
            {{ $t("adminVerifications.viewImage") }}
          </button>
          <span v-else class="text-muted-color text-sm">{{ $t("adminVerifications.imageRemoved") }}</span>
        </template>
      </Column>
      <Column :header="$t('adminVerifications.status')">
        <template #body="{ data }">
          <Tag :value="queue.statusText(data.status)" :severity="queue.statusSeverity(data.status)" />
        </template>
      </Column>
      <Column :header="$t('adminVerifications.action')">
        <template #body="{ data }">
          <div class="flex gap-2">
            <Button
              size="small"
              :label="$t('adminVerifications.approve')"
              severity="success"
              :disabled="data.status === 'approved' || queue.actingId === data.id"
              @click="queue.approve(data)"
            />
            <Button
              size="small"
              :label="$t('adminVerifications.reject')"
              severity="danger"
              outlined
              :disabled="queue.actingId === data.id"
              @click="queue.openReject(data)"
            />
          </div>
        </template>
      </Column>
    </DataTable>

    <!-- Image preview dialog -->
    <Dialog :visible="queue.imageOpen" :header="$t('adminVerifications.idCard')" modal class="max-w-3xl" @update:visible="queue.imageOpen = $event">
      <img v-if="queue.imageUrl" :src="queue.imageUrl" alt="ID card" class="w-full object-contain">
    </Dialog>

    <!-- Reject reason dialog -->
    <Dialog :visible="queue.rejectOpen" :header="$t('adminVerifications.rejectTitle')" modal class="w-full max-w-md" @update:visible="queue.rejectOpen = $event">
      <p class="text-sm text-muted-color mb-3">{{ $t("adminVerifications.rejectPrompt") }}</p>
      <Textarea v-model="queue.rejectNote" rows="3" class="w-full" :placeholder="$t('adminVerifications.rejectPlaceholder')" />
      <template #footer>
        <Button :label="$t('adminVerifications.cancel')" text @click="queue.rejectOpen = false" />
        <Button :label="$t('adminVerifications.confirmReject')" severity="danger" :loading="queue.actingId !== null" @click="queue.confirmReject" />
      </template>
    </Dialog>
  </AdminPage>
</template>

<script setup lang="ts">
/** Identity verifications waiting for review: check the submitted details and ID card, then approve or reject with a reason. */
const queue = await useAdminVerifications()
</script>
