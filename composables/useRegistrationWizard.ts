import { REGISTRATION_STEPS, type RegistrationStep } from "~/lib/domain/registration"

/** The registration wizard's position: the current step, its progress labels, and moving to a step with focus on its heading. */
export function useRegistrationWizard() {
  const { t } = useI18n()

  const step = ref<RegistrationStep>("identity")

  const stepLabels = computed(() => [
    t("competitionRegistration.stepIdentity"),
    t("competitionRegistration.stepCapacity"),
    t("competitionRegistration.stepDetails"),
    t("competitionRegistration.stepReview"),
    t("competitionRegistration.stepPayment"),
    t("competitionRegistration.stepDone"),
  ])
  const stepIndex = computed(() => REGISTRATION_STEPS.indexOf(step.value))

  // Each step's heading registers itself, so keyboard and screen-reader users start there after a move.
  let heading: HTMLElement | null = null
  const setHeading = (el: unknown) => { heading = el instanceof HTMLElement ? el : null }

  async function goTo(next: RegistrationStep) {
    step.value = next
    await nextTick()
    heading?.focus()
  }

  return { step, stepLabels, stepIndex, setHeading, goTo }
}
