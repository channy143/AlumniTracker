import { clsx, type ClassValue } from 'clsx';
import { format, parseISO } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatDate(date: string | Date, fmt: string = 'MMM d, yyyy') {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, fmt);
}

export function getInitials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function truncate(str: string, length: number = 100) {
  return str.length > length ? `${str.substring(0, length)}...` : str;
}

export function generateYears(start: number = 1990, end: number = new Date().getFullYear()) {
  return Array.from({ length: end - start + 1 }, (_, i) => String(start + i));
}

export const employmentStatusLabels: Record<string, string> = {
  employed: 'Employed',
  'self-employed': 'Self-Employed',
  unemployed: 'Unemployed',
  seeking: 'Seeking Opportunities',
  student: 'Further Studies',
  entrepreneur: 'Entrepreneur',
  retired: 'Retired',
};

export const jobTypeLabels: Record<string, string> = {
  'full-time': 'Full-Time',
  'part-time': 'Part-Time',
  contract: 'Contract',
  freelance: 'Freelance',
  internship: 'Internship',
};
