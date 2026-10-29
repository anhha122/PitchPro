# PitchPro – Frontend quản lý sân bóng theo quy trình To-Be

Đây là bản thiết kế lại FE từ `san_bong.zip` ban đầu, dựa trên 3 tài liệu nhóm cung cấp:

- `BTH2.4.docx`: quy trình As-Is và thống kê mô phỏng.
- `BTH-3.1.docx`: hai quy trình To-Be và kết quả mô phỏng BIMP.
- `BTH3.2.docx`: lựa chọn tác vụ, mức tự động hóa và biện pháp kiểm soát.

## 1. Cách chạy

Không cần cài Node.js hoặc thư viện JS. Mở `index.html` bằng trình duyệt hiện đại (Chrome, Edge). Nếu trình duyệt giới hạn lưu dữ liệu khi dùng giao thức `file://`, nên chạy máy chủ tĩnh tại thư mục này:

```powershell
cd duong-dan-toi-thu-muc-FE
python -m http.server 8000
```

Truy cập `http://localhost:8000`. Phần lớn các thao tác mẫu được lưu vào `localStorage` theo trình duyệt hiện tại; có thể khôi phục dữ liệu ở **Nhật ký thao tác → Khôi phục dữ liệu demo**.

### Cấu trúc

```text
index.html             # Trang chính + thanh điều hướng (SPA)
assets/styles.css      # Thiết kế giao diện responsive
assets/app.js          # Mô phỏng nghiệp vụ và trạng thái
pitch_list.html        # Chuyển hướng từ đường dẫn FE cũ sang trang lịch sân mới
comnunity.html         # Module cộng đồng cũ, giữ độc lập (ngoài phạm vi 2 quy trình)
legacy/                # Bản gốc base.html, pitch_list.html, comnunity.html trước chỉnh sửa
base.html              # Layout Jinja/Django cũ, giữ tham khảo (không dùng bởi FE mới)
css/calendar.css       # Tệp từ FE gốc (ban đầu rỗng)
js/lich.js             # Tệp từ FE gốc (ban đầu rỗng)
QUY_TRINH_THIET_KE.md  # Đối chiếu từng màn hình với To-Be
```

## 2. Luồng thử nghiệp vụ chính

**Quy trình 1 – Xử lý dịch vụ và thanh toán**

1. `Lịch & đặt sân` → tạo lượt đặt → hệ thống sinh hóa đơn nháp và chặn trùng lịch.
2. `Hóa đơn & thanh toán` → mở hóa đơn → `Ghi nhận tiền cọc` nếu có; cọc dự kiến không tự tính là đã nhận.
3. `Kho & dịch vụ` hoặc `Bán sản phẩm` → kiểm tra tồn kho rồi gộp hàng hóa vào hóa đơn.
4. `Nhận sân` → `Trả sân / chốt` → hệ thống tính tổng, trừ **cọc thực thu** đã ghi nhận.
5. Thanh toán tiền mặt yêu cầu kiểm đếm và bấm xác nhận. Với QR, hệ thống chỉ sinh **mã yêu cầu demo**, trạng thái vẫn là **Chờ đối soát**; nhân viên nhập mã chứng từ thực tế sau khi kiểm chứng mới ghi nhận hoàn tất.
6. Khi hủy lượt có tiền đã thu, lập yêu cầu hoàn → nhân viên giải trình → chọn vai trò `Quản lý` để phê duyệt → xác nhận **đã thực sự hoàn tiền** với mã chứng từ. Phiếu hoàn được ghi là dòng tiền âm.

**Quy trình 2 – Tổng hợp và đối soát**

