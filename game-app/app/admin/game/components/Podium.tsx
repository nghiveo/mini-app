"use client";

import { useMemo } from "react";

interface TeamEntry {
  id: number;
  name: string;
  score: number;
}

export default function Podium({ scores, teams }: { scores: Record<number, number>, teams: {id: number, name: string}[] }) {
  const rankedTeams = useMemo(() => {
    // Map scores to teams
    const entries: TeamEntry[] = teams.map(t => ({
      id: t.id,
      name: t.name,
      score: scores[t.id] || 0
    }));

    // Sort by score descending
    entries.sort((a, b) => b.score - a.score);

    // Keep top 3 for the podium
    return [
      entries[1] || null, // 2nd Place (Left)
      entries[0] || null, // 1st Place (Center)
      entries[2] || null, // 3rd Place (Right)
    ];
  }, [scores, teams]);

  return (
    <div className="w-full h-full flex flex-col items-center justify-end pb-10">
      <h2 className="font-display font-black text-5xl text-amber-400 mb-12 uppercase tracking-widest drop-shadow-lg animate-pulse">
        BẢNG VÀNG DANH DỰ
      </h2>

      <div className="flex items-end justify-center gap-2 sm:gap-6 h-64 w-full max-w-3xl px-4">
        {/* 2nd Place */}
        {rankedTeams[0] && (
          <div className="flex flex-col items-center flex-1 z-10 animate-[slideUp_1s_ease-out_0.5s_both]">
            <div className="text-xl sm:text-2xl font-bold text-slate-300 mb-2 truncate w-full text-center px-2">{rankedTeams[0].name}</div>
            <div className="font-display text-3xl font-black text-slate-100 mb-4">{rankedTeams[0].score}</div>
            <div className="w-full bg-gradient-to-t from-slate-600 to-slate-400 h-32 rounded-t-lg border-2 border-b-0 border-slate-300 shadow-[0_0_30px_rgba(148,163,184,0.3)] flex justify-center pt-4 relative overflow-hidden">
               <div className="absolute inset-0 bg-white/10 w-full h-full transform -skew-x-12 translate-x-4"></div>
               <span className="font-display text-5xl font-black text-slate-200 drop-shadow-md">2</span>
            </div>
          </div>
        )}

        {/* 1st Place */}
        {rankedTeams[1] && (
          <div className="flex flex-col items-center flex-1 z-20 animate-[slideUp_1s_ease-out_1s_both]">
            <div className="text-4xl mb-2 animate-bounce">👑</div>
            <div className="text-2xl sm:text-3xl font-black text-amber-300 mb-2 truncate w-full text-center px-2 drop-shadow-md">{rankedTeams[1].name}</div>
            <div className="font-display text-4xl font-black text-white mb-4 drop-shadow-lg">{rankedTeams[1].score}</div>
            <div className="w-full bg-gradient-to-t from-amber-600 to-amber-400 h-48 rounded-t-lg border-2 border-b-0 border-amber-300 shadow-[0_0_50px_rgba(251,191,36,0.5)] flex justify-center pt-4 relative overflow-hidden">
               <div className="absolute inset-0 bg-white/20 w-full h-full transform -skew-x-12 translate-x-4"></div>
               <span className="font-display text-6xl font-black text-amber-100 drop-shadow-md">1</span>
            </div>
          </div>
        )}

        {/* 3rd Place */}
        {rankedTeams[2] && (
          <div className="flex flex-col items-center flex-1 z-0 animate-[slideUp_1s_ease-out_0s_both]">
            <div className="text-lg sm:text-xl font-bold text-amber-700 mb-2 truncate w-full text-center px-2">{rankedTeams[2].name}</div>
            <div className="font-display text-2xl font-black text-amber-600 mb-4">{rankedTeams[2].score}</div>
            <div className="w-full bg-gradient-to-t from-amber-900 to-amber-700 h-24 rounded-t-lg border-2 border-b-0 border-amber-600 shadow-[0_0_20px_rgba(180,83,9,0.3)] flex justify-center pt-2 relative overflow-hidden">
               <div className="absolute inset-0 bg-white/5 w-full h-full transform -skew-x-12 translate-x-4"></div>
               <span className="font-display text-4xl font-black text-amber-500 drop-shadow-md">3</span>
            </div>
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slideUp {
          from { transform: translateY(100px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}} />
    </div>
  );
}
