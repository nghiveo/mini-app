"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback, useRef } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";

interface TeamState {
  id: number;
  name: string;
  ready: boolean;
  online: boolean;
}

const initialTeams: TeamState[] = [
  { id: 1, name: "Team 1", ready: false, online: false },
  { id: 2, name: "Team 2", ready: false, online: false },
  { id: 3, name: "Team 3", ready: false, online: false },
  { id: 4, name: "Team 4", ready: false, online: false },
];

const AdminRoomPage = () => {
  const router = useRouter();
  
  // Auth state
  const [showKeyModal, setShowKeyModal] = useState(true);
  const [adminKey, setAdminKey] = useState("");
  const [keyError, setKeyError] = useState<string | null>(null);

  // Room state
  const [roomId, setRoomId] = useState<string | null>(null);
  const [adminName, setAdminName] = useState("Admin");
  const [duration, setDuration] = useState(60);
  const [questionCount, setQuestionCount] = useState(18);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Teams state
  const [teams, setTeams] = useState<TeamState[]>(initialTeams);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Sinh phòng hoặc khôi phục
  const createOrRestoreRoom = async () => {
    setIsLoading(true);
    try {
      // Gọi API POST /api/rooms để sinh mã phòng
      const res = await fetch("/api/rooms", { method: "POST" });
      if (!res.ok) throw new Error("Không thể tạo ID phòng mới.");
      const data = await res.json();
      setRoomId(data.room_code);
      setDuration(data.duration);
      setQuestionCount(data.question_count);

      // Fetch total questions
      if (supabaseBrowser) {
        const { count } = await supabaseBrowser
          .from("questions")
          .select("*", { count: "exact", head: true });
        if (count !== null) setTotalQuestions(count);
      }
    } catch (err: unknown) {
      alert("Lỗi tạo phòng: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsLoading(false);
    }
  };

  // Auth Submit
  const handleSubmitKey = async (event: React.FormEvent) => {
    event.preventDefault();
    setKeyError(null);

    // Mock: chỉ nhận "1234" là đúng
    if (adminKey !== "1234") {
      setKeyError("Key Admin không chính xác.");
      return;
    }

    setShowKeyModal(false);
    await createOrRestoreRoom();
  };

  // Setup Supabase Realtime khi có roomId
  useEffect(() => {
    if (!roomId || showKeyModal || !supabaseBrowser) return;

    const channel = supabaseBrowser.channel(`room:${roomId}`, {
      config: {
        presence: { key: "admin" },
        broadcast: { self: true }, // nhận cả own messages
      },
    });

    channelRef.current = channel;

    // Lắng nghe thay đổi kết nối (Presence)
    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const activePresences = new Map<number, { online: boolean; teamName?: string }>();

        Object.values(state).flat().forEach((p: unknown) => {
          const presence = p as { is_player?: boolean; teamId?: number; teamName?: string };
          if (presence.is_player && presence.teamId) {
            activePresences.set(presence.teamId, {
              online: true,
              teamName: presence.teamName,
            });
          }
        });

        // Cập nhật online status & team name từ presence sync 
        setTeams((prev) =>
          prev.map((t) => {
            const p = activePresences.get(t.id);
            // Ưu tiên:
            // 1. Tên do Player tự đặt hoặc do Admin đổi (tồn tại trong Presence > teamName)
            // 2. Không lấy "Team X" (nếu presence teamName rỗng hoặc trùng)
            const resolvedName = p?.teamName && p.teamName.trim() !== "" ? p.teamName : t.name;

            return {
              ...t,
              online: !!p?.online,
              name: resolvedName,
              // Quan trọng: Phải giữ nguyên trạng thái ready hiện tại của team
              ready: t.ready,
            };
          })
        );
      })
      .on("presence", { event: "join" }, ({ newPresences }) => {
        // Khi có thiết bị mới join (chưa chắc là player, kiểm tra is_player)
        // Admin sẽ push lại config hiện tại cho mọi người trong phòng
        // để người mới join nhận được config mới nhất
        const hasNewPlayer = newPresences.some((p: unknown) => (p as {is_player?: boolean}).is_player);
        if (hasNewPlayer) {
          channel.send({
            type: "broadcast",
            event: "config_update",
            payload: { duration, question_count: questionCount },
          });
        }
      })
      .on("presence", { event: "leave" }, () => {})
      // Lắng nghe sự kiện Broadcast từ Player
      .on("broadcast", { event: "team_update" }, ({ payload }) => {
        // payload: { teamId, name, ready }
        if (payload.teamId) {
          setTeams((prev) =>
            prev.map((t) =>
              t.id === payload.teamId
                ? {
                    ...t,
                    ...(payload.name ? { name: payload.name } : {}),
                    ...(payload.ready !== undefined ? { ready: payload.ready } : {}),
                  }
                : t
            )
          );
        }
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ is_admin: true });
        }
      });

    return () => {
      supabaseBrowser?.removeChannel(channel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, showKeyModal, duration, questionCount]);

  // Cập nhật Config Phòng tới DB và Broadcast tới User
  const updateRoomConfig = useCallback(
    async (updates: { duration?: number; question_count?: number; status?: string }) => {
      if (!roomId) return;
      
      try {
        await fetch(`/api/rooms/${roomId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });

        if (channelRef.current) {
          channelRef.current.send({
            type: "broadcast",
            event: "config_update",
            payload: updates,
          });
        }
      } catch (err) {
        console.error("Lỗi đồng bộ cấu hình:", err);
      }
    },
    [roomId]
  );

  const handleChangeDuration = (delta: number) => {
    if (!roomId) return;
    setDuration((prev) => {
      const next = Math.max(10, prev + delta);
      updateRoomConfig({ duration: next });
      return next;
    });
  };

  const handleChangeQuestionCount = (delta: number) => {
    if (!roomId) return;
    setQuestionCount((prev) => {
      let next = prev + delta;
      
      // Số lượng câu hỏi phải chia 4 dư 2
      if (next % 4 !== 2) {
        next = Math.round((next - 2) / 4) * 4 + 2;
      }
      
      // Tối thiểu là 6 câu (để thỏa 6 % 4 == 2)
      if (next < 6) next = 6;
      
      // Phải nhỏ hơn tổng số câu hỏi - 2
      if (totalQuestions > 0) {
        while (next >= totalQuestions - 2 && next >= 6) {
          next -= 4;
        }
        if (next <= prev && delta > 0) return prev;
      }

      updateRoomConfig({ question_count: next });
      return next;
    });
  };

  const handleStartGame = async () => {
    // Chỉ bắt đầu nếu đủ 4 sẵn sàng
    const readyCount = teams.filter((t) => t.ready).length;
    if (readyCount < 4) {
      alert("Cần đủ 4 đội sẵn sàng để bắt đầu!");
      return;
    }
    
    // Check mất kết nối
    const offlineTeam = teams.find((t) => !t.online);
    if (offlineTeam) {
      alert(`Đội ${offlineTeam.name} đang mất kết nối. Vui lòng kiểm tra lại.`);
      return;
    }

    if (window.confirm("Bắt đầu trận đấu? Các đội sẽ bị khoá thay đổi thông tin.")) {
      await updateRoomConfig({ status: "playing" });
      if (channelRef.current) {
        channelRef.current.send({
          type: "broadcast",
          event: "game_start",
          payload: { timestamp: Date.now() },
        });
      }
      sessionStorage.setItem(`room_teams_${roomId}`, JSON.stringify(teams));
      router.push(`/admin/game?roomId=${roomId}`);
    }
  };

  const handleDisbandRoom = async () => {
    if (window.confirm("Giải tán phòng? Mọi người chơi sẽ bị đưa về trang chủ.")) {
      await updateRoomConfig({ status: "finished" }); // Hoặc status khác để đánh dấu phòng đóng
      if (channelRef.current) {
        channelRef.current.send({
          type: "broadcast",
          event: "admin_action",
          payload: { action: "disband" },
        });
      }
      router.push("/");
    }
  };

  const handleResetTeam = (teamId: number) => {
     if (channelRef.current) {
         channelRef.current.send({
             type: "broadcast",
             event: "admin_action",
             payload: { action: "reset", teamId }
         });
     }
     // Giả lập trực tiếp trên Admin UI trước khi Player nhận
     setTeams((prev) => prev.map((t) => (t.id === teamId ? { ...t, ready: false } : t)));
  };

  const handleKickTeam = (teamId: number) => {
     if (window.confirm(`Mời team ${teamId} ra khỏi phòng?`)) {
       if (channelRef.current) {
           channelRef.current.send({
               type: "broadcast",
               event: "admin_action",
               payload: { action: "kick", teamId }
           });
       }
       setTeams((prev) => prev.map((t) => (t.id === teamId ? { ...t, name: `Team ${teamId}`, ready: false } : t)));
     }
  };

  // Rendering
  return (
    <div className="font-body max-w-3xl mx-auto">
      <h1 className="screen-title mb-2">Trạm điều khiển</h1>
      <p className="screen-subtitle mb-6 text-base">
        Chia sẻ mã phòng cấu hình cho các đội quét mã QR hoặc nhập thủ công.
      </p>

      {/* DASHBOARD TOP PANEL */}
      <div className="mb-6 rounded-2xl bg-[rgba(15,23,42,0.95)] border border-[rgba(148,163,184,0.3)] shadow-[0_0_20px_rgba(30,58,138,0.15)] p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5 sm:gap-4 mb-5">
          <div className="flex-1">
            <div className="text-xs text-sky-300 uppercase tracking-widest font-semibold mb-1">
              Mã vào phòng
            </div>
            <div className="inline-flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-4">
              <span className="font-display text-4xl font-black text-white tracking-widest drop-shadow-[0_0_12px_rgba(56,189,248,0.5)]">
                {roomId || "------"}
              </span>
              {isLoading && <span className="text-xs text-slate-400 animate-pulse">Đang tạo...</span>}
            </div>
          </div>
          <div className="w-full sm:w-auto text-left sm:text-right">
            <div className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">
              Chủ tọa
            </div>
            <input
              type="text"
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
              className="w-full sm:w-36 rounded-xl bg-slate-900 border border-slate-700 px-3 py-1.5 text-sm font-semibold text-white focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400/40"
              placeholder="Tên Host"
            />
          </div>
        </div>

        {/* SETTINGS PANELS */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="rounded-xl bg-slate-900/60 border border-slate-700/60 px-4 py-3 flex flex-col justify-between group hover:border-sky-500/50 transition">
            <span className="text-xs font-semibold text-slate-300 uppercase mb-2">
              ⏱ Thời gian / câu
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleChangeDuration(-5)}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-lg transition shadow-sm"
              >
                –
              </button>
              <span className="font-display text-xl font-bold text-white min-w-[72px] text-center">
                {duration}s
              </span>
              <button
                type="button"
                onClick={() => handleChangeDuration(5)}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-lg transition shadow-sm"
              >
                +
              </button>
            </div>
          </div>

          <div className="rounded-xl bg-slate-900/60 border border-slate-700/60 px-4 py-3 flex flex-col justify-between group hover:border-fuchsia-500/50 transition">
            <span className="text-xs font-semibold text-slate-300 uppercase mb-2">
              🎯 Số câu hỏi
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleChangeQuestionCount(-4)}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-lg transition shadow-sm"
              >
                –
              </button>
              <span className="font-display text-xl font-bold text-white min-w-[72px] text-center">
                {questionCount}
              </span>
              <button
                type="button"
                onClick={() => handleChangeQuestionCount(4)}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-lg transition shadow-sm"
              >
                +
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* TEAMS GRID */}
      <h2 className="text-sm font-semibold tracking-wider text-slate-300 uppercase mb-3 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-slate-500"></span>
        Trạng thái 4 đội chơi
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {teams.map((team) => (
          <div
            key={team.id}
            className={[
              "relative rounded-2xl border p-4 flex flex-col justify-between transition-all duration-300 min-h-[140px]",
              team.ready ? "bg-emerald-900/10 border-emerald-500/40" : "bg-[rgba(15,23,42,0.6)] border-slate-700",
            ].join(" ")}
          >
            <div>
              <div className="flex items-start justify-between mb-2">
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider bg-black/20 px-2 py-0.5 rounded-full inline-block">
                  SLOT {team.id}
                </div>
                {/* Status Indicator */}
                <span
                  title={team.online ? "Đã kết nối Socket" : "Chưa kết nối / Mất mạng"}
                  className={[
                    "inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase transition-colors shrink-0",
                    team.online
                      ? "bg-emerald-500/15 text-emerald-400"
                      : "bg-rose-500/15 text-rose-400",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "h-1.5 w-1.5 rounded-full",
                      team.online ? "bg-emerald-400 animate-pulse" : "bg-rose-400",
                    ].join(" ")}
                  />
                  {team.online ? "Online" : "Offline"}
                </span>
              </div>
              <div className="font-display font-bold text-base text-white truncate break-words mt-1 pr-4">
                <input
                  type="text"
                  value={team.name || `Team ${team.id}`}
                  onChange={(e) => {
                    const newName = e.target.value;
                    setTeams((prev) => prev.map((t) => t.id === team.id ? { ...t, name: newName } : t));
                    if (channelRef.current) {
                      channelRef.current.send({
                        type: "broadcast",
                        event: "team_update",
                        payload: { teamId: team.id, name: newName }
                      });
                    }
                  }}
                  className="w-full bg-transparent border-b border-transparent hover:border-slate-500 focus:border-sky-400 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-2">
              {/* Ready Banner */}
              <div
                 className={[
                   "w-full text-center text-xs py-1.5 rounded-lg font-bold uppercase tracking-wide transition-colors",
                   team.ready
                     ? "bg-emerald-500 text-slate-950 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                     : "bg-slate-800 text-slate-400",
                 ].join(" ")}
              >
                  {team.ready ? "SẴN SÀNG" : "ĐANG CHỜ..."}
              </div>

              {/* Admin Actions */}
              <div className="flex items-center justify-between gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => handleResetTeam(team.id)}
                  className="flex-1 text-[10px] px-2 py-1.5 rounded-md bg-slate-800/80 hover:bg-slate-700 text-slate-200 transition"
                  title="Gỡ trạng thái READY của đội"
                >
                  Force Unready
                </button>
                <button
                  type="button"
                  onClick={() => handleKickTeam(team.id)}
                  className="px-2 py-1.5 rounded-md bg-rose-900/50 hover:bg-rose-600 border border-transparent hover:border-rose-400 text-rose-300 hover:text-white transition"
                  title="Đuổi thiết bị này và reset Slot"
                >
                  Kick
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-2xl bg-slate-900/40 border border-slate-700/50">
        <div className="text-sm font-medium text-slate-300 flex items-center gap-2">
          <span>Tiến độ:</span>
          <span className="font-display text-xl text-white">
            <span className={teams.filter((t) => t.ready).length === 4 ? "text-emerald-400" : "text-amber-400"}>
               {teams.filter((t) => t.ready).length}
            </span>
            /4
          </span>
          <span>đội sẵn sàng</span>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto mt-4 sm:mt-0">
          <button
            type="button"
            onClick={handleDisbandRoom}
            className="rounded-2xl px-6 py-3.5 font-display text-sm uppercase font-bold tracking-widest transition-all
              bg-rose-500/10 text-rose-400 border border-rose-500/50
              hover:bg-rose-500 hover:text-white
              active:translate-y-1"
          >
            Giải tán
          </button>
          <button
            type="button"
            onClick={handleStartGame}
            className="rounded-2xl px-8 py-3.5 font-display text-base uppercase font-bold tracking-widest transition-all
              bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950
              hover:from-amber-300 hover:to-amber-400
              shadow-[0_8px_0_rgba(180,83,9,1)] active:translate-y-1 active:shadow-[0_4px_0_rgba(180,83,9,1)]"
          >
            VÀO GAME
          </button>
        </div>
      </div>

      {/* AUTH MODAL */}
      {showKeyModal && (
        <div className="overlay-backdrop">
          <div className="overlay-panel font-body">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-2xl font-bold text-white flex gap-2 items-center">
                 <span className="bg-rose-500 text-white w-6 h-6 flex items-center justify-center rounded-md text-sm">🔒</span>
                 Xác thực Admin
              </h2>
              <button
                type="button"
                onClick={() => router.push("/")}
                className="text-xs rounded-full bg-slate-800 text-slate-200 px-3 py-1.5 hover:bg-slate-700 transition"
              >
                Hủy
              </button>
            </div>
            <p className="text-sm text-slate-300 mb-5 leading-relaxed">
              Bạn đang chuẩn bị tạo mới một Phiên (Room) chơi đấu trường. Vui lòng nhập <strong className="text-amber-300 font-normal">Mật khẩu tổng</strong> để tiếp tục truy cập quyền Quản trị tối cao.
            </p>
            <form onSubmit={handleSubmitKey} className="space-y-4">
              <div>
                <input
                  type="password"
                  value={adminKey}
                  onChange={(event) => setAdminKey(event.target.value)}
                  className={[
                      "w-full rounded-xl bg-slate-900 border px-4 py-3 text-lg font-bold text-center tracking-[0.5em] text-white focus:outline-none transition-colors placeholder:tracking-normal placeholder:font-normal placeholder:text-sm placeholder:text-slate-500",
                      keyError ? "border-rose-500/70 focus:border-rose-500 animate-[shake_0.4s_ease-in-out]" : "border-slate-600 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
                  ].join(" ")}
                  placeholder="Nhập Key VD: 1234"
                  autoFocus
                />
              </div>
              {keyError && (
                <p className="text-xs font-semibold text-rose-400 text-center animate-pulse">
                  {keyError}
                </p>
              )}
              <button
                type="submit"
                disabled={!adminKey.trim()}
                className="w-full mt-3 rounded-2xl bg-sky-500 text-white font-display text-base uppercase font-bold py-3.5 shadow-[0_8px_0_rgba(3,105,161,1)] active:translate-y-1 active:shadow-[0_4px_0_rgba(3,105,161,1)] disabled:opacity-50 disabled:shadow-none transition-all disabled:translate-y-0"
              >
                Kích hoạt Phòng đấu
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminRoomPage;

