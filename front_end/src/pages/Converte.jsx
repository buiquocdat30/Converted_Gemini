import React, { useState, useRef, useEffect } from "react";
import ePub from "epubjs"; // nếu dùng epub.js
import ConversionComparison from "../components/ConversionComparison/ConversionComparison";
import TranslationInfoPanel from "../components/TranslationInfoPanel/TranslationInfoPanel";
import "./pageCSS/Converte.css"; // Import file CSS

const Converte = () => {
  const [rawChapters, setRawChapters] = useState([]);
  const [convertedChapters, setConvertedChapters] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [books, setBooks] = useState("");
  const [author, setAuthor] = useState("");
  const [chapterCount, setChapterCount] = useState(0);
  const [totalWords, setTotalWords] = useState(0);
  const [averageWords, setAverageWords] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);

  const checkFileFormatFromText = (text) => {
    const chapterRegex =
      /^\s*((?:Chương|CHƯƠNG|Chapter|CHAPTER)\s*\d+[^\n]*|第[\d零〇一二三四五六七八九十百千]+章[^\n]*)$/im;

    const lines = text.split(/\r?\n/).map((line) => line.trimEnd());

    const chapters = [];
    let currentTitle = null;
    let currentContent = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (chapterRegex.test(line)) {
        if (currentTitle !== null) {
          chapters.push({
            title: currentTitle,
            content: `\n\n${currentContent.join("\n").trim()}\n`, // đảm bảo xuống dòng trước & sau
          });
          currentContent = [];
        }
        currentTitle = line;
      } else {
        if (currentTitle !== null) {
          currentContent.push(line);
        }
      }
    }

    if (currentTitle !== null) {
      chapters.push({
        title: currentTitle,
        content: `\n\n${currentContent.join("\n").trim()}\n`,
      });
    }

    const valid =
      chapters.length > 0 &&
      chapters.every(
        (ch) => ch.title && ch.content && ch.content.trim().length > 0
      );

    setError(valid ? "✅ Đúng định dạng chương!" : "❌ Sai định dạng chương!");

    return {
      valid,
      chapters,
      total: chapters.length,
    };
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
  
    const allowedTypes = ["application/epub+zip", "text/plain"];
    if (!allowedTypes.includes(file.type)) {
      alert("❗ Chỉ chấp nhận file .epub hoặc .txt");
      if (fileInputRef.current) fileInputRef.current.value = "";
      setSelectedFile(null);
      setRawChapters([]);
      setConvertedChapters([]);
      return;
    }
  
    setSelectedFile(file);
    setLoading(true);
    setError("");
    setSuccess("");
    setRawChapters([]);
    setConvertedChapters([]);
    setBooks(file.name.replace(/\.[^/.]+$/, ""));
    setAuthor("");
    setChapterCount(0);
    setTotalWords(0);
    setAverageWords(0);
  
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        let text = "";
  
        if (file.type === "application/epub+zip") {
          const epub = await import("epubjs");
          const book = epub.default(file);
          await book.ready;
          const spineItems = book.spine.spineItems;
          const chapters = await Promise.all(
            spineItems.map((item) => item.load(book.load.bind(book)).then(() => item.getTextContent()))
          );
          text = chapters.join("\n\n");
        } else {
          text = reader.result;
        }
  
        const { valid, chapters } = checkFileFormatFromText(text); // <- gọi hàm check format
  
        console.log('đây là valid:',valid)
        console.log('đây là chapters:',chapters)
        setRawChapters(chapters);
        setChapterCount(chapters.length);

        
  
        const total = chapters.reduce(
          (sum, chapter) => sum + chapter.content.split(/\s+/).filter(Boolean).length,
          0
        );
        setTotalWords(total);
        setAverageWords(chapters.length > 0 ? Math.round(total / chapters.length) : 0);
  
        setCurrentIndex(0);
        setConvertedChapters([]); // vẫn để trống ban đầu
        setSuccess("✅ Đọc file thành công! Vui lòng nhấn 'Chuyển Đổi Định Dạng' để bắt đầu.");
      } catch (err) {
        setError(`❗ Lỗi đọc file: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };
  
    if (file.type === "application/epub+zip") {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
  };
  

  useEffect(() => {
    if (selectedFile) {
      const reader = new FileReader();
      reader.onload = async () => {
        const text = reader.result;
        checkFileFormatFromText(text);
      };
      reader.readAsText(selectedFile);
    }

  }, [selectedFile]);

  const handleCheckFileFormat = () => {
    if (!selectedFile) {
      alert("📂 Vui lòng chọn tệp trước.");
    }
    // Chức năng kiểm tra định dạng đã được chuyển vào useEffect
  };

  const handleConvertFile = async () => {
    if (rawChapters.length === 0) {
      alert("📂 Vui lòng chọn và xử lý file trước khi chuyển đổi.");
      return;
    }
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch("/api/convert-format", {
        method: "POST",
        body: JSON.stringify({
          chapters: rawChapters,
          bookName: books,
          authorName: author,
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Lỗi khi chuyển đổi định dạng.");
      }
      const data = await response.json();
      setConvertedChapters(data.convertedChapters);
      setLoading(false);
      setSuccess("✅ Chuyển đổi định dạng thành công!");
    } catch (err) {
      setError(`❗ Lỗi chuyển đổi định dạng: ${err.message}`);
      setLoading(false);
    }
  };

  const handleNext = () => {
    setCurrentIndex((prev) => Math.min(prev + 1, rawChapters.length - 1));
  };

  const handleBack = () => {
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
  };

  const handleConvertedChange = (newText) => {
    const updated = [...convertedChapters];
    updated[currentIndex].content = newText;
    setConvertedChapters(updated);
  };

  return (
    <div className="converter-page">
      <h2 className="converter-title">📘 Chuyển đổi định dạng chương</h2>

      <div className="upload-container">
        <input
          type="file"
          accept=".epub,.txt"
          ref={fileInputRef}
          onChange={handleFileSelect}
          className="upload-input"
        />
        {rawChapters.length > 0 && (
          <button className="convert-button" onClick={handleConvertFile}>
            Chuyển Đổi Định Dạng
          </button>
        )}
      </div>

      {loading && <p className="loading-message">⏳ Đang xử lý...</p>}
      {error && <p className="error-message">{error}</p>}
      {success && <p className="success-message">{success}</p>}

      <TranslationInfoPanel
        books={books}
        author={author}
        totalChapters={chapterCount}
        totalWords={totalWords}
        averageWordsPerChapter={averageWords}
        setBooks={setBooks}
        setAuthor={setAuthor}
        className="translation-info"
      />

        {    console.log('đây là rawChapters:',rawChapters)}
      <ConversionComparison
        rawChapters={rawChapters}
        convertedChapters={convertedChapters}
        currentIndex={currentIndex}
        onBack={handleBack}
        onNext={handleNext}
        onConvertedChange={handleConvertedChange}
        className="conversion-comparison-section"
      />
    </div>
  );
};

export default Converte;
