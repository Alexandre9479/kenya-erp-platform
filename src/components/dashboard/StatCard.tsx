import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: "up" | "down" | "neutral";
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  prefix?: string;
}

export default function StatCard({
  title, value, change, changeType = "neutral",
  icon: Icon, iconColor, iconBg, prefix,
}: StatCardProps) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200 hover:shadow-lg hover:shadow-slate-200/50 transition-all duration-300 group">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
          <p className="text-2xl font-bold text-slate-900">
            {prefix && <span className="text-lg font-semibold text-slate-600 mr-1">{prefix}</span>}
            {value}
          </p>
          {change && (
            <div className="flex items-center gap-1 mt-2">
              <span className={cn(
                "text-xs font-semibold px-2 py-0.5 rounded-full",
                changeType === "up" && "bg-green-100 text-green-700",
                changeType === "down" && "bg-red-100 text-red-700",
                changeType === "neutral" && "bg-slate-100 text-slate-600",
              )}>
                {changeType === "up" && "↑ "}
                {changeType === "down" && "↓ "}
                {change}
              </span>
              <span className="text-xs text-slate-400">vs last month</span>
            </div>
          )}
        </div>
        <div className={cn(
          "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ml-4 group-hover:scale-110 transition-transform",
          iconBg
        )}>
          <Icon className={cn("w-6 h-6", iconColor)} />
        </div>
      </div>
    </div>
  );
}