import React, { useState, useRef } from "react";
import "../css/App.css";
import ConverteKeyInput from "./ConverteKeyInput";

const UploadForm = ({ onFileParsed }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [apiKey, setApiKey] = useState("");
  const [showGuide, setShowGuide] = useState(false);
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(false); // Thêm trạng thái loading
  const [error, setError] = useState(""); // Thêm trạng thái error

  const fileInputRef = useRef(null);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    const allowedTypes = ["application/epub+zip", "text/plain"];

    if (!allowedTypes.includes(file.type)) {
      alert("❗ Chỉ chấp nhận file .epub hoặc .txt");
      return;
    }

    setSelectedFile(file);
    setLoading(true); // Bắt đầu loading khi upload tệp
    setError(""); // Reset lỗi trước khi xử lý

    const reader = new FileReader();

    reader.onload = async () => {
      let fileContent;

      if (file.type === "application/epub+zip") {
        fileContent = reader.result.split(",")[1]; // base64
      } else {
        fileContent = reader.result;
      }

      try {
        const res = await fetch("http://localhost:8000/api/upload", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fileName: file.name,
            fileContent: fileContent,
          }),
        });

        const contentType = res.headers.get("content-type");

        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(errorText);
        }

        if (contentType && contentType.includes("application/json")) {
          const data = await res.json();
          console.log("✅ Server response:", data);

          if (Array.isArray(data.chapters)) {
            console.log("✅ Số chương:", data.chapters.length);
            setChapters(data.chapters);
          } else {
            console.warn("⚠️ Server không trả về chapters!");
          }
        }
      } catch (err) {
        console.error("❌ Lỗi khi upload file:", err);
        setError("❌ Đã xảy ra lỗi khi tải tệp lên. Vui lòng thử lại.");
      } finally {
        setLoading(false); // Kết thúc loading khi xử lý xong
      }
    };

    if (file.type === "application/epub+zip") {
      reader.readAsDataURL(file);
    } else {
      reader.readAsText(file);
    }
  };

  const handleSubmit = () => {
    if (!selectedFile) {
      alert("📂 Vui lòng chọn tệp trước!");
      return;
    }

    if (!chapters || chapters.length === 0) {
      alert("⏳ File đang xử lý hoặc chưa có nội dung chương.");
      return;
    }

    onFileParsed(chapters, apiKey);
  };

  const checkFileFormatFromText = (text) => {
    const chapterRegex = /^\s*((?:Chương|CHƯƠNG|Chapter|CHAPTER)\s*\d+[^\n]*|第[\d一二三四五六七八九十百千]+章[^\n]*)$/gim; // có thể đổi sang /^(chapter|chương)\s+\d+/i nếu cần hỗ trợ tiếng Việt
    const lines = text.split(/\r?\n/);
    const chapters = [];
    let currentChapter = null;

    lines.forEach((line) => {
      if (chapterRegex.test(line.trim())) {
        if (currentChapter) chapters.push(currentChapter);
        currentChapter = {
          title: line.trim(),
          content: "",
        };
      } else if (currentChapter) {
        currentChapter.content += line + "\n";
      }
    });

    if (currentChapter) chapters.push(currentChapter); // thêm chương cuối cùng

    const valid =
      chapters.length > 0 &&
      chapters.every((ch) => ch.content.trim().length > 0);

    return {
      valid,
      chapters,
      total: chapters.length,
    };
  };

  //hàm kiểm tra xem có đúng định dạng file
  const handleCheckFileFormat = async () => {
    if (!selectedFile) {
      alert("📂 Vui lòng chọn tệp trước.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result;
      const result = checkFileFormatFromText(text);

      if (result.valid) {
        alert(`✅ File hợp lệ! Tổng số chương: ${result.total}`);
      } else {
        alert("❌ File không đúng định dạng chương hoặc thiếu nội dung.");
        setSelectedFile(null); // xoá trong state
        setChapters([]); // xoá dữ liệu chương cũ
        fileInputRef.current.value = ""; // xoá nội dung input file
      }
    };
    reader.readAsText(selectedFile);
  };

  return (
    <div className="wrapper">
      <h2>📘 Gemini Converte</h2>
      <ConverteKeyInput apiKey={apiKey} setApiKey={setApiKey} />
      <div className="notify">
        <small>
          {apiKey
            ? "🔐 Đã nhập API key - Bạn có thể dịch toàn bộ chương."
            : "🔓 Chế độ miễn phí - Chỉ dịch được 2 chương đầu tiên."}
        </small>
      </div>
      <input
        ref={fileInputRef}
        className="converte-file"
        type="file"
        accept=".epub, .txt"
        onChange={handleFileUpload}
      />
      {loading && <p>⏳ Đang xử lý tệp...</p>}{" "}
      {/* Hiển thị thông báo khi đang tải lên */}
      {error && <p style={{ color: "red" }}>{error}</p>}{" "}
      {/* Hiển thị thông báo lỗi nếu có */}
      <div className="chapter-guide">
        <div className="chapter-guide-title">
          <h4>📌 Các định dạng chương được hỗ trợ:</h4>
        </div>
        <div className="chapter-guide-content">
          <ul>
            <li><strong>Chương N</strong> - Ví dụ: "Chương 1: Khởi đầu"</li>
            <li><strong>chương N</strong> - Ví dụ: "chương 1: Hành trình mới"</li>
            <li><strong>Chapter N</strong> - Ví dụ: "Chapter 2 - The Journey"</li>
            <li><strong>chapter N</strong> - Ví dụ: "chapter 3: A New Beginning"</li>
            <li><strong>第X章 (Hán tự)</strong> - Ví dụ:"第十章 - 新的开始"</li>
            <li><strong>第N章 (Số) </strong> - Ví dụ: "第99章 - 终极对决"</li>
            <li><strong>Số + Tiêu đề (Hán tự)+ Trang</strong> - Ví dụ: "19 啃老（第1页）"</li>
            <li><strong>Giữa các chương:</strong> Là nội dung các chương</li>
          </ul>
        </div>
      </div>
      <div className="converte">
        <button className="btn-submit" onClick={handleSubmit}>
          Hoàn tất
        </button>
        <button className="btn-check-file" onClick={handleCheckFileFormat}>
          Kiểm tra File
        </button>
      </div>
      {showGuide && (
        <div className="modal">
          <div className="modal-content">
            <h3>🔑 Cách lấy API Key Gemini</h3>
            <ol>
              <li>
                Truy cập:{" "}
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  aistudio.google.com/app/apikey
                </a>
              </li>
              <li>Đăng nhập tài khoản Google</li>
              <li>
                Nhấn nút <b>"Create API Key"</b>
              </li>
              <li>Sao chép key và dán vào ô phía trên</li>
            </ol>
            <p>Lưu ý: Tránh tiết lộ key, bảo mật cần thiết!!!</p>
            <button onClick={() => setShowGuide(false)}>Đã hiểu</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadForm;
