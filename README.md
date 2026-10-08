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
├─ index.html        Bố cục trang: hero, sách, thẻ thông hành, lá sớ, dữ liệu cá nhân
├─ styles.css        Giao diện (tông sáng, hero tông đêm), responsive từ 360px
├─ app.js            Logic: sách 4 chương, nghe chuyện, thẻ thông hành, vòng quay, lá sớ, đo lường
├─ ca-chep.js        Cảnh 3D hero: cá chép + 500 đèn trời
├─ admin.html/.js    Trang quản trị: số liệu từng mã thẻ, in mã QR cổng và trạm
├─ api/
│  ├─ track.js       Nhận sự kiện (lật trang, nghe chuyện, đóng dấu, quay thưởng)
│  ├─ admin.js       Trả số liệu cho trang quản trị (cần mật khẩu)
│  └─ _store.js      Kết nối Upstash Redis
├─ fish.stl          Model cá (từ pen "Flying lanterns and a Koi fish" của prisoner849)
├─ images/           Tranh 4 chương, giay-cu.jpg (nền giấy cũ)
├─ audio/            (tuỳ chọn) chuong-N.mp3 giọng đọc chương, ke-chuyen-N.mp3 chuyện kể cuối chương
├─ package.json      Lệnh npm start
└─ chay-du-an.bat    Chạy nhanh trên Windows
```

Thư viện (three.js r147, GSAP 3.12, QRCode.js, StPageFlip, Phosphor Icons, font Google) được tải từ CDN, nên **cần có mạng** khi mở trang.

---

## 3. Luồng người chơi

1. **Sách 4 chương (không bắt buộc):** đọc, cuối mỗi chương chạm vào một vật để nghe chuyện kể và mở huy hiệu.
2. **Tạo thẻ thông hành:** nhập tên là có hộ chiếu và mã QR riêng. Tạo trước ở nhà hoặc ngay tại cổng đều được.
3. **Check-in ở cổng (tuỳ chọn):** quét QR ở cổng (`?vao=CONG23`) để ghi nhận đã tới sự kiện, admin xem được.
4. **Đi 4 trạm (chỉ ở sự kiện):** quét QR ở trạm (`?tram=HUONG1`...) hoặc nhập mã in dưới QR. Dấu đóng vào trang visa, sau đó **quay vòng may mắn** một lần (sticker, móc khoá hoặc chúc may mắn). Chưa có thẻ mà quét QR trạm thì tạo thẻ xong dấu được đóng ngay.
5. **Check-out:** đủ 4 dấu thì nhận quà cuối bằng mã QUA-XXXX, và mở **lá sớ gửi Táo** để chia sẻ.

**Mã dùng thử:** cổng `CONG23`, trạm `HUONG1`, `MAIAM2`, `NEPNH3`, `TOTLA4`. Trang quản trị có sẵn 5 mã QR để in.

---

## 4. Thay nội dung thường gặp

| Muốn đổi | Sửa ở đâu |
|---|---|
| Tranh minh hoạ chương | Thay file trong `images/`, giữ tên `chuong-1.jpg` đến `chuong-4.jpg` |
| Giọng đọc, chuyện kể | `audio/chuong-N.mp3` (đọc chương), `audio/ke-chuyen-N.mp3` (chuyện cuối chương) |
| Nội dung 4 chương, chuyện kể, huy hiệu | `app.js`, mảng `CHAPTERS` |
| Mã cổng | `app.js` `GATE_CODE` và `admin.js` `GATE_CODE` (đổi cả hai) |
| Tên 4 trạm và mã trạm | `app.js` `STATIONS` và `admin.js` `STATIONS` |
| Quà vòng quay và tỉ lệ trúng | `app.js`, `PRIZES` (tên quà) và `WHEEL` (mỗi ô một `share`, tổng 100) |
| Gợi ý lời trong lá sớ | `app.js`, mảng `VALUES` |
| Ngày giờ, địa điểm sự kiện | `app.js`, trang sự kiện trong sách (đang ghi "Sắp công bố") |
| Màu sắc, font | `styles.css`, các biến trong `:root` |

---

## 5. Đo lường và trang quản trị

Trang ghi lại cho **từng mã thẻ**: số lần lật trang sách, các trang đã xem, trang đang xem, chương đã nghe, dấu trạm, quà vòng quay. Người chưa tạo thẻ vẫn được đếm theo mã trình duyệt, tạo thẻ xong thì gắn với mã thẻ. Trang quản trị cũng cho biết ai đã check-in ở cổng sự kiện.

Xem tại **`/admin.html`** (ví dụ https://chuyen-nha-tao.vercel.app/admin.html): bảng từng người, tìm kiếm, sắp xếp, xuất CSV, và phần **in mã QR** cho cổng và 4 trạm.

**Cài đặt một lần trên Vercel:**

1. Vào project trên Vercel → **Storage** → **Create Database** → chọn **Upstash** (Redis, gói Free) → **Connect** với project `chuyen-nha-tao`. Vercel tự thêm biến `KV_REST_API_URL` và `KV_REST_API_TOKEN`.
2. **Settings → Environment Variables** → thêm `ADMIN_KEY` = một mật khẩu do nhóm tự đặt (dài, khó đoán).
3. **Deployments** → bấm **Redeploy** bản mới nhất để nhận biến mới.
4. Mở `/admin.html`, nhập mật khẩu `ADMIN_KEY`.

Chưa làm các bước trên, hoặc mở ở máy (localhost), thì trang quản trị hiện số liệu của chính trình duyệt đang mở để xem thử.

---

## 6. Trang nhân sự (staff quét QR đóng dấu)

Khi đã nối kho dữ liệu (mục 5), thẻ được lưu trên máy chủ và **chỉ nhân sự mới đóng dấu được**:

1. Nhân sự mở **`/staff.html`** trên điện thoại, nhập mật khẩu `STAFF_KEY`, chọn chỗ đứng (một trong 4 trạm hoặc bàn check-out).
2. Bấm **Mở camera**, quét QR trên trang thông tin hộ chiếu của người chơi. Ở trạm, quét xong là dấu được đóng ngay; không quét được thì nhập mã thẻ `TAO-XXXXXX`.
3. Máy chủ bốc quà vòng quay của trạm đó. Điện thoại người chơi tự hiện dấu và vòng quay sau vài giây, kim dừng đúng quà đã bốc. Trúng quà thì nhân sự bấm **Đã trao …**.
4. Ở bàn check-out: quét QR, đủ 4 dấu thì bấm **Xác nhận trao quà cuối** (mỗi thẻ chỉ một lần), và trao nốt quà vòng quay còn thiếu nếu có.

**Cài đặt thêm trên Vercel:** Settings → Environment Variables → thêm `STAFF_KEY` (mật khẩu nhân sự, khác `ADMIN_KEY`) → Redeploy. Mật khẩu admin cũng đăng nhập được trang staff. Sai mật khẩu 5 lần thì bị khoá 15 phút, đăng nhập tự hết hạn sau 8 tiếng.

**Chạy thử trọn luồng ở máy:** `npm run dev:full` rồi mở http://localhost:5174 (máy chủ thử có sẵn Redis giả lập, mật khẩu staff `staff123`, admin `admin123`). Chạy `npm start` (cổng 5173, không có API) thì trang tự quay về cách cũ: người chơi tự nhập mã trạm để demo.

---

## 7. Một số điểm kỹ thuật

- **Lưu trữ:** thẻ, dấu trạm, quà, ảnh khoảnh khắc và lá sớ lưu trong `localStorage` của người chơi. Số liệu đo lường gửi lên `/api/track` (Upstash Redis). Ảnh và lời trong lá sớ không gửi lên máy chủ.
- **Mất mạng:** thẻ tạo lúc mất mạng có mã `OFF-`, có mạng lại tự đổi sang `TAO-`. Sự kiện đo lường được giữ lại trên máy và gửi khi có mạng.
- **Vòng quay:** khi có máy chủ, quà do máy chủ bốc lúc staff đóng dấu (tỉ lệ ở `api/_store.js` `PRIZE_WEIGHTS`, giữ khớp `WHEEL` trong `app.js`), điện thoại chỉ diễn hoạt cảnh. Không có máy chủ thì quay trên máy người chơi.
- **Analytics:** sự kiện cũng được đẩy vào `window.dataLayer`, gắn Google Tag Manager là đọc được.
- **Xoá dữ liệu thử:** cuối trang, mục "Tôi muốn xóa dữ liệu", bấm **Xóa dữ liệu trên máy**, gõ XOÁ để xác nhận.

---

## 8. Việc nhóm cần chốt

- Mã cổng thật (đang là `CONG23`), tên 4 trạm và mã trạm.
- Danh sách quà vòng quay, số lượng mỗi loại, tỉ lệ trúng.
- Ngày giờ và địa điểm sự kiện, thể lệ đầy đủ, thời gian lưu dữ liệu, email nhận yêu cầu xoá dữ liệu, độ tuổi tối thiểu.
- File thu âm chuyện kể cuối chương (`ke-chuyen-1.mp3` đến `ke-chuyen-4.mp3`).
- Tranh chương 1 bản nét, ảnh `og-image.jpg` 1200x630 khi chia sẻ link.

---

*Cảnh cá chép và đèn trời dựa trên pen "Flying lanterns and a Koi fish (instancing + DataTexture)" của Paul (prisoner849) trên CodePen, đã tô màu lại thành cá chép.*
