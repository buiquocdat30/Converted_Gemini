import React, { useState } from "react";
import ChapterList from "../ChapterList/ChapterList";
import TranslateViewer from "../TranslateViewer/TranslateViewer";
import ConverteKeyInput from "../ConverteKeyInput/ConverteKeyInput";
import { translateSingleChapter } from "../../services/translateSingleChapter.jsx";
import "./TranslatorApp.css";
import { toast } from "react-hot-toast";

const TranslatorApp = ({
  apiKey,
  chapters,
  setChapters,
  model,
  onUpdateChapter,
  onSelectChapter,
}) => {
  const [currentApiKey, setCurrentApiKey] = useState(apiKey || ""); //key đã nhập
  const [translatedChapters, setTranslatedChapters] = useState([]); //đã dịch
  const [currentIndex, setCurrentIndex] = useState(0); // 👈 thêm state để điều hướng
  const [tempKey, setTempKey] = useState(apiKey || ""); //kiểm soát key
  const [isMenuOpen, setIsMenuOpen] = useState(false); //kiểm soát topmenu
  const [isAddChapterModalOpen, setIsAddChapterModalOpen] = useState(false);
  const [newChapterTitle, setNewChapterTitle] = useState("");
  const [newChapterContent, setNewChapterContent] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [addChapterMode, setAddChapterMode] = useState("manual"); // "manual" hoặc "file"

  //Chọn chương để Nhảy
  const [selectedChapterIndex, setSelectedChapterIndex] = useState(null);

  //hàm chọn chương để Nhảy
  const handleSelectJumbChapter = (index) => {
    setSelectedChapterIndex(index);
  };

  // Hàm xử lý khi chuyển chương
  const handleChapterChange = (newIndex) => {
    console.log("TranslatorApp - Index mới:", newIndex);
    setCurrentIndex(newIndex);
    // Tính toán trang mới dựa trên index
    const chaptersPerPage = 10;
    const newPage = Math.floor(newIndex / chaptersPerPage) + 1;
    // Gọi callback để cập nhật trang trong ChapterList
    onSelectChapter?.(newIndex, newPage);
  };

  // Khi nhận kết quả dịch từ ChapterList
  const handleTranslationResult = (index, translated, translatedTitle) => {
    setTranslatedChapters((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...(chapters[index] || {}), // lấy từ chương gốc nếu chưa có
        translated, // thêm bản dịch mới
        translatedTitle,
      };
      return updated;
    });
    setCurrentIndex(index); // 👈 chuyển sang chương vừa dịch
  };

  // Khi người dùng sửa lại nội dung trong TranslateViewer
  const handleEditChapter = (index, newContent, type = 'translated') => {
    setTranslatedChapters((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...(chapters[index] || {}),
        [type]: newContent,
      };
      return updated;
    });
  };

  // Hàm xử lý dịch lại chương
  const handleRetranslate = (index) => {
    translateSingleChapter({
      index,
      chapters,
      apiKey: currentApiKey,
      model,
      onTranslationResult: (idx, translated, translatedTitle) => {
        handleTranslationResult(idx, translated, translatedTitle);
        // Sau khi dịch xong, tự động lưu vào translated
        handleEditChapter(idx, translated, 'translated');
      },
      onSelectChapter: () => {},
      setProgress: () => {},
      setResults: () => {},
      setErrorMessages: () => {},
      setTranslatedCount: () => {},
      setTotalProgress: () => {},
    });
  };

  const handleCurrentKey = () => {
    setCurrentApiKey(tempKey);
  };

  const mergedChapters = chapters.map((ch, i) => ({
    ...ch,
    ...translatedChapters[i],
  }));

  //hàm check key
  const handleCheckKey = async () => {
    if (!tempKey) return;

    try {
      const fakeChapter = {
        title: "Key Check",
        content: "This is a test. Please check if the key is valid.",
      };

      await translateSingleChapter({
        index: 0,
        chapters: [fakeChapter],
        apiKey: tempKey,
        onTranslationResult: (_, translated) => {
          if (
            translated.toLowerCase().includes("kiểm tra") ||
            translated.toLowerCase().includes("dịch")
          ) {
            alert("✅ Key hợp lệ và có thể sử dụng.");
          } else {
            alert("⚠️ Key không trả kết quả dịch rõ ràng.");
          }
        },
        onSelectChapter: () => {}, // tránh lỗi
        setProgress: () => {},
        setResults: () => {},
        setErrorMessages: () => {},
        setTranslatedCount: () => {},
        setTotalProgress: () => {},
      });
    } catch (err) {
      console.error("Lỗi khi kiểm tra key:", err);
      alert("❌ Key không hợp lệ hoặc đã vượt hạn mức.");
    }
  };

  // Hàm xử lý thêm chương mới
  const handleAddChapter = () => {
    if (addChapterMode === "manual") {
      if (!newChapterTitle.trim() || !newChapterContent.trim()) {
        toast.error("Vui lòng nhập đầy đủ tiêu đề và nội dung chương!");
        return;
      }

      const newChapter = {
        title: newChapterTitle,
        content: newChapterContent,
        chapterNumber: chapters.length + 1,
        chapterName: newChapterTitle,
      };

      // Thêm chương mới vào mảng chapters hiện tại
      const updatedChapters = [...chapters, newChapter];
      setChapters(updatedChapters);

      // Cập nhật translatedChapters
      const updatedTranslatedChapters = [...translatedChapters];
      updatedTranslatedChapters[chapters.length] = {
        ...newChapter,
        translated: newChapterContent,
        translatedTitle: newChapterTitle
      };
      setTranslatedChapters(updatedTranslatedChapters);

      setNewChapterTitle("");
      setNewChapterContent("");
      setIsAddChapterModalOpen(false);
      toast.success("✅ Đã thêm chương mới!");
    } else {
      // Xử lý thêm chương từ file
      if (!selectedFile) {
        toast.error("Vui lòng chọn file!");
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target.result;
        const fileName = selectedFile.name.replace(/\.[^/.]+$/, ""); // Bỏ đuôi file

        const newChapter = {
          title: fileName,
          content: content,
          chapterNumber: chapters.length + 1,
          chapterName: fileName,
        };

        // Thêm chương mới vào mảng chapters hiện tại
        const updatedChapters = [...chapters, newChapter];
        setChapters(updatedChapters);

        // Cập nhật translatedChapters
        const updatedTranslatedChapters = [...translatedChapters];
        updatedTranslatedChapters[chapters.length] = {
          ...newChapter,
          translated: content,
          translatedTitle: fileName
        };
        setTranslatedChapters(updatedTranslatedChapters);

        setSelectedFile(null);
        setIsAddChapterModalOpen(false);
        toast.success("✅ Đã thêm chương mới từ file!");
      };
      reader.readAsText(selectedFile);
    }
  };

  return (
    <div className="translator-app-wrapper">
      <h2
        className="translator-app-title"
        onClick={() => (window.location.href = "/")}
      >
        📘 Gemini Converte{" "}
      </h2>
      {/* Nút tròn để mở menu */}
      <div
        className="menu-toggle-button"
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        
      >
        🔑
        <span className="tooltip-text">Nhập key</span>
      </div>
      {/* Nút thêm chương */}
      <div
        className="menu-toggle-button add-chapter-button"
        onClick={() => setIsAddChapterModalOpen(true)}
      >
        ➕
        <span className="tooltip-text">Thêm chương</span>
      </div>

      {/* Modal thêm chương */}
      {isAddChapterModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Thêm chương mới</h3>
            <div className="add-chapter-tabs">
              <button
                className={addChapterMode === "manual" ? "active" : ""}
                onClick={() => setAddChapterMode("manual")}
              >
                Nhập thủ công
              </button>
              <button
                className={addChapterMode === "file" ? "active" : ""}
                onClick={() => setAddChapterMode("file")}
              >
                Từ file
              </button>
            </div>

            {addChapterMode === "manual" ? (
              <>
                <input
                  type="text"
                  placeholder="Nhập tiêu đề chương"
                  value={newChapterTitle}
                  onChange={(e) => setNewChapterTitle(e.target.value)}
                />
                <textarea
                  placeholder="Nhập nội dung chương"
                  value={newChapterContent}
                  onChange={(e) => setNewChapterContent(e.target.value)}
                  rows={10}
                />
              </>
            ) : (
              <input
                type="file"
                accept=".txt,.epub"
                onChange={(e) => setSelectedFile(e.target.files[0])}
              />
            )}

            <div className="modal-buttons">
              <button onClick={handleAddChapter}>Thêm chương</button>
              <button onClick={() => setIsAddChapterModalOpen(false)}>Hủy</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal nhập key */}
      {isMenuOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>📘 Menu key</h3>
            <div className="top-menu-body">
              <button onClick={() => (window.location.href = "/")}>
                🏠 Trang chủ
              </button>
              <ConverteKeyInput apiKey={tempKey} setApiKey={setTempKey} />
              <div className="converter-key-container">
                <button
                  className="confirm-key-btn"
                  onClick={handleCurrentKey}
                  disabled={!tempKey || currentApiKey === tempKey}
                >
                  🔑 Nhập key
                </button>
                <button className="check-key-btn" onClick={handleCheckKey}>
                  🔑 Kiểm tra key
                </button>
              </div>
            </div>
            <div className="modal-buttons">
              <button onClick={() => setIsMenuOpen(false)}>Đóng</button>
            </div>
          </div>
        </div>
      )}

      {/* Main layout */}
      <div className="content">
        <div className="chapter-list-container">
          <ChapterList
            chapters={mergedChapters}
            apiKey={currentApiKey}
            model={model}
            onTranslationResult={handleTranslationResult}
            onSelectChapter={handleChapterChange}
            onSelectJumbChapter={handleSelectJumbChapter}
            currentIndex={currentIndex}
          />
        </div>
        <div className="translate-viewer-container">
          <TranslateViewer
            chapters={mergedChapters}
            onUpdateChapter={handleEditChapter}
            currentIndex={currentIndex}
            onChangeIndex={handleChapterChange}
            selectedChapterIndex={selectedChapterIndex}
            onRetranslate={handleRetranslate}
          />
        </div>
        
      </div>
    </div>
  );
};

export default TranslatorApp;
