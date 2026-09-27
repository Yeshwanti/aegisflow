import type { ReactNode } from "react";
import { motion } from "framer-motion";
import clsx from "clsx";
import type { RiskLevel } from "../types";

export function Panel({
  children,
  className,
  title,
  subtitle,
  right,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <div className={clsx("bg-base-850 border border-base-700 rounded-lg shadow-panel", className)}>
      {(title || right) && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-base-700">
          <div>
            {title && <h3 className="text-sm font-semibold text-slate-100 tracking-wide">{title}</h3>}
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          {right}
        </div>
      )}
      {children}
    </div>
  );
}

export function RiskBadge({ level, size = "md" }: { level: RiskLevel; size?: "sm" | "md" }) {
  const styles: Record<RiskLevel, string> = {
    LOW: "bg-safe/15 text-safe border-safe/30",
    MODERATE: "bg-warn/15 text-warn border-warn/30",
    HIGH: "bg-orange-500/15 text-orange-400 border-orange-500/30",
    CRITICAL: "bg-crit/15 text-crit border-crit/30",
  };
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full border font-semibold uppercase tracking-wide",
        styles[level],
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs"
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {level}
    </span>
  );
}

export function MetricCard({
  label,
  value,
  unit,
  icon,
  accent,
  delta,
}: {
  label: string;
  value: string | number;
  unit?: string;
  icon?: ReactNode;
  accent?: "cyan" | "amber" | "red" | "green" | "slate";
  delta?: string;
}) {
  const accentColor: Record<string, string> = {
    cyan: "text-accent",
    amber: "text-warn",
    red: "text-crit",
    green: "text-safe",
    slate: "text-slate-300",
  };
  return (
    <div className="bg-base-850 border border-base-700 rounded-lg p-4 flex flex-col gap-2 hover:border-base-500 transition-colors">
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wider text-slate-500 font-medium">{label}</span>
        {icon && <span className={clsx("opacity-80", accentColor[accent ?? "slate"])}>{icon}</span>}
      </div>
      <div className="flex items-baseline gap-1.5">
        <motion.span
          key={String(value)}
          initial={{ opacity: 0.4, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className={clsx("text-2xl font-bold tabular-nums", accentColor[accent ?? "slate"])}
        >
          {value}
        </motion.span>
        {unit && <span className="text-xs text-slate-500 font-medium">{unit}</span>}
      </div>
      {delta && <span className="text-[11px] text-slate-500">{delta}</span>}
    </div>
  );
}

export function Button({
  children,
  onClick,
  variant = "primary",
  size = "md",
  className,
  disabled,
  type = "button",
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit";
  title?: string;
}) {
  const variants: Record<string, string> = {
    primary: "bg-accent text-base-950 hover:bg-accent-soft font-semibold",
    secondary: "bg-base-700 text-slate-100 hover:bg-base-600 border border-base-500",
    ghost: "bg-transparent text-slate-300 hover:bg-base-700 border border-base-700",
    danger: "bg-crit/15 text-crit hover:bg-crit/25 border border-crit/30",
  };
  return (
    <button
      type={type}
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={clsx(
        "inline-flex items-center justify-center gap-1.5 rounded-md transition-colors whitespace-nowrap",
        size === "sm" ? "px-2.5 py-1.5 text-xs" : "px-3.5 py-2 text-sm",
        variants[variant],
        disabled && "opacity-40 cursor-not-allowed",
        className
      )}
    >
      {children}
    </button>
  );
}

export function SectionHeading({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div>
        <h1 className="text-lg font-bold text-slate-50 tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

export function DemoTag() {
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded border border-warn/30 bg-warn/10 text-warn text-[10px] font-semibold uppercase tracking-wider">
      <span className="w-1.5 h-1.5 rounded-full bg-warn animate-pulse" />
      Demo Simulation Data
    </span>
  );
}
