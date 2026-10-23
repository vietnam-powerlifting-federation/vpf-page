<template>
  <AdminPage :title="$t('adminVouchers.title')" :subtitle="$t('adminVouchers.subtitle')">
    <AdminVoucherStats />
    <AdminVoucherIssueForm />
    <AdminVoucherTable />
    <AdminVoucherDialogs />
  </AdminPage>
</template>

<script setup lang="ts">
/** Vouchers: totals, an issue form (single or bulk), and the list with edit and revoke. */
const { ready } = useAdminVouchersPage()
await ready
</script>
