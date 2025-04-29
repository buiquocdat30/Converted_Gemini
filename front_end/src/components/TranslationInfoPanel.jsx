import React, { useState } from "react";
import "../css/TranslationInfoPanel.css";

const TranslationInfoPanel = ({
  books,
  author,
  totalChapters,
  totalWords,
  averageWordsPerChapter,
  setBooks,
  setAuthor,
}) => {
  const [isEditingBooks, setIsEditingBooks] = useState(false);
  const [isEditingAuthor, setIsEditingAuthor] = useState(false);
  const [editedBooks, setEditedBooks] = useState(books);
  const [editedAuthor, setEditedAuthor] = useState(author);

  const handleSaveBooks = () => {
    setIsEditingBooks(false);
    // Gọi hàm prop setBooks nếu muốn cập nhật ra ngoài component
    setBooks(editedBooks);
  };

  const handleCancelBooks = () => {
    setEditedBooks(books);
    setIsEditingBooks(false);
  };

  const handleSaveAuthor = () => {
    setIsEditingAuthor(false);
    // Gọi hàm prop setAuthor nếu muốn cập nhật ra ngoài component
    setAuthor(editedAuthor);
  };

  const handleCancelAuthor = () => {
    setEditedAuthor(author);
    setIsEditingAuthor(false);
  };
  return (
    <div className="tip-container">
      <h3 className="tip-title">📊 Thông tin tệp đã tải lên</h3>
      <div className="tip-body">
        <p>
          <strong>📖 Tên truyện:</strong>{" "}
          {isEditingBooks ? (
            <span className={`tip-body-books fade-toggle show`}>
              <input
                type="text"
                className="books-input"
                value={editedBooks}
                onChange={(e) => setEditedBooks(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveBooks();
                }}
                autoFocus
                onFocus={(e) => e.target.select()}
              />
              <span onClick={handleSaveBooks}>💾 Lưu</span>
              <span onClick={handleCancelBooks}>❌ Huỷ</span>
            </span>
          ) : (
            <>
              {books}
              <span className="tip-body-books">
                <span
                  onClick={() => {
                    setIsEditingBooks(true);
                    setEditedBooks(books); // đặt lại giá trị chính xác
                  }}
                >
                  ✏️ Sửa
                </span>
              </span>
            </>
          )}
        </p>

        <p>
          <strong>✍️ Tác giả:</strong>{" "}
          {isEditingAuthor ? (
            <span className={`tip-body-author fade-toggle show`}>
              <input
                type="text"
                className="author-input"
                value={editedAuthor}
                onChange={(e) => setEditedAuthor(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveAuthor();
                }}
                autoFocus
                onFocus={(e) => e.target.select()}
              />
              <span onClick={handleSaveAuthor}>💾 Lưu</span>
              <span onClick={handleCancelAuthor}>❌ Huỷ</span>
            </span>
          ) : (
            <>
              {author}
              <span className="tip-body-author">
                <span
                  onClick={() => {
                    setIsEditingAuthor(true);
                    setEditedAuthor(author);
                  }}
                >
                  ✏️ Sửa
                </span>
              </span>
            </>
          )}
        </p>
        <p>
          <strong>📘 Tổng số chương:</strong> {totalChapters}
        </p>
        <p>
          <strong>📝 Tổng số từ:</strong> {totalWords}
        </p>
        <p>
          <strong>📊 Số chữ trung bình mỗi chương:</strong>{" "}
          {averageWordsPerChapter}
        </p>
      </div>
    </div>
  );
};

export default TranslationInfoPanel;
