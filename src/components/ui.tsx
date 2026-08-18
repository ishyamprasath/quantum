import type { ReactNode } from "react";
import type { Urgency } from "@/lib/types";

export function Section({
  eyebrow,
  title,
  lede,
  children,
  className = "",
}: {
  eyebrow?: string;
  title?: string;
  lede?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section className={`mx-auto max-w-[1180px] px-5 ${className}`}>
      {eyebrow && (
        <p className="mono mb-3 text-[11px] uppercase tracking-[0.14em] text-ink-3">
          {eyebrow}
        </p>
      )}
      {title && (
        <h2 className="text-[26px] font-semibold leading-tight tracking-tight sm:text-[30px]">
          {title}
        </h2>
      )}
      {lede && <p className="mt-2 max-w-[62ch] text-[15px] leading-relaxed text-ink-2">{lede}</p>}
      {children}
    </section>
  );
}

export function Card({
  children,
  className = "",
  as: As = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "li" | "article";
}) {
  return (
    <As
      className={`rounded-xl border border-line bg-card shadow-[0_1px_2px_rgba(20,22,28,0.04)] ${className}`}
    >
      {children}
    </As>
  );
}

const URG: Record<Urgency, { bg: string; fg: string; label: string }> = {
  P1: { bg: "bg-p1-soft", fg: "text-p1", label: "P1 · today" },
  P2: { bg: "bg-p2-soft", fg: "text-p2", label: "P2 · this week" },
  P3: { bg: "bg-p3-soft", fg: "text-p3", label: "P3 · routine" },
};

export function UrgencyTag({ u, compact = false }: { u: Urgency; compact?: boolean }) {
  const s = URG[u];
  return (
    <span
      className={`mono inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${s.bg} ${s.fg}`}
    >
      {compact ? u : s.label}
    </span>
  );
}

export function Pill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "brand" | "warn" | "good";
}) {
  const tones = {
    neutral: "bg-p3-soft text-ink-2",
    brand: "bg-brand-soft text-brand-ink",
    warn: "bg-p2-soft text-p2",
    good: "bg-good-soft text-good",
  };
  return (
    <span
      className={`mono inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function Stat({
  value,
  label,
  note,
}: {
  value: ReactNode;
  label: string;
  note?: string;
}) {
  return (
    <Card className="p-4">
      <div className="mono text-[28px] font-semibold leading-none tracking-tight text-brand-ink">
        {value}
      </div>
      <div className="mt-2 text-[13px] font-medium">{label}</div>
      {note && <div className="mt-1 text-[12px] leading-snug text-ink-3">{note}</div>}
    </Card>
  );
}

export function Meter({ value, tone = "brand" }: { value: number; tone?: "brand" | "warn" }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-p3-soft">
      <div
        className={`h-full rounded-full transition-[width] duration-500 ${
          tone === "brand" ? "bg-brand" : "bg-p2"
        }`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
