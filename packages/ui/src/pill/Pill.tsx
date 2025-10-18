import type { ButtonHTMLAttributes, PropsWithChildren } from "react";
import clsx from "clsx";

type PillProps = ButtonHTMLAttributes<HTMLButtonElement> &
  PropsWithChildren<{
    active?: boolean;
    tone?: "neutral" | "primary" | "success" | "danger";
  }>;

const toneClasses: Record<NonNullable<PillProps["tone"]>, string> = {
  neutral: "bg-slate-100 text-slate-700 hover:bg-slate-200",
  primary: "bg-slate-900 text-white hover:bg-slate-800",
  success: "bg-emerald-500 text-white hover:bg-emerald-600",
  danger: "bg-rose-500 text-white hover:bg-rose-600",
};

const Pill = ({
  children,
  active = false,
  tone = "neutral",
  className,
  ...props
}: PillProps) => {
  return (
    <button
      type="button"
      className={clsx(
        "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400",
        toneClasses[tone],
        active && "ring-2 ring-offset-2 ring-slate-900",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
};

export default Pill;
