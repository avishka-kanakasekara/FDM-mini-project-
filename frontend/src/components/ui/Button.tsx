import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-gradient-to-br from-[#18a674] to-[#0c6d4c] text-white shadow-lg shadow-leaf/25 hover:from-[#1bb57f] hover:to-[#0e7d57]",
  secondary: "border border-line bg-white text-ink shadow-sm hover:border-[#c5d8d0] hover:bg-[#f7fbf9]",
  ghost: "text-ink hover:bg-black/5",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export function Button({ variant = "primary", className = "", type = "button", ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}
