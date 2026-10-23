import { registrationBlockMessage, registrationGate } from "~/lib/domain/registration"
import type { ApiResponse } from "~/types/api"
import type { RegistrationEligibility } from "~/types/competitions"

export type Registration = ReturnType<typeof createRegistration>["registration"]

const REGISTRATION_KEY: InjectionKey<Registration> = Symbol("registration")

function createRegistration(slug: string) {
  const { t } = useI18n()

  // Not awaited here (the page awaits `ready`), so the state can be provided to the steps right away.
  const fetched = useFetch<ApiResponse<RegistrationEligibility>>(`/api/meets/${slug}/registrations/me`)
  const eligibility = computed<RegistrationEligibility | null>(() => (fetched.data.value?.success ? fetched.data.value.data : null))
  const gate = computed(() => (eligibility.value ? registrationGate(eligibility.value) : null))
  const blockMessage = computed(() => (eligibility.value ? registrationBlockMessage(eligibility.value, t) : ""))

  const wizard = useRegistrationWizard()
  const entry = useRegistrationForm(slug, eligibility, wizard.goTo)

  /** Re-read eligibility after an identity submission, so the submitted birth year drives the division options. */
  const refreshEligibility = async () => { await fetched.refresh() }

  const registration = reactive({
    eligibility, pending: fetched.pending, gate, blockMessage, refreshEligibility,
    wizard: reactive(wizard), entry,
  })
  return { registration, ready: fetched }
}

/**
 * The competition registration wizard's state, shared with its steps through provide/inject:
 * six sibling steps edit one entry, so each reads it with `useRegistration()` instead of
 * receiving props. Call once from the page, then `await ready` so the server render has the data.
 */
export function useRegistrationPage(slug: string) {
  const { registration, ready } = createRegistration(slug)
  provide(REGISTRATION_KEY, registration)
  return { registration, ready }
}

export function useRegistration(): Registration {
  const registration = inject(REGISTRATION_KEY)
  if (!registration) throw new Error("useRegistration() needs useRegistrationPage() in a parent page")
  return registration
}
