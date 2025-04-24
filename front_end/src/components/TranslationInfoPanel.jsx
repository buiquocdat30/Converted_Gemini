import React from 'react';
import '../css/TranslationInfoPanel.css';

const models = [
  {
    value: 'gemini-1.5-flash-8b',
    label: 'Gemini 1.5 Flash-8B',
    description: 'Giới hạn miễn phí: 15 lần/phút, 1500 lần một ngày.'
  },
  {
    value: 'gemini-2.0-flash-lite',
    label: 'Gemini 2.0 Flash-Lite',
    description: 'Giới hạn miễn phí: 30 lần/phút, 1500 lần một ngày.'
  },
  {
    value: 'gemini-1.5-flash',
    label: 'Gemini 1.5 Flash',
    description: 'Giới hạn miễn phí: 15 lần/phút, 1500 lần một ngày.'
  },
  {
    value: 'gemini-2.0-flash',
    label: 'Gemini 2.0 Flash',
    description: 'Giới hạn miễn phí: 15 lần/phút, 1500 lần một ngày.'
  },
  {
    value: 'gemini-2.5-pro-experimental-03-25',
    label: 'Gemini 2.5 Pro Experimental 03-25',
    description: 'Giới hạn miễn phí: 5 lần/phút, 25 lần một ngày.'
  }
];

const TranslationInfoPanel = ({
  totalChapters,
  averageWordsPerChapter,
  selectedModel,
  setSelectedModel
}) => {
  const selected = models.find(m => m.value === selectedModel);

  return (
    <div className="tip-container">
      <h3 className="tip-title">📊 Thông tin tệp đã tải lên</h3>
      <p><strong>Tổng số chương:</strong> {totalChapters}</p>
      <p><strong>Số chữ trung bình mỗi chương:</strong> {averageWordsPerChapter}</p>

      <div className="tip-model-select">
        <label htmlFor="modelSelect" className="tip-label">
          🤖 Chọn Mô Hình AI:
        </label>
        <select
          id="modelSelect"
          className="tip-select"
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
        >
          {models.map((model) => (
            <option key={model.value} value={model.value}>
              {model.label}
            </option>
          ))}
        </select>

        {selected && (
          <p className="tip-model-description">{selected.description}</p>
        )}
      </div>
    </div>
  );
};

export default TranslationInfoPanel;
