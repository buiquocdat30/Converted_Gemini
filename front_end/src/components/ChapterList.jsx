import React, { useState } from 'react';
import axios from 'axios';
import "../css/ChapterList.css";  // Đừng quên import CSS

const ChapterList = ({ chapters, apiKey, onTranslate }) => {
  const [results, setResults] = useState({});

  const translate = async (index) => {
    const chapter = chapters[index];

    if (!apiKey && index >= 2) {
      alert('🔒 Chỉ được dịch 2 chương đầu miễn phí. Hãy nhập API key để tiếp tục.');
      return;
    }

    try {
      const res = await axios.post('http://localhost:3000/api/translate', {
        content: chapter.content,
        key: apiKey || ''
      });

      const translated = res.data.translated;

      setResults((prev) => ({
        ...prev,
        [index]: translated
      }));

      // Gửi nội dung dịch lên component cha
      onTranslate(index, translated);
    } catch (error) {
      alert('❌ Lỗi khi dịch chương: ' + chapter.title);
    }
  };

  return (
    <div className="chapter-list">
      <h3>📚 Danh sách chương ({chapters.length})</h3>
      <ul>
        {chapters.map((ch, idx) => (
          <li key={idx}>
            <strong>{ch.title}</strong>
            <button
              onClick={() => translate(idx)}
              style={{ marginLeft: 10 }}
            >
              Dịch
            </button>
            {results[idx] && (
              <div>
                <h5>🔁 Đã dịch:</h5>
                <p>{results[idx]}</p>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ChapterList;
