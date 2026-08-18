import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "ONDRU — municipal grievance triage",
  description:
    "On-device AI that groups duplicate civic complaints into one incident, routes them to a desk, ranks urgency, and refuses to guess when it is not sure.",
};

function Nav() {
  const links = [
    { href: "/", label: "Overview" },
    { href: "/triage", label: "Triage console" },
    { href: "/evaluation", label: "Evaluation" },
    { href: "/method", label: "Method" },
  ];
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1180px] items-center gap-6 px-5">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="text-[17px] font-semibold tracking-tight">ONDRU</span>
          <span className="hidden text-[11px] text-ink-3 sm:inline">ஒன்று</span>
        </Link>
        <nav className="flex items-center gap-1 text-[13px]">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-md px-2.5 py-1.5 text-ink-2 transition-colors hover:bg-brand-soft hover:text-brand-ink"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto hidden items-center gap-3 text-[11px] text-ink-3 md:flex">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-good" />
            runs in your browser
          </span>
          <a
            href="https://github.com/ishyamprasath/quantum"
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-line px-2 py-1 text-ink-2 transition-colors hover:border-line-2 hover:text-ink"
          >
            Source
          </a>
        </div>
      </div>
    </header>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <Nav />
        {children}
        <footer className="mt-24 border-t border-line">
          <div className="mx-auto flex max-w-[1180px] flex-col gap-2 px-5 py-8 text-[12px] text-ink-3 sm:flex-row sm:items-center sm:justify-between">
            <p>
              ONDRU — decision support for a grievance desk. It ranks and groups; it
              never closes a complaint.
            </p>
            <p>
              Code for Communities · SDG 16 Peace, Justice &amp; Strong Institutions
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
