import { NavItem, UserRole } from "@/types";

export const APP_CONFIG = {
  name: "ERP Platform",
  version: "1.0.0",
  description: "Enterprise Resource Planning for Modern Businesses",
  supportEmail: "support@erpplatform.com",
  defaultCurrency: "KES",
  defaultCountry: "Kenya",
  defaultTimezone: "Africa/Nairobi",
  trialDays: 30,
};

export const ROLES_CONFIG: Record<UserRole, { label: string; color: string; description: string }> = {
  super_admin: {
    label: "Super Admin",
    color: "bg-red-100 text-red-800 border-red-200",
    description: "Full platform access",
  },
  tenant_admin: {
    label: "Administrator",
    color: "bg-purple-100 text-purple-800 border-purple-200",
    description: "Full company access",
  },
  accountant: {
    label: "Accountant",
    color: "bg-blue-100 text-blue-800 border-blue-200",
    description: "Finance & accounting access",
  },
  sales: {
    label: "Sales Personnel",
    color: "bg-green-100 text-green-800 border-green-200",
    description: "Sales & CRM access",
  },
  purchasing: {
    label: "Purchasing Officer",
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
    description: "Procurement access",
  },
  warehouse: {
    label: "Warehouse Manager",
    color: "bg-orange-100 text-orange-800 border-orange-200",
    description: "Inventory & warehouse access",
  },
  hr: {
    label: "HR Manager",
    color: "bg-pink-100 text-pink-800 border-pink-200",
    description: "HR & payroll access",
  },
  viewer: {
    label: "Viewer",
    color: "bg-gray-100 text-gray-800 border-gray-200",
    description: "Read-only access",
  },
};

export const CURRENCIES = [
  { code: "KES", symbol: "KSh", name: "Kenyan Shilling" },
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "UGX", symbol: "USh", name: "Ugandan Shilling" },
  { code: "TZS", symbol: "TSh", name: "Tanzanian Shilling" },
  { code: "RWF", symbol: "RF", name: "Rwandan Franc" },
];

export const TIMEZONES = [
  { value: "Africa/Nairobi", label: "East Africa Time (EAT) - Nairobi" },
  { value: "Africa/Lagos", label: "West Africa Time (WAT) - Lagos" },
  { value: "Africa/Cairo", label: "Eastern European Time - Cairo" },
  { value: "UTC", label: "UTC" },
];

export const NAV_ITEMS: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: "LayoutDashboard",
    roles: ["super_admin","tenant_admin","accountant","sales","purchasing","warehouse","hr","viewer"],
  },
  {
    title: "Inventory",
    href: "/inventory",
    icon: "Package",
    roles: ["super_admin","tenant_admin","accountant","warehouse","purchasing","viewer"],
  },
  {
    title: "Sales",
    href: "/sales",
    icon: "ShoppingCart",
    roles: ["super_admin","tenant_admin","accountant","sales","viewer"],
  },
  {
    title: "Purchasing",
    href: "/purchasing",
    icon: "ClipboardList",
    roles: ["super_admin","tenant_admin","accountant","purchasing","viewer"],
  },
  {
    title: "Accounting",
    href: "/accounting",
    icon: "Calculator",
    roles: ["super_admin","tenant_admin","accountant"],
  },
  {
    title: "HR & Payroll",
    href: "/hr",
    icon: "Users",
    roles: ["super_admin","tenant_admin","hr"],
  },
  {
    title: "CRM",
    href: "/crm",
    icon: "Handshake",
    roles: ["super_admin","tenant_admin","sales","viewer"],
  },
  {
    title: "Warehouse",
    href: "/warehouse",
    icon: "Warehouse",
    roles: ["super_admin","tenant_admin","warehouse","viewer"],
  },
  {
    title: "Reports",
    href: "/reports",
    icon: "BarChart3",
    roles: ["super_admin","tenant_admin","accountant","sales","purchasing","hr","viewer"],
  },
  {
    title: "Settings",
    href: "/settings",
    icon: "Settings",
    roles: ["super_admin","tenant_admin"],
  },
  {
    title: "Users",
    href: "/users",
    icon: "UserCog",
    roles: ["super_admin","tenant_admin"],
  },
];