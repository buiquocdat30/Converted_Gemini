import React, { useState } from "react";
import UploadForm from "./components/UploadForm";
import TranslatorApp from "./components/TranslatorApp";
import "./css/App.css";

const App = () => {
  const [chapters, setChapters] = useState([]);
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("gemini-2.0-flash");

  const handleParsedChapters = (parsedChapters, key, model) => {
    console.log("✔️ Nhận được từ UploadForm:", { parsedChapters, key, model });
    setChapters(parsedChapters);
    setApiKey(key);
    setModel(model);
  };

  const handleUpdateChapterContent = (index, newContent) => {
    setChapters((prev) =>
      prev.map((ch, i) => (i === index ? { ...ch, content: newContent } : ch))
    );
  };

  return (
    <div>
      {chapters.length === 0 ? (
        <UploadForm onFileParsed={handleParsedChapters} />
      ) : (
        <TranslatorApp
          apiKey={apiKey}
          chapters={chapters}
          model={model}
          setChapters={setChapters}
          onUpdateChapter={handleUpdateChapterContent}
        />
      )}
    </div>
  );
};

export default App;
