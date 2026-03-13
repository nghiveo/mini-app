"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

interface TeamSlot {
  id: number;
  name: string;
  takenBy?: string;
}

const initialTeams: TeamSlot[] = [
  { id: 1, name: "Team 1" },
  { id: 2, name: "Team 2" },
  { id: 3, name: "Team 3" },
  { id: 4, name: "Team 4" },
];

const SelectTeamContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomId = searchParams.get("roomId") ?? "123456";

  const [teams, setTeams] = useState<TeamSlot[]>(initialTeams);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [teamName, setTeamName] = useState<string>("");

  useEffect(() => {
    if (!roomId || !supabaseBrowser) return;

    const channel = supabaseBrowser.channel(`room:${roomId}`);

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const activeTeams = new Map<number, string>();

        Object.values(state).flat().forEach((p: unknown) => {
          const presence = p as { is_player?: boolean; teamId?: number; teamName?: string };
          if (presence.is_player && presence.teamId) {
             activeTeams.set(presence.teamId, presence.teamName || "Khách");
          }
        });

        // Đánh dấu các team đã bị chiếm (đang online trong Lobby)
        setTeams((prev) =>
          prev.map((t) => ({
            ...t,
            takenBy: activeTeams.has(t.id) ? activeTeams.get(t.id) : undefined,
          }))
        );
      })
      .subscribe();

    return () => {
      supabaseBrowser?.removeChannel(channel);
    };
  }, [roomId]);

  const handleSelectTeam = (teamId: number) => {
    const team = teams.find((t) => t.id === teamId);
    if (!team || team.takenBy) {
      return;
    }
    setSelectedTeamId(teamId);
    
    // Chỉ tự động điền "Team X" nếu người dùng chưa nhập tên hoặc tên đang là mặc định
    if (!teamName.trim() || teamName.startsWith("Team ")) {
      setTeamName(team.name);
    }
  };

  const handleConfirm = () => {
    if (!selectedTeamId || !teamName.trim()) {
      return;
    }

    router.push(
      `/play/lobby?roomId=${roomId}&teamId=${selectedTeamId}&teamName=${encodeURIComponent(
        teamName.trim()
      )}`
    );
  };

  return (
    <div className="font-body max-w-xl mx-auto">
      <h1 className="screen-title">
        Chọn đội của bạn
      </h1>
      <p className="screen-subtitle">
        Phòng <span className="font-display text-amber-300">#{roomId}</span> – hãy chọn một trong 4 đội bên dưới.
      </p>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6">
        {teams.map((team) => {
          const isSelected = team.id === selectedTeamId;
          const isTaken = Boolean(team.takenBy);

          return (
            <button
              key={team.id}
              type="button"
              disabled={isTaken}
              onClick={() => handleSelectTeam(team.id)}
              className={[
                "relative h-24 sm:h-28 rounded-2xl border transition transform",
                "flex flex-col items-center justify-center text-center px-2",
                isTaken
                  ? "bg-slate-800/70 border-slate-700 cursor-not-allowed opacity-60"
                  : isSelected
                    ? "bg-emerald-500/20 border-emerald-400 shadow-[0_0_0_1px_rgba(52,211,153,0.5)] scale-[1.02]"
                    : "bg-[rgba(15,23,42,0.9)] border-[rgba(148,163,184,0.6)] hover:border-amber-300 hover:scale-[1.02]",
              ].join(" ")}
            >
              <span className="font-display text-lg sm:text-xl text-white">
                {team.name}
              </span>
              <span className="mt-1 text-[11px] text-slate-300">
                {isTaken ? `Đã lấy: ${team.takenBy}` : "Chạm để chọn đội"}
              </span>

              {isSelected && !isTaken && (
                <span className="absolute -top-2 right-2 rounded-full bg-emerald-500 text-[10px] px-2 py-0.5 font-semibold text-slate-950">
                  Đã chọn
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="space-y-3">
        <label className="block text-sm text-slate-200">
          Tên đội của bạn
          <input
            type="text"
            placeholder="Ví dụ: The Avengers, Fire Phoenix..."
            value={teamName}
            onChange={(event) => setTeamName(event.target.value)}
            className="mt-1 w-full rounded-xl bg-slate-900/80 border border-slate-600 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/40"
          />
        </label>

        <button
          type="button"
          disabled={!selectedTeamId || !teamName.trim()}
          onClick={handleConfirm}
          className="w-full mt-2 rounded-2xl bg-emerald-500 text-slate-950 font-semibold py-3 shadow-[0_10px_0_rgba(6,95,70,1)] active:translate-y-1 active:shadow-[0_4px_0_rgba(6,95,70,1)] disabled:opacity-60 disabled:shadow-none disabled:translate-y-0 disabled:cursor-not-allowed transition"
        >
          Vào phòng chờ
        </button>
      </div>
    </div>
  );
};

const SelectTeamPage = () => {
  return (
    <Suspense fallback={<div className="text-white text-center p-10 font-display">Đang tải...</div>}>
      <SelectTeamContent />
    </Suspense>
  );
};

export default SelectTeamPage;

