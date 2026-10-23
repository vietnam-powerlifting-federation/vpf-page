/** The VIP benefits page: the athlete's membership, and the settings of their VIP profile. */
export function useVipPage() {
  const membership = useVipMembership()
  const settings = useVipSettingsForm(
    computed(() => membership.vipSettings),
    computed(() => membership.showActive),
  )
  return { membership, settings }
}