1. `Đối soát cuối ngày` → chọn ngày → `Tạo / cập nhật đối soát`.
2. Hệ thống tổng hợp các phiếu **thu/hoàn theo ngày thực nhận**, phân loại tiền mặt và chuyển khoản.
3. Nhân viên nhập **số tiền mặt kiểm đếm** và **số tiền ngân hàng đã đối chiếu thực tế**.
4. Nếu có chênh lệch → `Yêu cầu & ngoại lệ` → bổ sung giải trình/chứng từ → sửa lại số kiểm đếm hoặc đối soát ở nguồn → quản lý xác nhận hết chênh lệch.
5. Chuyển vai trò `Quản lý` → phê duyệt báo cáo → khóa sổ. Chặn thao tác thu/chi mới vào ngày đã khóa trong phạm vi bản demo.
6. Xuất dữ liệu khoản thu đối soát CSV hoặc nhật ký thao tác CSV.

### Tình huống thử nhanh

- Mẫu có **8 sân**, 5 sân 5 người và 3 sân 7 người như FE cũ.
- Có các lượt đặt hôm nay, lượt thanh toán ngày trước, hóa đơn nháp và tiền cọc đã thu mẫu.
- Có thể thử **chặn đặt sân trùng**, **bán quá tồn kho**, **không cho duyệt chênh lệch**, **phân biệt nhân viên/quản lý**, **không hoàn tất QR khi chưa xác minh**, **không ghi nhận trùng mã ngân hàng**.

## 3. Ranh giới demo – KHÔNG phải hệ thống thương mại đã hoàn chỉnh

- **Chưa có backend**, API, database, đăng nhập, phân quyền ở phía máy chủ, hoặc tính nguyên tử của giao dịch. Đổi vai trò tại header **chỉ là mô phỏng**. Không dùng FE này để thu tiền thật hoặc chốt số liệu thật.
- **Chưa kết nối ngân hàng**, không tạo mã QR chuyển tiền thật, không có webhook/callback ngân hàng, chữ ký xác thực, chính sách chống gọi lặp. Với giao dịch chuyển khoản, frontend chỉ cho phép *ghi nhận nhân viên đã kiểm chứng bên ngoài*.
- **Chưa tích hợp AI** để gợi ý nguyên nhân sai lệch / chính sách hủy; các trường ghi chú là thao tác con người. Theo BTH3.2, AI chỉ nên gợi ý, không có quyền quyết định thu tiền/hoàn tiền/sửa sổ.
- **Chưa thực hiện kiểm soát đồng thời** hoặc ghi đa bảng nguyên tử theo tiêu chuẩn vận hành. Cần backend đảm trách tồn kho, tính cọc, thanh toán, so khớp ngân hàng, nhật ký chống sửa, đóng kỳ và phê duyệt.
- **Giá sân, giá bán, số lượng tồn kho là dữ liệu mẫu giả định** (không lấy từ tài liệu quy trình). Quy tắc cọc 40/50/60% kế thừa FE cũ để minh họa; cần nhóm xác nhận chính sách thật.
- **BIMP** trong BTH3.1 mô phỏng 100 lượt mỗi kịch bản: quy trình 1 As-Is 15,37 → To-Be 4,60 phút, quy trình 2 40,00 → 12,90 phút. Điều kiện mô phỏng chưa được xác nhận hoàn toàn đồng nhất; **không phải hiệu suất đo được của bản FE**.
- Đối soát hiện tập trung vào **dòng tiền thu/hoàn theo ngày**. `Doanh thu hóa đơn hoàn tất` được hiển thị riêng để tránh cộng trùng cọc và cần thống nhất quy tắc ghi nhận doanh thu/kế toán trước khi lập báo cáo thực tế.

## 4. Khi nối với backend sau này

Ưu tiên triển khai theo thứ tự: xác thực/role server-side; Booking/Invoice/InvoiceLine; Inventory + InventoryMovement với transaction và khóa; Deposit/Payment/Refund; bank payment intent + xác minh chữ ký callback + idempotency; Reconciliation + source snapshots; AdjustmentCase + approval; AuditLog và đóng sổ chống ghi mới/sửa trái phép.

FE hiện thuần HTML/CSS/JS, có thể dùng làm **prototype giao diện tham chiếu** để chuyển sang React/Vue hoặc tích hợp Django template. Các thao tác nghiệp vụ hiện chưa gọi API, nên khi tích hợp không nên dùng `localStorage` làm nguồn dữ liệu thực.
