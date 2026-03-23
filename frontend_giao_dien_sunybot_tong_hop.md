# Tổng hợp giao diện frontend đề tài Sunybot Smart Elevator

## 1) Mục đích tài liệu

Tài liệu này dùng để đưa cho một chatbot khác hiểu nhanh:

- bộ frontend hiện tại của bạn đang ở trạng thái nào,
- những file nào đã có thật trong gói code vừa gửi,
- giao diện trước khi build `dist` được tổ chức theo hướng nào,
- những màn hình/chức năng UI nào có thể xác nhận chắc chắn,
- những phần nào chỉ mới suy ra từ tài liệu dự án chứ chưa có source React đầy đủ trong gói upload này.

Tài liệu này **không giả vờ là đã có toàn bộ source frontend**. Nó tách rõ phần nào **đã xác minh bằng file thật**, phần nào **suy ra từ tài liệu mô tả project**.

---

## 2) Phạm vi file đã có thật trong gói upload hiện tại

Trong thư mục upload hiện tại, tôi chỉ xác nhận được các file sau:

- `.gitignore`
- `README.md`
- `index.html`
- `package.json`
- `package-lock.json`
- `vite.config.js`
- `elevator_ai_project_prompt_updated.md`
- cùng một số tài liệu `.md` mô tả kiến trúc/tiến độ của project

**Điểm rất quan trọng:** hiện **chưa có thư mục `src/`** trong gói frontend vừa gửi. Vì vậy:

- chưa có `src/main.jsx` để đọc trực tiếp,
- chưa có `src/App.jsx`,
- chưa có `src/pages/*`,
- chưa có `src/components/*`,
- chưa có `src/services/*` trong gói hiện tại để phân tích mã thật từng màn hình.

Nói cách khác: gói hiện tại là **khung build của một app React/Vite**, nhưng **chưa đủ source để giải thích chi tiết logic từng trang từ code thật**.

---

## 3) Kết luận nhanh về frontend hiện tại

Từ file thật đang có, có thể kết luận chắc chắn rằng frontend này là:

- một project **React + Vite**,
- dùng **React Router** để điều hướng nhiều màn hình,
- mount app vào phần tử `#root`,
- entry client được trỏ tới `src/main.jsx`,
- có cấu hình chạy dev server ở cổng `5173`.

Điều đó cho thấy đây là một **frontend web mới theo hướng SPA**, không còn là một file HTML tĩnh đơn lẻ.

---

## 4) Giải thích từng file code trong gói hiện tại

### 4.1 `index.html`

Đây là **HTML shell** của ứng dụng Vite/React.

Vai trò chính:

- khai báo tài liệu HTML gốc bằng tiếng Việt,
- nạp font `Sora`,
- tạo vùng mount `<div id="root"></div>` cho React,
- gọi file entry `src/main.jsx`.

Ý nghĩa kỹ thuật:

- file này **không chứa giao diện business thật**,
- nó chỉ là **vỏ ngoài** để React render toàn bộ app vào `#root`.

Suy ra:

- mọi màn hình thật như Home, Assistant, SOS, Maintenance, Call Floor... nếu tồn tại, sẽ nằm trong `src/` chứ không nằm trực tiếp trong `index.html`.

### 4.2 `package.json`

Đây là file mô tả project frontend.

Vai trò chính:

- đặt tên project là `sunybot-smart-elevator`,
- bật chế độ ES module (`"type": "module"`),
- định nghĩa 3 lệnh cơ bản:
  - `npm run dev`
  - `npm run build`
  - `npm run preview`
- khai báo dependency runtime:
  - `react`
  - `react-dom`
  - `react-router-dom`
- khai báo dependency build:
  - `vite`
  - `@vitejs/plugin-react`
  - type package cho React.

Ý nghĩa kỹ thuật:

- project này được thiết kế theo hướng **nhiều route/màn hình** chứ không phải một widget đơn.
- vì có `react-router-dom`, frontend rất có khả năng có các route như:
  - `/`
  - `/assistant`
  - `/maintenance`
  - `/sos`
  - `/call`
  hoặc cấu trúc route tương đương.

### 4.3 `vite.config.js`

Đây là file cấu hình Vite.

Vai trò chính:

- bật plugin React,
- cấu hình dev server chạy ở port `5173`.

Ý nghĩa kỹ thuật:

- khi phát triển local, frontend có thể được chạy độc lập bằng Vite,
- sau đó build thành `dist/` để backend FastAPI hoặc web server khác serve.

### 4.4 `package-lock.json`

Đây là file lock dependency.

Vai trò chính:

- khóa version chính xác của tất cả package để đảm bảo môi trường cài đặt ổn định,
- giúp `npm install` cho ra cây dependency nhất quán.

Ý nghĩa kỹ thuật:

- file này **không chứa logic giao diện**, nhưng rất quan trọng để build lại đúng môi trường.
- nếu sau này chatbot khác hỗ trợ bạn dựng lại frontend, file này sẽ giúp tránh lệch version.

### 4.5 `.gitignore`

