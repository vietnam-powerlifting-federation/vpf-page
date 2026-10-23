/** The tab title for a page, from an i18n key, so it follows the active locale. */
export function usePageTitle(titleKey: string) {
  const { t } = useI18n()
  useHead({ title: () => t(titleKey) })
}
