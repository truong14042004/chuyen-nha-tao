# Chuyện Nhà Táo · Tài liệu thiết kế & kỹ thuật landing page

> Tài liệu mô tả **trang web làm gì**, **thiết kế theo nguyên tắc nào** và **code được tổ chức ra sao**.
> Nguồn yêu cầu: *Project Management · Chuyện nhà Táo · 2.3 Landing Page* (PDF).
> Cách chạy dự án xem ở [README.md](README.md).

---

## Mục lục

1. [Tổng quan trang web](#1-tổng-quan-trang-web)
2. [Đối chiếu yêu cầu PDF với trang](#2-đối-chiếu-yêu-cầu-pdf-với-trang)
3. [Định hướng thiết kế](#3-định-hướng-thiết-kế)
4. [Design tokens](#4-design-tokens)
5. [Bố cục & responsive](#5-bố-cục--responsive)
6. [Chuyển động (motion)](#6-chuyển-động-motion)
7. [Âm thanh & giọng đọc](#7-âm-thanh--giọng-đọc)
8. [Kiến trúc code](#8-kiến-trúc-code)
9. [Thành phần HTML theo section](#9-thành-phần-html-theo-section)
10. [Thành phần CSS](#10-thành-phần-css)
11. [Logic JavaScript (app.js)](#11-logic-javascript-appjs)
12. [Cảnh 3D cá chép (ca-chep.js)](#12-cảnh-3d-cá-chép-ca-chepjs)
13. [Dữ liệu & lưu trữ](#13-dữ-liệu--lưu-trữ)
14. [Analytics](#14-analytics)
15. [Khả năng truy cập (a11y)](#15-khả-năng-truy-cập-a11y)
16. [Hiệu năng](#16-hiệu-năng)
17. [Hướng phát triển & việc cần chốt](#17-hướng-phát-triển--việc-cần-chốt)

---

## 1. Tổng quan trang web

**Chuyện Nhà Táo** là landing page làm "trung tâm" (hub) cho chiến dịch văn hoá ngày **23 tháng Chạp**, tiễn ông Táo về trời. Trang dẫn người dùng qua một hành trình **O2O (Online to Offline)**:

```
 Online                                                        Offline (sự kiện)
 ┌──────────┐   ┌────────────────┐   ┌──────────────┐   ┌──────────────────┐   ┌─────────────┐   ┌──────────────┐
 │ S01 Hero │ → │ S02 Sách 4     │ → │ S03 Tổng kết │ → │ S04 Tạo thẻ      │ → │ S05 Đóng dấu│ → │ S06 Nhận quà │
 │ cá chép  │   │ chương + game  │   │ 4 huy hiệu   │   │ thông hành + QR  │   │ 4 trạm      │   │ check-out    │
 └──────────┘   └────────────────┘   └──────────────┘   └──────────────────┘   └─────────────┘   └──────┬───────┘
                                                                                                        ↓
                                                         ┌──────────────────────────────────────────────┴──┐
                                                         │ S07–S08 Thẻ "Vị Táo" (Year in Values) + chia sẻ  │
                                                         └─────────────────────────────────────────────────┘
```

| Thành phần | Mục đích | Trải nghiệm chính |
|---|---|---|
| **Hero** | Gây ấn tượng, đưa người dùng vào câu chuyện | Cảnh 3D đêm 23 tháng Chạp: cá chép bơi giữa 500 đèn trời |
| **Sách 4 chương** | Kể câu chuyện văn hoá bằng tương tác | Tranh minh hoạ, giọng đọc, lật trang, 4 mini-game, 4 huy hiệu |
| **Thẻ thông hành** | Kết nối online với sự kiện thật | Virtual ID + QR, 4 trạm đóng dấu, mã quà dùng một lần |
| **Thẻ Vị Táo** | Biến giá trị thành nội dung chia sẻ (UGC) | 4 câu hỏi → danh hiệu → ảnh 1:1 / 9:16 → caption, Facebook, TikTok |
| **Dữ liệu của bạn** | Minh bạch, xây niềm tin | Thu gì, dùng làm gì, ai xem, quyền xoá |

**Bốn giá trị** xuyên suốt cả trang (chương sách, huy hiệu, trạm, danh hiệu UGC):

| # | Giá trị | Chương sách | Huy hiệu | Trạm | Danh hiệu UGC |
|---|---|---|---|---|---|
| 1 | Hướng thiện | Tự soi xét và hướng thiện | Huy hiệu Hướng Thiện | Trạm Hướng Thiện (`HUONG1`) | Táo Đức Thơm |
| 2 | Mái ấm | Gìn giữ mái ấm và hòa thuận | Huy hiệu Mái Ấm | Trạm Mái Ấm (`MAIAM2`) | Táo Gương Hòa |
| 3 | Nếp nhà | Thành kính và trân trọng nếp nhà | Huy hiệu Nếp Nhà | Trạm Nếp Nhà (`NEPNH3`) | Táo Nếp Nhà |
| 4 | Tốt lành | Khát vọng vươn lên, hướng tới điều tốt lành | Huy hiệu Tốt Lành | Trạm Tốt Lành (`TOTLA4`) | Táo Vượt Vũ Môn *(đề xuất)* |

---

## 2. Đối chiếu yêu cầu PDF với trang

| Mã PDF | Màn hình | Vị trí trên trang | Trạng thái |
|---|---|---|---|
| S01 | Hero + điều hướng | `header#site-header`, `section#hero` | ✅ |
| S02 | Storybook + 4 chương | `section#doc-sach`: quyển sách lật trang `#flipbook` (StPageFlip) + `#chapter-tabs` | ✅ |
| S03 | Tổng kết huy hiệu + CTA sự kiện | Trang 19–20 của quyển sách (`#badges`) | ✅ ngày/địa điểm "Sắp công bố" |
| S04 | Đăng ký / consent / Virtual ID | `#register`, `form#form-register` | ✅ (mô phỏng, chưa có backend) |
| S05 | Passport 4 trạm | `#ticket-slot` | ✅ (mô phỏng) |
| S06 | Check-out & quà | `#checkout` | ✅ (mô phỏng) |
| S07 | UGC: câu hỏi giá trị + tạo khung | `section#the-vi-tao` (`#quiz`, `#ugc-canvas`) | ✅ |
| S08 | Chia sẻ & caption mẫu | `#captions`, `#btn-share-fb`, `#btn-share-tt` | ✅ thể lệ chờ chốt |
| S09 | Hỗ trợ: lỗi, offline, consent, chính sách | `section#du-lieu`, `#offline-bar`, `#toasts` | ✅ |
| S10 | Màn điều phối cho nhân sự | không thuộc landing page | ⏳ cần backend (có wireframe) |

**Lỗi nội dung trong PDF đã xử lý:**
- Tên thương hiệu "Chuyển Nhà Tảo" → **Chuyện Nhà Táo**.
- Headline bị cắt chữ → tạm dùng **"Bếp đỏ giữ lửa, nếp nhà đoàn viên"** (chờ nhóm chốt).
- "Tảo Lửa" → bỏ, hero dùng cảnh cá chép + đèn trời.
- Câu hỏi giá trị 2 trùng giá trị 3 → viết lại câu 2 thành tình huống bữa cơm căng thẳng.
- Huy hiệu "Tiếp Nối" ≠ "Viên Mãn" → thống nhất 4 huy hiệu theo 4 giá trị.
- "Tạo Thẻ Yêu Nghiệm" → tạm dùng **"Thẻ Vị Táo"**; "Tâm Thế Thông Hành Hảo Quán" → tạm dùng **"Thẻ thông hành"**.

---

## 3. Định hướng thiết kế

**Cách hiểu yêu cầu:** landing page sự kiện văn hoá cho người trẻ và gia đình Việt, xem chủ yếu trên điện thoại. Không khí là "đêm 23 tháng Chạp ấm áp", ngôn ngữ dân gian hiện đại (tranh Hàng Trống, giấy dó, đỏ son, vàng đất).

Thiết kế kết hợp ba bộ nguyên tắc:

| Nguồn | Áp dụng vào trang |
|---|---|
| **UI/UX Pro Max** | Font Be Vietnam Pro (tối ưu tiếng Việt); vùng chạm ≥ 44px; form kiểm tra khi rời ô, có khối tóm tắt lỗi, trạng thái loading/thành công; hiệu ứng stagger 300–450ms; checklist trước khi giao |
| **taste-skill** | Một màu nhấn duy nhất (đỏ son); không emoji, không gạch dài trong nội dung; hero tối đa 4 lớp chữ; mỗi section một kiểu bố cục khác nhau; mọi animation phải có lý do |
| **GSAP ScrollTrigger** | Chuyển cảnh camera khi cuộn (scrub), hiện nội dung theo batch, tôn trọng chế độ giảm chuyển động |

**Thông số thiết kế:** `VARIANCE 7` (bố cục lệch, không đối xứng cứng) · `MOTION 6` (có chuyển động nhưng có chủ đích) · `DENSITY 4` (thoáng, dễ đọc).

**Nguyên tắc chủ đạo:**
1. **Văn hoá đúng chất:** cá chép (không phải koi) đưa ông Táo về trời, đèn trời, tranh minh hoạ phong cách Hàng Trống, nội dung tiếng Việt thật.
2. **Một CTA chính mỗi màn:** hero chỉ có "Mở cuốn sách", phụ là "Lấy thẻ thông hành".
3. **Ấm áp, không phán xét:** mọi thông báo lỗi viết giọng nhẹ nhàng ("Bạn nhập một cái tên để in lên thẻ nhé").
4. **Không chặn người dùng:** sai 3 lần thì có "Bỏ qua"; từ chối đồng ý vẫn tham gia được; mất mạng vẫn tạo thẻ.

---

## 4. Design tokens

Tất cả màu, bo góc, khoảng cách khai báo bằng **CSS custom properties** trong `styles.css`.

### 4.1 Hai tông màu

| Phạm vi | Selector | Dùng cho |
|---|---|---|
| **Tông sáng** (mặc định) | `:root` | Toàn bộ nội dung trang |
| **Tông đêm** | `.theme-dark`, `.site-header:not(.is-solid)` | Hero (cảnh đèn trời), header khi nằm trên hero, thẻ thông hành sơn mài |

Mỗi component chỉ dùng biến (`var(--text)`, `var(--surface)`...), nên đặt class `.theme-dark` lên một khối là toàn bộ khối đó tự đổi sang tông đêm.

### 4.2 Bảng màu

| Token | Tông sáng | Tông đêm | Vai trò | Tương phản |
|---|---|---|---|---|
| `--bg` | `#fff8f0` | `#120b07` | Nền trang | |
| `--bg-2` | `#fff1e3` | `#1a100a` | Nền section xen kẽ, footer | |
| `--surface` | `#ffffff` | `#20140d` | Nền thẻ (card) | |
| `--surface-2` | `#fffaf4` | `#2a1b12` | Nền thẻ lớp 2 | |
| `--text` | `#2a1710` | `#f4ece1` | Chữ chính | 15:1 |
| `--text-muted` | `#5e4637` | `#c4b3a0` | Chữ phụ | 8.6:1 |
| `--text-dim` | `#7a6252` | `#9c8a78` | Chú thích, nhãn nhỏ | 5.4:1 |
| `--accent` | `#c7321a` | `#d63b20` | **Màu nhấn duy nhất** (đỏ son): nút chính | chữ trắng 5.4:1 |
| `--accent-ink` | `#b02c15` | `#ff8a6b` | Chữ đỏ, icon, viền focus | 6.1:1 |
| `--gold` | `#f0b847` | `#e9b44c` | Chỉ cho huy hiệu, trạng thái đạt | |
| `--gold-ink` | `#8a5a0b` | `#e9b44c` | Chữ vàng ("Sắp công bố", mục chờ chốt) | 5.6:1 |
| `--danger` | `#c62828` | `#ff7a7a` | Lỗi | |
| `--ok` | `#2e7d4f` | `#8fd6a8` | Đúng, thành công | |
| `--line`, `--line-strong` | nâu 12% / 24% | kem 12% / 24% | Viền | |

### 4.3 Typography

- **Font:** `Be Vietnam Pro` (400, 500, 600, 700, 800), dự phòng `Noto Sans`, `system-ui`.
- **Cỡ chữ nền:** 16px, line-height 1.6. Tiêu đề dùng `text-wrap: balance`, đoạn văn dùng `text-wrap: pretty`.

| Vai trò | Cỡ | Đậm | Ví dụ |
|---|---|---|---|
| H1 hero | `clamp(33px, 9.2vw, 72px)` | 800, letter-spacing −0.035em | Bếp đỏ giữ lửa, nếp nhà đoàn viên |
| H2 section | `clamp(30px, 5.2vw, 48px)` | 800 | Cuốn sách bốn chương |
| H3 thẻ / chương | 22–32px | 800 | Tự soi xét và hướng thiện |
| Eyebrow | 13px, IN HOA, letter-spacing 0.14em | 600 | ĐÊM 23 THÁNG CHẠP (chỉ dùng 1 lần, ở hero) |
| Nội dung | 15–17px | 400 | Đoạn truyện, mô tả |
| Chú thích | 12–14px | 400–600 | Ghi chú dưới ô nhập |

### 4.3b Phong cách sách cổ (riêng quyển sách)
Quyển sách ở S02 có ngôn ngữ riêng, gợi cảm giác sách xưa để hợp chủ đề truyền thống:
- **Chữ:** `EB Garamond` (nội dung, chú thích, nút trong sách) và `Playfair Display` (tiêu đề, chữ cái đầu đoạn). Cả hai có bộ ký tự tiếng Việt. Phần còn lại của trang vẫn dùng Be Vietnam Pro.
- **Giấy:** nền ngà `#efdfbd`, nhiễu thớ giấy và sợi giấy dó bằng SVG `feTurbulence`, vết ố bằng `radial-gradient` (mỗi trang một kiểu theo `:nth-child`), mép trang tối dần, gáy sách đậm.
- **Trang trí:** khung viền kép mực nâu, hoa văn ❦ dưới tiêu đề, chữ cái đầu đoạn đóng khung đỏ son, số trang `· n ·`, mục lục số La Mã với đường chấm.
- **Tranh:** dạng tranh in dán vào trang (viền mat, sepia nhẹ), có chú thích "Hình I.".
- **Bìa:** da sơn mài có vân sờn, bốn góc bọc đồng, tên sách nhũ vàng (`background-clip: text`).
- **Độ dày:** mép giấy xếp lớp bằng nhiều lớp `box-shadow` ở cạnh ngoài.
- Màu mực dùng biến riêng trong `.pg`: `--ink`, `--ink-soft`, `--cinnabar`, `--paper`.

### 4.4 Bo góc, khoảng cách, đổ bóng

| Token | Giá trị | Quy tắc |
|---|---|---|
| `--radius-card` | 20px | Thẻ, sách, vé |
| `--radius-input` | 12px | Ô nhập, ô chọn |
| `--radius-pill` | 999px | Nút, chip, segmented control |
| `--nav-h` | 68px | Chiều cao header |
| `--container` | 1200px | Độ rộng tối đa nội dung |
| `--gutter` | 20px | Lề hai bên (≥ 16px theo PDF) |
| `--shadow-card` | bóng nâu ấm 2 lớp | Không dùng bóng đen thuần |
| `--ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | Đường cong chuyển động chung |

### 4.5 Icon & hình ảnh

- **Icon:** [Phosphor Icons](https://phosphoricons.com) (bản regular + fill qua CDN), dạng `<i class="ph ph-fire">`. Không dùng emoji làm icon.
- **Tranh chương:** `images/chuong-1.jpg` … `chuong-4.jpg`, phong cách tranh dân gian Hàng Trống, khổ dọc 4:5 (chương 2 khổ ngang, canh giữa bằng `object-position`).
- **Hạt giấy dó:** lớp nhiễu SVG cố định (`body::after`, opacity 0.035), không cuộn theo trang để không tốn GPU.

---

## 5. Bố cục & responsive

**Mobile-first.** Khung chính 375px, kiểm tra 360–430px, phụ là tablet 768px và desktop 1280px.

| Breakpoint | Thay đổi |
|---|---|
| ≤ 340px | Ẩn chữ "Chuyện Nhà Táo", chỉ giữ logo |
| ≤ 400px | Thu nhỏ tên thương hiệu, giảm khoảng cách header |
| ≥ 560px | Thẻ thông hành: QR và ô dấu đứng cạnh nhau |
| ≥ 720px | Tab chương hiện tên; huy hiệu 4 cột |
| ≥ 900px | Menu ngang + nút CTA trên header (ẩn ☰); sách 2 trang (5fr / 7fr); bước "Cách tham gia" nằm ngang |
| ≥ 1000px | Đăng ký và vé 2 cột (5fr / 7fr); UGC 2 cột, ô xem trước dính khi cuộn; dữ liệu 2 cột |

**Mỗi section một kiểu bố cục** (tránh lặp lại):

| Section | Kiểu bố cục |
|---|---|
| Hero | Toàn màn hình, chữ canh trái dưới, cảnh 3D làm nền |
| Sách | Cuốn sách 2 trang (tranh + nội dung) + thanh tab có chỉ báo trượt |
| Tổng kết | Lưới huy hiệu + thẻ sự kiện bên cạnh |
| Thẻ thông hành | Dòng 3 bước có đường nối + form / vé 2 cột |
| Vị Táo | Câu hỏi từng bước + ô xem trước dính (sticky) |
| Dữ liệu | Tiêu đề trái + accordion hỏi đáp phải |

Chiều cao hero dùng `min-height: 100dvh` để tránh nhảy layout do thanh địa chỉ iOS Safari.

---

## 6. Chuyển động (motion)

Mỗi chuyển động đều có lý do: dẫn chuyện, tạo thứ bậc, phản hồi thao tác, hoặc báo trạng thái thay đổi.

| Hiệu ứng | Ở đâu | Thông số | Lý do |
|---|---|---|---|
| Chữ hero trồi lên từng từ | `#hero-title .word` | yPercent 110 → 0, 0.9s, stagger 0.06 | Dẫn mắt đọc thông điệp |
| Câu phụ, nút hiện dần | `[data-hero-fade]` | y 18 → 0, 0.7s, stagger 0.12 | Thứ bậc sau headline |
| Camera bay lên khi cuộn | `carpScene.setScroll(progress)` | ScrollTrigger `scrub` trên `#hero` | Chuyển cảnh từ đêm vào câu chuyện |
| Chữ hero trôi lên, mờ đi | `.hero-content` | y −80, opacity 0, scrub | Nhường chỗ cho section kế |
| Section hiện dần | `.reveal` | `ScrollTrigger.batch`, y 28 → 0, 0.7s, stagger 0.08, `top 88%` | Thứ bậc khi cuộn |
| Đường nối 3 bước tự vẽ | `.flow-line` | scaleX 0 → 1, 0.9s | Thể hiện trình tự |
| Chỉ báo tab trượt | `.tab-indicator` | 0.45s `power3.out` | Báo chương đang chọn |
| Lật trang sách | `#flipbook` (StPageFlip) | Trang cong theo góc kéo, đổ bóng, 0.9s; kéo góc, vuốt, nút ‹ ›, phím ← → | Trải nghiệm đọc sách thật |
| Huy hiệu bật lên | `.badge .disc`, `.game-done` | scale 0.3 → 1, `back.out(2)` | Phản hồi thắng game |
| Dấu mộc đóng xuống | `.stamp .mark` | scale 2.4 → 1, xoay −50° → −12°, 0.55s | Phản hồi đóng dấu |
| Đèn trời bay lên | `.lantern-fly` | 3 đèn, bay hết màn hình ~3.2s | Nghi thức thả đèn chương 4 |
| Lắc khi sai | `.shake` | 0.35s | Báo lỗi |
| Thanh phần trăm giá trị | `#dist .bar` | scaleX 0 → 1, stagger 0.08 | Trình bày kết quả |

**Chế độ giảm chuyển động** (PDF D: "có tùy chọn giảm chuyển động"):
- Mặc định theo `prefers-reduced-motion` của hệ điều hành.
- Người xem đổi được bằng **nút ✨** trên header (`#motion-toggle`); lựa chọn lưu ở `localStorage['cnt_motion']` (`full` / `reduced`) và tải lại trang (giữ vị trí cuộn).
- Khi giảm: chỉ còn mờ dần (không dịch chuyển, không parallax, không bay camera), cảnh 3D đứng yên một khung hình, lớp `html.motion-reduced` tắt các animation CSS.
- Thêm `?motion=1` vào URL để xem cảnh cá bơi khi máy đang bật giảm chuyển động (dùng khi demo).

---

## 7. Âm thanh & giọng đọc

| Âm thanh | Cách tạo | Ghi chú |
|---|---|---|
| Lửa bếp lách tách | Web Audio API: nhiễu trắng qua bộ lọc bandpass, phát ngẫu nhiên 40–300ms | Bật bằng nút 🔊 `#sound-toggle`, **không tự phát** |
| Lật trang | Nhiễu 0.18s | Chỉ khi đang bật âm thanh |
| Chuông thành công | Sóng sine 660 → 990Hz | Hoàn thành chương, đóng dấu |

**Giọng đọc chương** (nút "Nghe đọc"), thứ tự ưu tiên:
1. File thu âm `audio/chuong-N.mp3`.
2. Giọng tiếng Việt của trình duyệt (`speechSynthesis`, ưu tiên giọng "Natural/Online" như HoaiMy trên Edge).
3. Không có giọng Việt → báo người dùng, **không** đọc bằng giọng tiếng Anh.

---

## 8. Kiến trúc code

Trang là **HTML/CSS/JavaScript thuần**, không framework, không bước build.

```
ChuyenNhaTao/
├─ index.html        Cấu trúc các section (S01–S09), thẻ meta OG, nạp thư viện
├─ styles.css        Design tokens + toàn bộ giao diện (679 dòng)
├─ app.js            Logic tương tác, dữ liệu nội dung, analytics, GSAP (1.085 dòng)
├─ ca-chep.js        Cảnh 3D hero (417 dòng)
├─ fish.stl          Model cá (STL nhị phân, 5.220 tam giác, 255KB)
├─ images/           Tranh 4 chương
├─ audio/            Giọng đọc (tuỳ chọn)
├─ package.json      npm start → http-server cổng 5173
└─ chay-du-an.bat    Chạy nhanh trên Windows
```

**Thư viện (CDN, tải `defer`):**

| Thư viện | Phiên bản | Dùng cho |
|---|---|---|
| three.js + BufferGeometryUtils + STLLoader | r147 (`examples/js`) | Cảnh 3D |
| GSAP + ScrollTrigger | 3.12.5 | Chuyển động |
| StPageFlip (`page-flip`) | 2.0.7 | Lật trang sách 3D |
| qrcodejs | 1.0.0 | Mã QR thẻ thông hành |
| Phosphor Icons (web) | 2.1.1 | Icon |
| Be Vietnam Pro | Google Fonts | Chữ |

**Thứ tự chạy:** `<html class="no-js">` → script inline đổi thành `js` → các thư viện → `ca-chep.js` (khai báo `window.carpScene`) → `app.js` (render nội dung, gắn sự kiện, khởi tạo GSAP). Nếu GSAP không tải được, nội dung vẫn hiển thị (lớp `.reveal` chỉ bị ẩn khi GSAP chạy).

---

## 9. Thành phần HTML theo section

| Khối | Phần tử chính | Mô tả |
|---|---|---|
| Skip link | `a.skip-link` | "Bỏ qua, đến phần đọc sách" cho người dùng bàn phím |
| **Header** | `header#site-header` | `.brand` (`.brand-seal` + `.brand-name`), `nav.nav-links` (3 mục, desktop), `.header-actions`: `#motion-toggle`, `#sound-toggle`, `.header-cta`, `#menu-toggle` |
| Menu mobile | `#mobile-menu` | 3 liên kết + nút "Mở cuốn sách"; `aria-expanded` trên nút ☰, đóng bằng Esc |
| Báo mất mạng | `#offline-bar` | `role="status"`, hiện khi `navigator.onLine === false` |
| **Hero** | `section#hero.hero.theme-dark` | `#hero-stage` (canvas 3D), `.eyebrow`, `h1#hero-title` (mỗi từ là `span.word`), `.hero-sub`, `.hero-ctas` |
| **Sách** | `section#doc-sach` | `.section-head`, `#chapter-tabs` (`role="tablist"`), `#flip-stage` > `#flipbook` (22 trang `.pg` do app.js dựng), `.flip-controls` (`#flip-prev`, `#flip-status`, `#flip-next`) |
| **Tổng kết** | trang 19–20 trong sách | `#badges` (4 `.badge`), thông tin sự kiện, CTA |
| **Thẻ thông hành** | `section#tram-trai-nghiem` | `ol.flow` (3 bước), `#register` (form), `#ticket-slot` (vé), `#checkout` (nhận quà) |
| Form đăng ký | `form#form-register` | `#error-summary` (`role="alert"`), `#f-nickname`, `#f-email`, `#f-consent`, `#btn-register`, `#btn-restore` |
| **Vị Táo** | `section#the-vi-tao` | `#quiz` (câu hỏi), `.customize` (`#ugc-photo`, `#ratio-seg`), `aside.ugc-preview` (`#ugc-canvas`, `#dist`, nút tải/chia sẻ, `#captions`) |
| **Dữ liệu** | `section#du-lieu` | `.faq` gồm 5 `<details>`; `#btn-clear-local` |
| Footer | `footer.site-footer` | Thương hiệu, liên kết, hashtag |
| Thông báo | `#toasts` | `aria-live="polite"` |

Nội dung động (chương sách, vé, câu hỏi, caption) do `app.js` render vào các vùng chứa (`#page-art`, `#page-text`, `#ticket-slot`, `#quiz`...).

---

## 10. Thành phần CSS

`styles.css` chia theo khối, mỗi khối có comment tiêu đề:

| Khối | Class chính | Ghi chú |
|---|---|---|
| Tokens | `:root`, `.theme-dark` | Xem mục 4 |
| Nền tảng | `.container`, `.sr-only`, `.skip-link`, `[hidden]` | `[hidden]{display:none!important}` để `hidden` luôn thắng class |
| Nút | `.btn` + `.btn-primary` / `.btn-ghost` / `.btn-quiet`, `.btn-sm`, `.btn-block`, `.icon-btn` | Cao 44–48px, nhấn thì `scale(0.97)`, có trạng thái `disabled` và `.spinner` |
| Header | `.site-header`, `.is-solid`, `.nav-links`, `.mobile-menu.is-open` | Trong suốt trên hero, đổi nền đặc khi cuộn |
| Hero | `.hero`, `.hero::before` (lớp phủ đọc chữ), `.no-webgl` (dự phòng) | |
| Section | `.section`, `.section-head`, `.card`, `.tag-phase`, `.reveal` | |
| Sách | `.chapter-tabs`, `.chapter-tab`, `.book`, `.page-art(.has-img)`, `.art-img`, `.seed-q`, `.page-text`, `.leaf` | Tranh phủ kín + lớp chuyển màu dưới để đọc câu hỏi gieo |
| Mini-game | `.game`, `.option(.is-right/.is-wrong)`, `.chip(.is-used/.is-selected/.is-matched)`, `.answer-line`, `.match-grid`, `.wish-list`, `.feedback`, `.game-done`, `.lantern-fly`, `.shake` | |
| Huy hiệu | `.badges`, `.badge(.is-unlocked)`, `.event-card`, `.soon` | |
| Form | `.form`, `.field`, `.input[aria-invalid]`, `.help`, `.error-text`, `.check`, `.error-summary` | |
| Vé | `.ticket(.theme-dark)`, `.ticket-empty`, `.skeleton`, `.qr-box` (nền sáng), `.stamps`, `.stamp(.is-done)`, `.code-entry`, `.checkout`, `.gift-code(.is-claimed)`, `.optin` | |
| UGC | `.quiz-card`, `.quiz-dots`, `.seg`, `.upload`, `.ugc-preview` (sticky), `.canvas-wrap`, `.dist-row(.top)`, `.caption`, `.rules` | |
| Dữ liệu | `.faq details`, `.pending` | |
| Thông báo | `.toasts`, `.toast(.ok/.gold/.err)`, `.offline-bar` | |
| Giảm chuyển động | `.motion-reduced` | Tắt `scroll-behavior`, `.shake`, `.skeleton` |

---

## 11. Logic JavaScript (app.js)

Toàn bộ nằm trong một IIFE `'use strict'`, chia thành các khối:

### 11.1 Tiện ích
| Hàm | Vai trò |
|---|---|
| `$`, `$$` | `querySelector` / `querySelectorAll` rút gọn |
| `esc(s)` | Escape HTML trước khi chèn chữ người dùng nhập (tên, caption) |
| `store.get/set/clear` | Bọc `localStorage` trong `try/catch`, tiền tố `cnt_` |
| `track(event, props)` | Đẩy sự kiện vào `window.dataLayer` (kèm UTM) |
| `toast(msg, type, icon)` | Thông báo nổi 4.2s, giọng ấm áp |

### 11.2 Hệ thống
| Khối | Hàm / đối tượng |
|---|---|
| Âm thanh | `sound.init/toggle/crackle/flip/chime` |
| Chuyển động | `reduceMotion`, `paintMotionBtn()`, nút `#motion-toggle` |
| Menu mobile | `setMenu(open)` |
| Mất mạng | lắng nghe `online` / `offline` → `#offline-bar` + toast |

### 11.3 Sách 4 chương (S02–S03)
Dữ liệu `CHAPTERS[]`, mỗi chương:
```js
{
  short, title, meaning,          // tên tab, tiêu đề, ý nghĩa ("Nhìn lại một năm")
  icon, img, alt, pos?,           // icon dự phòng, tranh, mô tả tranh, điểm canh tranh
  seed,                           // câu hỏi gieo
  story,                          // đoạn truyện
  badge: { name, desc },
  game: { type: 'quiz' | 'order' | 'match' | 'wish', label, q, ... }
}
```

| Hàm | Vai trò |
|---|---|
| `renderChapter()` | Vẽ trang tranh + nội dung, tải trước tranh chương kế |
| `goChapter(i)` | Đổi chương: hiệu ứng lật trang, âm thanh, lưu tiến độ |
| `moveIndicator()`, `syncTabs()` | Chỉ báo tab, dấu ✓ chương đã xong, phím ← → |
| `renderGame()` | 4 kiểu game: **quiz** (3 lựa chọn), **order** (ghép câu ca dao), **match** (ghép vật dụng ↔ ý nghĩa), **wish** (lời nguyện + thả đèn) |
| `fail()` | Đếm lần sai, hiện "Bỏ qua" từ lần thứ 3 |
| `completeChapter()`, `renderGameDone()` | Mở huy hiệu, toast, nút sang chương kế |
| `releaseLantern()` | Animation 3 đèn trời bay lên |
| `renderBadges()` | Lưới 4 huy hiệu + câu tổng kết S03 |
| `voiceOver()`, `speakTTS()`, `viVoice()`, `stopVoice()` | Giọng đọc (mục 7) |

### 11.3b Quyển sách lật trang
22 trang dựng bằng JS rồi giao cho StPageFlip (`loadFromHTML`):

| Trang | Nội dung |
|---|---|
| 0 | Bìa cứng (`data-density="hard"`) |
| 1–2 | Lời mở đầu, Mục lục (bấm để lật tới chương) |
| 3+4i … 6+4i | Chương i: tranh + câu hỏi gieo, nội dung + nghe đọc, mini-game, huy hiệu |
| 19–20 | Tổng kết 4 huy hiệu, thông tin sự kiện + CTA |
| 21 | Bìa sau |

Trên desktop các trang ghép thành trang đôi (tranh | nội dung, mini-game | huy hiệu); dưới 600px hiện từng trang (tỉ lệ trang cao hơn để đủ chỗ mini-game). Hàm chính: `goPage(p)`, `onPageChange(p)`, `initFlipbook()`, `renderGame(i)`, `renderBadgePage(i)`, `renderAllChapters()`. Bấm vào nút, ô nhập, chip trong trang không kích hoạt lật (chặn `mousedown`/`touchstart`). Thư viện không tải được thì trang xếp ngang, vuốt để xem.

### 11.4 Thẻ thông hành (S04–S06)
| Thành phần | Mô tả |
|---|---|
| `STATIONS[]` | 4 trạm `{ id, name, code }` |
| `ALPHA`, `randCode(n)` | Sinh mã bỏ ký tự dễ nhầm (0/O, 1/I/L) |
| `validateName()`, `validateEmail()`, `setFieldError()` | Kiểm tra khi rời ô, lỗi ngay dưới ô |
| Submit form | Khối tóm tắt lỗi nhận focus → loading 0.7s → tạo `pass` → toast phù hợp (bình thường / offline / không đồng ý) |
| `renderTicket()` | Vé: tên, mã `TAO-XXXXXX`, QR (`qrcodejs`), 4 ô dấu, ô nhập mã trạm; trạng thái trống có skeleton |
| `addStamp(code)` | Kiểm tra định dạng, sai mã, trùng trạm; animation dấu mộc |
| `renderCheckout()` | Mã quà `QUA-XXXX` một lần, nút "Nhân sự xác nhận", lời mời UGC |
| `#btn-restore` | Nhập lại mã thẻ (A7), hiện chỉ báo vì chưa có máy chủ |

### 11.5 Thẻ Vị Táo (S07–S08)
| Thành phần | Mô tả |
|---|---|
| `VALUES` | 4 giá trị → `{ name, title, desc }` |
| `QUESTIONS[]` | 4 câu, mỗi câu 4 đáp án gắn với 4 giá trị |
| `renderQuiz()` | Một câu một màn, chấm tiến độ, quay lại câu trước, làm lại |
| `result()` | Đếm phần trăm, chọn giá trị cao nhất (hoà thì ưu tiên câu cuối) |
| `drawCard()` | Vẽ canvas 1080×1080 hoặc 1080×1920: nền đêm + đèn trời (sinh ngẫu nhiên theo mã thẻ), ảnh tròn, tên, danh hiệu; khổ story có thêm biểu đồ 4 giá trị |
| `renderDist()` | Thanh phần trăm (không có rãnh nền) |
| `captionsFor()`, `renderCaptions()`, `copyCaption()` | 3 caption mẫu kèm `#ChuyenNhaTao #YearInValues` |
| Tải ảnh | Kiểm tra loại và dung lượng (≤ 20MB), nén về 1200px ngay trên máy |
| `share(network)` | Web Share API (gửi kèm file ảnh) nếu được; không thì copy caption + mở Facebook sharer / hướng dẫn TikTok |

### 11.6 GSAP
Cuối file: `gsap.registerPlugin(ScrollTrigger)`, header đổi nền khi cuộn quá 40px, menu sáng theo section, sau đó **một trong hai nhánh**: chuyển động đầy đủ (mục 6) hoặc bản mờ dần nhẹ. Khi font tải xong thì gọi `ScrollTrigger.refresh()`.

---

## 12. Cảnh 3D cá chép (ca-chep.js)

Dựa trên pen *"Flying lanterns and a Koi fish (instancing + DataTexture)"* của Paul ([prisoner849](https://codepen.io/prisoner849/pen/WNQNdpv)), đổi cá koi lưới cam thành **cá chép tô màu**.

**Đèn trời (instancing):**
- 500 đèn (300 trên mobile) dùng chung **một** geometry (Lathe + đáy lửa) qua `InstancedBufferGeometry`, nên chỉ tốn 1 draw call.
- Thuộc tính mỗi đèn: `instPos` (vị trí), `instSpeed` (tốc độ bay), `instLight` (pha nhấp nháy).
- Vertex shader cho đèn bay lên và lặp lại (`mod`), lắc ngang nhẹ. Fragment shader tô thân đỏ, lõi lửa vàng, nhấp nháy theo `sin/cos`.

**Cá bơi theo đường cong (DataTexture):**
1. Tạo vòng `CatmullRomCurve3` khép kín bán kính 40, 6 điểm, độ cao ngẫu nhiên ±10.
2. Lấy 512 điểm cách đều + khung Frenet (tangent, normal, binormal), ghi vào một `DataTexture` 512×4 (RGBA float).
3. Trong vertex shader, mỗi đỉnh của cá lấy toạ độ dọc thân `z` → tra vị trí trên đường cong → đặt lại đỉnh theo khung tại đó. Kết quả: **thân cá uốn theo khúc cua** và nghiêng khi lên xuống.
4. Pháp tuyến cũng được xoay theo khung để ánh sáng đúng. Thêm sóng quẫy đuôi (biên độ tăng dần về đuôi).
5. Tốc độ: hết một vòng trong 10 giây.

**Tô màu cá chép (shader thủ tục, không cần texture):** dựa trên toạ độ gốc đã chuẩn hoá `vLocal`:
- Lưng đỏ sẫm → thân vàng đồng → bụng vàng nhạt (theo chiều cao).
- Vảy so le có viền tối, độ sáng ngẫu nhiên từng vảy.
- Đầu mịn, mõm đỏ hơn.
- Vây đuôi, vây lưng, vây bụng đỏ cam có tia vây, tự phát sáng nhẹ như đèn chiếu xuyên qua.

**Camera & tương tác:** nhìn từ dưới lên (0, −25, 80), FOV 60. Rê chuột xoay nhẹ góc nhìn (không dùng OrbitControls để không chặn cuộn trang). Màn hình dọc thì camera lùi ra. Cuộn trang thì camera bay lên (`window.carpScene.setScroll`).

**Hiệu năng:** pixel ratio tối đa 2 (mobile 1.5); dừng render khi khuất màn hình (`IntersectionObserver`) hoặc khi chuyển tab; giảm chuyển động thì chỉ vẽ một khung hình.

---

## 13. Dữ liệu & lưu trữ

Bản hiện tại lưu mọi thứ trong **`localStorage` của trình duyệt** (tiền tố `cnt_`):

| Khoá | Nội dung |
|---|---|
| `cnt_chapter` | Chương đang đọc (0–3) |
| `cnt_page` | Trang sách đang mở (0–21), mở lại đúng trang |
| `cnt_chapters_done` | Mảng chương đã hoàn thành |
| `cnt_wish` | Lời nguyện chương 4 `{ choice, note }` |
| `cnt_pass` | Thẻ thông hành (xem dưới) |
| `cnt_ugc_answers` | Đáp án 4 câu Vị Táo |
| `cnt_utm` | Tham số UTM lần đầu vào trang |
| `cnt_visited` | Đã từng vào (để đo `return_visit`) |
| `cnt_motion` | `full` / `reduced` |

`sessionStorage['cnt_scroll']` giữ vị trí cuộn khi tải lại sau lúc bật/tắt hiệu ứng.

**Đối tượng thẻ thông hành (`cnt_pass`):**
```js
{
  id: 'TAO-7K3Q9P',        // Virtual ID
  nickname: 'Bé Na',
  email: null,             // chỉ lưu khi consent = true
  consent: false,
  stamps: [1, 2],          // id các trạm đã đóng dấu
  giftCode: 'QUA-7Q48',
  claimed: false,          // đã nhận quà
  synced: true             // false nếu tạo khi mất mạng
}
```

**Ảnh người dùng** chỉ xử lý trên máy (canvas), không gửi đi đâu. Nút "Xóa dữ liệu trên máy" gọi `store.clear()`.

---

## 14. Analytics

Mọi sự kiện đẩy vào `window.dataLayer` dạng `{ event, ts, ...utm, ...props }`. Gắn Google Tag Manager là đọc được ngay. Trên localhost, sự kiện còn được in ra console.

| Sự kiện | Khi nào | Thuộc tính |
|---|---|---|
| `page_view` | Mở trang | `utm_source` |
| `return_visit` | Quay lại lần sau | |
| `cta_open_book` | Bấm "Mở cuốn sách" | `from`: header / menu / hero |
| `cta_passport` | Bấm "Lấy thẻ thông hành" | `from`: hero / summary |
| `motion_toggle` | Bật/tắt hiệu ứng | `to` |
| `chapter_start` / `chapter_complete` | Mở / xong chương | `chapter`, `skipped` |
| `badge_unlocked` | Mở huy hiệu lần đầu | `badge` |
| `minigame_skip` | Bỏ qua mini-game | `chapter` |
| `voice_play` / `voice_unavailable` | Bấm nghe đọc / không có giọng Việt | `chapter` |
| `form_submit` | Tạo thẻ thành công | |
| `consent_accepted` / `consent_declined` | Theo ô đồng ý | |
| `virtual_id_created` | Có Virtual ID | `offline` |
| `qr_scan` | Nhập/quét mã trạm | `station`, `valid` |
| `stamp_added` | Đóng dấu thành công | `station` |
| `passport_complete` | Đủ 4/4 | |
| `reward_claimed` | Nhân sự xác nhận trao quà | |
| `optin_yes` / `optin_no` | Trả lời lời mời UGC | |
| `frame_generated` | Có danh hiệu Vị Táo | `title` |
| `download` | Tải thẻ | `ratio` |
| `copy_caption` | Sao chép caption | `version` |
| `share_click` | Bấm chia sẻ | `network` |

---

## 15. Khả năng truy cập (a11y)

- Tương phản chữ ≥ 4.5:1 ở cả hai tông (bảng mục 4.2).
- Vùng chạm ≥ 44×44px, khoảng cách giữa nút ≥ 8px.
- Viền focus rõ: `outline: 3px solid var(--accent-ink)`.
- `skip-link`, landmark (`header`, `main`, `nav`, `footer`), `aria-labelledby` cho từng section.
- Tab chương dùng `role="tablist"/"tab"`, `aria-selected`, phím ← →.
- Form: nhãn nằm trên ô (không dùng placeholder làm nhãn), `aria-invalid`, `aria-describedby`, khối tóm tắt lỗi `role="alert"` nhận focus.
- Thông báo động qua `aria-live` (toast, phản hồi game, tiến độ dấu).
- Nút chỉ có icon đều có `aria-label`; icon trang trí có `aria-hidden="true"`.
- Tôn trọng `prefers-reduced-motion`, kèm nút tự chọn.
- Âm thanh không tự phát.

---

## 16. Hiệu năng

| Mục | Cách làm |
|---|---|
| Model cá | STL nhị phân 255KB (giảm từ 1,6MB), `preload` sớm |
| Tranh chương | JPG nén 50–140KB, tải trước tranh chương kế |
| Script | `defer` toàn bộ; nội dung chữ hiện trước, cảnh 3D mờ dần vào khi sẵn sàng |
| 3D | 1 draw call cho 500 đèn; dừng render khi khuất; giới hạn pixel ratio |
| Animation | Chỉ animate `transform` / `opacity` |
| Cuộn | Không dùng `addEventListener('scroll')`, chỉ dùng ScrollTrigger / IntersectionObserver |
| Hạt giấy dó | Lớp `position: fixed`, không repaint khi cuộn |

Mục tiêu theo PDF: tải < 3 giây trên 4G.

---

## 17. Hướng phát triển & việc cần chốt

**Cần backend để chạy sự kiện thật** (API gợi ý):

| API | Dùng cho |
|---|---|
| `POST /virtual-id` `{ nickname, email?, consent }` → `{ id, giftCode }` | S04 tạo thẻ |
| `GET /virtual-id/:id` | A7 nhập lại mã thẻ |
| `POST /stamp` `{ virtualId, station }` | S05 đóng dấu (có hàng đợi khi offline) |
| `POST /reward/claim` `{ virtualId, code }` | S06 trao quà (một lần) |
| Màn S10 (nhân sự, đăng nhập PIN) | Tra Virtual ID, xác nhận dấu/quà, không lộ email |

**Nội dung nhóm cần chốt:**
- Headline chính, tên menu "Tạo Thẻ Yêu Nghiệm", tên cổng "Tâm Thế Thông Hành Hảo Quán".
- Danh hiệu thứ 4 (đang đề xuất "Táo Vượt Vũ Môn").
- Ngày giờ, địa điểm sự kiện, bản đồ 4 trạm, bảng quà (mục 2.4).
- Thể lệ UGC đầy đủ, thời gian lưu dữ liệu, email nhận yêu cầu xoá, độ tuổi tối thiểu.
- Tranh chương 1 bản đủ nét (đồng bộ phong cách với chương 2–4), file giọng đọc MP3.
- Ảnh chia sẻ `og-image.jpg` 1200×630, domain + HTTPS, mã UTM cho teaser và QR in ấn.

**Wireframe:** file Figma *"Chuyện Nhà Táo · Wireframe Landing (2.3)"*, trang "02 · Wireframe S01–S10".
