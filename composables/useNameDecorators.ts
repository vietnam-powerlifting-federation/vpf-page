import type { ApiResponse } from "~/types/api"
import type { UserPublic, UserPublicWithDecorators } from "~/types/users"

type NameDecorator = {
  vpfId: string
  decorator1: string | null
  decorator2: string | null
}

export function useNameDecorators() {
  const decorators = useState<NameDecorator[]>("name-decorators", () => [])

  const decoratorMap = computed(() => new Map(decorators.value.map(d => [d.vpfId, d])))

  async function fetchDecorators() {
    const res = await $fetch<ApiResponse<NameDecorator[]>>("/api/vip-settings")
    if (res.success && res.data) {
      decorators.value = res.data
    }
  }

  function applyDecorators(athletes: UserPublic[]): UserPublicWithDecorators[] {
    const map = decoratorMap.value
    return athletes.map(a => {
      const dec = map.get(a.vpfId)
      return dec ? { ...a, decorator1: dec.decorator1, decorator2: dec.decorator2 } : a
    })
  }

  return { fetchDecorators, applyDecorators, decoratorMap }
}
