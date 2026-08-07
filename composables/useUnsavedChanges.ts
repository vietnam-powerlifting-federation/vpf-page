import type { Ref } from "vue"

/**
 * Warn before leaving a page with unsaved edits.
 *
 * Covers in-app navigation (the profile layout's sidebar uses router.push, which
 * onBeforeRouteLeave intercepts) and full unloads via beforeunload. State only — the
 * caller renders the confirm dialog, so the styling stays with the page.
 */
export function useUnsavedChanges(isDirty: Ref<boolean>) {
  const router = useRouter()

  const promptVisible = ref(false)
  let pendingPath: string | null = null
  // Set while we replay the blocked navigation, so the guard does not re-open the
  // dialog on our own router.push and trap the athlete on the page.
  let bypass = false

  onBeforeRouteLeave((to) => {
    if (bypass) {
      bypass = false
      return true
    }
    if (!isDirty.value) return true
    pendingPath = to.fullPath
    promptVisible.value = true
    return false
  })

  function leave() {
    promptVisible.value = false
    if (!pendingPath) return
    const target = pendingPath
    pendingPath = null
    bypass = true
    router.push(target)
  }

  function keepEditing() {
    promptVisible.value = false
    pendingPath = null
  }

  /** Runs the caller's save and only navigates if it reports success. */
  async function saveAndLeave(save: () => Promise<boolean>) {
    const saved = await save()
    if (saved) leave()
    else promptVisible.value = false
  }

  function onBeforeUnload(event: BeforeUnloadEvent) {
    if (!isDirty.value) return
    event.preventDefault()
    event.returnValue = ""
  }

  onMounted(() => window.addEventListener("beforeunload", onBeforeUnload))
  onBeforeUnmount(() => window.removeEventListener("beforeunload", onBeforeUnload))

  return { promptVisible, discard: leave, keepEditing, saveAndLeave }
}
