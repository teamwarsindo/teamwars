'use client';

import { TeamStandingItem, DIVISION_MAP } from '@/lib/types/tournament';

interface StandingTabProps {
  standings: TeamStandingItem[];
}

export function StandingTab({ standings }: StandingTabProps) {
  if (!standings || standings.length === 0) {
    return (
      <div className="p-8 text-center text-xs text-muted-foreground">
        Belum ada data klasemen yang tersedia.
      </div>
    );
  }

  const groupAStandings = standings.filter((s) => s.groupName === DIVISION_MAP.GROUP_A);
  const groupBStandings = standings.filter((s) => s.groupName === DIVISION_MAP.GROUP_B);

  const renderTable = (items: TeamStandingItem[], title: string) => (
    <div className="space-y-3">
      <h3 className="text-sm font-black uppercase tracking-wider text-primary flex items-center gap-2">
        <span>🏆</span> Divisi {title}
      </h3>
      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
        <table className="w-full text-left text-xs">
          <thead className="bg-muted/50 border-b border-border text-[11px] font-black uppercase text-muted-foreground">
            <tr>
              <th className="py-3 px-3 text-center">#</th>
              <th className="py-3 px-3">Tim</th>
              <th className="py-3 px-2 text-center">MP</th>
              <th className="py-3 px-2 text-center">W</th>
              <th className="py-3 px-2 text-center">L</th>
              <th className="py-3 px-2 text-center">SW-SL</th>
              <th className="py-3 px-2 text-center">RD</th>
              <th className="py-3 px-3 text-center text-primary">PTS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40 font-bold">
            {items.map((item, idx) => (
              <tr key={item.teamId || idx} className="hover:bg-muted/20 transition">
                <td className="py-2.5 px-3 text-center font-black">{idx + 1}</td>
                <td className="py-2.5 px-3">
                  <div className="flex items-center gap-2.5">
                    <img src={item.teamLogo} alt="" className="h-6 w-6 object-contain" />
                    <span className="font-extrabold text-foreground">{item.teamName}</span>
                  </div>
                </td>
                <td className="py-2.5 px-2 text-center text-muted-foreground">{item.matchPlayed}</td>
                <td className="py-2.5 px-2 text-center text-emerald-500">{item.matchWins}</td>
                <td className="py-2.5 px-2 text-center text-rose-500">{item.matchLosses}</td>
                <td className="py-2.5 px-2 text-center text-muted-foreground">
                  {item.setWins}-{item.setLosses}
                </td>
                <td className="py-2.5 px-2 text-center">
                  <span className={item.roundDifference > 0 ? 'text-emerald-500' : item.roundDifference < 0 ? 'text-rose-500' : ''}>
                    {item.roundDifference > 0 ? `+${item.roundDifference}` : item.roundDifference}
                  </span>
                </td>
                <td className="py-2.5 px-3 text-center font-black text-primary text-sm">{item.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      {renderTable(groupAStandings, DIVISION_MAP.GROUP_A)}
      {renderTable(groupBStandings, DIVISION_MAP.GROUP_B)}
    </div>
  );
}