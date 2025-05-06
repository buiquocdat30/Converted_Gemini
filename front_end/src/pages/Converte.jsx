import React, { useState, useRef } from 'react';
import ConversionComparison from '../components/ConversionComparison/ConversionComparison';
import TranslationInfoPanel from '../components/TranslationInfoPanel/TranslationInfoPanel';
import {
  handleEpubFile,
  handleTxtFile,
  checkFileFormatFromText,
} from '../utils/fileHandlers';
import './pageCSS/Converte.css'; // Import file CSS

const Converte = () => {
  const [rawChapters, setRawChapters] = useState([]);
  const [convertedChapters, setConvertedChapters] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [books, setBooks] = useState('');
  const [author, setAuthor] = useState('');
  const [chapterCount, setChapterCount] = useState(0);
  const [totalWords, setTotalWords] = useState(0);
  const [averageWords, setAverageWords] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef(null);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setBooks(file.name.replace(/\.[^/.]+$/, ''));
    const allowedTypes = ['application/epub+zip', 'text/plain'];

    if (!allowedTypes.includes(file.type)) {
      alert('❗ Chỉ chấp nhận file .epub hoặc .txt');
      return;
    }

    setLoading(true);
    setError('');
    setRawChapters([]);
    setConvertedChapters([]);

    const reader = new FileReader();
    reader.onload = async () => {
      const result = reader.result;

      if (file.type === 'application/epub+zip') {
        await handleEpubFile(
          result,
          setRawChapters,
          setError,
          setSuccess,
          setChapterCount,
          setTotalWords,
          setAverageWords,
          setBooks,
          setAuthor
        );
      } else {
        handleTxtFile(
          result,
          setRawChapters,
          setError,
          setSuccess,
          fileInputRef,
          () => {}, // no setSelectedFile
          file,
          setChapterCount,
          setTotalWords,
          setAverageWords,
          setBooks,
          setAuthor
        );
      }

      setConvertedChapters(prev => JSON.parse(JSON.stringify(prev.length ? prev : rawChapters)));
      setLoading(false);
      setCurrentIndex(0);
    };

    if (file.type === 'application/epub+zip') {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
  };

  const handleCheckFileFormat = () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return alert('📂 Vui lòng chọn tệp trước.');

    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result;
      const result = checkFileFormatFromText(text);

      if (result.valid) {
        alert(`✅ File hợp lệ! Tổng số chương: ${result.total}`);
      } else {
        alert('❌ File không đúng định dạng chương hoặc thiếu nội dung.');
        fileInputRef.current.value = '';
        setRawChapters([]);
        setConvertedChapters([]);
      }
    };
    reader.readAsText(file);
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
          onChange={handleFileUpload}
          className="upload-input"
        />
        <button className="check-button" onClick={handleCheckFileFormat}>
          Kiểm tra File
        </button>
      </div>

      {loading && <p className="loading-message">⏳ Đang xử lý file...</p>}
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

      {rawChapters.length > 0 && convertedChapters.length > 0 && (
        <ConversionComparison
          rawChapters={rawChapters}
          convertedChapters={convertedChapters}
          currentIndex={currentIndex}
          onBack={handleBack}
          onNext={handleNext}
          onConvertedChange={handleConvertedChange}
          className="conversion-comparison-section"
        />
      )}
    </div>
  );
};

export default Converte;