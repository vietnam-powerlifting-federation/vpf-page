/** A form's element and a way to move focus to its first invalid field after a failed submit. */
export function useFormFocus() {
  const formEl = ref<HTMLFormElement | null>(null)

  async function focusFirstInvalid() {
    await nextTick()
    formEl.value?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus()
  }

  return { formEl, focusFirstInvalid }
}
