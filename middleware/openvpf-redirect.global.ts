export default defineNuxtRouteMiddleware((to) => {
  const path = to.path
  console.log(path)

  if (path.startsWith("/openvpf")) return
  if (path.startsWith("/login")) return

  return navigateTo("/openvpf" + path, { redirectCode: 301 })
})
