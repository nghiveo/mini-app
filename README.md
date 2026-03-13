# Đuổi Hình Bắt Chữ - Mini Game

Đây là ứng dụng trò chơi "Đuổi Hình Bắt Chữ" được xây dựng bằng Next.js (App Router) và sử dụng dữ liệu Realtime tĩnh qua Supabase.
Ứng dụng bao gồm 2 giao diện chính:
- **Admin**: Điều khiển tiến trình game, các câu hỏi và quản lý các đội.
- **Player (Người chơi)**: Giao diện cho các đội quét mã vào tham gia và tương tác tranh quyền trả lời.

---

## Hướng dẫn chạy ứng dụng (Đã được đóng gói)

Do mã nguồn ứng dụng đã được đóng gói (build) sẵn, bạn chỉ cần thực hiện các thao tác chạy server production rất đơn giản như sau:

### Yêu cầu tiên quyết
- Máy tính của bạn cần cài đặt sẵn **Node.js** (phiên bản 18 trở lên).

### Các bước khởi chạy

1. **Mở Command Prompt / Terminal** tại thư mục gốc chứa file này.
2. **Di chuyển vào thư mục mã nguồn** của ứng dụng:
   ```bash
   cd game-app
   ```
3. **Cài đặt các gói thư viện** (nếu trước đó bạn chưa cài):
   ```bash
   npm install
   ```
4. **Khởi động ứng dụng** từ bản build đã đóng gói:
   ```bash
   npm start
   ```
5. **Truy cập ứng dụng:**
   - Mở trình duyệt web của bạn và truy cập vào địa chỉ: [http://localhost:3000](http://localhost:3000).

---

## Cấu trúc thư mục chính của dự án:
- `game-app/`: Thư mục chính chứa mã nguồn của trò chơi.
  - `app/admin/`: Giao diện dành cho người quản trò chơi.
  - `app/play/`: Giao diện dành cho người chơi (lấy mã kết nối chơi từ admin).
  - `.next/`: Thư mục chứa mã đã được biên dịch và đóng gói sẵn để chạy production.
- `Docs/`: Tài liệu tham khảo dự án (nếu có).
