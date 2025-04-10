import { useState } from 'react';
import axios from 'axios';

const ChapterList = ({ chapters, apiKey }) => {
  const [results, setResults] = useState({});

  const translate = async (index) => {
    const chapter = chapters[index];

    // 🚧 Giới hạn 2 chương miễn phí nếu không có API key
    if (!apiKey && index >= 2) {
      alert('🔒 Chỉ được dịch 2 chương đầu miễn phí. Hãy nhập API key để tiếp tục.');
      return;
    }

    try {
      const res = await axios.post('http://localhost:3000/api/translate', {
        content: chapter.content,
        key: apiKey || ''
      });

      setResults((prev) => ({
        ...prev,
        [index]: res.data.translated
      }));
    } catch (error) {
      alert('❌ Lỗi khi dịch chương: ' + chapter.title);
    }
  };

  return (
    <div style={{ marginTop: 30 }}>
      <h3>📚 Danh sách chương ({chapters.length})</h3>
      <ul>
        {chapters.map((ch, idx) => (
          <li key={idx} style={{ marginBottom: 15 }}>
            <strong>{ch.title}</strong>
            <button
              onClick={() => translate(idx)}
              style={{ marginLeft: 10 }}
            >
              Dịch
            </button>
            {results[idx] && (
              <div style={{ marginTop: 5, background: '#f5f5f5', padding: 10 }}>
                <h5>🔁 Kết quả dịch:</h5>
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
