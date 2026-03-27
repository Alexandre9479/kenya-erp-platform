// ============================================
// GLOBAL TYPES FOR THE ERP PLATFORM
// ============================================

export type UserRole =
  | "super_admin"
  | "tenant_admin"
  | "accountant"
  | "sales"
  | "purchasing"
  | "warehouse"
  | "hr"
  | "viewer";

export type SubscriptionStatus =
  | "trial"
  | "active"
  | "suspended"
  | "cancelled";

export type DocumentType =
  | "invoice"
  | "quote"
  | "delivery_note"
  | "receipt"
  | "lpo"
  | "grn"
  | "payslip"
  | "statement";

export interface BankDetails {
  bankName: string;
  accountName: string;
  accountNumber: string;
  branchName?: string;
  swiftCode?: string;
  isPrimary: boolean;
}

export interface Tenant {
  _id: string;
  companyName: string;
  companyEmail: string;
  companyPhone: string;
  companyAddress: string;
  companyCity?: string;
  companyCountry: string;
  companyLogo?: string;
  kraPin?: string;
  vatNumber?: string;
  currency: string;
  timezone: string;
  fiscalYearStart: string;
  paymentTerms?: string;
  termsAndConditions?: string;
  bankDetails?: BankDetails[];
  subscription: SubscriptionStatus;
  subscriptionExpiry?: Date;
  trialEndsAt?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  _id: string;
  tenantId: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  department?: string;
  phone?: string;
  isActive: boolean;
  avatar?: string;
  lastLogin?: Date;
  createdAt: Date;
}

export interface NavItem {
  title: string;
  href: string;
  icon: string;
  roles: UserRole[];
  badge?: string;
  children?: NavItem[];
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface SelectOption {
  value: string;
  label: string;
}

export interface TableColumn<T = unknown> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  render?: (value: unknown, row: T) => React.ReactNode;
}