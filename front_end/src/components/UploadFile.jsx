import axios from 'axios';

const UploadFile = ({ setChapters }) => {
  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await axios.post('http://localhost:3000/api/upload', formData);
      setChapters(res.data);
    } catch (err) {
      alert('Upload thất bại');
    }
  };

  return (
    <div style={{ margin: '10px 0' }}>
      <input type="file" accept=".epub" onChange={handleUpload} />
    </div>
  );
};

export default UploadFile;
