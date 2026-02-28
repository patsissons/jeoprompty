import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "border-white/10 bg-white/5 text-foreground",
        secondary: "border-cyan-300/20 bg-cyan-400/10 text-cyan-200",
        success: "border-emerald-300/20 bg-emerald-400/10 text-emerald-200",
        warning: "border-amber-300/20 bg-amber-400/10 text-amber-200",
        destructive: "border-rose-300/20 bg-rose-400/10 text-rose-200",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

type BadgeProps = React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
