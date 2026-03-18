import { onMounted } from "vue"
import { storeToRefs } from "pinia"
import { useProfileStore } from "~/stores/profile"

export const PROFILE_ATHLETE_KEY = "openvpf-profile-athlete"

export function useProfileAthlete() {
  const { $pinia } = useNuxtApp()
  const store = useProfileStore($pinia)
  const { data, pending, error } = storeToRefs(store)

  onMounted(() => {
    if (!data.value && !pending.value) {
      void store.fetchProfile()
    }
  })

  return {
    data,
    pending,
    error,
    refresh: () => store.fetchProfile({ force: true }),
  }
}
