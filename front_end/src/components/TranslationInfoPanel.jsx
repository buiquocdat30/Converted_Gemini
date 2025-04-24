import React from 'react';
import '../css/TranslationInfoPanel.css';



const TranslationInfoPanel = ({
  totalChapters,
  averageWordsPerChapter,
}) => {
  

  return (
    <div className="tip-container">
      <h3 className="tip-title">📊 Thông tin tệp đã tải lên</h3>
      <p><strong>Tổng số chương:</strong> {totalChapters}</p>
      <p><strong>Số chữ trung bình mỗi chương:</strong> {averageWordsPerChapter}</p>

      
    </div>
  );
};

export default TranslationInfoPanel;
