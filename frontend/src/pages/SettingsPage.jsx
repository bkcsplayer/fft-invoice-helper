import { useState, useEffect } from 'react'
import api from '../api/client'

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState('smtp')
    const [toast, setToast] = useState(null)

    const showToast = (message, type) => {
        setToast({ message, type })
        setTimeout(() => setToast(null), 3000)
    }

    return (
        <div className="space-y-5 max-w-4xl mx-auto">
            {toast && <div className={`toast toast-${toast.type}`}>{toast.message}</div>}

            <h1 className="text-2xl font-bold text-gray-800">Settings</h1>

            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
                {[
                    { key: 'smtp', label: '📧 SMTP' },
                    { key: 'companies', label: '🏢 Companies' },
                    { key: 'service_types', label: '🔧 Service Types' },
                    { key: 'contacts', label: '📇 Contacts' },
                ].map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === tab.key
                                ? 'bg-white text-primary-600 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {activeTab === 'smtp' && <SmtpSettings showToast={showToast} />}
            {activeTab === 'companies' && <CompaniesSettings showToast={showToast} />}
            {activeTab === 'service_types' && <ServiceTypesSettings showToast={showToast} />}
            {activeTab === 'contacts' && <ContactsSettings showToast={showToast} />}
        </div>
    )
}

// ===== SMTP Settings =====
function SmtpSettings({ showToast }) {
    const [form, setForm] = useState({
        smtp_host: '', smtp_port: 587, smtp_username: '', smtp_password: '',
        smtp_use_tls: true, from_email: '', from_name: '',
    })
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [testing, setTesting] = useState(false)

    useEffect(() => {
        api.get('/settings/smtp').then(res => {
            setForm(f => ({ ...f, ...res.data, smtp_password: '' }))
        }).finally(() => setLoading(false))
    }, [])

    const handleSave = async (e) => {
        e.preventDefault()
        setSaving(true)
        try {
            const payload = { ...form }
            if (!payload.smtp_password) delete payload.smtp_password
            await api.put('/settings/smtp', payload)
            showToast('SMTP settings saved!', 'success')
        } catch (err) {
            showToast('Save failed: ' + (err.response?.data?.detail || err.message), 'error')
        } finally {
            setSaving(false)
        }
    }

    const handleTest = async () => {
        setTesting(true)
        try {
            await api.post('/settings/smtp/test')
            showToast('SMTP connection successful!', 'success')
        } catch (err) {
            showToast('Test failed: ' + (err.response?.data?.detail || err.message), 'error')
        } finally {
            setTesting(false)
        }
    }

    if (loading) return <div className="flex justify-center p-8"><div className="spinner" /></div>

    return (
        <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">SMTP Configuration</h2>
            <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">SMTP Host</label>
                        <input type="text" value={form.smtp_host} onChange={e => setForm(f => ({ ...f, smtp_host: e.target.value }))} className="input-field" placeholder="smtp.gmail.com" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Port</label>
                        <input type="number" value={form.smtp_port} onChange={e => setForm(f => ({ ...f, smtp_port: Number(e.target.value) }))} className="input-field" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Username</label>
                        <input type="text" value={form.smtp_username} onChange={e => setForm(f => ({ ...f, smtp_username: e.target.value }))} className="input-field" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Password</label>
                        <input type="password" value={form.smtp_password} onChange={e => setForm(f => ({ ...f, smtp_password: e.target.value }))} className="input-field" placeholder="Leave blank to keep current" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">From Email</label>
                        <input type="email" value={form.from_email} onChange={e => setForm(f => ({ ...f, from_email: e.target.value }))} className="input-field" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">From Name</label>
                        <input type="text" value={form.from_name} onChange={e => setForm(f => ({ ...f, from_name: e.target.value }))} className="input-field" />
                    </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.smtp_use_tls} onChange={e => setForm(f => ({ ...f, smtp_use_tls: e.target.checked }))} className="w-4 h-4 accent-primary-600" />
                    <span className="text-sm font-medium text-gray-700">Use TLS</span>
                </label>
                <div className="flex gap-3 pt-2">
                    <button type="submit" disabled={saving} className="btn btn-primary disabled:opacity-50">
                        {saving ? 'Saving...' : '💾 Save Settings'}
                    </button>
                    <button type="button" onClick={handleTest} disabled={testing} className="btn btn-secondary disabled:opacity-50">
                        {testing ? 'Testing...' : '🔌 Test Connection'}
                    </button>
                </div>
            </form>
        </div>
    )
}