Đây là file quy định những gì Git không theo dõi.

Vai trò chính:

- bỏ qua `node_modules`, `dist`, `coverage`, `.env`, log file, file IDE/editor.

Ý nghĩa kỹ thuật:

- xác nhận đây là workflow frontend chuẩn:
  - source được commit,
  - output build `dist/` không nhất thiết commit,
  - biến môi trường `.env` được giữ riêng.

### 4.6 `README.md`

Hiện tại README chỉ có một dòng: `# Elev_Web-main`.

Ý nghĩa:

- README hiện chưa đủ để mô tả project,
- gần như chưa cung cấp kiến trúc, cách chạy hay giải thích màn hình.

Kết luận:

- README hiện là phần cần bổ sung nếu bạn muốn project dễ bàn giao hơn.

---

## 5) Những gì có thể xác nhận chắc chắn về giao diện từ file thật

Từ bộ file thật hiện tại, có thể xác nhận chắc chắn 6 điểm sau:

1. Frontend là **ứng dụng React dạng SPA**.
2. App được mount từ `src/main.jsx`.
3. Có dùng **React Router**, nghĩa là có nhiều view hoặc nhiều route.
4. Có quy trình chuẩn:
   - chạy dev bằng Vite,
   - build ra `dist`,
   - preview build.
5. Giao diện dùng font `Sora`, nên có chủ đích tạo cảm giác hiện đại hơn giao diện mặc định.
6. Gói hiện tại mới là **khung frontend**, chưa phải bộ source đầy đủ để đọc logic từng màn hình.

---

## 6) Những gì có thể suy ra từ tài liệu dự án đi kèm

Từ các tài liệu `.md` đi kèm project, phần giao diện của đề tài được mô tả theo hướng **thang máy thông minh có trợ lý Sunybot** với các nhóm màn hình/chức năng sau:

### 6.1 Nhóm màn hình người dùng cuối

Đây là nhóm giao diện phục vụ người dùng/khách dùng thang máy:

- **Home**: màn hình chính hiển thị trạng thái tổng quát của hệ thống.
- **Assistant**: màn hình chatbot/trợ lý ảo để hỏi đáp.
- **Call Floor / Call**: màn hình gọi tầng.
- **SOS**: màn hình hoặc action khẩn cấp.

### 6.2 Nhóm màn hình kỹ thuật / bảo trì

Đây là nhóm giao diện dành cho kỹ thuật viên:

- **Maintenance**: giao diện bảo trì/LLM Console.
- **AgentTracePanel**: panel hiển thị trace kỹ thuật, session hoặc debug agent.

### 6.3 Nhóm chức năng giao diện được mô tả trong tài liệu

Các chức năng UI được tài liệu dự án nhắc tới gồm:

- hiển thị trạng thái thang máy,
- gọi tầng,
- chat với Sunybot,
- SOS khẩn cấp,
- voice interaction,
- maintenance / debug,
- phân tách giao diện khách hàng và giao diện kỹ thuật.

---

## 7) Mô hình giao diện trước khi build `dist`

Vì `index.html` trỏ tới `/src/main.jsx`, nên trước khi build `dist`, source giao diện mới nhiều khả năng được tổ chức theo mô hình như sau:

```text
src/
├── main.jsx
├── App.jsx hoặc router config
├── pages/
│   ├── Home.jsx
│   ├── Assistant.jsx
│   ├── CallFloor.jsx
│   ├── SOS.jsx
│   └── Maintenance.jsx
├── components/
│   ├── AgentTracePanel.jsx
│   └── các component UI dùng chung khác
└── services/
    └── api.js
```

Lưu ý: đây là **cấu trúc suy ra từ tài liệu mô tả project**, không phải cây thư mục đã xác minh đầy đủ từ gói upload hiện tại.

---

## 8) Ý nghĩa của từng màn hình giao diện được suy ra

### 8.1 `Home`

Mục đích:

- làm dashboard chính,
- cho thấy trạng thái cơ bản của thang máy,
- có thể là nơi truy cập nhanh đến chat, gọi tầng, SOS.

Khả năng hiển thị:

- trạng thái tầng hiện tại,
- hướng di chuyển,
- trạng thái cửa,
- số người,
- cảnh báo cơ bản.

### 8.2 `Assistant`

Mục đích:

- cho người dùng hỏi đáp với Sunybot,
- phục vụ chatbot cho người dùng cuối,
- tránh lộ thông tin kỹ thuật sâu.

Khả năng hiển thị:

- ô chat,
- lịch sử hội thoại,
- phản hồi từ backend `/chat`,
- có thể tích hợp voice input/output.

### 8.3 `CallFloor`

Mục đích:

- thao tác gọi tầng từ giao diện,
- về sau có thể gắn logic tầng khóa, kiểm soát truy cập hoặc rule đặc biệt.

Khả năng hiển thị:

- danh sách nút tầng,
- trạng thái gọi thành công/thất bại,
- thông báo tầng bị khóa hoặc tầng không khả dụng.

### 8.4 `SOS`

