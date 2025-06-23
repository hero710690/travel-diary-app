import { parseISO, isValid } from 'date-fns';

/**
 * Safely parse a date string and return a valid Date object
 * @param dateString - The date string to parse
 * @param fallback - Fallback date if parsing fails (defaults to current date)
 * @returns A valid Date object
 */
export const safeParseDate = (dateString: string | undefined, fallback?: Date): Date => {
  if (!dateString) {
    return fallback || new Date();
  }

  try {
    let date: Date;
    
    // Try parsing as ISO string first
    if (dateString.includes('T')) {
      date = parseISO(dateString);
    } else {
      // Try parsing as YYYY-MM-DD
      date = new Date(dateString + 'T00:00:00');
    }
    
    // Check if date is valid
    if (isValid(date)) {
      return date;
    } else {
      console.warn('Invalid date parsed:', dateString);
      return fallback || new Date();
    }
  } catch (error) {
    console.error('Date parsing error:', error, 'for date:', dateString);
    return fallback || new Date();
  }
};

/**
 * Calculate the difference in days between two dates
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Number of days difference
 */
export const getDaysDifference = (startDate: Date, endDate: Date): number => {
  const timeDiff = endDate.getTime() - startDate.getTime();
  return Math.floor(timeDiff / (1000 * 60 * 60 * 24));
};

/**
 * Add days to a date, ensuring we work with date-only values to avoid timezone issues
 * @param date - Base date
 * @param days - Number of days to add
 * @returns New date with days added (time set to midnight UTC)
 */
export const addDaysToDate = (date: Date, days: number): Date => {
  // Create a new date at midnight UTC to avoid timezone issues
  const baseDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const newDate = new Date(baseDate);
  newDate.setDate(newDate.getDate() + days);
  return newDate;
};

/**
 * Calculate the difference in days between two dates, ignoring time components
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Number of days difference
 */
export const getDaysDifferenceIgnoreTime = (startDate: Date, endDate: Date): number => {
  const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
  const timeDiff = end.getTime() - start.getTime();
  return Math.floor(timeDiff / (1000 * 60 * 60 * 24));
};
