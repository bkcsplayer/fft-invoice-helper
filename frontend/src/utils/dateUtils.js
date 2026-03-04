/**
 * Calculate due date by adding business days (skip weekends).
 */
export function calculateDueDate(invoiceDate, businessDays = 10) {
    const d = new Date(invoiceDate)
    let remaining = businessDays
    while (remaining > 0) {
        d.setDate(d.getDate() + 1)
        if (d.getDay() !== 0 && d.getDay() !== 6) {
            remaining--
        }
    }
    return d.toISOString().split('T')[0]
}

/**
 * Format date as YYYY-MM-DD for input fields.
 */
export function formatDateForInput(date) {
    if (!date) return ''
    const d = new Date(date)
    return d.toISOString().split('T')[0]
}

/**
 * Get today's date as YYYY-MM-DD.
 */
export function getToday() {
    return new Date().toISOString().split('T')[0]
}
