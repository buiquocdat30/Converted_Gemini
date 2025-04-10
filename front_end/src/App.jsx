import { useState } from 'react';
import UploadFile from './components/UploadFile';
import ChapterList from './components/ChapterList';

function App() {
  const [chapters, setChapters] = useState([]);
  const [apiKey, setApiKey] = useState('');
  const [showGuide, setShowGuide] = useState(false);

  const handleFileUpload = async (e) => {
    const formData = new FormData();
    formData.append('epub', e.target.files[0]);

    const res = await fetch('http://localhost:3000/api/upload', {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();
    setChapters(data.chapters);
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>📘 Gemini EPUB Translator</h2>

      <div style={{ marginBottom: 10 }}>
        <label>🔑 Nhập Google Gemini API Key (nếu có): </label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          style={{ marginLeft: 10, padding: 5, width: 300 }}
          placeholder="API Key..."
        />
        <button
          style={{
            marginLeft: 10,
            padding: '5px 10px',
            cursor: 'pointer',
            backgroundColor: '#e0e0e0',
            border: 'none',
            borderRadius: '5px',
          }}
          onClick={() => setShowGuide(true)}
        >
          ❓ Hướng dẫn lấy API key
        </button>
      </div>

      <div style={{ marginBottom: 20 }}>
        <small>
          {apiKey
            ? '🔐 Đã nhập API key - Bạn có thể dịch toàn bộ chương.'
            : '🔓 Chế độ miễn phí - Chỉ dịch được 2 chương đầu tiên.'}
        </small>
      </div>

      <input type="file" accept=".epub" onChange={handleFileUpload} />

      {chapters.length > 0 && (
        <ChapterList chapters={chapters} apiKey={apiKey} />
      )}

      {/* Modal hướng dẫn */}
      {showGuide && (
        <div
          style={{
            position: 'fixed',
            top: 0, left: 0,
            width: '100%', height: '100%',
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div
            style={{
              background: 'white',
              padding: 30,
              borderRadius: 10,
              maxWidth: 500,
              boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
            }}
          >
            <h3>🔑 Cách lấy API Key Gemini</h3>
            <ol>
              <li>Truy cập: <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer">aistudio.google.com/app/apikey</a></li>
              <li>Đăng nhập tài khoản Google</li>
              <li>Nhấn nút <b>"Create API Key"</b></li>
              <li>Sao chép key và dán vào ô phía trên</li>
            </ol>
            <p>Lưu ý: Chỉ sử dụng cho mục đích học tập/cá nhân để tránh lạm dụng!</p>
            <button
              onClick={() => setShowGuide(false)}
              style={{
                marginTop: 10,
                padding: '6px 12px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: 5,
                cursor: 'pointer',
              }}
            >
              Đã hiểu
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;