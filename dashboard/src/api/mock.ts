import type { AdminUrl, ApiKey, CreatorStat, Summary, User } from '../types'

const now = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
export const mockUser: User = { id: 'user-1', name: 'María López', email: 'maria@example.com', role: 'admin', created_at: now, updated_at: now }
export const mockUrls: AdminUrl[] = [
  { id: 'url-1', code: 'curso26', url: 'https://ejemplo.com/cursos/desarrollo-web?ref=dashboard', short_url: 'http://localhost:3000/curso26', click_count: 284, created_at: now, updated_at: now, creator: { id: mockUser.id, name: mockUser.name } },
  { id: 'url-2', code: 'docsapi', url: 'https://developer.mozilla.org/es/docs/Web/JavaScript', short_url: 'http://localhost:3000/docsapi', click_count: 132, created_at: now, updated_at: now, creator: { id: mockUser.id, name: mockUser.name } },
  { id: 'url-3', code: 'proyecto', url: 'https://github.com/carlos388mendoza/Acortador-de-URLs', short_url: 'http://localhost:3000/proyecto', click_count: 87, created_at: now, updated_at: now, creator: { id: 'user-2', name: 'Carlos Mendoza' } },
]
export const mockKeys: ApiKey[] = [{ id: 'key-1', name: 'Integración de pruebas', key_prefix: 'sk_12ab', is_active: true, last_used_at: null, created_at: now, owner: { id: mockUser.id, name: mockUser.name } }]
export const mockSummary: Summary = { total_urls: 3, total_clicks: 503, total_users: 2, active_api_keys: 1 }
export const mockCreators: CreatorStat[] = [{ user: { id: mockUser.id, name: mockUser.name, email: mockUser.email }, url_count: 2, click_count: 416 }, { user: { id: 'user-2', name: 'Carlos Mendoza', email: 'carlos@example.com' }, url_count: 1, click_count: 87 }]

export async function mockRequest(path: string, init: RequestInit = {}): Promise<unknown> {
  await new Promise((resolve) => setTimeout(resolve, 180))
  const method = init.method ?? 'GET'
  const url = new URL(path, window.location.origin)
  const body = init.body ? JSON.parse(String(init.body)) as Record<string, unknown> : {}
  if (url.pathname === '/api/auth/me' && method === 'PATCH') return { user: { ...mockUser, ...body } }
  if (url.pathname === '/api/auth/me') return { user: mockUser }
  if (url.pathname === '/api/auth/login') return { user: mockUser }
  if (url.pathname === '/api/auth/logout') return null
  if (url.pathname.startsWith('/api/admin/urls/')) { const id = url.pathname.split('/').at(-1); const index = mockUrls.findIndex((item) => item.id === id); if (method === 'PATCH' && index >= 0) { mockUrls[index] = { ...mockUrls[index], ...body, updated_at: now }; return { admin_url: mockUrls[index] } } if (method === 'DELETE' && index >= 0) { mockUrls.splice(index, 1); return null } }
  if (url.pathname.startsWith('/api/admin/api-keys/')) { const id = url.pathname.split('/').at(-1); const key = mockKeys.find((item) => item.id === id); if (key && method === 'PATCH') { Object.assign(key, body); return { api_key: key } } if (key && method === 'DELETE') { key.is_active = false; return null } }
  if (url.pathname.startsWith('/api/admin/users/')) { const id = url.pathname.split('/').at(-1); if (method === 'PATCH') return { user: { ...mockUser, ...body, id } }; if (method === 'DELETE') return null }
  if (url.pathname === '/api/admin/urls') {
    if (method === 'POST') {
      const created: AdminUrl = { id: crypto.randomUUID(), code: String(body.code || `demo${mockUrls.length + 1}`), url: String(body.url), short_url: `http://localhost:3000/${String(body.code || `demo${mockUrls.length + 1}`)}`, click_count: 0, created_at: now, updated_at: now, creator: { id: mockUser.id, name: mockUser.name } }
      mockUrls.unshift(created); return { admin_url: created }
    }
    const search = url.searchParams.get('search')?.toLowerCase() || ''
    const data = mockUrls.filter((item) => `${item.code} ${item.url}`.toLowerCase().includes(search))
    return { data, total: data.length, page: Number(url.searchParams.get('page') || 1), limit: Number(url.searchParams.get('limit') || 20) }
  }
  if (url.pathname === '/api/admin/api-keys') {
    if (method === 'POST') {
      const api_key: ApiKey = { id: crypto.randomUUID(), name: String(body.name), key_prefix: 'sk_demo', is_active: true, last_used_at: null, created_at: now, owner: { id: mockUser.id, name: mockUser.name } }
      mockKeys.unshift(api_key); return { api_key, key: `sk_${crypto.randomUUID().replaceAll('-', '')}` }
    }
    return { data: mockKeys }
  }
  if (url.pathname === '/api/admin/users') { if (method === 'POST') return { user: { ...mockUser, ...body, id: crypto.randomUUID() } }; return { data: [mockUser, { ...mockUser, id: 'user-2', name: 'Carlos Mendoza', email: 'carlos@example.com', role: 'user' }], total: 2, page: 1, limit: 20 } }
  if (url.pathname === '/api/admin/stats/summary') return mockSummary
  if (url.pathname === '/api/admin/stats/top-urls') return { data: [...mockUrls].sort((a, b) => b.click_count - a.click_count) }
  if (url.pathname === '/api/admin/stats/recent-urls') return { data: mockUrls }
  if (url.pathname === '/api/admin/stats/top-creators') return { data: mockCreators }
  if (url.pathname === '/api/admin/stats/clicks-per-day') {
    const days = Number(url.searchParams.get('days') || 30)
    return { data: Array.from({ length: days }, (_, i) => { const date = new Date(); date.setUTCDate(date.getUTCDate() - (days - i - 1)); return { date: date.toISOString().slice(0, 10), clicks: [0, 3, 8, 4, 10, 14, 6][i % 7] } }) }
  }
  if (url.pathname === '/api/admin/search') { const q = (url.searchParams.get('q') || '').toLowerCase(); return { urls: mockUrls.filter((item) => `${item.code} ${item.url}`.toLowerCase().includes(q)), users: [mockUser].filter((item) => `${item.name} ${item.email}`.toLowerCase().includes(q)), api_keys: mockKeys.filter((item) => `${item.name} ${item.key_prefix}`.toLowerCase().includes(q)) } }
  return { data: [] }
}
