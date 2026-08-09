import * as React from "react"
import { cn } from "../../lib/utils"

export interface BadgeProps {
  className?: string;
  children?: React.ReactNode;
  variant?: "default" | "success" | "warning" | "destructive" | "outline" | "secondary";
}

export function Badge({ className, variant = "default", children, ...props }: BadgeProps) {
  const variants = {
    default: "border-transparent bg-slate-900 text-slate-50 hover:bg-slate-900/80",
    secondary: "border-transparent bg-slate-100 text-slate-900 hover:bg-slate-100/80",
    destructive: "border-transparent bg-red-500 text-slate-50 hover:bg-red-500/80",
    outline: "text-slate-950 border-slate-200",
    success: "border-transparent bg-emerald-500 text-white hover:bg-emerald-500/80",
    warning: "border-transparent bg-amber-500 text-white hover:bg-amber-500/80",
  }

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
