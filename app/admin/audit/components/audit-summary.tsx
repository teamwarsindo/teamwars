'use client';

interface AuditSummaryProps {
  summary?: { totalMatches: number; mismatchedCount: number; totalKeysInKv: number };
}

export function AuditSummary({ summary }: AuditSummaryProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="p-4 rounded-xl border border-border bg-card">
        <p className="text-xs text-muted-foreground uppercase font-semibold">Total Item Match</p>
        <p className="text-2xl font-black text-foreground mt-1">{summary?.totalMatches || 0}</p>
      </div>
      <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/10">
        <p className="text-xs text-destructive uppercase font-semibold">Group Mismatch ("Group A/B")</p>
        <p className="text-2xl font-black text-destructive mt-1">{summary?.mismatchedCount || 0}</p>
      </div>
      <div className="p-4 rounded-xl border border-border bg-card">
        <p className="text-xs text-muted-foreground uppercase font-semibold">Total Key di KV</p>
        <p className="text-2xl font-black text-primary mt-1">{summary?.totalKeysInKv || 0}</p>
      </div>
    </div>
  );
}