Mục đích:

- cho người dùng gửi tín hiệu khẩn cấp nhanh.

Khả năng hiển thị:

- nút SOS lớn,
- trạng thái gửi cảnh báo,
- thông báo xác nhận hoặc cảnh báo khẩn cấp đã kích hoạt.

### 8.5 `Maintenance`

Mục đích:

- là giao diện kỹ thuật,
- phục vụ debug agent/backend,
- có thể dùng cho bảo trì, theo dõi trace, session, response nguồn dữ liệu.

Khả năng hiển thị:

- console kỹ thuật,
- session trace,
- log tool calling,
- citations hoặc debug info,
- thông tin mà màn Assistant cho khách hàng sẽ không hiển thị.

### 8.6 `AgentTracePanel`

Mục đích:

- tách phần trace kỹ thuật khỏi giao diện người dùng cuối,
- hỗ trợ kỹ thuật viên hoặc người phát triển khi kiểm tra agent.

Khả năng hiển thị:

- bước suy luận của agent ở dạng an toàn,
- tool trace,
- nguồn dữ liệu sử dụng,
- session state hoặc debug panel.

---

## 9) Mối quan hệ giữa frontend mới và frontend cũ

Theo tài liệu dự án, hệ thống của bạn có dấu hiệu tồn tại song song:

- **frontend build mới** theo hướng `dist` / React / Vite,
- **frontend source cũ hoặc legacy** theo hướng `gui/web/index.html`, `pages/*`, `static/*`.

Điều này rất quan trọng cho chatbot khác hiểu đúng:

- bộ file frontend bạn vừa gửi **nghiêng về frontend mới**,
- nhưng tài liệu dự án cho thấy project tổng thể **vẫn có lớp UI cũ song song**,
- vì vậy không được giả định project chỉ có một bộ giao diện duy nhất.

---

## 10) Những gì chưa thể xác minh 100% từ gói hiện tại

Các điểm sau **chưa thể khẳng định bằng mã nguồn React thật**, vì thư mục `src/` chưa có trong gói upload:

1. Router thật đang định nghĩa route nào.
2. `main.jsx` đang render component nào.
3. Có dùng `BrowserRouter`, `HashRouter` hay router kiểu khác.
4. `Assistant.jsx`, `Home.jsx`, `CallFloor.jsx`, `SOS.jsx`, `Maintenance.jsx` có đúng tên file đó không.
5. `AgentTracePanel` hiện đang nằm ở maintenance hay nhúng trong trang khác.
6. Service layer gọi backend bằng endpoint nào chính xác.
7. Có state management riêng hay không.
8. Có CSS module, plain CSS, Tailwind hay component library nào khác hay không.

---

## 11) Kết luận rất ngắn gọn để chatbot khác hiểu đúng

Nếu gửi tài liệu này cho chatbot khác, hãy hiểu project frontend hiện tại theo cách sau:

- Đây là **khung của một app React/Vite mới** cho Sunybot Smart Elevator.
- Gói upload hiện tại **mới xác minh được phần shell build**, chưa có đầy đủ `src/` để đọc logic từng trang.
- Từ tài liệu dự án, giao diện được định hướng có ít nhất các màn hình:
  - Home
  - Assistant
  - CallFloor
  - SOS
  - Maintenance
- Có dấu hiệu frontend được **tách theo 2 vai trò**:
  - UI cho người dùng cuối
  - UI cho kỹ thuật viên/bảo trì
- Không nên mô tả quá chắc những gì nằm trong `src/` nếu chưa có source thật đi kèm.

---

## 12) Prompt ngắn để gửi kèm cho chatbot khác

Bạn có thể gửi kèm đoạn này:

```text
Hãy dùng file Markdown này làm mô tả chuẩn cho frontend hiện tại của project Sunybot Smart Elevator.
Lưu ý rằng bộ file tôi gửi mới là khung Vite/React và tài liệu mô tả dự án, chưa có đầy đủ thư mục src.
Khi phân tích hoặc đề xuất sửa frontend, hãy:
1) tách rõ phần nào đã xác minh từ file thật,
2) phần nào chỉ suy ra từ tài liệu,
3) không giả định đã có đầy đủ source nếu tôi chưa gửi src,
4) nếu cần sửa giao diện React, hãy chỉ ra chính xác các file src cần có hoặc cần bổ sung.
```

---

## 13) Đề xuất nâng cấp tài liệu sau bước này

Để tài liệu này trở thành hồ sơ frontend hoàn chỉnh hơn nữa, lần upload tiếp theo nên có thêm:

- `src/main.jsx`
- `src/App.jsx` hoặc file router chính
- `src/pages/*`
- `src/components/*`
- `src/services/api.js`
- CSS hoặc asset chính

Khi đó có thể tạo tiếp một bản `.md` cấp 2 mô tả:

- từng màn hình thực sự render gì,
- route map đầy đủ,
- component tree,
- luồng gọi API giữa frontend và backend,
- file nào bắt buộc sửa nếu đổi Home/Assistant/SOS/Maintenance.
