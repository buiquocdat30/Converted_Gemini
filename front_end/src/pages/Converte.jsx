import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import { saveAs } from "file-saver";
import { 
  cleanContentForExport, 
  handleEpubFile, 
  handleTxtFile, 
  checkFileFormatFromText 
} from "../utils/fileHandlers";
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



  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
  
    const allowedTypes = ["application/epub+zip", "text/plain"];
    const allowedExtensions = [".epub", ".txt"];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
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
        if (file.type === "application/epub+zip" || file.name.toLowerCase().endsWith(".epub")) {
          const chapters = await handleEpubFile(
            reader.result,
            setRawChapters,
            setError,
            setSuccess,
            setChapterCount,
            setTotalWords,
            setAverageWords
          );
        } else if (file.type === "text/plain" || file.name.toLowerCase().endsWith(".txt")) {
          const chapters = handleTxtFile(
            reader.result,
            setRawChapters,
            setError,
            setSuccess,
            fileInputRef,
            setSelectedFile,
            file,
            setChapterCount,
            setTotalWords,
            setAverageWords
          );
        }
  
        setCurrentIndex(0);
        setConvertedChapters([]); // vẫn để trống ban đầu
        setSuccess("✅ Đọc file thành công! Vui lòng nhấn 'Chuyển Đổi Định Dạng' để bắt đầu.");
      } catch (err) {
        setError(`❗ Lỗi đọc file: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };
  
    if (file.type === "application/epub+zip" || file.name.toLowerCase().endsWith(".epub")) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
  };
  

  useEffect(() => {
    if (selectedFile) {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          let text = reader.result;
          
          // Nếu là file EPUB, cần xử lý khác
          if (selectedFile.type === "application/epub+zip" || selectedFile.name.toLowerCase().endsWith(".epub")) {
            // Không xử lý EPUB trong useEffect này vì đã được xử lý trong handleFileSelect
            return;
          }
          
          const result = checkFileFormatFromText(text);
          if (result.valid) {
            setError("✅ Đúng định dạng chương!");
          } else {
            setError("❌ Sai định dạng chương!");
          }
        } catch (err) {
          console.error("Lỗi trong useEffect:", err);
        }
      };
      
      if (selectedFile.type === "application/epub+zip" || selectedFile.name.toLowerCase().endsWith(".epub")) {
        reader.readAsArrayBuffer(selectedFile);
      } else {
        reader.readAsText(selectedFile);
      }
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
      const response = await axios.post("http://localhost:8000/converte", {
        chapters: rawChapters,
      });
  
      const data = response.data; // ✅ axios trả về data ở đây
      setConvertedChapters(data.convertedChapters);
      setSuccess("✅ Chuyển đổi định dạng thành công!");
    } catch (err) {
      setError(`❗ Lỗi chuyển đổi định dạng: ${err.response?.data?.error || err.message}`);
    } finally {
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

  const handleExport = () => {
    if (convertedChapters.length === 0) {
      alert("Không có nội dung đã chuyển đổi để xuất.");
      return;
    }

    // Tạo nội dung file với nội dung đã được lọc sạch
    const fullText = convertedChapters
      .map((ch) => {
        const cleanedContent = cleanContentForExport(ch.content);
        return `${ch.title}\n\n${cleanedContent}`;
      })
      .join("\n\n");

    // Tạo tên file
    const fileName = `${books || "converted"}.epub`;

    // Tạo và lưu file
    const blob = new Blob([fullText], { type: "text/plain;charset=utf-8" });
    saveAs(blob, fileName);
    
    alert("✅ Đã xuất file EPUB thành công! (Đã loại bỏ phần glossary)");
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


      <ConversionComparison
        rawChapters={rawChapters}
        convertedChapters={convertedChapters}
        currentIndex={currentIndex}
        onBack={handleBack}
        onNext={handleNext}
        onConvertedChange={handleConvertedChange}
        onExport={handleExport}
        className="conversion-comparison-section"
      />
    </div>
  );
};

export default Converte;
