import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api/client'
import { formatCurrency, getStatusBadgeClass } from '../utils/formatters'
import { getToken } from '../api/client'

export default function InvoicesListPage() {
    const [invoices, setInvoices] = useState([])
    const [total, setTotal] = useState(0)
    const [page, setPage] = useState(1)
    const [pageSize] = useState(20)
    const [statusFilter, setStatusFilter] = useState('')
    const [search, setSearch] = useState('')
    const [loading, setLoading] = useState(true)
    const [toast, setToast] = useState(null)
    const [sendingId, setSendingId] = useState(null)
    const navigate = useNavigate()

    const showToast = (message, type = 'info') => {
        setToast({ message, type })
        setTimeout(() => setToast(null), 4000)
    }

    useEffect(() => {
        loadInvoices()
    }, [page, statusFilter])

    const loadInvoices = async () => {
        setLoading(true)
        try {
            const params = { page, page_size: pageSize }
            if (statusFilter) params.status = statusFilter
            if (search) params.search = search
            const res = await api.get('/invoices', { params })
            setInvoices(res.data.items)
            setTotal(res.data.total)
        } catch (err) {
            console.error('Load invoices error:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleSearch = (e) => {
        e.preventDefault()
        setPage(1)
        loadInvoices()
    }

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this invoice?')) return
        try {
            await api.delete(`/invoices/${id}`)
            showToast('Invoice deleted', 'success')
            loadInvoices()
        } catch (err) {
            showToast('Delete failed: ' + (err.response?.data?.detail || err.message), 'error')
        }
    }

    const handleStatusChange = async (id, newStatus) => {
        try {
            await api.patch(`/invoices/${id}/status`, { status: newStatus })
            loadInvoices()
        } catch (err) {
            showToast('Status update failed: ' + (err.response?.data?.detail || err.message), 'error')
        }
    }

    const handleDownloadPdf = async (id) => {
        try {
            const res = await api.get(`/invoices/${id}/download-pdf`, { responseType: 'blob' })
            // Check if response is actually an error (JSON)
            const contentType = res.headers?.['content-type'] || ''
            if (contentType.includes('json')) {
                const text = await res.data.text()
                try {
                    const err = JSON.parse(text)
                    showToast('PDF error: ' + (err.detail || 'Unknown error'), 'error')
                } catch {
                    showToast('PDF error: ' + text, 'error')
                }
                return
            }
            const blob = new Blob([res.data], { type: 'application/pdf' })
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.style.display = 'none'
            a.href = url
            a.download = `invoice_${id}.pdf`
            document.body.appendChild(a)
            a.click()
            setTimeout(() => {
                document.body.removeChild(a)
                window.URL.revokeObjectURL(url)
            }, 100)
        } catch (err) {
            showToast('PDF download failed: ' + (err.response?.data?.detail || err.message), 'error')
        }
    }

    const handleSendEmail = async (inv) => {
        const email = inv.bill_to_email
        if (!email) {
            showToast('No client email on this invoice. Edit the invoice and add a client email first.', 'error')
            return
        }
        if (!window.confirm('Send invoice ' + inv.invoice_number + ' to ' + email + '?')) return
        setSendingId(inv.id)
        try {
            await api.post(`/invoices/${inv.id}/send-email`, { emails: [email] })
            showToast('Invoice sent to ' + email + ' successfully!', 'success')
            loadInvoices()
        } catch (err) {
            showToast('Send email failed: ' + (err.response?.data?.detail || err.message), 'error')
        } finally {
            setSendingId(null)
        }
    }

    const totalPages = Math.ceil(total / pageSize)

    return (
        <div className="space-y-5">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all ${toast.type === 'success' ? 'bg-green-500 text-white' :
                        toast.type === 'error' ? 'bg-red-500 text-white' :
                            'bg-blue-500 text-white'
                    }`}>
                    {toast.message}
                </div>
            )}

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <h1 className="text-2xl font-bold text-gray-800">Invoices</h1>
                <Link to="/invoices/new" className="btn btn-primary">
                    ➕ New Invoice
                </Link>
            </div>

            {/* Filters */}
            <div className="card p-4">
                <div className="flex flex-col sm:flex-row gap-3">
                    <form onSubmit={handleSearch} className="flex-1 flex gap-2">
                        <input
                            id="invoice-search"
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by invoice # or client name..."
                            className="input-field flex-1"
                        />
                        <button type="submit" className="btn btn-primary">
                            🔍 Search
                        </button>
                    </form>
                    <select
                        id="status-filter"
                        value={statusFilter}
                        onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
                        className="input-field w-auto min-w-[150px]"
                    >
                        <option value="">All Statuses</option>
                        <option value="draft">Draft</option>
                        <option value="sent">Sent</option>
                        <option value="paid">Paid</option>
                        <option value="overdue">Overdue</option>
                        <option value="cancelled">Cancelled</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="card overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center h-48">
                        <div className="spinner" style={{ width: 32, height: 32 }} />
                    </div>
                ) : invoices.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-gray-400 gap-2">
                        <span className="text-4xl">📄</span>
                        <p>No invoices found</p>
                        <Link to="/invoices/new" className="text-primary-600 hover:underline text-sm">
                            Create your first invoice
                        </Link>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Invoice #</th>
                                    <th>Client</th>
                                    <th>Date</th>
                                    <th>Amount</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {invoices.map((inv) => (
                                    <tr key={inv.id}>
                                        <td>
                                            <Link to={`/invoices/${inv.id}`} className="text-primary-600 hover:underline font-medium">
                                                {inv.invoice_number}
                                            </Link>
                                        </td>
                                        <td className="text-gray-600">{inv.bill_to_name}</td>
                                        <td className="text-gray-500 text-sm">{inv.invoice_date}</td>
                                        <td className="font-semibold">{formatCurrency(inv.total)}</td>
                                        <td>
                                            <select
                                                value={inv.status}
                                                onChange={(e) => handleStatusChange(inv.id, e.target.value)}
                                                className={`text-xs font-semibold px-2 py-1 rounded-full border-none outline-none cursor-pointer ${inv.status === 'paid' ? 'bg-green-100 text-green-700' :
                                                    inv.status === 'sent' ? 'bg-blue-100 text-blue-700' :
                                                        inv.status === 'overdue' ? 'bg-red-100 text-red-700' :
                                                            inv.status === 'cancelled' ? 'bg-orange-100 text-orange-700' :
                                                                'bg-gray-100 text-gray-600'
                                                    }`}
                                            >
                                                <option value="draft">Draft</option>
                                                <option value="sent">Sent</option>
                                                <option value="paid">Paid</option>
                                                <option value="overdue">Overdue</option>
                                                <option value="cancelled">Cancelled</option>
                                            </select>
                                        </td>
                                        <td>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => navigate(`/invoices/${inv.id}`)}
                                                    className="p-1.5 hover:bg-gray-100 rounded-lg text-sm"
                                                    title="Edit"
                                                >✏️</button>
                                                <button
                                                    onClick={() => handleSendEmail(inv)}
                                                    className={`p-1.5 rounded-lg text-sm ${inv.bill_to_email ? 'hover:bg-blue-50' : 'opacity-30 cursor-not-allowed'}`}
                                                    title={inv.bill_to_email ? 'Send to ' + inv.bill_to_email : 'No client email — edit invoice to add'}
                                                    disabled={sendingId === inv.id}
                                                >{sendingId === inv.id ? '⏳' : '✉️'}</button>
                                                <button
                                                    onClick={() => handleDownloadPdf(inv.id)}
                                                    className="p-1.5 hover:bg-gray-100 rounded-lg text-sm"
                                                    title="Download PDF"
                                                >📥</button>
                                                <button
                                                    onClick={() => handleDelete(inv.id)}
                                                    className="p-1.5 hover:bg-red-50 rounded-lg text-sm"
                                                    title="Delete"
                                                >🗑️</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between p-4 border-t border-gray-100">
                        <p className="text-sm text-gray-500">
                            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
                        </p>
                        <div className="flex gap-1">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="btn btn-secondary text-xs px-3 py-1.5 disabled:opacity-40"
                            >← Prev</button>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="btn btn-secondary text-xs px-3 py-1.5 disabled:opacity-40"
                            >Next →</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
