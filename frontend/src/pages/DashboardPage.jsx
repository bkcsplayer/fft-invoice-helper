import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, BarChart, Bar, Legend,
} from 'recharts'
import api from '../api/client'
import { formatCurrency, STATUS_COLORS, getStatusBadgeClass } from '../utils/formatters'

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const PIE_COLORS = ['#94a3b8', '#3b82f6', '#22c55e', '#ef4444', '#f97316']

export default function DashboardPage() {
    const [stats, setStats] = useState(null)
    const [monthly, setMonthly] = useState([])
    const [byStatus, setByStatus] = useState([])
    const [byCompany, setByCompany] = useState([])
    const [recent, setRecent] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadDashboard()
    }, [])

    const loadDashboard = async () => {
        try {
            const [statsRes, monthlyRes, statusRes, companyRes, recentRes] = await Promise.all([
                api.get('/dashboard/stats'),
                api.get('/dashboard/monthly'),
                api.get('/dashboard/by-status'),
                api.get('/dashboard/by-company'),
                api.get('/dashboard/recent'),
            ])
            setStats(statsRes.data)
            setMonthly(monthlyRes.data.map(d => ({
                ...d,
                name: `${MONTH_NAMES[d.month - 1]} ${d.year}`,
            })))
            setByStatus(statusRes.data)
            setByCompany(companyRes.data)
            setRecent(recentRes.data)
        } catch (err) {
            console.error('Dashboard load error:', err)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="spinner" style={{ width: 40, height: 40 }} />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                <StatCard icon="📄" label="Total Invoices" value={stats?.total_invoices || 0} color="blue" />
                <StatCard icon="💰" label="Total Revenue" value={formatCurrency(stats?.total_revenue)} color="green" />
                <StatCard icon="📅" label="This Month" value={formatCurrency(stats?.this_month)} color="purple" />
                <StatCard icon="⏳" label="Outstanding" value={formatCurrency(stats?.outstanding)} color="amber" />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Revenue Trend */}
                <div className="card p-6">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Monthly Revenue</h2>
                    <ResponsiveContainer width="100%" height={280}>
                        <AreaChart data={monthly}>
                            <defs>
                                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip formatter={(v) => formatCurrency(v)} />
                            <Area type="monotone" dataKey="amount" stroke="#2563eb" fill="url(#colorRevenue)" strokeWidth={2} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Status Distribution */}
                <div className="card p-6">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Invoice Status</h2>
                    {byStatus.length > 0 ? (
                        <ResponsiveContainer width="100%" height={280}>
                            <PieChart>
                                <Pie
                                    data={byStatus}
                                    cx="50%" cy="50%"
                                    innerRadius={60} outerRadius={100}
                                    paddingAngle={3}
                                    dataKey="count"
                                    nameKey="status"
                                    label={({ status, count }) => `${status} (${count})`}
                                >
                                    {byStatus.map((entry, idx) => (
                                        <Cell key={idx} fill={STATUS_COLORS[entry.status] || PIE_COLORS[idx % PIE_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-[280px] text-gray-400">
                            No invoice data yet
                        </div>
                    )}
                </div>
            </div>

            {/* Company Revenue & Recent Invoices */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Company Revenue */}
                <div className="card p-6">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Revenue by Company</h2>
                    {byCompany.length > 0 ? (
                        <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={byCompany}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="company" tick={{ fontSize: 12 }} />
                                <YAxis tick={{ fontSize: 12 }} />
                                <Tooltip formatter={(v) => formatCurrency(v)} />
                                <Bar dataKey="amount" fill="#2563eb" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-[280px] text-gray-400">
                            No company data yet
                        </div>
                    )}
                </div>

                {/* Recent Invoices */}
                <div className="card p-6">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Recent Invoices</h2>
                    {recent.length > 0 ? (
                        <div className="overflow-auto">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Invoice #</th>
                                        <th>Client</th>
                                        <th>Amount</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recent.map((inv) => (
                                        <tr key={inv.id}>
                                            <td>
                                                <Link to={`/invoices/${inv.id}`} className="text-primary-600 hover:underline font-medium">
                                                    {inv.invoice_number}
                                                </Link>
                                            </td>
                                            <td className="text-gray-600">{inv.bill_to_name}</td>
                                            <td className="font-medium">{formatCurrency(inv.total)}</td>
                                            <td><span className={getStatusBadgeClass(inv.status)}>{inv.status}</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-48 text-gray-400">
                            No invoices yet — <Link to="/invoices/new" className="text-primary-600 ml-1 hover:underline">create one</Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

function StatCard({ icon, label, value, color }) {
    const colorClasses = {
        blue: 'from-blue-500 to-blue-600',
        green: 'from-emerald-500 to-emerald-600',
        purple: 'from-purple-500 to-purple-600',
        amber: 'from-amber-500 to-amber-600',
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center text-xl text-white shadow-lg`}>
                {icon}
            </div>
            <div>
                <p className="text-sm text-gray-500">{label}</p>
                <p className="text-xl font-bold text-gray-800">{value}</p>
            </div>
        </div>
    )
}
