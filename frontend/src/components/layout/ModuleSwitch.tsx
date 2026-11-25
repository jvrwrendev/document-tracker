import { FileText, Ticket } from 'lucide-react';

// The ticketing system runs as its own site.
const TICKETING_URL =
  (import.meta.env.VITE_TICKETING_URL as string | undefined) || 'https://issuance.itsd-ticket.online/#admin';

/** Switch between the two systems: Ticketing (other site) | Document Tracker (this site). */
export function ModuleSwitch() {
  return (
    <nav aria-label="Switch system" className="mb-4 inline-flex gap-1 rounded-xl border bg-card p-1">
      <a
        href={TICKETING_URL}
        className="inline-flex items-center gap-2 rounded-lg px-4 py-1.5 text-sm font-semibold text-foreground hover:bg-muted"
      >
        <Ticket className="h-4 w-4" />
        Ticketing
      </a>
      <span
        aria-current="page"
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground"
      >
        <FileText className="h-4 w-4" />
        Document Tracker
      </span>
    </nav>
  );
}