// ===== Companies Settings =====
function CompaniesSettings({ showToast }) {
    const [companies, setCompanies] = useState([])
    const [loading, setLoading] = useState(true)
    const [editId, setEditId] = useState(null)
    const [form, setForm] = useState({ code: '', name: '', full_name: '', address: '', phone: '', email: '', website: '', gst_number: '' })

    const load = () => {
        api.get('/companies').then(res => setCompanies(res.data)).finally(() => setLoading(false))
    }
    useEffect(() => { load() }, [])

    const handleSave = async (e) => {
        e.preventDefault()
        try {
            if (editId) {
                await api.put(`/companies/${editId}`, form)
                showToast('Company updated!', 'success')
            } else {
                await api.post('/companies', form)
                showToast('Company added!', 'success')
            }
            setForm({ code: '', name: '', full_name: '', address: '', phone: '', email: '', website: '', gst_number: '' })
            setEditId(null)
            load()
        } catch (err) {
            showToast('Save failed: ' + (err.response?.data?.detail || err.message), 'error')
        }
    }

    const handleEdit = (c) => {
        setEditId(c.id)
        setForm({ code: c.code, name: c.name, full_name: c.full_name || '', address: c.address || '', phone: c.phone || '', email: c.email || '', website: c.website || '', gst_number: c.gst_number || '' })
    }

    const handleDelete = async (id) => {
        if (!confirm('Delete this company?')) return
        try {
            await api.delete(`/companies/${id}`)
            showToast('Company deleted', 'success')
            load()
        } catch (err) {
            showToast('Delete failed', 'error')
        }
    }

    if (loading) return <div className="flex justify-center p-8"><div className="spinner" /></div>

    return (
        <div className="space-y-4">
            <div className="card p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">{editId ? 'Edit Company' : 'Add Company'}</h2>
                <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input type="text" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} className="input-field" placeholder="Code (e.g. FFT)" required />
                    <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input-field" placeholder="Company Name" required />
                    <input type="text" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} className="input-field" placeholder="Full Legal Name" />
                    <input type="text" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className="input-field" placeholder="Address" />
                    <input type="text" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="input-field" placeholder="Phone" />
                    <input type="text" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="input-field" placeholder="Email" />
                    <input type="text" value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} className="input-field" placeholder="Website" />
                    <input type="text" value={form.gst_number} onChange={e => setForm(f => ({ ...f, gst_number: e.target.value }))} className="input-field" placeholder="GST Number" />
                    <div className="md:col-span-2 flex gap-2">
                        <button type="submit" className="btn btn-primary">{editId ? 'Update' : '➕ Add'}</button>
                        {editId && <button type="button" onClick={() => { setEditId(null); setForm({ code: '', name: '', full_name: '', address: '', phone: '', email: '', website: '', gst_number: '' }) }} className="btn btn-secondary">Cancel</button>}
                    </div>
                </form>
            </div>
            <div className="card overflow-hidden">
                <table className="data-table">
                    <thead><tr><th>Code</th><th>Name</th><th>Phone</th><th>Actions</th></tr></thead>
                    <tbody>
                        {companies.map(c => (
                            <tr key={c.id}>
                                <td className="font-medium">{c.code}</td>
                                <td>{c.name}</td>
                                <td className="text-sm text-gray-500">{c.phone || '—'}</td>
                                <td>
                                    <div className="flex gap-1">
                                        <button onClick={() => handleEdit(c)} className="p-1 hover:bg-gray-100 rounded text-sm">✏️</button>
                                        <button onClick={() => handleDelete(c.id)} className="p-1 hover:bg-red-50 rounded text-sm">🗑️</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

// ===== Service Types Settings =====
function ServiceTypesSettings({ showToast }) {
    const [types, setTypes] = useState([])
    const [loading, setLoading] = useState(true)
    const [form, setForm] = useState({ code: '', name: '' })

    const load = () => {
        api.get('/service-types').then(res => setTypes(res.data)).finally(() => setLoading(false))
    }
    useEffect(() => { load() }, [])

    const handleSave = async (e) => {
        e.preventDefault()
        try {
            await api.post('/service-types', form)
            showToast('Service type added!', 'success')
            setForm({ code: '', name: '' })
            load()
        } catch (err) {
            showToast('Save failed: ' + (err.response?.data?.detail || err.message), 'error')
        }
    }

    const handleDelete = async (id) => {
        if (!confirm('Delete this service type?')) return
        try {
            await api.delete(`/service-types/${id}`)
            showToast('Deleted', 'success')
            load()
        } catch (err) {
            showToast('Delete failed', 'error')
        }
    }

    if (loading) return <div className="flex justify-center p-8"><div className="spinner" /></div>

    return (
        <div className="space-y-4">
            <div className="card p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Add Service Type</h2>
                <form onSubmit={handleSave} className="flex gap-3">
                    <input type="text" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} className="input-field w-32" placeholder="Code" required />
                    <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input-field flex-1" placeholder="Name" required />
                    <button type="submit" className="btn btn-primary">➕ Add</button>
                </form>
            </div>
            <div className="card overflow-hidden">
                <table className="data-table">
                    <thead><tr><th>Code</th><th>Name</th><th>Actions</th></tr></thead>
                    <tbody>
                        {types.map(t => (
                            <tr key={t.id}>
                                <td className="font-medium">{t.code}</td>
                                <td>{t.name}</td>
                                <td>
                                    <button onClick={() => handleDelete(t.id)} className="p-1 hover:bg-red-50 rounded text-sm">🗑️</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

// ===== Contacts Settings =====
function ContactsSettings({ showToast }) {
    const [contacts, setContacts] = useState([])
    const [loading, setLoading] = useState(true)
    const [form, setForm] = useState({ email: '', name: '' })

    const load = () => {
        api.get('/contacts').then(res => setContacts(res.data)).finally(() => setLoading(false))
    }
    useEffect(() => { load() }, [])

    const handleSave = async (e) => {
        e.preventDefault()
        try {
            await api.post('/contacts', form)
            showToast('Contact added!', 'success')
            setForm({ email: '', name: '' })
            load()
        } catch (err) {
            showToast('Save failed: ' + (err.response?.data?.detail || err.message), 'error')
        }
    }

    const handleDelete = async (id) => {
        if (!confirm('Delete this contact?')) return
        try {
            await api.delete(`/contacts/${id}`)
            showToast('Deleted', 'success')
            load()
        } catch (err) {
            showToast('Delete failed', 'error')
        }
    }

    if (loading) return <div className="flex justify-center p-8"><div className="spinner" /></div>

    return (
        <div className="space-y-4">
            <div className="card p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Add Contact</h2>
                <form onSubmit={handleSave} className="flex gap-3">
                    <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="input-field flex-1" placeholder="Email" required />
                    <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input-field w-48" placeholder="Name (optional)" />
                    <button type="submit" className="btn btn-primary">➕ Add</button>
                </form>
            </div>
            <div className="card overflow-hidden">
                <table className="data-table">
                    <thead><tr><th>Email</th><th>Name</th><th>Actions</th></tr></thead>
                    <tbody>
                        {contacts.map(c => (
                            <tr key={c.id}>
                                <td className="font-medium">{c.email}</td>
                                <td>{c.name || '—'}</td>
                                <td>
                                    <button onClick={() => handleDelete(c.id)} className="p-1 hover:bg-red-50 rounded text-sm">🗑️</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
