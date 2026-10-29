import { mockRequest } from './mock'

// Los mocks son solo para desarrollo explícito y nunca se empaquetan en producción.
export const mocksEnabled = !import.meta.env.PROD && import.meta.env.VITE_USE_MOCKS === 'true'
const useMocks = mocksEnabled
export class ApiError extends Error { status: number; constructor(message: string, status: number) { super(message); this.status = status; this.name = 'ApiError' } }
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (useMocks) return await mockRequest(path, init) as T
  const response = await fetch(path, { ...init, credentials: 'include', headers: { 'Content-Type': 'application/json', ...init.headers } })
  if (response.status === 204) return null as T
  const payload = await response.json() as Record<string, unknown>
  if (!response.ok) throw new ApiError(typeof payload.error === 'string' ? payload.error : 'Ocurrió un error inesperado', response.status)
  return payload as T
}
export const apiPost = <T>(path: string, body: unknown) => api<T>(path, { method: 'POST', body: JSON.stringify(body) })
export const apiPatch = <T>(path: string, body: unknown) => api<T>(path, { method: 'PATCH', body: JSON.stringify(body) })
export const apiDelete = <T>(path: string) => api<T>(path, { method: 'DELETE' })
