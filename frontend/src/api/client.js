import axios from 'axios'

const api = axios.create({
    baseURL: '/api',
    headers: {
        'Content-Type': 'application/json',
    },
})

// Token storage (in memory only, not localStorage)
let accessToken = null

export const setToken = (token) => {
    accessToken = token
}

export const getToken = () => accessToken

export const clearToken = () => {
    accessToken = null
}

// Request interceptor: attach token
api.interceptors.request.use(
    (config) => {
        if (accessToken) {
            config.headers.Authorization = `Bearer ${accessToken}`
        }
        return config
    },
    (error) => Promise.reject(error)
)

// Response interceptor: handle 401
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            clearToken()
            window.location.href = '/login'
        }
        return Promise.reject(error)
    }
)

export default api
