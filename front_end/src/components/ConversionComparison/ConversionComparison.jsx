import React from 'react';
import './ConversionComparison.css';

const ConversionComparison = ({
  rawText,
  convertedText,
  chapterIndex,
  onPrev,
  onNext,
  onConvertedEdit,
  onExport
}) => {
  return (
    <div className="comparison-container">
      <div className="header">
        <button onClick={onPrev}>← Prev</button>
        <h3>Chương {chapterIndex + 1}</h3>
        <button onClick={onNext}>Next →</button>
      </div>
      <div className="columns">
        <div className="column before">
          <h4>📄 Trước xử lý</h4>
          <textarea readOnly value={rawText}></textarea>
        </div>
        <div className="column after">
          <h4>✅ Sau xử lý</h4>
          <textarea
            value={convertedText}
            onChange={(e) => onConvertedEdit(e.target.value)}
          />
        </div>
      </div>
      <div className="actions">
        <button onClick={() => navigator.clipboard.writeText(rawText)}>Copy trước</button>
        <button onClick={() => navigator.clipboard.writeText(convertedText)}>Copy sau</button>
        <button onClick={onExport}>📤 Xuất file EPUB</button>
      </div>
    </div>
  );
};

export default ConversionComparison;
