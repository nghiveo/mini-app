"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useRef, Suspense } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";

const LobbyContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const roomId = searchParams.get("roomId");
  const teamId = searchParams.get("teamId");
  const teamNameParam = searchParams.get("teamName");

  // State lưu tên ban đầu từ URL để track lần đầu
  const initialTeamNameRef = useRef(teamNameParam ?? `Team ${teamId}`);
  const [teamName, setTeamName] = useState(initialTeamNameRef.current);
  const [isReady, setIsReady] = useState(false);
  
  // States from Admin broadcast
  const [duration, setDuration] = useState(60);
  const [questionCount, setQuestionCount] = useState(18);

  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    // Nếu thiếu param, đẩy về trang chủ
    if (!roomId || !teamId || !supabaseBrowser) {
      router.push("/");
      return;
    }

    // Dùng random device string để phân biệt
    const deviceHash = Math.random().toString(36).substring(2, 9);
    const presenceKey = `p_${teamId}_${deviceHash}`;

    const channel = supabaseBrowser.channel(`room:${roomId}`, {
      config: {
        presence: { key: presenceKey },
      },
    });
    channelRef.current = channel;

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        let currentStatusFound = false;

        // Quét xem mình đang có presence name là gì (để đồng bộ nếu bị admin ép đổi)
        Object.values(state).flat().forEach((p: unknown) => {
          const presence = p as { is_player?: boolean; teamId?: number; teamName?: string };
          if (presence.is_player && presence.teamId === parseInt(teamId, 10)) {
            currentStatusFound = true;
            if (presence.teamName && presence.teamName !== teamName) {
              setTeamName(presence.teamName);
            }
          }
        });

        // Nếu admin kick thì presence của mình sẽ không còn
        if (!currentStatusFound && state["admin"]) {
           // Admin ở trong phòng nhưng mình không có mặt (bị xoá presence) => Khả năng bị Kick session
        }
      })
      .on("broadcast", { event: "config_update" }, ({ payload }) => {
        if (payload.duration) setDuration(payload.duration);
        if (payload.question_count) setQuestionCount(payload.question_count);
      })
      .on("broadcast", { event: "admin_action" }, ({ payload }) => {
        if (payload.action === "disband") {
          alert("Phòng đã bị Admin giải tán.");
          router.push("/");
          return;
        }
        
        if (payload.teamId === parseInt(teamId, 10)) {
          if (payload.action === "reset") {
            setIsReady(false);
          } else if (payload.action === "kick") {
            alert("Bạn đã bị Admin mời ra khỏi phòng.");
            router.push("/");
          }
        }
      })
      .on("broadcast", { event: "team_update" }, async ({ payload }) => {
        // Nhận event đổi tên hoặc ready từ ADMIN hoặc thiết bị team khác
        if (payload.teamId === parseInt(teamId, 10)) {
          if (payload.name !== undefined && payload.name !== teamName) {
            setTeamName(payload.name);
            // Cập nhật lại presence với tên mới
            await channel.track({ is_player: true, teamId: parseInt(teamId, 10), teamName: payload.name });
          }
        }
      })
      .on("broadcast", { event: "game_start" }, () => {
        router.push(`/play/game?roomId=${roomId}&teamId=${teamId}&teamName=${encodeURIComponent(teamName)}`);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          // Khởi tạo trạng thái online / offline cho nhánh team (kèm tên đội)
          await channel.track({ is_player: true, teamId: parseInt(teamId, 10), teamName: initialTeamNameRef.current });

          // Khi mới join, gửi thông tin name và ready status hiện tại cho admin
          channel.send({
            type: "broadcast",
            event: "team_update",
            payload: {
              teamId: parseInt(teamId, 10),
              name: initialTeamNameRef.current,
              ready: false, // Ban đầu luôn là Chua san sang
            },
          });
        }
      });

    return () => {
      supabaseBrowser?.removeChannel(channel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, teamId, router]); // Cố tình bỏ teamName khỏi deps để tránh loop re-track trừ khi update name explicit

  // Theo dõi cập nhật Name để đẩy presence lên (tránh loop với sync)
  useEffect(() => {
     if (channelRef.current && teamName) {
        channelRef.current.track({
          is_player: true,
          teamId: parseInt(teamId || "1", 10),
          teamName: teamName,
        });
     }
  }, [teamName, teamId]);

  const handleToggleReady = () => {
    setIsReady((prev) => {
      const nextState = !prev;
      
      // Gửi Cập nhật Ready State về Admin
      if (channelRef.current && teamId) {
        channelRef.current.send({
          type: "broadcast",
          event: "team_update",
          payload: {
            teamId: parseInt(teamId, 10),
            name: teamName,
            ready: nextState,
          },
        });
      }
      
      return nextState;
    });
  };

  return (
    <div className="font-body max-w-xl mx-auto">
      <h1 className="screen-title mb-1">
        Phòng chờ
      </h1>
      <p className="text-center text-sm text-slate-400 mb-6 font-semibold uppercase tracking-widest">
        Mã phòng: <span className="text-amber-400">#{roomId}</span>
      </p>

      {/* TÊN ĐỘI NỔI BẬT */}
      <div className="relative mb-8 flex justify-center">
        <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full" />
        <div className="relative rounded-2xl bg-gradient-to-b from-slate-800 to-slate-900 border border-emerald-500/30 w-full p-6 text-center shadow-2xl">
           <span className="block text-[10px] text-emerald-400 uppercase tracking-widest font-bold mb-2">Đội của bạn</span>
           <h2 className="font-display text-4xl text-white font-black drop-shadow-[0_0_15px_rgba(52,211,153,0.4)]">
             {teamName}
           </h2>
        </div>
      </div>

      <div className="rounded-2xl bg-[rgba(15,23,42,0.9)] border border-[rgba(148,163,184,0.5)] p-4 mb-5 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold tracking-wide text-slate-300 uppercase">
            Cấu hình từ Trạm điều khiển
          </span>
          <span className="text-[10px] bg-slate-800/80 px-2 py-0.5 rounded text-slate-400 font-bold uppercase">
            Chỉ xem
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-slate-900/80 border border-slate-700/60 px-3 py-2">
            <div className="text-[11px] text-slate-400">
              Thời gian / câu
            </div>
            <div className="mt-1 font-display text-base text-white">
              {duration} giây
            </div>
          </div>
          <div className="rounded-xl bg-slate-900/80 border border-slate-700/60 px-3 py-2">
            <div className="text-[11px] text-slate-400">
              Số câu hỏi
            </div>
            <div className="mt-1 font-display text-base text-white">
              {questionCount} câu
            </div>
          </div>
        </div>
      </div>



      <button
        type="button"
        onClick={handleToggleReady}
        className={[
          "w-full rounded-2xl font-display text-lg font-bold uppercase tracking-widest py-3 hover:-translate-y-0.5 shadow-[0_10px_0_rgba(0,0,0,0.6)] transition-all active:translate-y-1 active:shadow-[0_4px_0_rgba(0,0,0,0.6)]",
          isReady
            ? "bg-emerald-500 text-slate-950 shadow-[0_10px_0_rgba(6,95,70,1)] hover:bg-emerald-400"
            : "bg-sky-500 text-white shadow-[0_10px_0_rgba(3,105,161,1)] hover:bg-sky-400",
        ].join(" ")}
      >
        {isReady ? "HỦY SẴN SÀNG" : "BẤM SẴN SÀNG"}
      </button>

      <p className="mt-4 text-center text-[11px] text-slate-400 px-4">
        Khi 4 đội đều báo danh thành công, Admin sẽ có thể ấn{" "}
        <span className="font-semibold text-slate-200">
          VÀO GAME
        </span>{" "}
        để bắt đầu.
      </p>
    </div>
  );
};

const LobbyPage = () => {
  return (
    <Suspense fallback={<div className="text-white text-center p-10 font-display">Đang tải...</div>}>
      <LobbyContent />
    </Suspense>
  );
};

export default LobbyPage;

