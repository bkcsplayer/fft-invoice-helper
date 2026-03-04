import { createContext, useContext, useState, useCallback } from 'react'
import api, { setToken, clearToken } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(false)

    const login = useCallback(async (username, password) => {
        setLoading(true)
        try {
            const res = await api.post('/auth/login', { username, password })
            setToken(res.data.access_token)
            setUser({ username })
            return { success: true }
        } catch (err) {
            return {
                success: false,
                error: err.response?.data?.detail || 'Login failed',
            }
        } finally {
            setLoading(false)
        }
    }, [])

    const logout = useCallback(() => {
        clearToken()
        setUser(null)
    }, [])

    const isAuthenticated = !!user

    return (
        <AuthContext.Provider value={{ user, login, logout, isAuthenticated, loading }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => {
    const context = useContext(AuthContext)
    if (!context) throw new Error('useAuth must be used within AuthProvider')
    return context
}
