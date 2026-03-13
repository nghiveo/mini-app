"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";

interface Question {
  id: number;
  answer: string;
  image_url: string;
  is_used: boolean;
}

const AdminQuestionsPage = () => {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // Form Create/Edit
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formAnswer, setFormAnswer] = useState("");
  const [formImageUrl, setFormImageUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchQuestions = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/questions");
      if (!res.ok) throw new Error("Lỗi khi tải dữ liệu");
      const data = await res.json();
      setQuestions(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setFormImageUrl(data.url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSaveQuestion = async () => {
    if (!formAnswer.trim() || !formImageUrl) {
      setError("Vui lòng nhập đủ đáp án và tải ảnh lên.");
      return;
    }

    try {
      const isEdit = editingId !== null;
      const url = isEdit ? `/api/questions/${editingId}` : "/api/questions";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answer: formAnswer,
          image_url: formImageUrl,
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Lỗi lưu câu hỏi");
      }

      await fetchQuestions();
      closeModal();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error");
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa câu này?")) return;
    try {
      const res = await fetch(`/api/questions/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Lỗi xoá câu hỏi");
      fetchQuestions();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error");
    }
  };

  const handleToggleUsed = async (id: number, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/questions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_used: !currentStatus }),
      });
      if (!res.ok) throw new Error("Lỗi cập nhật trạng thái");
      fetchQuestions();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error");
    }
  };

  const openModal = (q?: Question) => {
    setError(null);
    if (q) {
      setEditingId(q.id);
      setFormAnswer(q.answer);
      setFormImageUrl(q.image_url);
    } else {
      setEditingId(null);
      setFormAnswer("");
      setFormImageUrl("");
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setFormAnswer("");
    setFormImageUrl("");
    setEditingId(null);
  };

  const total = questions.length;
  const usedCount = questions.filter((q) => q.is_used).length;

  return (
    <div className="font-body max-w-5xl mx-auto">
      <div className="mb-3">
        <button
          type="button"
          onClick={() => router.push("/")}
          className="text-xs text-slate-300 hover:text-white"
        >
          ← Quay lại menu chính
        </button>
      </div>
      <h1 className="screen-title">Thiết lập câu hỏi</h1>
      <p className="screen-subtitle">
        Quản lý kho hình ảnh &amp; đáp án để đảm bảo trận đấu luôn mới mẻ, không trùng lặp.
      </p>

      {/* DASHBOARD BAR */}
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3 text-xs text-slate-200">
          <div className="rounded-xl bg-[rgba(15,23,42,0.9)] border border-[rgba(148,163,184,0.5)] px-3 py-2">
            <div className="text-[11px] text-slate-400">Tổng số câu hỏi</div>
            <div className="font-display text-base text-white">{total}</div>
          </div>
          <div className="rounded-xl bg-[rgba(15,23,42,0.9)] border border-[rgba(148,163,184,0.5)] px-3 py-2">
            <div className="text-[11px] text-slate-400">Đã sử dụng gần đây</div>
            <div className="font-display text-base text-amber-300">{usedCount}</div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => fetchQuestions()}
            className="rounded-2xl bg-slate-800 text-slate-200 font-display text-xs px-4 py-2 hover:bg-slate-700"
          >
            Làm mới
          </button>
          <button
            type="button"
            onClick={() => openModal()}
            className="rounded-2xl bg-emerald-500 text-slate-950 font-display text-xs px-4 py-2 shadow-[0_6px_0_rgba(6,95,70,1)] active:translate-y-1 active:shadow-[0_3px_0_rgba(6,95,70,1)]"
          >
            + Thêm câu hỏi
          </button>
        </div>
      </div>

      {/* LIST QUESTIONS */}
      <div className="rounded-2xl bg-[rgba(15,23,42,0.95)] border border-[rgba(148,163,184,0.6)] divide-y divide-slate-800/80">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-slate-400">Đang tải dữ liệu...</div>
        ) : questions.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">Chưa có câu hỏi nào.</div>
        ) : (
          questions.map((question) => (
            <div key={question.id} className="flex items-center gap-4 px-4 py-3 hover:bg-slate-800/30 transition-colors">
              <div className="h-16 w-16 relative rounded-xl bg-slate-800/80 border border-slate-700 overflow-hidden flex-shrink-0">
                {question.image_url ? (
                  <Image src={question.image_url} alt="Question" fill className="object-cover" />
                ) : (
                  <span className="text-[10px] text-slate-300 flex items-center justify-center p-2 text-center h-full">No img</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display text-base md:text-lg text-white truncate">
                  {question.answer}
                </div>
                <div className="mt-1 text-xs text-slate-400 flex gap-4">
                  <span>ID: {question.id}</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleUsed(question.id, question.is_used)}
                  className={[
                    "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold cursor-pointer active:scale-95 transition",
                    question.is_used
                      ? "bg-amber-500/10 text-amber-300 border border-amber-500/30"
                      : "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30",
                  ].join(" ")}
                >
                  {question.is_used ? "Đã dùng (Click bỏ)" : "Chưa dùng (Click chọn)"}
                </button>
                <div className="flex gap-2 text-xs">
                  <button type="button" onClick={() => openModal(question)} className="rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-100 px-3 py-1.5 transition">
                    Sửa
                  </button>
                  <button type="button" onClick={() => handleDelete(question.id)} className="rounded-lg bg-rose-600/90 hover:bg-rose-500 text-white px-3 py-1.5 transition">
                    Xóa
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* MODAL CẬP NHẬT/THÊM */}
      {showModal && (
        <div className="overlay-backdrop">
          <div className="overlay-panel font-body">
            <h2 className="font-display text-xl text-white mb-2">
              {editingId ? "Sửa câu hỏi" : "Thêm câu hỏi mới"}
            </h2>
            <p className="text-sm text-slate-300 mb-4">
              Tải ảnh câu hỏi và nhập đáp án (hệ thống tự động chuẩn hóa tiếng Việt không dấu, in hoa).
            </p>
            <div className="space-y-4">
              <label className="block text-sm text-slate-200">
                Ảnh câu hỏi
                <div className="relative mt-1 flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-600 bg-slate-900/80 px-3 py-6 text-xs text-slate-300 hover:border-amber-400 transition cursor-pointer">
                  {isUploading ? (
                    <span className="animate-pulse text-amber-300">Đang tải lên...</span>
                  ) : formImageUrl ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="relative w-32 h-32 rounded-md overflow-hidden border border-slate-500">
                        <Image src={formImageUrl} alt="Preview" fill className="object-cover" />
                      </div>
                      <span className="text-amber-400">Bấm để thay đổi ảnh</span>
                    </div>
                  ) : (
                    "Bấm để chọn file ảnh từ máy (PNG, JPG)"
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handleUploadImage}
                    disabled={isUploading}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-wait"
                  />
                </div>
              </label>

              <label className="block text-sm text-slate-200">
                Đáp án (Có thể nhập có dấu)
                <input
                  type="text"
                  value={formAnswer}
                  onChange={(e) => setFormAnswer(e.target.value)}
                  className="mt-1 w-full rounded-xl bg-slate-900/80 border border-slate-600 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/40 uppercase"
                  placeholder="Ví dụ: NGAN HANG"
                  autoFocus
                />
              </label>

              {error && <p className="text-sm text-rose-400 mt-2">{error}</p>}

              <div className="flex items-center justify-between gap-3 pt-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-100 text-sm px-4 py-2.5 transition"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleSaveQuestion}
                  disabled={isUploading}
                  className="flex-1 rounded-2xl bg-emerald-500 text-slate-950 font-display text-sm px-5 py-2.5 shadow-[0_6px_0_rgba(6,95,70,1)] active:translate-y-1 active:shadow-[0_3px_0_rgba(6,95,70,1)] disabled:opacity-60 transition"
                >
                  {editingId ? "Cập nhật" : "Lưu câu hỏi"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminQuestionsPage;

