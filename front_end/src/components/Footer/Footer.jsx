import React from "react";
import "./Footer.css";

import footer_logo from "../../assets/icon.png";

const Footer = () => {
  return (
    <div className="footer">
      <div className="footer_decripstion">
        <p>
          Truyện dịch là nền tảng mở trực tuyến để dịch thuật, chuyển đổi các
          truyện từ tiếng nước ngoài sang tiếng Việt một cách nhanh chóng và
          thuận tiện
        </p>
      </div>
      <div className="footer-logo">
        <img src={footer_logo} alt="" />
      </div>
      <ul className="footer-links">
        <li>Điều khoản dịch vụ</li>
        <li>Chính sách bảo mật</li>
        <li>Về bản quyền</li>
        <li>Hướng dẫn sử dụng</li>
        <li>Liên hệ</li>
      </ul>
      <div className="footer-copyright">
        <hr />
        <p>Copyright @ 2025 - All Right Reserved.</p>
      </div>
    </div>
  );
};
export default Footer;
