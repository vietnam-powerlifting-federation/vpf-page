/** Title and description for a page, from i18n keys, so they follow the active locale. */
export function usePageSeo(titleKey: string, descriptionKey: string, options: { ogType?: "website" | "article" | "profile" } = {}) {
  const { t } = useI18n()
  useSeoMeta({
    title: () => t(titleKey),
    description: () => t(descriptionKey),
    ogTitle: () => t(titleKey),
    ogDescription: () => t(descriptionKey),
    ...(options.ogType ? { ogType: options.ogType } : {}),
  })
}
