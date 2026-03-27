import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(
  amount: number,
  currency: string = "KES",
  symbol: string = "KSh"
): string {
  return `${symbol} ${new Intl.NumberFormat("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)}`;
}

export function formatDate(date: Date | string, pattern: string = "dd/MM/yyyy"): string {
  return format(new Date(date), pattern);
}

export function formatDateTime(date: Date | string): string {
  return format(new Date(date), "dd/MM/yyyy HH:mm");
}

export function generateDocNumber(prefix: string, sequence: number): string {
  return `${prefix}-${String(sequence).padStart(5, "0")}`;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function truncate(text: string, length: number = 50): string {
  if (text.length <= length) return text;
  return `${text.substring(0, length)}...`;
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);
}

export function calculateTax(amount: number, taxRate: number): number {
  return (amount * taxRate) / 100;
}

export function calculateDiscount(amount: number, discount: number, isPercent: boolean = true): number {
  if (isPercent) return (amount * discount) / 100;
  return discount;
}