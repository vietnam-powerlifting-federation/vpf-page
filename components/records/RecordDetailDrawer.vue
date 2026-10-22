<template>
  <Drawer
    v-model:visible="visible"
    position="right"
    class="!w-[min(420px,92vw)]"
    :pt="{ header: { class: 'border-b border-surface-200 !py-3' } }"
  >
    <template #header>
      <strong class="font-display text-lg font-bold tracking-[0.06em] uppercase">{{ title }}</strong>
    </template>
    <template #closebutton="{ closeCallback }">
      <button type="button" autofocus class="grid size-11 cursor-pointer place-items-center rounded hover:bg-surface-100" :aria-label="$t('general.close')" @click="closeCallback">
        <AppIcon name="lucide:x" class="size-5" />
      </button>
    </template>

    <div v-if="record" class="grid gap-6 pt-2">
      <p class="font-display text-6xl leading-none font-extrabold tabular-nums">
        {{ formatKg(record.weight, locale) }}<span class="ml-1 font-sans text-xl font-semibold text-accent">kg</span>
      </p>

      <div>
        <p class="font-display text-[0.8125rem] font-bold tracking-[0.08em] text-muted-color uppercase">{{ $t("records.holder") }}</p>
        <NuxtLinkLocale :to="`/athletes/${record.slug || record.vpfId}`" class="text-xl font-semibold decoration-accent decoration-2 underline-offset-3 hover:underline">
          {{ record.name }}
        </NuxtLinkLocale>
        <p class="text-sm text-muted-color tabular-nums">{{ record.vpfId }}</p>
      </div>

      <dl class="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <div>
          <dt class="text-muted-color">{{ $t("records.attempt") }}</dt>
          <dd class="font-semibold">{{ record.attempt }}</dd>
        </div>
        <div>
          <dt class="text-muted-color">{{ $t("general.bodyWeight") }}</dt>
          <dd class="font-semibold tabular-nums">{{ record.bodyWeight ? `${formatKg(record.bodyWeight, locale)} kg` : "–" }}</dd>
        </div>
        <div>
          <dt class="text-muted-color">{{ $t("general.yearOfBirth") }}</dt>
          <dd class="font-semibold tabular-nums">{{ record.dob ?? "–" }}</dd>
        </div>
        <div>
          <dt class="text-muted-color">{{ $t("general.division") }}</dt>
          <dd class="font-semibold">{{ $t(DIVISION_LABEL_KEY[record.division]) }}</dd>
        </div>
        <div class="col-span-2">
          <dt class="text-muted-color">{{ $t("records.setAt") }}</dt>
          <dd class="font-semibold">
            <NuxtLinkLocale v-if="record.meetSlug" :to="`/competitions/${record.meetSlug}`" class="decoration-accent decoration-2 underline-offset-3 hover:underline">
              {{ record.meetName }}
            </NuxtLinkLocale>
            <span v-else>{{ record.meetName ?? "–" }}</span>
            <span class="block font-normal text-muted-color">{{ formatDate(record.hostDate, locale, "long") }}</span>
          </dd>
        </div>
      </dl>
    </div>
  </Drawer>
</template>

<script setup lang="ts">
import { DIVISION_LABEL_KEY, formatDate, formatKg, formatWeightClass } from "~/lib/domain/format"
import type { RecordRow } from "~/types/records"

/** Everything about one record: holder, attempt, body weight, year of birth and where it was set. */
const props = defineProps<{ record: RecordRow | null }>()
const visible = defineModel<boolean>("visible", { required: true })

const { t, locale } = useI18n()

const title = computed(() => {
  if (!props.record) return ""
  const lift = t(props.record.lift === "bench" ? "general.benchPress" : `general.${props.record.lift}`)
  return t("records.detailTitle", { lift, weightClass: formatWeightClass(props.record.weightClass, props.record.sex) })
})
</script>
