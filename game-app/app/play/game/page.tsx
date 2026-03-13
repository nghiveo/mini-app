"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useRef, Suspense } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";

type Stage = "init" | "main_turn" | "stealing" | "stolen" | "answer_reveal" | "ended" | "tie_break_init" | "tie_break_round" | "tie_break_stolen";

interface GameSyncPayload {
  stage: Stage;
  currentIdx: number;
  turnTeamId: number;
  scores: Record<number, number>;
  ringerId: number | null;
  expiresAt: number;
  question: { image_url: string; length: number } | null;
  tiedTeams?: number[];
}

const VI_ALPHABET = [
  "A", "B", "C", "D", "Đ", "E", "G", "H", "I", "K", "L", "M", 
  "N", "O", "P", "Q", "R", "S", "T", "U", "V", "X", "Y"
];

function PlayerGameContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomId = searchParams.get("roomId");
  const teamId = searchParams.get("teamId");
  const teamName = searchParams.get("teamName");

  const [gameState, setGameState] = useState<GameSyncPayload | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [inputValue, setInputValue] = useState("");
  const [showFlash, setShowFlash] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!roomId || !teamId || !supabaseBrowser) {
      router.push("/");
      return;
    }

    const deviceHash = Math.random().toString(36).substring(2, 9);
    const presenceKey = `p_${teamId}_${deviceHash}`;

    const channel = supabaseBrowser.channel(`room:${roomId}`, {
      config: { presence: { key: presenceKey } },
    });
    channelRef.current = channel;

    channel
      .on("broadcast", { event: "game_sync" }, ({ payload }) => {
        setGameState(payload as GameSyncPayload);
      })
      .on("broadcast", { event: "end_game_early" }, () => {
        alert("Admin đã giải tán trò chơi!");
        router.push("/");
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ is_player: true, teamId: parseInt(teamId, 10), teamName, in_game: true });
        }
      });

    return () => {
      supabaseBrowser?.removeChannel(channel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, teamId, router]);

  // Bộ đếm Visual
  useEffect(() => {
    if (!gameState) return;
    const interval = setInterval(() => {
       if (gameState.expiresAt > 0) {
          const left = Math.max(0, Math.ceil((gameState.expiresAt - Date.now()) / 1000));
          setTimeLeft(left);
       } else {
          setTimeLeft(0);
       }
    }, 1000);
    return () => clearInterval(interval);
  }, [gameState]);

  // Reset phím gõ mỗi khi sang câu mới hoặc sang Stealing
  useEffect(() => {
    setInputValue("");
  }, [gameState?.currentIdx, gameState?.stage]);

  const handleKeyPress = (char: string) => {
    if (!gameState?.question?.length) return;
    if (inputValue.length < gameState.question.length) {
      setInputValue(prev => prev + char);
    }
  };

  const handleDelete = () => {
    setInputValue(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
     setInputValue("");
  };

  const handleSubmit = () => {
     if (channelRef.current && teamId) {
        channelRef.current.send({
           type: "broadcast",
           event: "submit_answer",
           payload: { teamId: parseInt(teamId, 10), answer: inputValue }
        });
     }
  };

  const handleBellRing = () => {
     if (channelRef.current && teamId) {
        channelRef.current.send({
           type: "broadcast",
           event: "bell_ring",
           payload: { teamId: parseInt(teamId, 10), timestamp: Date.now() }
        });
     }
  };

  const handleQuitGame = () => {
     if (window.confirm("Bạn có chắc chắn muốn rời khỏi trò chơi? (Điều này không làm ảnh hưởng tới các đội khác)")) {
        router.push("/");
     }
  };

  const myTeamId = parseInt(teamId || "1", 10);
  const isMyTurn = gameState?.stage === "main_turn" && gameState.turnTeamId === myTeamId;
  const isMyStolenTurn = (gameState?.stage === "stolen" || gameState?.stage === "tie_break_stolen") && gameState.ringerId === myTeamId;
  const canAnswer = isMyTurn || isMyStolenTurn;
  const isStealingOpen = gameState?.stage === "stealing";
  
  const isTieBreakInit = gameState?.stage === "tie_break_init";
  const isTieBreakRound = gameState?.stage === "tie_break_round";
  const amITied = gameState?.tiedTeams?.includes(myTeamId) || false;

  // Flash Effect on Successful Steal
  useEffect(() => {
    if (isMyStolenTurn) {
      setShowFlash(true);
      const t = setTimeout(() => setShowFlash(false), 800);
      return () => clearTimeout(t);
    }
  }, [isMyStolenTurn]);

  if (!gameState || gameState.stage === "init") {
     return <div className="text-white text-center p-10 font-display">Đang chờ Host khởi động hệ thống...</div>;
  }

  // Render input boxes
  const renderBoxes = () => {
     if (!gameState.question?.length) return null;
     const boxes = [];
     for (let i = 0; i < gameState.question.length; i++) {
        const char = inputValue[i] || "";
        boxes.push(
           <div key={i} className={`w-8 h-10 flex items-center justify-center font-display text-2xl font-bold bg-slate-900 border-b-2 ${char ? 'border-sky-400 text-white' : 'border-slate-700 text-slate-500'}`}>
              {char}
           </div>
        );
     }
     return <div className="flex flex-wrap gap-1 justify-center">{boxes}</div>;
  };

  return (
    <div className="font-body max-w-xl mx-auto min-h-screen flex flex-col p-4 relative">
       {/* Flash Overlay */}
       {showFlash && (
          <div className="fixed inset-0 z-[100] bg-white pointer-events-none animate-[flash_0.8s_ease-out_forwards]">
             <style dangerouslySetInnerHTML={{__html: `
               @keyframes flash {
                 0% { opacity: 0; }
                 10% { opacity: 1; }
                 20% { opacity: 0; }
                 30% { opacity: 0.8; }
                 100% { opacity: 0; }
               }
             `}} />
          </div>
       )}

       {/* Header */}
       <div className="flex justify-between items-center mb-4 bg-slate-900/50 p-3 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-3">
             <button 
                onClick={handleQuitGame}
                className="w-10 h-10 rounded-full bg-slate-800 hover:bg-rose-900/50 border border-slate-600 hover:border-rose-500 text-slate-400 hover:text-rose-400 flex items-center justify-center transition-colors shadow-sm"
                title="Rời khỏi"
             >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                </svg>
             </button>
             <div>
                <div className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Đội của bạn</div>
                <div className="font-display font-bold text-emerald-400 truncate max-w-[150px]">{teamName}</div>
             </div>
          </div>
          <div className="text-right">
             <div className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Điểm của bạn</div>
             <div className="font-display text-2xl font-black text-amber-400">{gameState.scores[myTeamId] || 0}</div>
          </div>
       </div>

       {/* Trạng thái game */}
        {gameState.stage === "ended" ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
             <div className="text-6xl mb-4">🎉</div>
             <h2 className="font-display text-3xl font-bold text-amber-400 tracking-widest uppercase mb-2">Kết Thúc</h2>
             <p className="text-slate-300">Trận đấu đã kết thúc, hãy nhìn lên màn hình chính để xem Kết Quả!</p>
          </div>
       ) : isTieBreakInit ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
             <div className="text-6xl mb-4 animate-bounce">⚡</div>
             <h2 className="font-display text-4xl font-black text-rose-500 tracking-widest uppercase mb-2">SUDDEN DEATH</h2>
             <p className="text-lg text-slate-300 mb-6 font-bold">CÂU HỎI PHỤ - CHUẨN BỊ GIÀNH QUYỀN TRẢ LỜI!</p>
             {amITied ? (
                <div className="bg-rose-500/20 border border-rose-500 text-rose-300 px-6 py-4 rounded-xl animate-pulse">
                   Bạn nằm trong nhóm Bằng Điểm! Hãy sẵn sàng tay trên nút CHUÔNG khi câu hỏi bắt đầu.
                </div>
             ) : (
                <div className="bg-slate-800/80 border border-slate-600 text-slate-400 px-6 py-4 rounded-xl">
                   Bạn không nằm trong nhóm Bằng Điểm. Chỉ làm khán giả chặng này nhé!
                </div>
             )}
          </div>
       ) : (
          <>
             {/* Question Area */}
             <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 flex flex-col items-center relative overflow-hidden mb-6">
                <div className="absolute top-2 left-3 bg-rose-500/20 text-rose-400 text-[10px] px-2 py-0.5 rounded-full font-bold">
                   CÂU: {gameState.currentIdx + 1}
                </div>
                <div className="absolute top-2 right-3 font-display font-black text-xl text-sky-400">
                   {timeLeft}s
                </div>

                <div className="mt-6 mb-4 w-full flex justify-center">
                   {/* eslint-disable-next-line @next/next/no-img-element */}
                   <img 
                     src={gameState.question?.image_url} 
                     alt="question" 
                     className={`rounded-xl h-48 sm:h-64 object-contain bg-white transition-all ${!canAnswer && !isStealingOpen ? "blur-md opacity-60" : ""}`}
                   />
                </div>

                {/* Status Indicator */}
                {!canAnswer && !isStealingOpen && !isTieBreakRound && gameState.stage !== "answer_reveal" && (
                   <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm z-10">
                      <div className="text-center p-4">
                         <div className="animate-spin text-4xl mb-3">⏳</div>
                         <h3 className="font-display font-bold text-xl text-amber-400 uppercase">Lượt đội {gameState.turnTeamId}</h3>
                         <p className="text-xs text-slate-300">Chuẩn bị giành quyền trả lời!</p>
                      </div>
                   </div>
                )}
                
                {gameState.stage === "answer_reveal" && (
                   <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm z-10">
                      <div className="text-center p-4">
                         <h3 className="font-display font-bold text-2xl text-emerald-400 uppercase">Hết giờ / Trả lời xong</h3>
                         <p className="text-sm text-slate-300">Chờ Admin chuyển sang câu kế tiếp!</p>
                      </div>
                   </div>
                )}

                {/* Chuông */}
                {(isStealingOpen || isTieBreakRound) && (
                   <div className="absolute inset-0 flex items-center justify-center bg-slate-950/90 backdrop-blur-md z-20">
                      {isStealingOpen && gameState.turnTeamId === myTeamId ? (
                         <div className="text-center text-rose-400 font-bold uppercase">Bạn đã mất quyền trả lời</div>
                      ) : isTieBreakRound && !amITied ? (
                         <div className="text-center text-slate-500 font-bold uppercase px-8">Bạn không tham gia câu hỏi phụ này</div>
                      ) : (
                         <button 
                            onClick={handleBellRing}
                            className={`w-48 h-48 rounded-full bg-gradient-to-tr from-rose-600 to-rose-400 border-[8px] border-rose-900 shadow-[0_0_50px_rgba(225,29,72,0.8)] flex items-center justify-center transition-transform active:scale-95 active:shadow-inner ${isTieBreakRound ? "ring-8 ring-rose-500/50 animate-pulse" : ""}`}
                         >
                            <span className="font-display text-4xl font-black text-white tracking-widest shadow-black drop-shadow-lg uppercase">BẤM CHUÔNG</span>
                         </button>
                      )}
                   </div>
                )}

             </div>

             {/* Keyboard Area */}
             {canAnswer && (
                <div className="mt-auto">
                   <div className="mb-4">
                      {renderBoxes()}
                   </div>
                   
                   <div className="bg-slate-900 rounded-2xl p-2 border border-slate-700">
                      <div className="flex flex-wrap justify-center gap-1.5 mb-2">
                         {VI_ALPHABET.map(char => (
                            <button
                               key={char}
                               onClick={() => handleKeyPress(char)}
                               className="w-10 h-10 sm:w-12 sm:h-12 bg-slate-800 text-slate-100 rounded-lg font-display text-xl font-bold shadow-[0_4px_0_rgba(15,23,42,1)] active:translate-y-1 active:shadow-none transition-all"
                            >
                               {char}
                            </button>
                         ))}
                      </div>
                      <div className="flex gap-2">
                         <button onClick={handleClear} className="flex-1 bg-slate-800 text-slate-400 rounded-lg py-3 font-bold uppercase text-xs">Xóa hết</button>
                         <button onClick={handleDelete} className="flex-1 bg-slate-800 text-slate-400 rounded-lg py-3 font-bold uppercase text-xs">Xóa 1</button>
                         <button onClick={handleSubmit} className="flex-[2] bg-emerald-500 text-slate-950 font-black rounded-lg py-3 uppercase text-sm shadow-[0_4px_0_rgba(6,95,70,1)] active:translate-y-1 active:shadow-none">
                            TRẢ LỜI
                         </button>
                      </div>
                   </div>
                </div>
             )}
          </>
       )}
    </div>
  );
}

export default function PlayerGamePage() {
  return (
    <Suspense fallback={<div className="text-white text-center p-10 font-display">Đang tải...</div>}>
      <PlayerGameContent />
    </Suspense>
  );
}
