"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useRef, Suspense } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";
import Confetti from "./components/Confetti";
import Podium from "./components/Podium";

interface TeamState {
  id: number;
  name: string;
  ready: boolean;
  online: boolean;
}

interface Question {
  id: number;
  answer: string;
  image_url: string;
}

type Stage = "init" | "main_turn" | "stealing" | "stolen" | "answer_reveal" | "ended" | "tie_break_init" | "tie_break_round" | "tie_break_stolen";

function AdminGameContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomId = searchParams.get("roomId");

  // Room config
  const [duration, setDuration] = useState(60);
  const [questionCount, setQuestionCount] = useState(18);
  
  // Game state
  const [teams, setTeams] = useState<TeamState[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [stage, setStage] = useState<Stage>("init");
  const [turnTeamId, setTurnTeamId] = useState<number>(1);
  const [scores, setScores] = useState<Record<number, number>>({ 1: 0, 2: 0, 3: 0, 4: 0 });
  const [ringerId, setRingerId] = useState<number | null>(null);
  const [expiresAt, setExpiresAt] = useState<number>(0);
  const [tiedTeams, setTiedTeams] = useState<number[]>([]);
  const [timeLeft, setTimeLeft] = useState<number>(0); // for visual only
  const [showConfetti, setShowConfetti] = useState(false);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize data
  useEffect(() => {
    if (!roomId) {
      router.push("/");
      return;
    }

    // Restore teams from sessionStorage
    const storedTeamsStr = sessionStorage.getItem(`room_teams_${roomId}`);
    if (storedTeamsStr) {
      try {
        const parsed = JSON.parse(storedTeamsStr);
        setTeams(parsed);
      } catch {
        console.error("Invalid team data in session.");
      }
    }

    // Fetch Room config first (if we have time limit / q count)
    const initGame = async () => {
       try {
         let targetQuestionCount = 18;

         const roomRes = await fetch(`/api/rooms/${roomId}`);
         if (roomRes.ok) {
           const roomData = await roomRes.json();
           setDuration(roomData.duration || 60);
           setQuestionCount(roomData.question_count || 18);
           targetQuestionCount = roomData.question_count || 18;
         }

         // Fetch all questions and pick random Q count + 5 reserve for tie break
         const qRes = await fetch("/api/questions");
         if (qRes.ok) {
           const allQs = await qRes.json();
           const shuffled = allQs.sort(() => 0.5 - Math.random());
           const selected = shuffled.slice(0, targetQuestionCount + 5);
           setQuestions(selected);
         }
       } catch (err) {
         console.error("Lỗi fetch game data:", err);
       }
    };
    initGame();

  }, [roomId, router]);

  // Setup Supabase Realtime
  useEffect(() => {
    if (!roomId || !supabaseBrowser) return;

    const channel = supabaseBrowser.channel(`room:${roomId}`, {
      config: {
        presence: { key: "admin_game" },
        broadcast: { self: true },
      },
    });
    channelRef.current = channel;

    channel
      .on("broadcast", { event: "bell_ring" }, ({ payload }) => {
        // payload: { teamId, timestamp }
        handleBellRing(payload.teamId);
      })
      .on("broadcast", { event: "submit_answer" }, ({ payload }) => {
         // payload: { teamId, answer }
         handleAnswerSubmit(payload.teamId, payload.answer);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ is_admin: true, in_game: true });
        }
      });

    return () => {
      supabaseBrowser?.removeChannel(channel);
    };
  // Dựa vào các dependency này, nhưng handleAnswerSubmit & handleBellRing sẽ stale state 
  // Nên ta xài useRef cho state hoặc broadcast state thẳng (sẽ fix ref sau)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  // Sync Game State to players Whenever state changes materially
  useEffect(() => {
    if (!channelRef.current || stage === "init") return;
    
    channelRef.current.send({
      type: "broadcast",
      event: "game_sync",
      payload: {
        stage,
        currentIdx,
        turnTeamId,
        scores,
        ringerId,
        expiresAt,
        question: questions[currentIdx] ? { 
           // Không gửi answer thô sang player để chống gian lận, chỉ gửi chiều dài
           image_url: questions[currentIdx].image_url,
           length: questions[currentIdx].answer.replace(/\s+/g, "").length
        } : null,
        tiedTeams
      }
    });

  }, [stage, currentIdx, turnTeamId, scores, ringerId, expiresAt, questions, tiedTeams]);

  // Visual local timer 
  useEffect(() => {
    const interval = setInterval(() => {
      if (expiresAt > 0) {
        const left = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
        setTimeLeft(left);
        // Timeout trigger handled by explicit check
      } else {
        setTimeLeft(0);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  // Effect when game ends to show confetti continuously
  useEffect(() => {
    if (stage === "ended") {
       setShowConfetti(true);
       try {
         const audio = new Audio("/tingting.mp3"); // Or a special applause sound if available
         audio.volume = 0.5;
         audio.play().catch(e => console.log("Audio play failed:", e));
       } catch {}
    }
  }, [stage]);

  // Handlers
  const handleNextQuestion = () => {
    // Check if we just finished the main set of questions (or if we are in tie breaks and didn't find a winner)
    const isMainSetFinished = currentIdx >= questionCount - 1 && stage !== "tie_break_init" && stage !== "tie_break_round" && stage !== "tie_break_stolen";
    const isInTieBreak = stage === "tie_break_init" || stage === "tie_break_round" || stage === "tie_break_stolen" || stage === "answer_reveal";

    if (isMainSetFinished || (isInTieBreak && currentIdx >= questionCount - 1)) {
        // Calculate rankings
        const sortedTeams = Object.entries(scores).sort((a, b) => b[1] - a[1]);
        const highestScore = sortedTeams[0][1];
        
        // Find all teams with highest score
        const topTeams = sortedTeams.filter(([, score]) => score === highestScore).map(([id]) => parseInt(id, 10));

        if (topTeams.length > 1 && currentIdx < questions.length - 1) {
            // There's a tie for first place! Setup tie break.
            if (timerRef.current) clearTimeout(timerRef.current);
            setTiedTeams(topTeams);
            setStage("tie_break_init");
            return;
        } else if (isMainSetFinished) {
            // No tie or ran out of reserve questions
            setStage("ended");
            return;
        }
    }

    if (currentIdx >= questions.length - 1) {
      setStage("ended");
      return;
    }

    if (timerRef.current) clearTimeout(timerRef.current);

    // If entering tie break question
    if (tiedTeams.length > 0) {
        setCurrentIdx(prev => prev + 1);
        setRingerId(null);
        setStage("tie_break_round");
        setExpiresAt(Date.now() + 10000); // 10s for sudden death buzz
        
        timerRef.current = setTimeout(() => {
            // Hết giờ stealing (chưa ai bấm), chuyển sang reveal 
            setStage("answer_reveal");
            setExpiresAt(0);
        }, 10000);
        return;
    }
    
    // Normal round progression
    setCurrentIdx(prev => prev + 1);
    const nextTurn = ((currentIdx + 1) % 4) + 1;
    setTurnTeamId(nextTurn);
    setRingerId(null);
    setStage("main_turn");
    
    const newExpiresAt = Date.now() + duration * 1000;
    setExpiresAt(newExpiresAt);

    // Auto trigger stealing if no answer in main_turn
    timerRef.current = setTimeout(() => {
      handleTimeOutMainTurn();
    }, duration * 1000);
  };

  const handleStartGame = () => {
    setStage("main_turn");
    const nextTurn = ((currentIdx) % 4) + 1;
    setTurnTeamId(nextTurn);
    const newExpiresAt = Date.now() + duration * 1000;
    setExpiresAt(newExpiresAt);

    timerRef.current = setTimeout(() => {
      handleTimeOutMainTurn();
    }, duration * 1000);
  };

  const stageRef = useRef(stage);
  const ringerIdRef = useRef(ringerId);
  useEffect(() => {
     stageRef.current = stage;
     ringerIdRef.current = ringerId;
  }, [stage, ringerId]);

  const handleTimeOutMainTurn = () => {
    if (stageRef.current === "main_turn") {
      setStage("stealing");
      setExpiresAt(Date.now() + 10000); // 10s để giành quyền
      
      timerRef.current = setTimeout(() => {
         // Hết giờ stealing (chưa ai bấm), chuyển sang reveal 
         setStage("answer_reveal");
         setExpiresAt(0);
      }, 10000);
    }
  };

  const handleBellRing = (tId: number) => {
    if (stageRef.current !== "stealing" && stageRef.current !== "tie_break_round") return;
    if (ringerIdRef.current) return; // có người bấm rồi
    
    // In tie break, only tied teams can ring
    if (stageRef.current === "tie_break_round" && !tiedTeams.includes(tId)) return;
    
    if (timerRef.current) clearTimeout(timerRef.current);
    
    setRingerId(tId);
    setStage(stageRef.current === "stealing" ? "stolen" : "tie_break_stolen");
    setExpiresAt(Date.now() + 15000); // 15s để trả lời khi giành được

    timerRef.current = setTimeout(() => {
      // Đội chuông không trả lời, mất lượt
      handleAnswerSubmit(tId, "", true); 
    }, 15000);
  };

  const currentQRef = useRef<Question | null>(null);
  useEffect(() => {
    currentQRef.current = questions[currentIdx] || null;
  }, [questions, currentIdx]);

  const handleAnswerSubmit = (tId: number, answerText: string, isTimeout = false) => {
    if (timerRef.current) clearTimeout(timerRef.current);

    const actualAns = currentQRef.current?.answer || "";
    // Bỏ dấu, in hoa, loại khoảng trắng để so sánh
    const normalize = (s: string) => {
      let str = s.toUpperCase().trim();
      str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A");
      str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E");
      str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, "I");
      str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "O");
      str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U");
      str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "Y");
      str = str.replace(/Đ/g, "D");
      return str.replace(/\s+/g, "");
    };

    const isCorrect = !isTimeout && (normalize(answerText) === normalize(actualAns));

    const handleCorrectEffects = () => {
       // Phát âm thanh ting ting (âm thanh hệ thống hoặc custom)
       try {
         const audio = new Audio("/tingting.mp3");
         audio.volume = 0.5;
         audio.play().catch(e => console.log("Audio play failed:", e));
       } catch {}

       // Bật hiệu ứng Confetti
       setShowConfetti(true);
       setTimeout(() => setShowConfetti(false), 3000);
    };

    if (stageRef.current === "main_turn" && tId === turnTeamId) {
       if (isCorrect) {
          handleCorrectEffects();
          setScores(prev => ({ ...prev, [tId]: prev[tId] + 10 }));
          setStage("answer_reveal");
          setExpiresAt(0);
       } else {
          // Sai hoặc timeout -> chuyển sang giành quyền
          handleTimeOutMainTurn();
       }
    } else if ((stageRef.current === "stolen" || stageRef.current === "tie_break_stolen") && tId === ringerIdRef.current) {
       if (isCorrect) {
          // Tie breaks also award 5 points or we can just award 0 and only use it to determine the winner. 
          // Let's add 5 points for consistency.
          handleCorrectEffects();
          setScores(prev => ({ ...prev, [tId]: prev[tId] + 5 }));
       } else {
          // Không trừ điểm, nhưng hết lượt
          // Nếu đang trong tie break, và trả lời sai -> có thể cho đội bằng điểm còn lại giành tiếp bằng cách reset về tie_break_round.
          // Nhưng logic hiện tại: 1 câu hỏi chỉ có 1 steal. Nên hết câu thì sang Next Question.
       }
       setStage("answer_reveal");
       setExpiresAt(0);
    }
  };

  // Override by Admin
  const forceCorrect = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    
    // Play effects
    try {
      const audio = new Audio("/tingting.mp3");
      audio.volume = 0.5;
      audio.play().catch(e => console.log("Audio play failed:", e));
    } catch {}
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3000);

    if (stage === "main_turn") {
      setScores(prev => ({ ...prev, [turnTeamId]: prev[turnTeamId] + 10 }));
      setStage("answer_reveal");
    } else if ((stage === "stolen" || stage === "tie_break_stolen") && ringerId) {
      setScores(prev => ({ ...prev, [ringerId]: prev[ringerId] + 5 }));
      setStage("answer_reveal");
    }
    setExpiresAt(0);
  };

  const forceWrong = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (stage === "main_turn") {
      handleTimeOutMainTurn();
    } else if (stage === "stolen" || stage === "tie_break_stolen") {
      setStage("answer_reveal");
      setExpiresAt(0);
    }
  };

  const forceReveal = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setStage("answer_reveal");
    setExpiresAt(0);
  };
  
  const handleEndGameEarly = () => {
    if (window.confirm("Bạn có chắc chắn muốn giải tán trò chơi này ngay lập tức? Tất cả các đội sẽ bị đẩy ra ngoài.")) {
      if (channelRef.current) {
        channelRef.current.send({
          type: "broadcast",
          event: "end_game_early",
          payload: {}
        });
      }
      sessionStorage.removeItem(`room_teams_${roomId}`);
      router.push("/");
    }
  };

  if (!questions.length && stage === "init") {
     return <div className="text-white text-center p-20">Đang chuẩn bị đề thi...</div>;
  }

  const currentQ = questions[currentIdx];

  return (
    <div className="font-body max-w-5xl mx-auto p-4 flex gap-6 relative">
      {showConfetti && <Confetti />}
      
      {/* LEFT: Game Flow Control */}
      <div className="flex-1 flex flex-col items-center">
         <div className="flex justify-between items-center w-full mb-4 px-2">
           <h1 className="screen-title text-2xl mb-0">Màn hình Điều phối</h1>
           <button 
             onClick={handleEndGameEarly}
             className="bg-rose-900/50 hover:bg-rose-600 text-rose-200 hover:text-white px-4 py-2 rounded-lg text-xs font-bold uppercase transition flex items-center gap-2 border border-rose-800"
           >
             ✖ Giải tán
           </button>
         </div>
         
         <div className="bg-slate-900 rounded-xl p-4 border border-slate-700 w-full mb-6">
            <div className="flex justify-between items-center mb-2">
               <span className="text-slate-400 font-bold uppercase tracking-widest text-xs">
                 Câu hỏi số {currentIdx + 1} / {questions.length}
               </span>
               <span className="bg-sky-500/20 text-sky-400 font-bold px-3 py-1 rounded-full text-xs uppercase">
                 Trạng thái: {stage}
               </span>
            </div>

            {currentQ ? (
              <div className="flex flex-col items-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={currentQ.image_url} 
                  alt="question" 
                  className="rounded-lg h-64 object-contain mb-4 border border-slate-600 bg-white"
                />
                <div className="text-center">
                  <span className="text-slate-400 text-sm">Đáp án gốc:</span>
                  <div className="font-display text-2xl text-emerald-400 font-bold mt-1 tracking-wider uppercase">
                    {currentQ.answer}
                  </div>
                </div>
              </div>
            ) : stage === "ended" ? (
                <div className="w-full h-96 flex items-center justify-center">
                   <Podium scores={scores} teams={teams} />
                </div>
             ) : (
                <div className="text-amber-400 font-display text-4xl text-center py-20">
                  KẾT THÚC!
                </div>
             )}
         </div>

         {/* Admin Controls */}
         <div className="grid grid-cols-2 gap-3 w-full max-w-md">
            {stage === "init" && (
               <button onClick={handleStartGame} className="col-span-2 bg-amber-500 text-black font-bold py-3 rounded-xl uppercase tracking-widest hover:bg-amber-400">
                  Bắt đầu Bấm giờ 
               </button>
            )}

            {(stage === "main_turn" || stage === "stolen") && (
              <>
                 <button onClick={forceCorrect} className="bg-emerald-600 text-white font-bold py-2 rounded-xl text-sm hover:bg-emerald-500 transition">
                    Duyệt ĐÚNG (Cộng đ)
                 </button>
                 <button onClick={forceWrong} className="bg-rose-600 text-white font-bold py-2 rounded-xl text-sm hover:bg-rose-500 transition">
                    Phạt SAI (Chuyển Next/Rì-vêu)
                 </button>
              </>
            )}

            {stage !== "answer_reveal" && stage !== "init" && stage !== "ended" && (
              <button onClick={forceReveal} className="col-span-2 bg-slate-700 text-white font-bold py-2 rounded-xl text-sm hover:bg-slate-600 transition border border-slate-500">
                  Dừng & Hiện Đáp Án (Không ai có điểm)
              </button>
            )}

            {stage === "answer_reveal" && currentIdx < questions.length - 1 && (
               <button onClick={handleNextQuestion} className="col-span-2 bg-sky-500 text-white font-bold py-3 rounded-xl text-lg uppercase hover:bg-sky-400 transition animate-bounce">
                  Câu tiếp theo ➡
               </button>
            )}
         </div>
      </div>

      {/* RIGHT: Live Data Panel */}
      <div className="w-[320px] shrink-0 space-y-4">
         {/* Timer */}
         <div className="bg-slate-900 rounded-xl p-6 border border-slate-700 text-center relative overflow-hidden">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Đếm Ngược</h3>
            <div className={`font-display text-6xl font-black tabular-nums transition-colors ${timeLeft < 10 && timeLeft > 0 ? "text-rose-500 animate-pulse" : "text-white"}`}>
               {timeLeft}s
            </div>
            {/* Lượt ai? */}
            <div className="mt-4 pt-4 border-t border-slate-800">
               {stage === "main_turn" ? (
                  <p className="text-sm">Đang là lượt của: <span className="font-bold text-amber-400">Team {turnTeamId}</span></p>
               ) : stage === "stealing" ? (
                  <p className="text-sm text-rose-400 font-bold animate-pulse">GIÀNH QUYỀN!</p>
               ) : stage === "stolen" ? (
                  <p className="text-sm text-emerald-400 font-bold">Chờ <span className="uppercase inline-block border-b-2 border-emerald-400">Team {ringerId}</span> trả lời...</p>
               ) : stage === "ended" ? (
                  <p className="text-sm text-fuchsia-400 font-bold uppercase tracking-widest">KẾT QUẢ CUỐI CÙNG</p>
               ) : (
                  <p className="text-sm text-slate-500">Chờ lệnh...</p>
               )}
            </div>
         </div>

         {/* Scores Table */}
         <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Bảng điểm Live
            </h3>
            <div className="space-y-2">
               {[1, 2, 3, 4].map(id => {
                  const teamInfo = teams.find(t => t.id === id);
                  const isTurn = stage === "main_turn" && turnTeamId === id;
                  const isStolen = stage === "stolen" && ringerId === id;
                  
                  return (
                    <div key={id} className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${isTurn ? "bg-amber-500/20 border-amber-500/50" : isStolen ? "bg-emerald-500/20 border-emerald-500/50" : "bg-slate-800/40 border-slate-700/50"}`}>
                       <div className="flex-1 min-w-0 pr-3">
                          <div className="text-[10px] text-slate-400 uppercase font-bold">Slot {id}</div>
                          <div className="font-bold text-white truncate text-sm">
                             {teamInfo?.name || `Đội ${id}`}
                          </div>
                          {isTurn && <div className="text-[10px] text-amber-400 uppercase mt-0.5">Lượt chính</div>}
                          {isStolen && <div className="text-[10px] text-emerald-400 uppercase mt-0.5">Giành quyền</div>}
                       </div>
                       <div className="font-display text-2xl font-black text-amber-300">
                          {scores[id] || 0}
                       </div>
                    </div>
                  );
               })}
            </div>
         </div>
      </div>
    </div>
  );
}

export default function AdminGamePage() {
  return (
    <Suspense fallback={<div className="text-white text-center p-10 font-display">Đang tải...</div>}>
      <AdminGameContent />
    </Suspense>
  );
}
