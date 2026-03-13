"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const ROOM_CODE_LENGTH = 6;

const JoinRoomPage = () => {
  const router = useRouter();
  const [digits, setDigits] = useState<string[]>(Array(ROOM_CODE_LENGTH).fill(""));
  const [error, setError] = useState<string | null>(null);

  const [isChecking, setIsChecking] = useState(false);

  const verifyRoomCode = async (code: string) => {
    setIsChecking(true);
    setError(null);
    try {
      const res = await fetch(`/api/rooms?code=${code}`);
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Phòng không tồn tại.");
      }

      if (data.status === "playing" || data.status === "ended") {
         throw new Error("Phòng đã bắt đầu hoặc đã kết thúc.");
      }

      router.push(`/play/select-team?roomId=${code}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setIsChecking(false);
    }
  };

  const handleChange = (index: number, value: string) => {
    setError(null);

    // Chỉ cho phép nhập số
    if (!/^\d?$/.test(value)) {
      return;
    }

    const next = [...digits];
    next[index] = value;
    setDigits(next);

    // Tự động focus ô tiếp theo nếu có nhập số
    if (value && index < ROOM_CODE_LENGTH - 1) {
      const nextInput = document.getElementById(`room-digit-${index + 1}`);
      nextInput?.focus();
    }

    const code = next.join("");
    if (code.length === ROOM_CODE_LENGTH && !next.includes("")) {
      verifyRoomCode(code);
    }
  };

  const handleKeyDown = (
    index: number,
    event: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      const prevInput = document.getElementById(`room-digit-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleFocus = (index: number) => {
    const input = document.getElementById(`room-digit-${index}`) as HTMLInputElement | null;
    input?.setSelectionRange(0, 1);
  };

  return (
    <div className="font-body max-w-xl mx-auto">
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
        Nhập ID phòng
      </h1>
      <p className="screen-subtitle">
        Vui lòng nhập mã phòng gồm 6 chữ số do Admin cung cấp.
      </p>

      <div className="flex justify-center mb-6">
        <div className="flex gap-2 sm:gap-3">
          {digits.map((digit, index) => (
            <input
              key={index}
              id={`room-digit-${index}`}
              type="tel"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              className="w-10 h-12 sm:w-12 sm:h-14 rounded-xl bg-slate-900/80 border border-slate-600 text-center text-xl sm:text-2xl font-display text-white focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/40"
              onChange={(event) => handleChange(index, event.target.value)}
              onKeyDown={(event) => handleKeyDown(index, event)}
              onFocus={() => handleFocus(index)}
            />
          ))}
        </div>
      </div>

      {error && (
        <p className="text-center text-sm text-red-400 mb-4 animate-[fade-in-up_0.3s_ease-out]">
          {error}
        </p>
      )}
      {isChecking && (
        <p className="text-center text-sm text-amber-400 mb-4 animate-pulse">
          Đang kiểm tra mã phòng...
        </p>
      )}

      <p className="text-center text-xs text-slate-300 px-4">
        Mẹo: Nhập đủ 6 số, hệ thống tự đối chiếu và đưa bạn vào phòng chọn Đội.
      </p>
    </div>
  );
};

export default JoinRoomPage;

