import React, { useEffect, useState, useContext } from "react";
import axios from "axios";
import "../pages/pageCSS/GlossaryManager.css";
import { API_URL } from '../config/config';
import { AuthContext } from "../context/ConverteContext";



function toCSV(data) {
  if (!data.length) return '';
  const header = Object.keys(data[0]).join(',');
  const rows = data.map(row => Object.values(row).map(v => '"' + (v ?? '').toString().replace(/"/g, '""') + '"').join(','));
  return [header, ...rows].join('\n');
}

// Nhận storyId qua props hoặc router
const GlossaryManager = ({ storyId: propStoryId }) => {
  // Nếu dùng react-router, có thể lấy storyId từ useParams
  // const { storyId } = useParams();
  const [storyId, setStoryId] = useState(propStoryId || "");
  const [glossary, setGlossary] = useState([]);
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [log, setLog] = useState([]);
  const [typeFilter, setTypeFilter] = useState("");
  const { stories, fetchStories } = useContext(AuthContext);

  // Lấy token auth từ localStorage
  const token = localStorage.getItem("auth-token");

  // Log helper
  const addLog = (msg, data) => {
    setLog((prev) => [
      { time: new Date().toLocaleTimeString(), msg, data },
      ...prev.slice(0, 30)
    ]);
    console.log("[GlossaryManager]", msg, data);
  };

  // Lấy danh sách truyện của user khi mount
  useEffect(() => {
    fetchStories();
  }, []);

  // Lấy glossary khi storyId đổi
  useEffect(() => {
    if (!storyId) {
      setGlossary([]); // Nếu storyId rỗng thì reset glossary về mảng rỗng
      return;
    }
    fetchGlossary();
  }, [storyId]);

  const fetchGlossary = async () => {
    setLoading(true);
    try {
      addLog("Gọi API lấy glossary", { storyId });
      const res = await axios.get(`${API_URL}/user/glossary/${storyId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log("đây là khi hàm gọi glossary trả về kq:",res.data.data);
      // Nếu không phải mảng thì fallback về []
      setGlossary(Array.isArray(res.data.data) ? res.data.data : []);
      addLog("Glossary nhận được", res.data.data);
    } catch (err) {
      addLog("Lỗi khi lấy glossary", err);
      setGlossary([]); // Nếu lỗi cũng set về mảng rỗng
      alert("Lỗi khi lấy glossary: " + err.message);
    }
    setLoading(false);
  };

  const searchGlossary = async () => {
    if (!keyword) return fetchGlossary();
    setLoading(true);
    try {
      addLog("Gọi API tìm kiếm glossary", { storyId, keyword });
      const res = await axios.get(`${API_URL}/user/glossary/${storyId}/search?keyword=${encodeURIComponent(keyword)}`,
        { headers: { Authorization: `Bearer ${token}` } });
      setGlossary(Array.isArray(res.data.data) ? res.data.data : []);
      addLog("Kết quả tìm kiếm", res.data.data);
    } catch (err) {
      addLog("Lỗi khi tìm glossary", err);
      setGlossary([]); // Nếu lỗi cũng set về mảng rỗng
      alert("Lỗi khi tìm glossary: " + err.message);
    }
    setLoading(false);
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditData({ ...item });
    addLog("Bắt đầu sửa", item);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({});
    addLog("Hủy sửa", null);
  };

  const saveEdit = async () => {
    setLoading(true);
    try {
      addLog("Gọi API cập nhật glossary", editData);
      await axios.put(`${API_URL}/user/glossary/items/${editingId}`, editData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      addLog("Cập nhật thành công", editData);
      setEditingId(null);
      setEditData({});
      fetchGlossary();
    } catch (err) {
      addLog("Lỗi khi cập nhật glossary", err);
      alert("Lỗi khi cập nhật glossary: " + err.message);
    }
    setLoading(false);
  };

  const deleteItem = async (id) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa mục này?")) return;
    setLoading(true);
    try {
      addLog("Gọi API xóa glossary", { id });
      await axios.delete(`${API_URL}/user/glossary/items/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      addLog("Xóa thành công", { id });
      fetchGlossary();
    } catch (err) {
      addLog("Lỗi khi xóa glossary", err);
      alert("Lỗi khi xóa glossary: " + err.message);
    }
    setLoading(false);
  };

  // Lọc theo loại
  const typeList = Array.from(new Set((glossary || []).map(g => g.type).filter(Boolean)));
  const filteredGlossary = (glossary || []).filter(item =>
    (!typeFilter || item.type === typeFilter)
  );

  // Xuất CSV
  const exportCSV = () => {
    const csv = toCSV(filteredGlossary);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `glossary_${storyId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    addLog("Đã xuất file CSV", null);
  };

  return (
    <div className="glossary-wrapper">
      <h2 className="glossary-title">📚 Quản lý Glossary cho truyện</h2>
      <div className="glossary-toolbar">
        {/* Dropdown chọn truyện thay cho input nhập storyId */}
        <label className="glossary-story-label">
          Chọn truyện:
          <select
            value={storyId}
            onChange={e => setStoryId(e.target.value)}
            className="glossary-story-select"
          >
            <option value="">-- Chọn truyện --</option>
            {stories.map(story => (
              <option key={story.id} value={story.id}>
                {story.name} {story.author ? `- ${story.author}` : ""}
              </option>
            ))}
          </select>
        </label>
        {/* Ẩn input nhập storyId thủ công */}
        {/* <input
          value={storyId}
          onChange={e => setStoryId(e.target.value)}
          style={{ marginLeft: 8, width: 220, border: `1.5px solid ${BORDER}`, borderRadius: 6, padding: 6 }}
          placeholder="Nhập storyId..."
        /> */}
        <input
          value={keyword}
          onChange={e => setKeyword(e.target.value)}
          placeholder="Tìm kiếm từ, tên, loại..."
          className="glossary-search-input"
        />
        <button onClick={searchGlossary} disabled={loading}
          className="glossary-btn glossary-btn-search">
          Tìm kiếm
        </button>
        <button onClick={fetchGlossary} disabled={loading}
          className="glossary-btn glossary-btn-refresh">
          Làm mới
        </button>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          className="glossary-type-select">
          <option value="">-- Lọc theo loại --</option>
          {typeList.map(type => <option key={type} value={type}>{type}</option>)}
        </select>
        <button onClick={exportCSV} className="glossary-btn glossary-btn-export">
          ⬇️ Xuất CSV
        </button>
      </div>
      {/* Nếu chưa chọn truyện thì không hiển thị bảng glossary */}
      {storyId ? (
        <>
          <div className="glossary-count">
            <span>Tổng số mục:</span> {filteredGlossary.length}
          </div>
          <div className="glossary-table-container">
            <table className="glossary-table">
              <thead>
                <tr>
                  <th>Tên gốc</th>
                  <th>Tên dịch</th>
                  <th>Loại</th>
                  <th>Ngôn ngữ</th>
                  <th>Số lần</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {filteredGlossary.map(item => (
                  editingId === item.id ? (
                    <tr key={item.id} className="glossary-row-editing">
                      <td><input value={editData.original} onChange={e => setEditData(d => ({ ...d, original: e.target.value }))} className="glossary-input" /></td>
                      <td><input value={editData.translated} onChange={e => setEditData(d => ({ ...d, translated: e.target.value }))} className="glossary-input" /></td>
                      <td><input value={editData.type} onChange={e => setEditData(d => ({ ...d, type: e.target.value }))} className="glossary-input" /></td>
                      <td><input value={editData.lang} onChange={e => setEditData(d => ({ ...d, lang: e.target.value }))} className="glossary-input" /></td>
                      <td>{item.frequency}</td>
                      <td>
                        <button onClick={saveEdit} disabled={loading} className="glossary-btn glossary-btn-save">Lưu</button>
                        <button onClick={cancelEdit} className="glossary-btn glossary-btn-cancel">Hủy</button>
                      </td>
                    </tr>
                  ) : (
                    <tr key={item.id} className="glossary-row">
                      <td>{item.original}</td>
                      <td>{item.translated}</td>
                      <td>{item.type}</td>
                      <td>{item.lang}</td>
                      <td>{item.frequency}</td>
                      <td>
                        <button onClick={() => startEdit(item)} disabled={loading} className="glossary-btn glossary-btn-edit">Sửa</button>
                        <button onClick={() => deleteItem(item.id)} className="glossary-btn glossary-btn-delete" disabled={loading}>Xóa</button>
                      </td>
                    </tr>
                  )
                ))}
                {filteredGlossary.length === 0 && (
                  <tr><td colSpan={6} className="glossary-empty">Không có dữ liệu</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="glossary-empty-select">Vui lòng chọn truyện để xem và quản lý glossary.</div>
      )}
      <div className="glossary-log-section">
        <h4 className="glossary-log-title">📝 Log thao tác (debug):</h4>
        <div className="glossary-log-list">
          {log.map((l, i) => (
            <div key={i} className="glossary-log-item">
              <b>[{l.time}]</b> {l.msg}
              <pre className="glossary-log-data">{l.data ? JSON.stringify(l.data, null, 2) : ''}</pre>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GlossaryManager;
