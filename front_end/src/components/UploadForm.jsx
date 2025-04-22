import React, { useState, useRef } from "react";
import "../css/App.css";
import ConverteKeyInput from "./ConverteKeyInput";
import ePub from "epubjs";

const UploadForm = ({ onFileParsed }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [apiKey, setApiKey] = useState("");
  const [showGuide, setShowGuide] = useState(false);
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(false); // Thêm trạng thái loading
  const [error, setError] = useState(""); // Thêm trạng thái error
  const [sucess, setSucess] = useState("");

  const fileInputRef = useRef(null);

  function arrayBufferToBase64(buffer) {
    let binary = "";
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;

    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }

    return window.btoa(binary);
  }
  //hàm xử lý fie epub
  // const handleEpubFile = async (
  //   readerResult,
  //   setChapters,
  //   setError,
  //   setSucess
  // ) => {
  //   try {
  //     const book = ePub(readerResult);
  //     const spine = await book.loaded.spine;
  //     const epubChapters = spine.items; // ✅ FIX: dùng `spine.items` thay vì `spine.get()`
  //     const extractedChapters = [];

  //     for (const item of epubChapters) {
  //       const doc = await book.load(item.href);
  //       const title = item.title || `Chapter ${extractedChapters.length + 1}`;
  //       const content = doc.body?.textContent || "";
  //       extractedChapters.push({ title, content });
  //     }

  //     setChapters(extractedChapters);
  //     setSucess("✅ File có thể sử dụng.");
  //     console.log("✅ EPUB đã xử lý:", extractedChapters);
  //   } catch (err) {
  //     console.error("❌ EPUB xử lý lỗi:", err);
  //     setError("❌ Lỗi khi đọc file EPUB.");
  //     setSucess("");
  //     setChapters([]);
  //   }
  // };

  const handleEpubFile = async (
    readerResult,
    setChapters,
    setError,
    setSucess
  ) => {
    try {
      const book = ePub(readerResult);
      await book.ready; // đảm bảo book đã load xong
      console.log("Book:", book);
      const spine = await book.loaded.spine;

      console.log("spine", spine);
      const epubChapters = spine.items;
      console.log("epubChapters", epubChapters);
      const extractedChapters = [];

      for (const item of epubChapters) {
        // ✅ Sử dụng book.load thay vì .spine.get().render()
        const contents = await book.load(item.href);
        console.log("contents", contents);
        const tempDiv = document.createElement("div");
        console.log("tempDiv", tempDiv);
        tempDiv.innerHTML = contents;
        const content = tempDiv.textContent || "";
        console.log("content", content);
        const title = item.title || `Chapter ${extractedChapters.length + 1}`;
        console.log("title", title);

        extractedChapters.push({ title, content });
      }

      setChapters(extractedChapters);
      setSucess("✅ File EPUB đã được xử lý.");
      console.log("✅ EPUB đã xử lý:", extractedChapters);
    } catch (err) {
      console.error("❌ EPUB xử lý lỗi:", err);
      setError("❌ Lỗi khi đọc file EPUB.");
      setSucess("");
      setChapters([]);
    }
  };

  //hàm xử lý file txt
  const handleTxtFile = (
    readerResult,
    setChapters,
    setError,
    setSucess,
    fileInputRef,
    setSelectedFile,
    file
  ) => {
    const result = checkFileFormatFromText(readerResult);
    if (result.valid) {
      setChapters(result.chapters);
      setSucess("✅ File có thể sử dụng.");
      console.log("✅ TXT đã xử lý:", result.chapters);
    } else {
      setError(`❌ File ${file.name} không đúng định dạng chương.`);
      setSelectedFile(null);
      setChapters([]);
      setSucess("");
      fileInputRef.current.value = "";
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    const allowedTypes = ["application/epub+zip", "text/plain"];

    if (!allowedTypes.includes(file.type)) {
      alert("❗ Chỉ chấp nhận file .epub hoặc .txt");
      return;
    }

    setSelectedFile(file);
    setLoading(true);
    setError("");
    setChapters([]);

    const reader = new FileReader();

    reader.onload = async () => {
      const result = reader.result;

      if (file.type === "application/epub+zip") {
        await handleEpubFile(result, setChapters, setError, setSucess);
      } else {
        handleTxtFile(
          result,
          setChapters,
          setError,
          setSucess,
          fileInputRef,
          setSelectedFile,
          file
        );
      }

      setLoading(false);
    };

    if (file.type === "application/epub+zip") {
      reader.readAsArrayBuffer(file);
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
    const chapterRegex =
      /^\s*((?:Chương|CHƯƠNG|Chapter|CHAPTER)\s*\d+[^\n]*|第[\d一二三四五六七八九十百千]+章[^\n]*)$/gim; // có thể đổi sang /^(chapter|chương)\s+\d+/i nếu cần hỗ trợ tiếng Việt
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
      {sucess && <p style={{ color: "red" }}>{sucess}</p>}{" "}
      {/* Hiển thị thông báo khi file dùng được */}
      <div className="chapter-guide">
        <div className="chapter-guide-title">
          <h4>📌 Các định dạng chương được hỗ trợ:</h4>
        </div>
        <div className="chapter-guide-content">
          <ul>
            <li>
              <strong>Chương N</strong> - Ví dụ: "Chương 1: Khởi đầu"
            </li>
            <li>
              <strong>chương N</strong> - Ví dụ: "chương 1: Hành trình mới"
            </li>
            <li>
              <strong>Chapter N</strong> - Ví dụ: "Chapter 2 - The Journey"
            </li>
            <li>
              <strong>chapter N</strong> - Ví dụ: "chapter 3: A New Beginning"
            </li>
            <li>
              <strong>第X章 (Hán tự)</strong> - Ví dụ:"第十章 - 新的开始"
            </li>
            <li>
              <strong>第N章 (Số) </strong> - Ví dụ: "第99章 - 终极对决"
            </li>
            <li>
              <strong>Số + Tiêu đề (Hán tự)+ Trang</strong> - Ví dụ: "19
              啃老（第1页）"
            </li>
            <li>
              <strong>Giữa các chương:</strong> Là nội dung các chương
            </li>
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
