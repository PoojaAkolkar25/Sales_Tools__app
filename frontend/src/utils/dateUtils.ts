/**
 * Formats a date string or Date object to DD-MMM-YYYY format (e.g., 02-Feb-2026)
 * @param dateInput Date object or ISO date string
 * @returns formatted date string
 */
export const formatToAppDate = (dateInput: string | Date | null | undefined): string => {
    if (!dateInput) return '';

    let date: Date;

    if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
        const [year, month, day] = dateInput.split('-').map(Number);
        date = new Date(year, month - 1, day);
    } else {
        date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput as Date;
    }

    if (!date || isNaN(date.getTime())) return String(dateInput);

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
