# Đuổi Hình Bắt Chữ - Mini Game

Đây là ứng dụng trò chơi "Đuổi Hình Bắt Chữ" được xây dựng bằng Next.js (App Router) và sử dụng dữ liệu Realtime qua Supabase.

## Hướng dẫn chạy ứng dụng (Đã được đóng gói)

Do mã nguồn ứng dụng đã được đóng gói (build) sẵn cho môi trường production, bạn có thể khởi chạy server game ngay lập tức theo các bước dưới đây:

### Yêu cầu tiên quyết
- Máy tính của bạn cần cài đặt sẵn **Node.js** (phiên bản 18 trở lên).

### Các bước khởi chạy

1. **Mở Command Prompt / Terminal** tại thư mục `game-app` này.
2. **Cài đặt các gói thư viện phụ thuộc** (chỉ cần chạy lần đầu hoặc khi đổi máy):
   ```bash
   npm install
   ```
3. **Khởi động ứng dụng** từ bản build đã đóng gói:
   ```bash
   npm start
   ```
4. **Truy cập ứng dụng:**
   - Mở trình duyệt web của bạn và truy cập vào địa chỉ: [http://localhost:3000](http://localhost:3000).

---

### Chế độ phát triển (Development)
Nếu bạn muốn chỉnh sửa code và xem thay đổi ngay lập tức trên máy:
```bash
npm run dev
```

### Đóng gói lại ứng dụng (Re-build)
Nếu bạn đã sửa code và muốn đóng gói lại ứng dụng cho production:
```bash
npm run build
```
Sau đó tiếp tục chạy lệnh `npm start` để trải nghiệm bản build mới nhất của trò chơi.
