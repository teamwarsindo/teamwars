import React from 'react';

interface MatchBannerProps {
  teamAName: string;
  teamBName: string;
  scoreA: number;
  scoreB: number;
}

export default function MatchBanner({ teamAName, teamBName, scoreA, scoreB }: MatchBannerProps) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-around shadow-sm">
      <div className="text-center">
        <h2 className="text-lg font-bold text-blue-400">{teamAName}</h2>
        <span className="text-3xl font-extrabold text-white">{scoreA}</span>
      </div>
      <div className="text-slate-600 font-bold text-lg">VS</div>
      <div className="text-center">
        <h2 className="text-lg font-bold text-red-400">{teamBName}</h2>
        <span className="text-3xl font-extrabold text-white">{scoreB}</span>
      </div>
    </div>
  );
}
