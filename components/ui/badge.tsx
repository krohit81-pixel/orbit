import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2.5 py-[3px] text-[11px] font-semibold leading-none tracking-tight",
  {
    variants: {
      variant: {
        default: "bg-secondary text-muted-foreground",
        accent: "bg-accent text-accent-foreground",
        warm: "bg-[hsl(var(--warm-foreground))] text-warm border border-warm/30",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}
function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
export { Badge, badgeVariants };
