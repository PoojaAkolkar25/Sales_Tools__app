/**
 * Formats a date string or Date object to DD-MMM-YYYY format (e.g., 02-Feb-2026)
 * @param dateInput Date object or ISO date string
 * @returns formatted date string
 */
export const parseDateSafe = (dateInput: string | Date | null | undefined): Date | null => {
    if (!dateInput) return null;
    if (dateInput instanceof Date) return dateInput;

    if (typeof dateInput === 'string') {
        // Handle YYYY-MM-DD
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
            const [year, month, day] = dateInput.split('-').map(Number);
            return new Date(year, month - 1, day);
        }
        // Fallback for other strings
        const d = new Date(dateInput);
        return isNaN(d.getTime()) ? null : d;
    }
    return null;
};

export const formatToAppDate = (dateInput: string | Date | null | undefined): string => {
    if (!dateInput) return '';
    const date = parseDateSafe(dateInput);
    if (!date) return String(dateInput);

    const day = String(date.getDate()).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    const year = date.getFullYear();

    return `${day}-${month}-${year}`;
};

/**
 * Returns current date in YYYY-MM-DD format for HTML5 date inputs
 */
export const getCurrentDateForInput = (): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};
