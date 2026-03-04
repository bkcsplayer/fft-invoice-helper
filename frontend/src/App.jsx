import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import InvoicesListPage from './pages/InvoicesListPage'
import InvoiceFormPage from './pages/InvoiceFormPage'
import SettingsPage from './pages/SettingsPage'

function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    {/* Public */}
                    <Route path="/login" element={<LoginPage />} />

                    {/* Protected routes with layout */}
                    <Route
                        path="/"
                        element={
                            <ProtectedRoute>
                                <Layout>
                                    <DashboardPage />
                                </Layout>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/invoices"
                        element={
                            <ProtectedRoute>
                                <Layout>
                                    <InvoicesListPage />
                                </Layout>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/invoices/new"
                        element={
                            <ProtectedRoute>
                                <Layout>
                                    <InvoiceFormPage />
                                </Layout>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/invoices/:id"
                        element={
                            <ProtectedRoute>
                                <Layout>
                                    <InvoiceFormPage />
                                </Layout>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/settings"
                        element={
                            <ProtectedRoute>
                                <Layout>
                                    <SettingsPage />
                                </Layout>
                            </ProtectedRoute>
                        }
                    />

                    {/* Catch-all */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    )
}

export default App
