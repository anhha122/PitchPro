# Đối chiếu quy trình To-Be ↔ thiết kế giao diện

Bảng này phân biệt **đã mô phỏng ở FE** với các bước **cần backend/quy trình thật**. Nguồn nghiệp vụ: BTH3.1 và BTH3.2; BTH2.4 dùng để tham chiếu As-Is.

| Hoạt động trong tài liệu nhóm | Màn hình / tính năng FE | Trạng thái |
|---|---|---|
| **Quy trình 1 — Tạo hóa đơn nháp khi lượt thuê bắt đầu** | Tạo hóa đơn nháp ngay khi đặt, gắn mã lượt duy nhất; giữ ở trạng thái nháp cho tới khi trả sân | Mô phỏng FE (thời điểm tạo nháp sớm hơn bước bắt đầu thuê để hỗ trợ chuẩn bị) |
| Ghi nhận trả sân, chốt hóa đơn | Nút Nhận sân → Trả sân / chốt; phân biệt `booked`, `using`, `completed` | Mô phỏng FE; cần tín hiệu thực tế từ nhân viên |
| Tính tổng tiền và khấu trừ cọc | Tính giá sân theo giờ + sản phẩm; chỉ khấu trừ cọc đã ghi phiếu thu | Mô phỏng FE; giá mẫu và cần Business Rule ở backend |
| Tất toán bằng cọc đủ điều kiện | Trả sân khi số dư đã thu đủ thì hoàn tất mà không tạo thêm dòng thu | Mô phỏng FE; cần backend kiểm tra khoản chờ và bất biến dữ liệu |
| Phát hành hóa đơn, ghi nhật ký | Chỉ hiện thao tác in cho hóa đơn `paid` và có nhật ký thao tác | Mô phỏng FE; chưa phát hành hóa đơn điện tử hợp lệ |
| **Sub-process mua sản phẩm** | Kiểm tồn, báo lỗi vượt tồn, trừ số lượng và thêm vào invoice line | Mô phỏng FE; chưa có transaction nguyên tử CSDL |
| **Call Activity thanh toán** | Tạo mã tham chiếu QR demo, chờ; xác minh chứng từ mới ghi nhận; tiền mặt nhập tiền thực đếm | Mô phỏng FE; không có API ngân hàng/callback/chữ ký |
| Nhắc thanh toán quá hạn | Có trạng thái chờ để theo dõi | Chưa làm gửi thông báo tự động và timer backend |
| Đối soát giao dịch lỗi | Hiện yêu cầu giải trình ở ngoại lệ, trạng thái chờ người xử lý | Chưa tích hợp AI hỗ trợ |
| **Event Sub-process hủy** | Hủy hóa đơn chưa thu; nếu đã thu thì tạo yêu cầu hoàn tiền, duyệt, ghi phiếu hoàn âm | Mô phỏng FE; chính sách hủy/hoàn cần kiểm định và quyền server-side |
| **Quy trình 2 — Chốt phạm vi giao dịch trong ngày** | Tạo kỳ đối soát ngày, ghi phiên; chặn nhận thu/chi mới ngày khóa | Mô phỏng FE; backend cần snapshot bất biến và kiểm soát kỳ thật |
| Tổng hợp và phân loại theo phương thức | Tính tổng từ các dòng thu/hoàn được ghi nhận theo ngày, tách `cash`, `bank` | Mô phỏng FE; backend cần SQL và dữ liệu giao dịch gốc |
| Liệt kê giao dịch treo | Bảng hóa đơn có `awaiting` và `qr_pending` | Mô phỏng FE; chưa có dữ liệu ngân hàng tự đồng bộ |
| Gửi yêu cầu dữ liệu ngân hàng | Không có API ở bản FE | Chưa thực hiện |
| Đối chiếu chuyển khoản | Nhân viên nhập số thực tế sau khi đối chiếu ngoài hệ thống | Mô phỏng thủ công; chưa so khớp danh sách giao dịch từ ngân hàng |
| Kiểm đếm tiền mặt | Nhân viên nhập số kiểm đếm; hệ thống không tự giả định số tiền vật lý | Mô phỏng FE; xác nhận 2 người tùy chính sách chưa làm |
| So sánh, tạo báo cáo đối soát | Bảng expected/actual, chênh lệch theo phương thức, xuất CSV | Mô phỏng FE |
| **Call Activity xử lý chênh lệch** | Tạo case, giải trình, yêu cầu cập nhật dữ liệu đến khi khớp, quản lý xác nhận | Mô phỏng FE; chưa hỗ trợ đọc chứng từ tự động bằng AI |
| Phê duyệt báo cáo và khóa sổ | Đổi vai trò demo, phê duyệt chỉ khi khớp và hết case, rồi khóa sổ | Mô phỏng FE; phân quyền trên client không đủ an toàn |
| Nhắc quá hạn quản lý duyệt | Không có chức năng gửi nhắc | Chưa thực hiện |

## Quy tắc kiểm soát quan trọng cho hệ thống triển khai thật

1. **Tiền cọc**: ước tính phải thu ≠ tiền đã thu. Lưu từng lần thu cọc và chỉ trừ vào số phải trả khi có trạng thái xác minh hợp lệ.
2. **Chuyển khoản**: QR/payment intent chỉ khởi tạo yêu cầu. Backend phải kiểm chữ ký callback, số tiền, người nhận, mã tham chiếu và idempotency trước khi chuyển sang `paid`.
3. **Tiền mặt**: cần nhân viên thực hiện kiểm đếm thực tế, ghi số đếm, người thu và xác nhận; không tự đánh dấu thành công.
4. **Kho hàng**: kiểm tồn và thay đổi hóa đơn/tồn kho trong transaction, tránh bán quá tồn hoặc ghi trùng khi nhiều nhân viên thao tác.
5. **Ngoại lệ**: nhân viên cung cấp lý do và chứng từ; quản lý phê duyệt. Không tự điều chỉnh chênh lệch hoặc tự quyết định hoàn tiền bằng AI.
6. **Khóa sổ**: phải có bản đối soát khớp và phê duyệt hợp lệ; sau khóa sổ không sửa dữ liệu lịch sử trái phép. Nếu có bút toán bổ sung sau khóa sổ, thực hiện quy trình điều chỉnh riêng.

## Chỉ số mô phỏng trong báo cáo (không phải KPI của FE)

| Chỉ số | Quy trình 1 | Quy trình 2 |
|---|---:|---:|
| Cycle Time As-Is (trung bình) | 15,37 phút | 40,00 phút |
| Cycle Time To-Be (trung bình) | 4,60 phút | 12,90 phút |
| Tỷ lệ giảm mô phỏng | 70,07% | 67,75% |
| Lượt hoàn thành mỗi kịch bản | 100 | 100 |

**Lưu ý:** Điều kiện chạy kịch bản chưa xác nhận đồng nhất hoàn toàn, 0 EUR là chưa khai báo chi phí, không phải chi phí triển khai bằng 0.
