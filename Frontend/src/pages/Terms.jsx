import React, { useState, useEffect, useRef } from "react";
import "./Terms.css";

const SECTIONS = [
    { id: "section-1", title: "1. Chấp nhận điều khoản" },
    { id: "section-2", title: "2. Chính sách tài khoản người dùng" },
    { id: "section-3", title: "3. Chính sách ví điện tử" },
    { id: "section-4", title: "4. Chính sách nạp tiền vào ví" },
    { id: "section-5", title: "5. Chính sách đặt sân và giữ chỗ" },
    { id: "section-6", title: "6. Chính sách hủy đặt sân bởi người dùng" },
    { id: "section-7", title: "7. Chính sách hủy đặt sân bởi chủ sân" },
    { id: "section-8", title: "8. Chính sách hoàn tiền" },
    { id: "section-9", title: "9. Chính sách đánh giá sân" },
    { id: "section-10", title: "10. Chính sách báo cáo và khiếu nại" },
    { id: "section-11", title: "11. Chính sách chống gian lận" },
    { id: "section-12", title: "12. Chính sách bảo mật dữ liệu" },
    { id: "section-13", title: "13. Giới hạn trách nhiệm" },
];

const Terms = () => {
    const [active, setActive] = useState(SECTIONS[0].id);
    const observerRef = useRef(null);

    useEffect(() => {
        const onHash = () => {
            const hash = window.location.hash.replace("#", "");
            if (hash) setActive(hash);
        };

        const options = { root: null, rootMargin: "0px 0px -60% 0px", threshold: [0.1, 0.5] };
        const callback = (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) setActive(entry.target.id);
            });
        };

        const observer = new IntersectionObserver(callback, options);
        observerRef.current = observer;
        SECTIONS.forEach((s) => {
            const el = document.getElementById(s.id);
            if (el) observer.observe(el);
        });

        window.addEventListener("hashchange", onHash);
        onHash();

        return () => {
            observer.disconnect();
            window.removeEventListener("hashchange", onHash);
        };
    }, []);

    const filtered = SECTIONS;

    const scrollTo = (id) => {
        const el = document.getElementById(id);
        if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "start" });
            setActive(id);
            window.history.replaceState(null, "", `#${id}`);
        }
    };

    return (
        <div className="terms-page">
            <div className="terms-layout">
                <aside className="terms-sidebar" aria-label="Danh mục điều khoản">
                    <div className="sidebar-inner">
                        <nav aria-label="Mục điều khoản">
                            <ul className="sidebar-list">
                                {filtered.map((s) => (
                                    <li key={s.id} className={active === s.id ? "active" : ""}>
                                        <button type="button" onClick={() => scrollTo(s.id)}>
                                            {s.title}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </nav>
                    </div>
                </aside>

                <main className="terms-container terms-content">
                    <h1>CHÍNH SÁCH SỬ DỤNG HỆ THỐNG ĐẶT SÂN THỂ THAO FIEBO</h1>

                    <p>
                        Chào mừng bạn đến với Fiebo. Vui lòng đọc kỹ các điều khoản dưới đây
                        trước khi sử dụng dịch vụ.
                    </p>

                    <section id="section-1">
                        <h2>1. Chấp nhận điều khoản</h2>
                        <p>
                            Khi đăng ký tài khoản và sử dụng hệ thống đặt sân thể thao, người
                            dùng được xem là đã đọc, hiểu và đồng ý tuân thủ toàn bộ các điều
                            khoản và chính sách của hệ thống.
                        </p>
                        <p>
                            Người dùng phải cung cấp thông tin chính xác, đầy đủ và hợp lệ khi
                            đăng ký tài khoản. Hệ thống có quyền tạm khóa, hạn chế hoặc chấm
                            dứt tài khoản nếu phát hiện thông tin sai lệch, gian lận hoặc hành
                            vi vi phạm chính sách.
                        </p>
                        <p>
                            Hệ thống có quyền cập nhật, sửa đổi hoặc bổ sung các điều khoản và
                            chính sách khi cần thiết nhằm đảm bảo hoạt động ổn định của hệ
                            thống. Người dùng có trách nhiệm theo dõi các cập nhật này và
                            tiếp tục sử dụng hệ thống đồng nghĩa với việc chấp nhận các thay
                            đổi.
                        </p>
                    </section>

                    <section id="section-2">
                        <h2>2. Chính sách tài khoản người dùng</h2>
                        <p>Mỗi người dùng chỉ được phép tạo một tài khoản cá nhân trong hệ thống.</p>
                        <p>
                            Người dùng phải chịu trách nhiệm bảo mật thông tin đăng nhập
                            bao gồm email, số điện thoại, mật khẩu và mã OTP. Người dùng không
                            được chia sẻ tài khoản với người khác.
                        </p>
                        <p>Hệ thống có quyền khóa hoặc hạn chế tài khoản trong các trường hợp sau:</p>
                        <ul>
                            <li>Gian lận thanh toán</li>
                            <li>Lạm dụng mã khuyến mãi hoặc coupon</li>
                            <li>Tạo nhiều tài khoản để trục lợi</li>
                            <li>Hành vi gây ảnh hưởng đến hệ thống hoặc người dùng khác</li>
                            <li>Vi phạm quy định pháp luật</li>
                        </ul>
                    </section>

                    <section id="section-3">
                        <h2>3. Chính sách ví điện tử</h2>
                        <p>Mỗi tài khoản người dùng sẽ được cấp một ví điện tử trong hệ thống.</p>
                        <p>
                            Ví điện tử được sử dụng để thực hiện các giao dịch như:
                        </p>
                        <ul>
                            <li>Thanh toán đặt sân</li>
                            <li>Nhận hoàn tiền từ các giao dịch bị hủy</li>
                        </ul>
                        <p>
                            Tất cả các giao dịch liên quan đến ví bao gồm nạp tiền, thanh toán,
                            hoàn tiền và rút tiền đều được ghi nhận trong lịch sử giao dịch
                            nhằm đảm bảo tính minh bạch.
                        </p>
                        <p>Người dùng có thể xem lịch sử giao dịch ví trong phần quản lý tài khoản.</p>
                        <p>Số tiền nạp phải nằm trong khoảng:</p>
                        <ul>
                            <li>10,000 VND → 10,000,000 VND</li>
                        </ul>
                        <p>Mỗi yêu cầu nạp tiền phải có nội dung chuyển khoản duy nhất để đối soát.</p>
                    </section>

                    <section id="section-4">
                        <h2>4. Chính sách nạp tiền vào ví</h2>
                        <p>Người dùng có thể nạp tiền vào ví điện tử thông qua các phương thức thanh toán được hệ thống hỗ trợ.</p>
                        <p>Sau khi giao dịch nạp tiền thành công:</p>
                        <ul>
                            <li>Số dư ví sẽ được cập nhật ngay lập tức</li>
                            <li>Một bản ghi giao dịch sẽ được lưu trong lịch sử giao dịch ví</li>
                        </ul>
                        <p>
                            Trong trường hợp giao dịch nạp tiền thất bại do lỗi từ bên thứ ba
                            hoặc do người dùng nhập sai thông tin, hệ thống không chịu
                            trách nhiệm cho các thiệt hại phát sinh.
                        </p>
                    </section>

                    <section id="section-5">
                        <h2>5. Chính sách đặt sân và giữ chỗ</h2>
                        <p>Người dùng có thể tìm kiếm và xem thông tin sân mà không cần đăng nhập.</p>
                        <p>Người dùng chỉ có thể đặt các khung giờ trong tương lai.</p>
                        <p>Để đặt sân, người dùng phải đăng nhập và thực hiện các bước sau:</p>
                        <ul>
                            <li>Chọn sân muốn đặt</li>
                            <li>Chọn ngày và khung giờ còn trống</li>
                            <li>Xác nhận thông tin đặt sân</li>
                            <li>Thanh toán bằng ví điện tử</li>
                        </ul>
                        <p>
                            Một đặt sân chỉ được xác nhận khi thanh toán thành công và sau khi
                            được chủ sân xác nhận. Nếu thanh toán không thành công, hệ thống
                            sẽ không giữ khung giờ đã chọn và khung giờ đó có thể được đặt
                            bởi người dùng khác.
                        </p>
                        <p>
                            Khi người dùng tiến hành thanh toán cho đặt sân, hệ thống có thể
                            tạm giữ khung giờ trong 5 phút để người dùng hoàn tất thanh toán.
                            Nếu người dùng không hoàn tất thanh toán trong thời gian giữ chỗ,
                            khung giờ sẽ được giải phóng và có thể được đặt bởi người dùng khác.
                        </p>
                    </section>

                    <section id="section-6">
                        <h2>6. Chính sách hủy đặt sân bởi người dùng</h2>
                        <p>
                            Người dùng có quyền hủy đặt sân trước khi khung giờ đặt sân bắt
                            đầu. Mức hoàn tiền sẽ được tính dựa trên khoảng thời gian giữa
                            thời điểm hủy và thời điểm bắt đầu đặt sân. Tiền hoàn sẽ được trả
                            về ví điện tử của người dùng.
                        </p>
                        <p>Thời gian hủy trước giờ bắt đầu — Mức hoàn tiền:</p>
                        <div className="table-responsive">
                            <table className="refund-table" role="table" aria-label="Bảng mức hoàn tiền">
                                <thead>
                                    <tr>
                                        <th>Thời gian hủy trước giờ bắt đầu</th>
                                        <th>Mức hoàn tiền</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>Trên 24 giờ</td>
                                        <td>100%</td>
                                    </tr>
                                    <tr>
                                        <td>Từ 12 giờ đến dưới 24 giờ</td>
                                        <td>70%</td>
                                    </tr>
                                    <tr>
                                        <td>Từ 6 giờ đến dưới 12 giờ</td>
                                        <td>50%</td>
                                    </tr>
                                    <tr>
                                        <td>Dưới 6 giờ</td>
                                        <td>0%</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </section>

                    <section id="section-7">
                        <h2>7. Chính sách hủy đặt sân bởi chủ sân</h2>
                        <p>Trong một số trường hợp đặc biệt, chủ sân có thể hủy đặt sân do:</p>
                        <ul>
                            <li>Sự cố kỹ thuật</li>
                            <li>Điều kiện thời tiết không phù hợp</li>
                            <li>Sân không thể sử dụng</li>
                        </ul>
                        <p>Trong trường hợp này, người dùng sẽ được hoàn lại 100% số tiền đã thanh toán.</p>
                        <p>
                            <strong>Chính sách không đến sân:</strong> Nếu người dùng không đến
                            sân và không thực hiện hủy đặt sân trước thời gian quy định,
                            đặt sân sẽ được xem là đã sử dụng và người dùng sẽ không được
                            hoàn tiền.
                        </p>
                    </section>

                    <section id="section-8">
                        <h2>8. Chính sách hoàn tiền</h2>
                        <p>Mọi khoản hoàn tiền trong hệ thống sẽ được xử lý theo nguyên tắc sau:</p>
                        <ul>
                            <li>Hoàn tiền chỉ được thực hiện vào ví điện tử trong hệ thống</li>
                            <li>Hệ thống không hoàn tiền trực tiếp về tài khoản ngân hàng hoặc phương thức thanh toán ban đầu</li>
                        </ul>
                        <p>Thời gian xử lý hoàn tiền có thể từ vài phút đến tối đa 24 giờ tùy vào hệ thống xử lý.</p>
                        <p>Quy định hủy tự động nếu chủ sân chưa xác nhận:</p>
                        <ul>
                            <li>Thời gian đặt &lt; 1 giờ trước giờ chơi → hủy ngay khi bắt đầu</li>
                            <li>Thời gian đặt &lt; 24 giờ → hủy trước 1 giờ</li>
                            <li>Thời gian đặt trên 24 giờ → hủy sau 12 giờ từ lúc tạo</li>
                        </ul>
                        <p>Khi bị hủy:</p>
                        <ul>
                            <li>Slot được giải phóng</li>
                            <li>Tiền được hoàn về ví</li>
                            <li>Gửi thông báo cho người dùng</li>
                        </ul>
                    </section>

                    <section id="section-9">
                        <h2>9. Chính sách đánh giá sân</h2>
                        <p>
                            Sau khi thời gian đặt sân kết thúc, người dùng có thể gửi đánh giá về
                            sân đã sử dụng. Mỗi đặt sân chỉ được phép gửi một đánh giá duy
                            nhất.
                        </p>
                        <p>Đánh giá có thể bao gồm:</p>
                        <ul>
                            <li>Điểm đánh giá</li>
                            <li>Nội dung nhận xét</li>
                            <li>Hình ảnh minh họa</li>
                        </ul>
                        <p>Nội dung đánh giá không được chứa:</p>
                        <ul>
                            <li>Nội dung xúc phạm</li>
                            <li>Nội dung quảng cáo</li>
                            <li>Spam</li>
                            <li>Nội dung vi phạm pháp luật</li>
                        </ul>
                        <p>Hệ thống có quyền xóa các đánh giá vi phạm chính sách.</p>
                    </section>

                    <section id="section-10">
                        <h2>10. Chính sách báo cáo và khiếu nại</h2>
                        <p>Người dùng có thể gửi báo cáo hoặc khiếu nại liên quan đến:</p>
                        <ul>
                            <li>Chất lượng sân</li>
                            <li>Dịch vụ tại địa điểm</li>
                            <li>Sự cố đặt sân</li>
                            <li>Vấn đề thanh toán</li>
                        </ul>
                        <p>
                            Bộ phận chăm sóc khách hàng sẽ xem xét và xử lý các báo cáo trong
                            thời gian sớm nhất. Hệ thống có quyền yêu cầu người dùng cung cấp
                            thêm thông tin hoặc bằng chứng để xác minh khiếu nại.
                        </p>
                    </section>

                    <section id="section-11">
                        <h2>11. Chính sách chống gian lận</h2>
                        <p>Hệ thống có quyền kiểm tra và xử lý các hành vi gian lận bao gồm:</p>
                        <ul>
                            <li>Gian lận thanh toán</li>
                            <li>Lạm dụng mã khuyến mãi</li>
                            <li>Tạo nhiều tài khoản để nhận ưu đãi</li>
                            <li>Lợi dụng lỗi hệ thống</li>
                        </ul>
                        <p>Trong các trường hợp này, hệ thống có quyền:</p>
                        <ul>
                            <li>Tạm khóa tài khoản</li>
                            <li>Hủy giao dịch</li>
                            <li>Thu hồi ưu đãi</li>
                            <li>Chấm dứt tài khoản vĩnh viễn</li>
                        </ul>
                    </section>

                    <section id="section-12">
                        <h2>12. Chính sách bảo mật dữ liệu</h2>
                        <p>Hệ thống cam kết bảo vệ thông tin cá nhân của người dùng. Thông tin cá nhân bao gồm:</p>
                        <ul>
                            <li>Họ tên</li>
                            <li>Email</li>
                            <li>Số điện thoại</li>
                            <li>Lịch sử giao dịch</li>
                        </ul>
                        <p>
                            Các thông tin này chỉ được sử dụng để phục vụ cho hoạt động của hệ
                            thống và không được chia sẻ cho bên thứ ba nếu không có sự đồng ý
                            của người dùng, trừ khi có yêu cầu từ cơ quan pháp luật.
                        </p>
                    </section>

                    <section id="section-13">
                        <h2>13. Giới hạn trách nhiệm</h2>
                        <p>
                            Hệ thống đóng vai trò là nền tảng trung gian kết nối người dùng và
                            chủ sân.
                        </p>
                        <p>
                            Hệ thống không chịu trách nhiệm đối với các vấn đề phát sinh từ phía địa điểm thể thao ngoài phạm vi quản lý của nền tảng.
                        </p>
                        <p>
                            Trong trường hợp xảy ra tranh chấp, hệ thống sẽ hỗ trợ các bên
                            liên quan giải quyết dựa trên chính sách và quy định của hệ thống.
                        </p>
                    </section>
                </main>
            </div>
        </div>
    );
};

export default Terms;
