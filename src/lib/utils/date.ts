/**
 * Date utilities for Kenya ERP Platform.
 * Default timezone: Africa/Nairobi (EAT, UTC+3)
 */
import { format, parseISO, isValid, differenceInDays, addDays } from "date-fns";

export const NAIROBI_TIMEZONE = "Africa/Nairobi";

/**
 * Format a date string or Date object for display.
 */
export function formatDate(
  date: string | Date | null | undefined,
  pattern = "dd MMM yyyy"
): string {
  if (!date) return "—";
  const d = typeof date === "string" ? parseISO(date) : date;
  if (!isValid(d)) return "—";
  return format(d, pattern);
}

/**
 * Format a date as a short date (e.g. 01/06/2024).
 */
export function formatShortDate(date: string | Date | null | undefined): string {
  return formatDate(date, "dd/MM/yyyy");
}

/**
 * Format a datetime string.
 */
export function formatDateTime(date: string | Date | null | undefined): string {
  return formatDate(date, "dd MMM yyyy, HH:mm");
}

/**
 * Get today's date as ISO string (YYYY-MM-DD).
 * Uses a stable server-friendly format — avoids Date.now() in render.
 */
export function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * Add days to a date and return ISO string.
 */
export function addDaysISO(date: string, days: number): string {
  return addDays(parseISO(date), days).toISOString().split("T")[0];
}

/**
 * Number of days until a due date (negative = overdue).
 */
export function daysUntilDue(dueDate: string): number {
  return differenceInDays(parseISO(dueDate), new Date());
}

/**
 * Return "overdue", "due-soon" (within 3 days), or "ok".
 */
export function dueDateStatus(dueDate: string): "overdue" | "due-soon" | "ok" {
  const days = daysUntilDue(dueDate);
  if (days < 0) return "overdue";
  if (days <= 3) return "due-soon";
  return "ok";
}

/**
 * Format a month/year string for chart labels.
 */
export function formatMonthYear(date: string | Date): string {
  return formatDate(date, "MMM yyyy");
}

/**
 * Get the start of a fiscal year for Kenya (July 1).
 */
export function kenyaFiscalYearStart(year: number): string {
  return `${year}-07-01`;
}
