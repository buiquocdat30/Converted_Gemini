import React, { useContext } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "../context/ConverteContext";
import "./pageCSS/Home.css";

const Home = () => {
  const { menu, setMenu } = useContext(AuthContext);
  return (
    <div className="home-container">
      <h1 className="home-title">📖 Hướng Dẫn Sử Dụng</h1>

      <div className="step">
        <h2>📝 Bước 1: Đọc hướng dẫn</h2>
        <p>Hãy đọc kỹ hướng dẫn trước khi bắt đầu sử dụng công cụ.</p>
        <p className="link">📺 Xem video hướng dẫn</p>
      </div>

      <div className="step">
        <h2>📂 Bước 2: Nhập và kiểm tra File</h2>
        <p>
          Hệ thống chỉ hỗ trợ định đạng có sẵn phù hợp hệ thống, nếu không sẽ
          không tiến hành dịch được:
        </p>
        <p>Để kiếm tra xem định dạng bạn đã đúng chưa vui lòng chọn phần</p>
        <div onClick={() => setMenu("converte")}>
          <Link style={{ textDecoration: "none" }} to="/converte">
            Chuyển đổi
          </Link>
          {menu === "converte" ? <hr /> : <></>}
        </div>
      </div>
      <div className="step">
        <h2>📂 Bước 3: Nhập thêm từ điển</h2>
        <p>
          Hệ thống sẽ thêm các từ trong từ điển vào trong phần dịch phù hợp với
          định dạng dịch
        </p>
        <p>Nếu để trống hệ thống mặc định không sử dụng từ điển</p>
        <div onClick={() => setMenu("dictionary")}>
          <Link style={{ textDecoration: "none" }} to="/dictionary">
            Từ điển
          </Link>
          {menu === "dictionary" ? <hr /> : <></>}
        </div>
      </div>

      <div className="step">
        <h2>📂 Bước 4: Nhập File</h2>
        <p>Hệ thống hỗ trợ các định dạng sau:</p>
        <ul>
          <li>📜 TXT (Văn bản thuần)</li>
          <li>📖 EPUB (Sách điện tử)</li>
          {/* <li>🌍 Lấy trực tiếp từ metruyenchu</li> */}
          <li onClick={() => setMenu("translate")}>
            <Link style={{ textDecoration: "none" }} to="/translate">
              Dịch
            </Link>
            {menu === "translate" ? <hr /> : <></>}
          </li>
        </ul>
      </div>

      <div className="step">
        <h2>⚙️ Bước 5: Cài đặt AI</h2>
        <p>Tùy chỉnh các thông số để phù hợp với nhu cầu:</p>
        <ul>
          <li>🤖 Chọn Model AI</li>
          <li>🔑 Nhập API Key (mã khóa AI)</li>
          <li onClick={() => setMenu("translate")}>
            <Link style={{ textDecoration: "none" }} to="/translate">
              Dịch
            </Link>
            {menu === "translate" ? <hr /> : <></>}
          </li>
        </ul>
      </div>

      <div className="step">
        <h2>📤 Bước 4: Xuất File</h2>
        <p>Bắt đầu dịch và tải file dưới định dạng:</p>
        <ul>
          <li>📥 EPUB (Sách điện tử)</li>
          <li>📥 TXT (Văn bản thuần)</li>
        </ul>
      </div>
    </div>
  );
};

export default Home;
