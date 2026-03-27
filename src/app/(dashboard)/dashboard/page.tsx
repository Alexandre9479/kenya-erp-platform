"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import {
  ShoppingCart, Package, Users, TrendingUp,
  AlertTriangle, FileText, ArrowRight,
  BarChart3, Clock, CheckCircle2,
} from "lucide-react";
import StatCard from "@/components/dashboard/StatCard";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar,
} from "recharts";
import Link from "next/link";
import { cn } from "@/lib/utils";

const revenueData = [
  { month: "Aug", revenue: 180000, expenses: 120000 },
  { month: "Sep", revenue: 220000, expenses: 140000 },
  { month: "Oct", revenue: 195000, expenses: 130000 },
  { month: "Nov", revenue: 280000, expenses: 160000 },
  { month: "Dec", revenue: 350000, expenses: 190000 },
  { month: "Jan", revenue: 310000, expenses: 175000 },
];

const topProducts = [
  { name: "Office Chairs", sold: 45, revenue: 135000 },
  { name: "Printer Paper A4", sold: 200, revenue: 60000 },
  { name: "Laptop Stands", sold: 30, revenue: 90000 },
  { name: "Desk Organizers", sold: 80, revenue: 48000 },
  { name: "Whiteboard Markers", sold: 300, revenue: 30000 },
];

const recentActivity = [
  { type: "invoice", desc: "Invoice INV-00045 created for Kamau Enterprises", time: "5 min ago", status: "success" },
  { type: "stock", desc: "Low stock alert: Printer Paper A4 (5 reams left)", time: "23 min ago", status: "warning" },
  { type: "payment", desc: "Payment of KSh 45,000 received from Tech Solutions", time: "1 hr ago", status: "success" },
  { type: "order", desc: "LPO-00012 approved and sent to supplier", time: "2 hrs ago", status: "info" },
  { type: "employee", desc: "Leave request approved for Jane Muthoni", time: "3 hrs ago", status: "success" },
];

interface Stats {
  customers: number;
  products: number;
  lowStock: number;
  employees: number;
  monthRevenue: number;
  invoices: number;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/stats")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setStats(d.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const currencySymbol = session?.user?.currencySymbol || "KSh";

  const formatCurrency = (amount: number) =>
    `${currencySymbol} ${new Intl.NumberFormat("en-KE").format(amount)}`;

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            Good {getGreeting()},{" "}
            <span className="text-blue-600">{session?.user?.firstName}! 👋</span>
          </h2>
          <p className="text-slate-500 mt-1">
            Here&apos;s what&apos;s happening with your business today.
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/sales"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-blue-500/25">
            <ShoppingCart className="w-4 h-4" />
            New Sale
          </Link>
          <Link href="/inventory"
            className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors">
            <Package className="w-4 h-4" />
            Inventory
          </Link>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Monthly Revenue"
          value={loading ? "..." : formatCurrency(stats?.monthRevenue || 0)}
          change="12.5%"
          changeType="up"
          icon={TrendingUp}
          iconColor="text-green-600"
          iconBg="bg-green-100"
        />
        <StatCard
          title="Total Invoices"
          value={loading ? "..." : String(stats?.invoices || 0)}
          change="8.2%"
          changeType="up"
          icon={FileText}
          iconColor="text-blue-600"
          iconBg="bg-blue-100"
        />
        <StatCard
          title="Total Customers"
          value={loading ? "..." : String(stats?.customers || 0)}
          change="3.1%"
          changeType="up"
          icon={Users}
          iconColor="text-purple-600"
          iconBg="bg-purple-100"
        />
        <StatCard
          title="Low Stock Items"
          value={loading ? "..." : String(stats?.lowStock || 0)}
          change="Alert"
          changeType={stats?.lowStock ? "down" : "neutral"}
          icon={AlertTriangle}
          iconColor="text-orange-600"
          iconBg="bg-orange-100"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-slate-200">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-semibold text-slate-900">Revenue Overview</h3>
              <p className="text-xs text-slate-500">Revenue vs Expenses (last 6 months)</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-slate-600">Revenue</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <span className="text-slate-600">Expenses</span>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f87171" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip
               formatter={(value) => [`KSh ${Number(value).toLocaleString()}`, ""]}
                contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
              />
              <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} fill="url(#colorRevenue)" />
              <Area type="monotone" dataKey="expenses" stroke="#f87171" strokeWidth={2} fill="url(#colorExpenses)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Top Products */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-semibold text-slate-900">Top Products</h3>
              <p className="text-xs text-slate-500">By units sold this month</p>
            </div>
            <Link href="/inventory" className="text-blue-600 text-xs font-semibold hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {topProducts.map((product, index) => (
              <div key={product.name} className="flex items-center gap-3">
                <div className={cn(
                  "w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0",
                  index === 0 && "bg-yellow-100 text-yellow-700",
                  index === 1 && "bg-slate-100 text-slate-600",
                  index === 2 && "bg-orange-100 text-orange-600",
                  index > 2 && "bg-blue-50 text-blue-600",
                )}>
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{product.name}</p>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1">
                    <div
                      className="bg-blue-500 h-1.5 rounded-full"
                      style={{ width: `${(product.sold / 300) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-semibold text-slate-900">{product.sold} sold</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-slate-200">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-semibold text-slate-900">Recent Activity</h3>
              <p className="text-xs text-slate-500">Latest actions across all modules</p>
            </div>
            <BarChart3 className="w-5 h-5 text-slate-400" />
          </div>
          <div className="space-y-3">
            {recentActivity.map((activity, i) => (
              <div key={i} className="flex items-start gap-3 p-3 hover:bg-slate-50 rounded-xl transition-colors">
                <div className={cn(
                  "w-8 h-8 rounded-xl flex items-center justify-center shrink-0",
                  activity.status === "success" && "bg-green-100",
                  activity.status === "warning" && "bg-orange-100",
                  activity.status === "info" && "bg-blue-100",
                )}>
                  {activity.status === "success" && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                  {activity.status === "warning" && <AlertTriangle className="w-4 h-4 text-orange-600" />}
                  {activity.status === "info" && <FileText className="w-4 h-4 text-blue-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700">{activity.desc}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span className="text-xs text-slate-400">{activity.time}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200">
          <h3 className="font-semibold text-slate-900 mb-5">Quick Overview</h3>
          <div className="space-y-4">
            {[
              { label: "Total Products", value: loading ? "..." : String(stats?.products || 0), icon: Package, color: "text-blue-600", bg: "bg-blue-50" },
              { label: "Total Employees", value: loading ? "..." : String(stats?.employees || 0), icon: Users, color: "text-purple-600", bg: "bg-purple-50" },
              { label: "Total Customers", value: loading ? "..." : String(stats?.customers || 0), icon: Users, color: "text-green-600", bg: "bg-green-50" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", item.bg)}>
                  <item.icon className={cn("w-5 h-5", item.color)} />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-slate-500">{item.label}</p>
                  <p className="text-xl font-bold text-slate-900">{item.value}</p>
                </div>
              </div>
            ))}

            <Link href="/reports"
              className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors mt-2">
              <BarChart3 className="w-4 h-4" />
              View Full Reports
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}