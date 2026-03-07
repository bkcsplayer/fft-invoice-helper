import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api/client'
import { calculateDueDate, getToday } from '../utils/dateUtils'
import { formatCurrency } from '../utils/formatters'

const ITEM_TYPES = [
    { value: 'standard', label: 'Standard' },
    { value: 'hourly', label: 'Hourly' },
    { value: 'solar_rate', label: 'Solar Rate (W×Rate)' },
    { value: 'equipment', label: 'Equipment' },
    { value: 'tools', label: 'Tools' },
    { value: 'fuel', label: 'Fuel' },
    { value: 'meal', label: 'Meal' },
    { value: 'accommodation', label: 'Accommodation' },
]

const DEFAULT_PAYMENT = {
    payment_method: '',
    payment_company_name: 'FUTUREFRONTIER TECHNOLOGY LTD.',
    payment_company_address: '4838 Richard Rd SW #300 Calgary, AB T3E 6L1',
    contact_phone: '403-399-0959',
    contact_email: '',
    payee: '',
    signature_name: 'Bruce Wang',
    website: 'www.futurefrontier.ca',
    bank_name: '',
    bank_address: '',
    transit_number: '',
    institution_number: '',
    account_number: '',
}

export default function InvoiceFormPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const isEditing = !!id

    const [companies, setCompanies] = useState([])
    const [serviceTypes, setServiceTypes] = useState([])
    const [savedClients, setSavedClients] = useState([])
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [previewHtml, setPreviewHtml] = useState('')
    const [showPreview, setShowPreview] = useState(false)
    const [toast, setToast] = useState(null)
    const [defaultRate, setDefaultRate] = useState(0.48)
    const [defaultWatts, setDefaultWatts] = useState(500)

    const [form, setForm] = useState({
        company_id: '',
        service_type_id: '',
        bill_to_name: '',
        bill_to_address: '',
        bill_to_phone: '',
        bill_to_email: '',
        invoice_date: getToday(),
        due_date: calculateDueDate(getToday()),
        po_number: '',
        code_number: '',
        item_type: 'standard',
        gst_enabled: true,
        gst_rate: 5,
        hst_enabled: false,
        hst_rate: 0,
        terms_conditions: 'Payment is due within the terms stated above. Late payments may be subject to interest charges.',
        ...DEFAULT_PAYMENT,
    })

    const [items, setItems] = useState([
        { sort_order: 0, quantity: 1, description: '', unit_price: 0, amount: 0 },
    ])

    useEffect(() => {
        loadFormData()
    }, [id])

    const loadFormData = async () => {
        setLoading(true)
        try {
            const [companiesRes, typesRes, clientsRes] = await Promise.all([
                api.get('/companies'),
                api.get('/service-types'),
                api.get('/saved-clients'),
            ])
            setCompanies(companiesRes.data)
            setServiceTypes(typesRes.data)
            setSavedClients(clientsRes.data)

            if (companiesRes.data.length > 0 && !isEditing) {
                const defaultCompany = companiesRes.data.find(c => c.is_default) || companiesRes.data[0]
                setForm(f => ({ ...f, company_id: defaultCompany.id }))
            }
            if (typesRes.data.length > 0 && !isEditing) {
                setForm(f => ({ ...f, service_type_id: typesRes.data[0].id }))
            }

            if (isEditing) {
                const res = await api.get(`/invoices/${id}`)
                const inv = res.data
                setForm({
                    company_id: inv.company_id || '',
                    service_type_id: inv.service_type_id || '',
                    bill_to_name: inv.bill_to_name || '',
                    bill_to_address: inv.bill_to_address || '',
                    bill_to_phone: inv.bill_to_phone || '',
                    bill_to_email: inv.bill_to_email || '',
                    invoice_date: inv.invoice_date || getToday(),
                    due_date: inv.due_date || '',
                    po_number: inv.po_number || '',
                    code_number: inv.code_number || '',
                    item_type: inv.item_type || 'standard',
                    gst_enabled: inv.gst_enabled ?? true,
                    gst_rate: Number(inv.gst_rate) || 5,
                    hst_enabled: inv.hst_enabled ?? false,
                    hst_rate: Number(inv.hst_rate) || 0,
                    terms_conditions: inv.terms_conditions || '',
                    payment_method: '',
                    payment_company_name: inv.payment_company_name || '',
                    payment_company_address: inv.payment_company_address || '',
                    contact_phone: inv.contact_phone || '',
                    contact_email: inv.contact_email || '',
                    payee: '',
                    signature_name: inv.signature_name || '',
                    website: inv.website || '',
                    bank_name: '',
                    bank_address: '',
                    transit_number: '',
                    institution_number: '',
                    account_number: '',
                })
                if (inv.items && inv.items.length > 0) {
                    setItems(inv.items.map((item, idx) => ({
                        sort_order: item.sort_order || idx,
                        quantity: Number(item.quantity),
                        description: item.description,
                        unit_price: Number(item.unit_price),
                        amount: Number(item.amount),
                    })))
                }
            }
        } catch (err) {
            console.error('Load form data error:', err)
        } finally {
            setLoading(false)
        }
    }

    const selectSavedClient = (client) => {
        setForm(f => ({
            ...f,
            bill_to_name: client.name || '',
            bill_to_address: client.address || '',
            bill_to_phone: client.phone || '',
            bill_to_email: client.email || '',
        }))
        showToast(`Client "${client.name}" selected`, 'success')
    }

    const saveCurrentAsClient = async () => {
        if (!form.bill_to_name) {
            showToast('Please enter a client name first', 'error')
            return
        }
        try {
            await api.post('/saved-clients', {
                name: form.bill_to_name,
                address: form.bill_to_address,
                phone: form.bill_to_phone,
                email: form.bill_to_email,
            })
            const res = await api.get('/saved-clients')
            setSavedClients(res.data)
            showToast(`"${form.bill_to_name}" saved as client preset!`, 'success')
        } catch (err) {
            showToast('Failed to save client', 'error')
        }
    }

    const deleteSavedClient = async (clientId, e) => {
        e.stopPropagation()
        if (!confirm('Remove this saved client?')) return
        try {
            await api.delete(`/saved-clients/${clientId}`)
            setSavedClients(prev => prev.filter(c => c.id !== clientId))
        } catch (err) {
            showToast('Failed to delete client', 'error')
        }
    }

    const updateForm = (key, value) => {
        setForm(f => {
            const updated = { ...f, [key]: value }
            if (key === 'invoice_date') {
                updated.due_date = calculateDueDate(value)
            }
            return updated
        })
    }

    const updateItem = (idx, key, value) => {
        setItems(prev => {
            const updated = [...prev]
            updated[idx] = { ...updated[idx], [key]: value }
            if (key === 'quantity' || key === 'unit_price') {
                updated[idx].amount = Number(updated[idx].quantity) * Number(updated[idx].unit_price)
            }
            return updated
        })
    }

    const addItem = () => {
        const newItem = {
            sort_order: items.length,
            quantity: 1,
            description: '',
            unit_price: 0,
            amount: 0,
        }
        if (form.item_type === 'solar_rate') {
            newItem.watts_per_panel = defaultWatts
            newItem.rate_per_watt = defaultRate
        }
        setItems(prev => [...prev, newItem])
    }

    const removeItem = (idx) => {
        if (items.length <= 1) return
        setItems(prev => prev.filter((_, i) => i !== idx))
    }

    const moveItem = (idx, direction) => {
        const newIdx = idx + direction
        if (newIdx < 0 || newIdx >= items.length) return
        setItems(prev => {
            const updated = [...prev]
                ;[updated[idx], updated[newIdx]] = [updated[newIdx], updated[idx]]
            return updated.map((item, i) => ({ ...item, sort_order: i }))
        })
    }

    // Calculate totals
    const subtotal = items.reduce((sum, item) => {
        if (form.item_type === 'solar_rate') {
            const panels = Number(item.quantity)
            const watts = Number(item.watts_per_panel || 500)
            const rate = Number(item.rate_per_watt || 0)
            return sum + (panels * watts * rate)
        }
        return sum + (Number(item.quantity) * Number(item.unit_price))
    }, 0)
    const gstAmount = form.gst_enabled ? subtotal * (Number(form.gst_rate) / 100) : 0
    const hstAmount = form.hst_enabled ? subtotal * (Number(form.hst_rate) / 100) : 0
    const total = subtotal + gstAmount + hstAmount

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!form.bill_to_name) {
            showToast('Please enter the client name', 'error')
            return
        }
        if (items.length === 0 || !items[0].description) {
            showToast('Please add at least one item', 'error')
            return
        }

        setSaving(true)
        try {
            // For solar rate, compute unit_price = watts × rate, so backend qty × unit_price = correct amount
            const mappedItems = items.map((item, idx) => {
                if (form.item_type === 'solar_rate') {
                    const watts = Number(item.watts_per_panel || 500)
                    const rate = Number(item.rate_per_watt || 0)
                    const computedUnitPrice = watts * rate
                    return {
                        sort_order: idx,
                        quantity: Number(item.quantity),
                        description: item.description,
                        unit_price: computedUnitPrice,
                        amount: Number(item.quantity) * computedUnitPrice,
                    }
                }
                return {
                    sort_order: idx,
                    quantity: Number(item.quantity),
                    description: item.description,
                    unit_price: Number(item.unit_price),
                    amount: Number(item.quantity) * Number(item.unit_price),
                }
            })

            const payload = {
                ...form,
                company_id: form.company_id ? Number(form.company_id) : null,
                service_type_id: form.service_type_id ? Number(form.service_type_id) : null,
                gst_rate: Number(form.gst_rate),
                hst_rate: Number(form.hst_rate),
                items: mappedItems,
            }

            let res
            if (isEditing) {
                res = await api.put(`/invoices/${id}`, payload)
            } else {
                res = await api.post('/invoices', payload)
            }

            showToast(isEditing ? 'Invoice updated!' : 'Invoice created!', 'success')

            // Show preview
            const invoiceId = res.data.id
            try {
                const previewRes = await api.get(`/invoices/${invoiceId}/preview-html`)
                setPreviewHtml(previewRes.data)
                setShowPreview(true)
            } catch (e) {
                // Preview is optional
            }

            if (!isEditing) {
                navigate(`/invoices/${invoiceId}`, { replace: true })
            }
        } catch (err) {
            showToast('Save failed: ' + (err.response?.data?.detail || err.message), 'error')
        } finally {
            setSaving(false)
        }
    }

    const handleGeneratePdf = async () => {
        if (!id) return
        try {
            const res = await api.get(`/invoices/${id}/download-pdf`, { responseType: 'blob' })
            if (res.data.type && res.data.type.includes('json')) {
                const text = await res.data.text()
                const err = JSON.parse(text)
                showToast('PDF error: ' + (err.detail || 'Unknown error'), 'error')
                return
            }
            const blob = new Blob([res.data], { type: 'application/pdf' })
            const url = window.URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.setAttribute('download', `invoice_${id}.pdf`)
            document.body.appendChild(link)
            link.click()
            link.remove()
            window.URL.revokeObjectURL(url)
            showToast('PDF downloaded!', 'success')
        } catch (err) {
            showToast('PDF generation failed: ' + (err.response?.data?.detail || err.message), 'error')
        }
    }

    const showToast = (message, type) => {
        setToast({ message, type })
        setTimeout(() => setToast(null), 3000)
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="spinner" style={{ width: 40, height: 40 }} />
            </div>
        )
    }

    const selectedCompany = companies.find(c => c.id === Number(form.company_id))

    return (
        <div className="space-y-5 max-w-5xl mx-auto">
            {toast && (
                <div className={`toast toast-${toast.type}`}>{toast.message}</div>
            )}

            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-800">
                    {isEditing ? 'Edit Invoice' : 'Create New Invoice'}
                </h1>
                {isEditing && (
                    <button onClick={handleGeneratePdf} className="btn btn-primary">
                        📄 Download PDF
                    </button>
                )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
                {/* Company Information */}
                <div className="card p-6">
                    <h2 className="text-lg font-semibold text-primary-800 mb-4 flex items-center gap-2">
                        🏢 Company Information
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Company</label>
                            <select
                                id="company-select"
                                value={form.company_id}
                                onChange={e => updateForm('company_id', e.target.value)}
                                className="input-field"
                            >
                                <option value="">Select Company</option>
                                {companies.map(c => (
                                    <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Service Type</label>
                            <select
                                id="service-type-select"
                                value={form.service_type_id}
                                onChange={e => updateForm('service_type_id', e.target.value)}
                                className="input-field"
                            >
                                <option value="">Select Type</option>
                                {serviceTypes.map(st => (
                                    <option key={st.id} value={st.id}>{st.code} - {st.name}</option>
                                ))}
                            </select>
                        </div>
                        {selectedCompany && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 mb-1">Address</label>
                                    <p className="text-sm text-gray-700 bg-gray-50 p-2.5 rounded-lg">{selectedCompany.address || 'N/A'}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 mb-1">GST Number</label>
                                    <p className="text-sm text-gray-700 bg-gray-50 p-2.5 rounded-lg">{selectedCompany.gst_number || 'N/A'}</p>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Client Information */}
                <div className="card p-6">
                    <h2 className="text-lg font-semibold text-primary-800 mb-4 flex items-center gap-2">
                        👤 Client Information
                    </h2>

                    {/* Saved Client Presets */}
                    {savedClients.length > 0 && (
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-500 mb-2">Quick Select — Saved Clients</label>
                            <div className="flex flex-wrap gap-2">
                                {savedClients.map(client => (
                                    <button
                                        key={client.id}
                                        type="button"
                                        onClick={() => selectSavedClient(client)}
                                        className={`relative group flex flex-col items-start border rounded-xl px-4 py-2.5 text-left text-sm transition-all hover:shadow-md hover:border-primary-400 ${form.bill_to_name === client.name
                                            ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200'
                                            : 'border-gray-200 bg-white hover:bg-gray-50'
                                            }`}
                                    >
                                        <span className="font-semibold text-gray-800">{client.name}</span>
                                        {client.email && <span className="text-xs text-gray-400">{client.email}</span>}
                                        {client.phone && <span className="text-xs text-gray-400">{client.phone}</span>}
                                        <span
                                            onClick={(e) => deleteSavedClient(client.id, e)}
                                            className="absolute -top-1.5 -right-1.5 flex w-5 h-5 items-center justify-center bg-gray-400 hover:bg-red-500 text-white rounded-full text-xs cursor-pointer transition-colors"
                                        >×</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-600 mb-1">Bill To *</label>
                            <input
                                id="bill-to-name"
                                type="text"
                                value={form.bill_to_name}
                                onChange={e => updateForm('bill_to_name', e.target.value)}
                                className="input-field"
                                placeholder="Client company name"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Address</label>
                            <input
                                type="text"
                                value={form.bill_to_address}
                                onChange={e => updateForm('bill_to_address', e.target.value)}
                                className="input-field"
                                placeholder="Client address"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Phone</label>
                            <input
                                type="text"
                                value={form.bill_to_phone}
                                onChange={e => updateForm('bill_to_phone', e.target.value)}
                                className="input-field"
                                placeholder="Client phone"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Email</label>
                            <input
                                type="email"
                                value={form.bill_to_email}
                                onChange={e => updateForm('bill_to_email', e.target.value)}
                                className="input-field"
                                placeholder="Client email (for sending invoices)"
                            />
                        </div>
                        <div className="flex items-end">
                            <button
                                type="button"
                                onClick={saveCurrentAsClient}
                                className="btn btn-secondary text-sm w-full"
                            >
                                💾 Save as Client Preset
                            </button>
                        </div>
                    </div>
                </div>

                {/* Invoice Details */}
                <div className="card p-6">
                    <h2 className="text-lg font-semibold text-primary-800 mb-4 flex items-center gap-2">
                        🧾 Invoice Details
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Invoice Date</label>
                            <input
                                id="invoice-date"
                                type="date"
                                value={form.invoice_date}
                                onChange={e => updateForm('invoice_date', e.target.value)}
                                className="input-field"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Due Date</label>
                            <input
                                type="date"
                                value={form.due_date}
                                onChange={e => updateForm('due_date', e.target.value)}
                                className="input-field"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">P.O. #</label>
                            <input
                                type="text"
                                value={form.po_number}
                                onChange={e => updateForm('po_number', e.target.value)}
                                className="input-field"
                                placeholder="Purchase order #"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Code Number</label>
                            <input
                                type="text"
                                value={form.code_number}
                                onChange={e => updateForm('code_number', e.target.value)}
                                className="input-field"
                                placeholder="e.g. 8001"
                            />
                        </div>
                    </div>
                </div>

                {/* Invoice Items */}
                <div className="card p-6">
                    <h2 className="text-lg font-semibold text-primary-800 mb-4 flex items-center gap-2">
                        🛒 Invoice Items
                    </h2>

                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-600 mb-1">Item Type</label>
                        <select
                            value={form.item_type}
                            onChange={e => updateForm('item_type', e.target.value)}
                            className="input-field w-auto"
                        >
                            {ITEM_TYPES.map(t => (
                                <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Solar Rate Defaults */}
                    {form.item_type === 'solar_rate' && (
                        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
                            <p className="text-xs font-semibold text-yellow-700 mb-2">☀️ Default values for new items</p>
                            <div className="flex items-center gap-4 flex-wrap">
                                <div className="flex items-center gap-2">
                                    <label className="text-sm text-gray-600">Watts/Panel:</label>
                                    <input
                                        type="number"
                                        value={defaultWatts}
                                        onChange={e => setDefaultWatts(Number(e.target.value))}
                                        className="input-field w-24 text-sm py-1.5"
                                        min="0"
                                        step="10"
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <label className="text-sm text-gray-600">Rate/W (CAD):</label>
                                    <input
                                        type="number"
                                        value={defaultRate}
                                        onChange={e => setDefaultRate(Number(e.target.value))}
                                        className="input-field w-24 text-sm py-1.5"
                                        min="0"
                                        step="0.01"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setItems(prev => prev.map(item => ({
                                            ...item,
                                            watts_per_panel: defaultWatts,
                                            rate_per_watt: defaultRate,
                                        })))
                                        showToast('Applied defaults to all items', 'success')
                                    }}
                                    className="btn btn-secondary text-xs py-1.5 px-3"
                                >
                                    Apply to All Items
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Items */}
                    <div className="space-y-2">
                        {form.item_type === 'solar_rate' ? (
                            <>
                                <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-gray-500 uppercase px-1">
                                    <div className="col-span-1">Order</div>
                                    <div className="col-span-1">Panels</div>
                                    <div className="col-span-3">Address / Description</div>
                                    <div className="col-span-2">Watts/Panel</div>
                                    <div className="col-span-2">Rate/W (CAD)</div>
                                    <div className="col-span-2">Amount</div>
                                    <div className="col-span-1"></div>
                                </div>
                                {items.map((item, idx) => {
                                    const watts = Number(item.watts_per_panel || 500)
                                    const rate = Number(item.rate_per_watt || 0)
                                    const panels = Number(item.quantity)
                                    const solarAmount = panels * watts * rate
                                    return (
                                        <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-gray-50 rounded-lg p-2">
                                            <div className="col-span-1 flex flex-col gap-0.5">
                                                <button type="button" onClick={() => moveItem(idx, -1)} className="text-xs opacity-60 hover:opacity-100">🔼</button>
                                                <button type="button" onClick={() => moveItem(idx, 1)} className="text-xs opacity-60 hover:opacity-100">🔽</button>
                                            </div>
                                            <div className="col-span-1">
                                                <input
                                                    type="number"
                                                    value={item.quantity}
                                                    onChange={e => updateItem(idx, 'quantity', e.target.value)}
                                                    className="input-field text-center p-2 text-sm"
                                                    min="0"
                                                    placeholder="35"
                                                />
                                            </div>
                                            <div className="col-span-3">
                                                <input
                                                    type="text"
                                                    value={item.description}
                                                    onChange={e => updateItem(idx, 'description', e.target.value)}
                                                    className="input-field p-2 text-sm"
                                                    placeholder="e.g. 138 sage hill grove NW"
                                                />
                                            </div>
                                            <div className="col-span-2">
                                                <input
                                                    type="number"
                                                    value={item.watts_per_panel || 500}
                                                    onChange={e => updateItem(idx, 'watts_per_panel', e.target.value)}
                                                    className="input-field p-2 text-sm text-right"
                                                    min="0"
                                                    step="10"
                                                    placeholder="500"
                                                />
                                            </div>
                                            <div className="col-span-2">
                                                <input
                                                    type="number"
                                                    value={item.rate_per_watt || ''}
                                                    onChange={e => updateItem(idx, 'rate_per_watt', e.target.value)}
                                                    className="input-field p-2 text-sm text-right"
                                                    min="0"
                                                    step="0.01"
                                                    placeholder="0.48"
                                                />
                                            </div>
                                            <div className="col-span-2 text-right font-medium text-sm px-2">
                                                {formatCurrency(solarAmount)}
                                            </div>
                                            <div className="col-span-1 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => removeItem(idx)}
                                                    className="text-red-400 hover:text-red-600 text-sm"
                                                    disabled={items.length <= 1}
                                                >🗑️</button>
                                            </div>
                                        </div>
                                    )
                                })}
                            </>
                        ) : (
                            <>
                                <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-gray-500 uppercase px-1">
                                    <div className="col-span-1">Order</div>
                                    <div className="col-span-1">
                                        {form.item_type === 'hourly' ? 'Hours' : 'Qty'}
                                    </div>
                                    <div className="col-span-5">Description</div>
                                    <div className="col-span-2">
                                        {form.item_type === 'hourly' ? 'Rate/Hour' : 'Unit Price'}
                                    </div>
                                    <div className="col-span-2">Amount</div>
                                    <div className="col-span-1"></div>
                                </div>
                                {items.map((item, idx) => (
                                    <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-gray-50 rounded-lg p-2">
                                        <div className="col-span-1 flex flex-col gap-0.5">
                                            <button type="button" onClick={() => moveItem(idx, -1)} className="text-xs opacity-60 hover:opacity-100">🔼</button>
                                            <button type="button" onClick={() => moveItem(idx, 1)} className="text-xs opacity-60 hover:opacity-100">🔽</button>
                                        </div>
                                        <div className="col-span-1">
                                            <input
                                                type="number"
                                                value={item.quantity}
                                                onChange={e => updateItem(idx, 'quantity', e.target.value)}
                                                className="input-field text-center p-2 text-sm"
                                                min="0"
                                                step="0.5"
                                            />
                                        </div>
                                        <div className="col-span-5">
                                            <input
                                                type="text"
                                                value={item.description}
                                                onChange={e => updateItem(idx, 'description', e.target.value)}
                                                className="input-field p-2 text-sm"
                                                placeholder="Item description"
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <input
                                                type="number"
                                                value={item.unit_price}
                                                onChange={e => updateItem(idx, 'unit_price', e.target.value)}
                                                className="input-field p-2 text-sm text-right"
                                                min="0"
                                                step="0.01"
                                            />
                                        </div>
                                        <div className="col-span-2 text-right font-medium text-sm px-2">
                                            {formatCurrency(Number(item.quantity) * Number(item.unit_price))}
                                        </div>
                                        <div className="col-span-1 text-center">
                                            <button
                                                type="button"
                                                onClick={() => removeItem(idx)}
                                                className="text-red-400 hover:text-red-600 text-sm"
                                                disabled={items.length <= 1}
                                            >🗑️</button>
                                        </div>
                                    </div>
                                ))}
                            </>
                        )}
                    </div>

                    <button type="button" onClick={addItem} className="btn btn-secondary mt-3 text-sm">
                        ➕ Add Item
                    </button>

                    {/* Tax Options */}
                    <div className="mt-5 pt-4 border-t border-gray-100">
                        <div className="flex flex-wrap gap-6">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={form.gst_enabled}
                                    onChange={e => updateForm('gst_enabled', e.target.checked)}
                                    className="w-4 h-4 accent-primary-600"
                                />
                                <span className="text-sm font-medium text-gray-700">
                                    GST ({form.gst_rate}%)
                                </span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={form.hst_enabled}
                                    onChange={e => updateForm('hst_enabled', e.target.checked)}
                                    className="w-4 h-4 accent-primary-600"
                                />
                                <span className="text-sm font-medium text-gray-700">HST</span>
                            </label>
                            {form.hst_enabled && (
                                <input
                                    type="number"
                                    value={form.hst_rate}
                                    onChange={e => updateForm('hst_rate', e.target.value)}
                                    className="input-field w-24 text-sm"
                                    placeholder="HST %"
                                    min="0"
                                    step="0.5"
                                />
                            )}
                        </div>

                        {/* Totals */}
                        <div className="mt-4 space-y-2 max-w-xs ml-auto">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Subtotal</span>
                                <span className="font-medium">{formatCurrency(subtotal)}</span>
                            </div>
                            {form.gst_enabled && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">GST ({form.gst_rate}%)</span>
                                    <span>{formatCurrency(gstAmount)}</span>
                                </div>
                            )}
                            {form.hst_enabled && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">HST ({form.hst_rate}%)</span>
                                    <span>{formatCurrency(hstAmount)}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200">
                                <span>Total</span>
                                <span className="text-primary-600">{formatCurrency(total)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Payment Details */}
                <div className="card p-6">
                    <h2 className="text-lg font-semibold text-primary-800 mb-4 flex items-center gap-2">
                        💳 Payment Details
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                            /* Removed for security reasons: ['payment_method', 'Payment Method'], */
                            ['payment_company_name', 'Company Name'],
                            ['payment_company_address', 'Company Address'],
                            ['contact_phone', 'Contact Phone'],
                            ['contact_email', 'Contact Email'],
                            /* Removed for security reasons: ['payee', 'Payee'], */
                            ['website', 'Website'],
                            ['signature_name', 'Authorized By'],
                        ].map(([key, label]) => (
                            <div key={key}>
                                <label className="block text-sm font-medium text-gray-600 mb-1">{label}</label>
                                <input
                                    type="text"
                                    value={form[key]}
                                    onChange={e => updateForm(key, e.target.value)}
                                    className="input-field"
                                />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Bank Information removed for security reasons */}

                {/* Terms */}
                <div className="card p-6">
                    <h2 className="text-lg font-semibold text-primary-800 mb-4">📝 Terms & Conditions</h2>
                    <textarea
                        value={form.terms_conditions}
                        onChange={e => updateForm('terms_conditions', e.target.value)}
                        className="input-field h-24 resize-none"
                        placeholder="Terms and conditions..."
                    />
                </div>

                {/* Submit Button */}
                <div className="flex gap-3">
                    <button
                        type="submit"
                        disabled={saving}
                        className="btn btn-primary py-3 px-8 text-base disabled:opacity-50"
                    >
                        {saving ? (
                            <>
                                <div className="spinner" style={{ width: 18, height: 18 }} />
                                Saving...
                            </>
                        ) : (
                            <>📄 {isEditing ? 'Update Invoice' : 'Generate Invoice'}</>
                        )}
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate('/invoices')}
                        className="btn btn-secondary py-3 px-8 text-base"
                    >
                        Cancel
                    </button>
                </div>
            </form>

            {/* Preview */}
            {showPreview && previewHtml && (
                <div className="card p-6 mt-5">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-800">Invoice Preview</h2>
                        <div className="flex gap-2">
                            <button onClick={handleGeneratePdf} className="btn btn-primary text-sm">
                                📥 Download PDF
                            </button>
                            <button onClick={() => window.print()} className="btn btn-secondary text-sm">
                                🖨️ Print
                            </button>
                        </div>
                    </div>
                    <div className="border rounded-lg overflow-hidden">
                        <iframe
                            srcDoc={previewHtml}
                            className="w-full"
                            style={{ height: '800px' }}
                            title="Invoice Preview"
                        />
                    </div>
                </div>
            )}
        </div>
    )
}
