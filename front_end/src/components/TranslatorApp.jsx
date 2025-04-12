import React, { useState } from "react";
import ChapterList from "./ChapterList";
import TranslateViewer from "./TranslateViewer";

const TranslatorApp = ({ apiKey, chapters, setChapters, onUpdateChapter }) => {
  const [translatedChapters, setTranslatedChapters] = useState([...chapters]);

  // const handleUpdateTranslation = (index, translatedContent) => {
  //   const updated = [...translatedChapters];
  //   updated[index].content = translatedContent;
  //   setTranslatedChapters(updated);
  // };

  return (
    <div style={{ display: "flex", gap: 30 }}>
      <div style={{ flex: 1 }}>
        <ChapterList
          chapters={chapters}
          apiKey={apiKey}
          onTranslate={onUpdateChapter}
        />
      </div>
      <div style={{ flex: 2 }}>
        <TranslateViewer
          chapters={translatedChapters}
          onUpdateChapter={onUpdateChapter}
        />
      </div>
    </div>
  );
};

export default TranslatorApp;
