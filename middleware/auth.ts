export default defineNuxtRouteMiddleware(() => {
  // Get the auth token from cookies
  const token = useCookie("auth-token").value

  // If no token is present, redirect to index page
  if (!token) {
    return navigateTo("/login")
  }
})
