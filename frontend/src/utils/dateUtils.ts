/**
 * Formats a date string or Date object to DD/MMM/YYYY format (e.g., 02/Feb/2026)
 * @param dateInput Date object or ISO date string
 * @returns formatted date string
 */
export const formatToAppDate = (dateInput: string | Date | null | undefined): string => {
    if (!dateInput) return '';

    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;

    if (isNaN(date.getTime())) return String(dateInput);

    const day = String(date.getDate()).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
};

/**
 * Returns current date in YYYY-MM-DD format for HTML5 date inputs
 */
export const getCurrentDateForInput = (): string => {
    return new Date().toISOString().split('T')[0];
};
