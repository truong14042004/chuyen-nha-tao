# Chuyện Nhà Táo · Landing page

Landing page cho dự án **Chuyện Nhà Táo**, làm theo tài liệu *Project Management · 2.3 Landing Page*.

- **Hero:** cảnh 3D đêm 23 tháng Chạp, cá chép bơi giữa đèn trời (three.js).
- **S02, S03:** sách 4 chương, mỗi chương có tranh minh hoạ, giọng đọc, mini-game và huy hiệu.
- **S04 đến S06:** thẻ thông hành O2O gồm form đồng ý dữ liệu, mã QR, 4 trạm đóng dấu và mã nhận quà.
- **S07, S08:** thẻ "Vị Táo" (Year in Values): 4 câu hỏi, tạo ảnh 1:1 hoặc 9:16, caption mẫu, chia sẻ.
- **S09:** chính sách dữ liệu, báo mất mạng, thông báo lỗi giọng ấm áp.

Trang là HTML, CSS, JavaScript thuần, **không cần build**.

---

## 1. Chạy dự án

> Trang phải chạy qua một máy chủ web nhỏ (localhost). Nếu mở thẳng file `index.html` bằng cách bấm đúp, trình duyệt sẽ chặn tải model cá `fish.stl` nên cảnh 3D không hiện.

### Cách 1: Bấm đúp (Windows, dễ nhất)

1. Giải nén file `.zip` ra một thư mục.
2. Bấm đúp **`chay-du-an.bat`**.
3. Trình duyệt tự mở `http://localhost:5173`. Muốn tắt trang thì đóng cửa sổ đen.

File `.bat` dùng Node.js nếu máy có, nếu không thì dùng Python.

### Cách 2: Dùng Node.js

