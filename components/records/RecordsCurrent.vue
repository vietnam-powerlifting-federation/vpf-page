<template>
  <!-- Current records: weight class × lift. -->
  <div class="overflow-clip rounded-md border border-surface-200 bg-surface-0" :aria-busy="pending || undefined">
    <TableSkeleton v-if="!loaded" :columns="4" :rows="9" />
    <TableEmpty
      v-else-if="rows.length === 0"
      :title="$t('records.matrixEmptyTitle')"
      :body="$t('records.matrixEmptyBody', { category: categoryLabel, division: divisionLabel })"
    />
    <RecordsMatrix
      v-else
      :rows="rows"
      :sex="sex"
      :weight-classes="weightClasses"
      :caption="$t('records.matrixCaption', { category: categoryLabel, division: divisionLabel })"
      :decorators="decoratorMap"
      @open="emit('open', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import type { RecordRow } from "~/types/records"
import type { Sex } from "~/types/union-types"

/** The standing records for one category and division, as a weight class × lift matrix. */
defineProps<{
  rows: RecordRow[]
  loaded: boolean
  pending: boolean
  sex: Sex
  weightClasses: readonly number[]
  categoryLabel: string
  divisionLabel: string
}>()
const emit = defineEmits<{ open: [row: RecordRow] }>()

const { decoratorMap } = useNameDecorators()
</script>
