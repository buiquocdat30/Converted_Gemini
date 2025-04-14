import React, { useState } from "react";
import axios from "axios";
import "../css/ChapterList.css";

const ChapterList = ({
  chapters,
  apiKey,
  onTranslationResult,
  onSelectChapter 
}) => {
  const [results, setResults] = useState({});
  const [errorMessages, setErrorMessages] = useState({}); // Thêm trạng thái lỗi

  const translate = async (index) => {
    const chapter = chapters[index];
    onSelectChapter?.(index); // 👈 gọi để hiển thị chương trước khi dịch
 
    console.log("📌 chương hiện tại:", chapter ? ("OK", chapter) : "MISSING");
    if (!apiKey && index >= 2) {
      alert(
        "🔒 Chỉ được dịch 2 chương đầu miễn phí. Hãy nhập API key để tiếp tục."
      );
      return;
    }

    try {
      const res = await axios.post("http://localhost:8000/api/translate", {
        chapters: [chapter],
        key: apiKey || "",
      });

      // ✅ Bảo vệ an toàn trước khi truy cập
      const translated =
        res?.data?.chapters &&
        Array.isArray(res.data.chapters) &&
        res.data.chapters[0]
          ? res.data.chapters[0].translated
          : null;
      console.log("📌 dịch hiện tại data:", res.data.chapters[0].translated);
      console.log("📌 dịch hiện tại:", translated || "MISSING");

      onTranslationResult(index, translated);
      console.log(
        "📌 Dịch hiện tại:",
        onTranslationResult ? "OK ✅" : "MISSING ❌"
      );

      setResults((prev) => ({
        ...prev,
        [index]: translated,
      }));
      console.log("kết quả dịch ok cuối", results);

      setErrorMessages((prev) => ({ ...prev, [index]: null })); // Xóa lỗi nếu có
    } catch (error) {
      console.error("Lỗi khi dịch chương:", error); // In lỗi chi tiết ra console

      let errorMessage = "❌ Lỗi khi dịch chương: " + chapter.title;
      if (
        error.response &&
        error.response.data &&
        error.response.data.message
      ) {
        errorMessage += " - " + error.response.data.message; // Thêm thông báo lỗi từ backend
      }

      setErrorMessages((prev) => ({ ...prev, [index]: errorMessage })); // Lưu lỗi

      alert(errorMessage);
    }
  };

  return (
    <div className="chapter-list">
      <h3>📚 Danh sách chương ({chapters.length})</h3>
      <ul>
        {chapters.map((ch, idx) => (
          <li key={idx}>
            <strong>{ch.title}</strong>
            <button onClick={() => translate(idx)} style={{ marginLeft: 10 }}>
              Dịch
            </button>
            {/* {onTranslatedChapters[idx]?.translated && <span>✅ Đã dịch</span>} */}
            {errorMessages[idx] && (
              <div style={{ color: "red" }}>
                <p>{errorMessages[idx]}</p>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ChapterList;
