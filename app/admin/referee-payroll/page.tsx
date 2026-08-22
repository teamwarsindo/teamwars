"use client";
import { useState, useEffect } from "react";
import { ShieldCheck, Wallet, Receipt, Edit3, Copy } from "lucide-react";

export default function RefereePayrollPage() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch("/api/referee/payroll").then(res => res.json()).then(setData);
  }, []);

  if (!data) return <div className="p-10 text-center">Loading...</div>;

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-6">
      <div className="border-b border-border pb-4">
        <h1 className="text-xl font-black text-foreground">Referee Payroll & Performance</h1>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <table className="w-full text-left">
          <thead className="text-muted-foreground uppercase text-xs font-black">
            <tr>
              <th className="p-3">Wasit</th>
              <th className="p-3 text-center">Total Match</th>
              <th className="p-3 text-center">Honor</th>
              <th className="p-3 text-center">Rekening</th>
              <th className="p-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.referees.map((ref: any) => (
              <tr key={ref.name}>
                <td className="p-3 font-bold text-sm">{ref.name}</td>
                <td className="p-3 text-center">{ref.totalMatches}</td>
                <td className="p-3 text-center">Rp {ref.totalEarned.toLocaleString()}</td>
                <td className="p-3 text-center text-xs">
                  <div className="font-bold">{ref.profile?.bankName}</div>
                  <div>{ref.profile?.accountNumber}</div>
                </td>
                <td className="p-3 text-right">
                  {data.isAdmin && (
                    <button className="bg-primary text-primary-foreground px-3 py-1 rounded-lg text-xs font-bold">
                      <Receipt className="inline h-3 w-3 mr-1" /> Bayar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
