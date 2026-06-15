import { Quote } from "lucide-react";
import { cn } from "@/lib/utils";

export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70", className)}>
      {children}
    </div>
  );
}

export function SectionTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="mb-2.5 mt-1 flex items-baseline justify-between">
      <Eyebrow>{children}</Eyebrow>
      {right}
    </div>
  );
}

export function SourceQuote({ children }: { children?: string }) {
  if (!children) return null;
  return (
    <div className="mt-1.5 flex gap-1.5 border-l-2 border-border pl-2.5 text-[12.5px] italic text-muted-foreground/80">
      <Quote className="mt-0.5 h-3 w-3 shrink-0" />
      <span>{children}</span>
    </div>
  );
}
