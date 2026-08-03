import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:4000/api',
  headers: { 'Content-Type': 'application/json' },
})

// Request interceptor to attach token and pointDeVenteId
api.interceptors.request.use((config) => {
  try {
    const raw = localStorage.getItem('auth')
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed?.token) {
        config.headers.Authorization = `Bearer ${parsed.token}`
      }
      if (parsed?.profile?.pointDeVenteId) {
        config.headers['X-Point-De-Vente-Id'] = parsed.profile.pointDeVenteId
      }
    }
  } catch (e) {}
  return config
})

export default api
