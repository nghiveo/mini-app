"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import * as XLSX from "xlsx";

interface Member {
  fullName: string;
  title: string;
}

const AdminTeamSetupPage = () => {
  const router = useRouter();
  const [fileName, setFileName] = useState<string | null>(null);
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [animatedTeams, setAnimatedTeams] = useState<Record<number, Member[]>>({
    1: [],
    2: [],
    3: [],
    4: [],
  });
  const [isAnimating, setIsAnimating] = useState(false);
  const [teams, setTeams] = useState<Record<number, Member[]>>({
    1: [],
    2: [],
    3: [],
    4: [],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setError(null);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      const data = new Uint8Array(reader.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<(string | null)[]>(sheet, {
        header: 1,
        defval: "",
      });

      const members: Member[] = [];

      rows.forEach((row, index) => {
        if (index === 0) {
          return;
        }

        const fullName = String(row[0] ?? "").trim();
        const title = String(row[1] ?? "").trim();

        if (!fullName) {
          return;
        }

        members.push({
          fullName,
          title,
        });
      });

      setAllMembers(members);
      setTeams({ 1: [], 2: [], 3: [], 4: [] });
      setAnimatedTeams({ 1: [], 2: [], 3: [], 4: [] });
    };

    reader.readAsArrayBuffer(file);
  };

  const handleConfirm = async () => {
    if (!allMembers.length) {
      setError("Vui lòng tải file Excel hợp lệ trước khi chia đội.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/team-setup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          members: allMembers,
        }),
      });

      const payload = (await response.json()) as {
        error?: string;
        teams?: Record<number, Member[]>;
      };

      if (!response.ok || !payload.teams) {
        throw new Error(payload.error ?? "Không thể chia đội. Vui lòng thử lại.");
      }

      setTeams(payload.teams);
      animateDealing(payload.teams);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra khi chia đội.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleShuffleAgain = async () => {
    setTeams({ 1: [], 2: [], 3: [], 4: [] });
    setAnimatedTeams({ 1: [], 2: [], 3: [], 4: [] });
    await handleConfirm();
  };

  const animateDealing = async (finalTeams: Record<number, Member[]>) => {
    setIsAnimating(true);
    setAnimatedTeams({ 1: [], 2: [], 3: [], 4: [] });

    const sequence: { team: number; member: Member }[] = [];
    const maxLen = Math.max(...Object.values(finalTeams).map((t) => t.length));

    for (let i = 0; i < maxLen; i += 1) {
      for (let t = 1; t <= 4; t += 1) {
        if (finalTeams[t][i]) {
          sequence.push({ team: t, member: finalTeams[t][i] });
        }
      }
    }

    for (const item of sequence) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      setAnimatedTeams((prev) => ({
        ...prev,
        [item.team]: [...prev[item.team], item.member],
      }));
    }

    setIsAnimating(false);
  };

  return (
    <div className="font-body">
      <div className="mb-3">
        <button
          type="button"
          onClick={() => router.push("/")}
          className="text-xs text-slate-300 hover:text-white"
        >
          ← Quay lại menu chính
        </button>
      </div>
      <h1 className="screen-title">
        Sắp xếp thành viên đội chơi
      </h1>
      <p className="screen-subtitle">
        Tải file Excel nhân sự, hệ thống sẽ chia ngẫu nhiên thành 4 đội với hiệu ứng chia bài.
      </p>

      <label
        htmlFor="excel-upload"
        className="block mb-6 cursor-pointer rounded-2xl border-2 border-dashed border-amber-300/60 bg-[rgba(15,23,42,0.8)] p-6 text-center hover:border-amber-400"
      >
        <div className="font-display text-lg text-amber-300 mb-2">
          Kéo &amp; thả file vào đây
        </div>
        <p className="text-xs text-slate-300 mb-2">
          Hỗ trợ định dạng .xlsx, .csv – Cột A: Họ tên, Cột B: Chức danh
        </p>
        <div className="inline-block mt-2 rounded-full bg-slate-900/70 px-4 py-1 text-[11px] text-slate-200">
          {fileName ?? "Chưa chọn file"}
        </div>
        <input
          id="excel-upload"
          type="file"
          accept=".xlsx,.csv"
          onChange={handleFileChange}
          className="hidden"
        />
      </label>

      {/* Bỏ tính năng xem trước */}

      <div className="mb-4 rounded-2xl bg-[rgba(15,23,42,0.95)] border border-[rgba(148,163,184,0.6)] p-6">
        <div className="text-base font-semibold tracking-wide text-slate-300 uppercase mb-4 min-h-[1.5rem]">
          {isAnimating && <span className="animate-pulse text-amber-300">(Đang chia...)</span>}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-slate-100">
          {[1, 2, 3, 4].map((teamId) => {
            const teamMembers = animatedTeams[teamId] || [];
            
            let bgClass = "";
            let textClass = "";
            switch (teamId) {
              case 1: bgClass = "bg-emerald-500/10 border-emerald-400/70"; textClass = "text-emerald-300"; break;
              case 2: bgClass = "bg-sky-500/10 border-sky-400/70"; textClass = "text-sky-300"; break;
              case 3: bgClass = "bg-violet-500/10 border-violet-400/70"; textClass = "text-violet-300"; break;
              case 4: bgClass = "bg-amber-500/10 border-amber-400/70"; textClass = "text-amber-300"; break;
            }

            return (
              <div key={teamId} className={`rounded-xl border py-4 px-3 text-center transition-all duration-300 ${bgClass}`}>
                <div className={`font-display text-lg tracking-wide ${textClass}`}>
                  Đội {teamId}
                </div>
                <div className="mt-1 text-xs text-slate-200">
                  {teams[teamId]?.length ? `${teamMembers.length} / ${teams[teamId].length} thành viên` : "Chưa chia"}
                </div>
                {teamMembers.length > 0 && (
                  <ul className="mt-3 flex flex-col items-center space-y-2 text-sm text-slate-100">
                    {teamMembers.map((member, idx) => (
                      <li 
                        key={`${teamId}-${member.fullName}-${idx}`}
                        className="w-full bg-slate-800/80 rounded-md px-3 py-2 text-left transform opacity-0 animate-[fade-in-up_0.3s_ease-out_forwards]"
                      >
                        <div className="font-semibold text-base truncate">{member.fullName}</div>
                        <div className="text-xs text-slate-400 mt-0.5 truncate">{member.title}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {error && (
        <p className="mb-3 text-xs text-rose-400">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          disabled={!allMembers.length || isSubmitting}
          onClick={handleShuffleAgain}
          className="rounded-2xl bg-slate-800 text-slate-100 font-display text-sm px-4 py-2 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          Chia lại
        </button>
        <button
          type="button"
          disabled={!allMembers.length || isSubmitting || isAnimating}
          onClick={handleConfirm}
          className="rounded-2xl bg-emerald-500 text-slate-950 font-display text-sm px-5 py-2 shadow-[0_8px_0_rgba(6,95,70,1)] active:translate-y-1 active:shadow-[0_4px_0_rgba(6,95,70,1)] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSubmitting || isAnimating ? "Đang chia..." : "Xác nhận kết quả"}
        </button>
      </div>
    </div>
  );
};

export default AdminTeamSetupPage;