Cần cài [Node.js](https://nodejs.org) bản LTS (18 trở lên). Mở terminal tại thư mục dự án:

```bash
npm start
```

Lần đầu chạy, `npx` sẽ tự tải gói `http-server` (vài giây).

### Cách 3: Dùng Python

```bash
python -m http.server 5173
```

Sau đó mở `http://localhost:5173` trên trình duyệt.

### Cách 4: VS Code

Cài extension **Live Server**, mở thư mục dự án, bấm chuột phải vào `index.html` rồi chọn **Open with Live Server**.

### Xem trên điện thoại (cùng mạng Wi-Fi)

Chạy `npm start`, xem địa chỉ IP máy tính bằng lệnh `ipconfig` (dòng *IPv4 Address*), rồi mở `http://<IP-máy-tính>:5173` trên điện thoại. Lưu ý: camera và một số tính năng chia sẻ chỉ chạy trên HTTPS khi đã đưa lên mạng.

---

## 2. Cấu trúc thư mục

```
ChuyenNhaTao/
├─ index.html        Toàn bộ bố cục các section S01 đến S09
├─ styles.css        Giao diện (tông sáng, hero tông đêm), responsive từ 360px
├─ app.js            Logic: sách 4 chương, mini-game, thẻ thông hành, QR, thẻ Vị Táo, analytics
├─ ca-chep.js        Cảnh 3D hero: cá chép + 500 đèn trời
├─ fish.stl          Model cá (từ pen "Flying lanterns and a Koi fish" của prisoner849)
├─ images/
│  ├─ chuong-1.jpg   Tranh minh hoạ 4 chương
│  ├─ chuong-2.jpg
│  ├─ chuong-3.jpg
│  └─ chuong-4.jpg
├─ audio/            (tuỳ chọn) chuong-1.mp3 đến chuong-4.mp3 cho giọng đọc
├─ package.json      Lệnh npm start
└─ chay-du-an.bat    Chạy nhanh trên Windows
```

Thư viện (three.js r147, GSAP 3.12, QRCode.js, Phosphor Icons, font Be Vietnam Pro) được tải từ CDN, nên **cần có mạng** khi mở trang.

---

## 3. Thay nội dung thường gặp

| Muốn đổi | Sửa ở đâu |
|---|---|
| Tranh minh hoạ chương | Thay file trong `images/`, giữ nguyên tên `chuong-1.jpg` đến `chuong-4.jpg` (nên rộng 1000 đến 1200px) |
| Giọng đọc chương | Thêm `audio/chuong-1.mp3` đến `chuong-4.mp3`. Chưa có file thì trang dùng giọng tiếng Việt của trình duyệt (Edge có giọng HoaiMy) |
| Headline, câu phụ hero | `index.html`, trong section `id="hero"` |
| Nội dung 4 chương, câu hỏi gieo, mini-game, huy hiệu | `app.js`, mảng `CHAPTERS` |
| Tên 4 trạm và mã trạm | `app.js`, mảng `STATIONS` |
| 4 câu hỏi Vị Táo và danh hiệu | `app.js`, `QUESTIONS` và `VALUES` |
| Caption mẫu | `app.js`, hàm `captionsFor` |
| Ngày giờ, địa điểm sự kiện | `index.html`, khối `event-card` (đang ghi "Sắp công bố") |
| Màu sắc, font | `styles.css`, các biến trong `:root` (tông sáng) và `.theme-dark` (tông đêm) |

**Mã trạm dùng thử:** `HUONG1`, `MAIAM2`, `NEPNH3`, `TOTLA4`.

---

## 4. Một số điểm kỹ thuật

- **Lưu trữ:** thẻ, dấu trạm, tiến độ đọc và câu trả lời được lưu trong `localStorage` của trình duyệt. Bản này **chưa có máy chủ**, nên tạo thẻ và đóng dấu chỉ đang mô phỏng trên máy. Muốn chạy sự kiện thật cần backend để lưu Virtual ID và cho nhân sự quét QR (màn S10 trong PDF).
- **Analytics:** mọi sự kiện được đẩy vào `window.dataLayer` với tên đúng như cột tracking trong PDF (`page_view`, `chapter_start`, `badge_unlocked`, `form_submit`, `qr_scan`, `stamp_added`, `share_click`...). Gắn Google Tag Manager là đọc được ngay.
- **Hiệu ứng chuyển động:** mặc định theo cài đặt "Animation effects" của Windows hoặc hệ điều hành. Người xem có thể bật hoặc tắt bằng nút ✨ trên header, trang nhớ lựa chọn này.
- **Xoá dữ liệu thử:** cuối trang, mục "Tôi muốn xóa dữ liệu", bấm **Xóa dữ liệu trên máy**.

---

## 5. Đưa lên mạng (miễn phí)

Vì là trang tĩnh, có thể dùng:

- **Netlify Drop:** vào https://app.netlify.com/drop, kéo thả cả thư mục dự án vào là có link HTTPS.
- **Vercel** hoặc **GitHub Pages:** đẩy thư mục lên GitHub rồi bật Pages, hoặc import vào Vercel.

Sau khi có domain, nhớ bổ sung theo checklist kỹ thuật trong PDF:

- Ảnh `og-image.jpg` khổ 1200x630 đặt cạnh `index.html`, để link hiện đẹp khi chia sẻ.
- Mã UTM cho bài teaser, QR in ấn và nút chia sẻ.
- Test trên iOS Safari và Android Chrome, màn hình rộng 360 đến 430px.

---

## 6. Việc nhóm cần chốt

- Headline chính: bản PDF bị cắt chữ, đang tạm dùng "Bếp đỏ giữ lửa, nếp nhà đoàn viên".
- Tên menu "Tạo Thẻ Yêu Nghiệm" (đang dùng "Thẻ Vị Táo") và tên cổng "Tâm Thế Thông Hành Hảo Quán" (đang dùng "Thẻ thông hành").
- Danh hiệu thứ 4 "Táo Vượt Vũ Môn" (đề xuất).
- Ngày giờ và địa điểm sự kiện, thể lệ đầy đủ, thời gian lưu dữ liệu, email nhận yêu cầu xoá dữ liệu, độ tuổi tối thiểu.
- Tranh chương 1 đang là bản tạm (độ phân giải thấp). Tranh chương 3, 4 nên thay bản gốc lớn hơn.
- File giọng đọc MP3 cho 4 chương.

---

*Cảnh cá chép và đèn trời dựa trên pen "Flying lanterns and a Koi fish (instancing + DataTexture)" của Paul (prisoner849) trên CodePen, đã tô màu lại thành cá chép.*
