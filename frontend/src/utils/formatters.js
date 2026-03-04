/**
 * Format a number as currency (USD).
 */
export function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(amount || 0)
}

/**
 * Format a number with commas.
 */
export function formatNumber(num) {
    return new Intl.NumberFormat('en-US').format(num || 0)
}

/**
 * Status color mapping.
 */
export const STATUS_COLORS = {
    draft: '#94a3b8',
    sent: '#3b82f6',
    paid: '#22c55e',
    overdue: '#ef4444',
    cancelled: '#f97316',
}

/**
 * Get badge class for status.
 */
export function getStatusBadgeClass(status) {
    return `badge badge-${status || 'draft'}`
}
