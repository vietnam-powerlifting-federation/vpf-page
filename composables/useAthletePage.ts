import { athleteMetaLine, hasVisibleSocials, vipBanners } from "~/lib/domain/athlete-profile"
import type { ApiResponse } from "~/types/api"
import type { AthleteProfileData } from "~/types/users"

/**
 * An athlete's public page: the whole profile aggregate (athlete, personal bests, history,
 * meets, records and VIP settings), with a 404 when there is no such athlete.
 * Returned as one reactive object. Call it with `await` from `<script setup>`.
 */
export async function useAthletePage(slug: string) {
  // Composables that need the component instance are called before the first await.
  const { t } = useI18n()
  const { athlete: me } = useAuthSession()

  const { data } = await useFetch<ApiResponse<AthleteProfileData>>(`/api/athletes/${slug}/profile`)
  const profile = computed(() => (data.value?.success ? data.value.data : null))

  if (!profile.value) {
    throw createError({ statusCode: 404, statusMessage: t("athlete.notFound"), fatal: true })
  }

  const athlete = computed(() => profile.value!.athlete)
  const vip = computed(() => profile.value?.vipSettings ?? null)
  const sex = computed(() => profile.value?.compHistory[0]?.sex ?? null)

  const metaLine = computed(() => athleteMetaLine(athlete.value, sex.value, t))
  const banners = computed(() => vipBanners(vip.value))
  const hasSocials = computed(() => hasVisibleSocials(vip.value))

  // Only the athlete may attach a photo to their own certificates. Who is signed in
  // is read in the browser (see SiteHeader), so this never affects the shared HTML.
  const isOwner = computed(() => me.value?.athlete.vpfId === athlete.value.vpfId)

  return reactive({ profile, athlete, vip, metaLine, banners, hasSocials, isOwner })
}
