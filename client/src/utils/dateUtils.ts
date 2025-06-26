import { parseISO, isValid } from 'date-fns';

/**
 * Safely parse a date string and return a valid Date object in UTC
 * @param dateString - The date string to parse
 * @param fallback - Fallback date if parsing fails (defaults to current date)
 * @returns A valid Date object in UTC
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
      // Parse as YYYY-MM-DD and ensure it's treated as UTC to avoid timezone shifts
      date = new Date(dateString + 'T00:00:00.000Z');
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
 * Add days to a date, ensuring we work with UTC dates to avoid timezone issues
 * @param date - Base date
 * @param days - Number of days to add
 * @returns New date with days added (in UTC)
 */
export const addDaysToDate = (date: Date, days: number): Date => {
  // Work with UTC dates to avoid timezone conversion issues
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  
  // Create a new UTC date
  const newDate = new Date(Date.UTC(year, month, day + days));
  return newDate;
};

/**
 * Calculate the difference in days between two dates, ignoring time components
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Number of days difference
 */
export const getDaysDifferenceIgnoreTime = (startDate: Date, endDate: Date): number => {
  // Use UTC methods to avoid timezone conversion issues
  const start = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate()));
  const end = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate()));
  const timeDiff = end.getTime() - start.getTime();
  return Math.floor(timeDiff / (1000 * 60 * 60 * 24));
};

/**
 * Combine a date and time string into a proper UTC datetime
 * @param date - The base date
 * @param timeString - Time in HH:MM format (e.g., "09:00")
 * @returns Combined datetime in UTC
 */
export const combineDateAndTime = (date: Date, timeString: string): Date => {
  // Parse the time string
  const [hours, minutes] = timeString.split(':').map(Number);
  
  console.log('🔍 combineDateAndTime debug:', {
    inputDate: date.toISOString(),
    inputTime: timeString,
    dateUTCYear: date.getUTCFullYear(),
    dateUTCMonth: date.getUTCMonth(),
    dateUTCDate: date.getUTCDate(),
    parsedHours: hours,
    parsedMinutes: minutes
  });
  
  // Create a new date in UTC with the specified time
  const combinedDate = new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    hours,
    minutes,
    0,
    0
  ));
  
  console.log('🔍 combineDateAndTime result:', combinedDate.toISOString());
  
  return combinedDate;
};
