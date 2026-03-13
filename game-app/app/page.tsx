"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type MainMenuAction =
  | "play"
  | "create-room"
  | "manage-questions"
  | "team-setup"
  | "rules";

const rulesText = `
1. Mỗi câu trả lời đúng ở lượt chính được 10 điểm.
2. Nếu hết thời gian hoặc trả lời sai, quyền trả lời được mở cho 3 đội còn lại. Đội bấm chuông nhanh nhất và trả lời đúng được 5 điểm.
3. Mỗi câu hỏi chỉ có tối đa 1 lượt giành quyền (steal).
4. Tất cả đội phải trả lời số lượng câu hỏi bằng nhau. Trò chơi kết thúc khi hết số câu đã thiết lập.
5. Đội có tổng điểm cao nhất thắng. Nếu bằng điểm sẽ dùng câu hỏi phụ và bấm chuông để phân định.
`;

const Home = () => {
  const router = useRouter();
  const [showRules, setShowRules] = useState(false);

  const handleAction = (action: MainMenuAction) => {
    if (action === "rules") {
      setShowRules(true);
      return;
    }

    if (action === "play") {
      router.push("/play/join");
      return;
    }

    if (action === "create-room") {
      router.push("/admin/room");
      return;
    }

    if (action === "manage-questions") {
      router.push("/admin/questions");
      return;
    }

    if (action === "team-setup") {
      router.push("/admin/team-setup");
      return;
    }
  };

  return (
    <div className="font-body max-w-xl mx-auto">
      <h1 className="screen-title">
        ĐUỔI HÌNH BẮT CHỮ
      </h1>
      <p className="screen-subtitle">
        Mini game 4 đội chơi – tương tác real-time, giao diện tối giản, hiện đại.
      </p>

      <div className="space-y-4">
        <button
          type="button"
          className="btn-main-menu btn-main-menu--primary"
          onClick={() => handleAction("play")}
        >
          <div className="flex flex-col items-start">
            <span className="btn-main-menu__label font-display">
              Chơi trò chơi
            </span>
            <span className="text-xs text-white/80">
              Người chơi nhập ID phòng để tham gia.
            </span>
          </div>
          <span className="btn-main-menu__tag">Player</span>
        </button>

        <button
          type="button"
          className="btn-main-menu btn-main-menu--secondary"
          onClick={() => handleAction("create-room")}
        >
          <div className="flex flex-col items-start">
            <span className="btn-main-menu__label font-display">
              Tạo phòng chơi
            </span>
            <span className="text-xs text-white/80">
              Màn hình điều khiển cho MC/Admin.
            </span>
          </div>
          <span className="btn-main-menu__tag">Admin</span>
        </button>

        <button
          type="button"
          className="btn-main-menu btn-main-menu--muted"
          onClick={() => handleAction("manage-questions")}
        >
          <div className="flex flex-col items-start">
            <span className="btn-main-menu__label font-display">
              Thiết lập câu hỏi
            </span>
            <span className="text-xs text-slate-200/80">
              Quản lý kho ảnh &amp; đáp án cho từng vòng chơi.
            </span>
          </div>
          <span className="btn-main-menu__tag">Admin</span>
        </button>

        <button
          type="button"
          className="btn-main-menu btn-main-menu--muted"
          onClick={() => handleAction("team-setup")}
        >
          <div className="flex flex-col items-start">
            <span className="btn-main-menu__label font-display">
              Sắp xếp thành viên đội chơi
            </span>
            <span className="text-xs text-slate-200/80">
              Chia đội tự động từ file Excel với hiệu ứng chia bài.
            </span>
          </div>
          <span className="btn-main-menu__tag">Admin</span>
        </button>

        <div className="pt-2">
          <button
            type="button"
            className="btn-main-menu btn-main-menu--muted !py-3 border border-[rgba(148,163,184,0.6)] bg-transparent/0"
            onClick={() => handleAction("rules")}
          >
            <div className="flex flex-col items-start">
              <span className="btn-main-menu__label font-display text-base sm:text-lg">
                Luật chơi
              </span>
              <span className="text-xs text-slate-300/90">
                Xem nhanh cách tính điểm và giành quyền trả lời.
              </span>
            </div>
          </button>
        </div>
      </div>

      {showRules && (
        <div className="overlay-backdrop" role="dialog" aria-modal="true">
          <div className="overlay-panel font-body">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl text-white">
                Luật chơi
              </h2>
              <button
                type="button"
                className="rounded-full px-3 py-1 text-xs bg-slate-800 text-slate-200 hover:bg-slate-700"
                onClick={() => setShowRules(false)}
              >
                Đóng
              </button>
            </div>
            <p className="text-sm text-slate-200 whitespace-pre-line leading-relaxed max-h-72 overflow-y-auto">
              {rulesText}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
