export default defineNuxtPlugin(() => {
  const route = useRoute()

  const updateRootClass = () => {
    const path = route.path
    const isOpenVpfRoute = path === "/openvpf" || path.startsWith("/openvpf/") || path === "/test"

    if (isOpenVpfRoute) {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }

  // Update on initial load
  updateRootClass()

  // Watch for route changes
  watch(() => route.path, () => {
    updateRootClass()
  })
})
