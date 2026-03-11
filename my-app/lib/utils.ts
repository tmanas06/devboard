import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, parseISO } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats hours as a readable string (e.g., "8h", "8.5h", "8h 30m")
 * @param hours - Number of hours (can be decimal)
 * @returns Formatted hours string
 */
export function formatHours(hours: number): string {
  if (hours === 0) return "0h";
  
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  
  if (minutes === 0) {
    return `${wholeHours}h`;
  }
  
  if (wholeHours === 0) {
    return `${minutes}m`;
  }
  
  return `${wholeHours}h ${minutes}m`;
}

/**
 * Formats a date string to a readable date format (without time)
 * @param dateString - ISO date string or Date object
 * @returns Formatted date string (e.g., "Jan 15, 2024")
 */
export function formatDate(dateString: string | Date): string {
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    return format(date, 'MMM d, yyyy');
  } catch (error) {
    return String(dateString);
  }
}

/**
 * Formats a date string to a readable date/time format
 * @param dateString - ISO date string or Date object
 * @returns Formatted date string (e.g., "Jan 15, 2024 2:30 PM")
 */
export function formatDateTime(dateString: string | Date): string {
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    return format(date, 'MMM d, yyyy h:mm a');
  } catch (error) {
    return String(dateString);
  }
}
