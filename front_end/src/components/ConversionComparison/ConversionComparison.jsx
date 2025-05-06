import React from "react";
import "./ConversionComparison.css";

const ConversionComparison = ({
  rawChapters,
  convertedChapters,
  currentIndex,
  onBack,
  onNext,
  onConvertedEdit,
  onExport,
}) => {
  const raw = rawChapters[currentIndex] || { title: "", content: "" };
  const converted = convertedChapters[currentIndex] || {
    title: "",
    content: "",
  };
  console.log(rawChapters);
  console.log(typeof rawChapters[currentIndex], rawChapters[currentIndex]);
  return (
    <div className="comparison-container">
      <div className="header">
        <button onClick={onBack}>← Prev</button>
        <h3>Chương {currentIndex + 1}</h3>
        <button onClick={onNext}>Next →</button>
      </div>
      <div className="columns">
        <div className="column before">
          <h4>📄 Trước xử lý</h4>
          <h5>Chương {raw.title}</h5>
          {console.log("raw.content", raw.content)}
          <textarea readOnly value={raw.content}></textarea>
        </div>
        <div className="column after">
          <h4>✅ Sau xử lý</h4>
          <h5>Chương {converted.title}</h5>
          <textarea
            value={converted.content}
            onChange={(e) => onConvertedEdit(e.target.value)}
          />
        </div>
      </div>
      <div className="actions">
        <button onClick={() => navigator.clipboard.writeText(raw.content)}>
          Copy trước
        </button>
        <button
          onClick={() => navigator.clipboard.writeText(converted.content)}
        >
          Copy sau
        </button>
        <button onClick={onExport}>📤 Xuất file EPUB</button>
      </div>
    </div>
  );
};

export default ConversionComparison;
