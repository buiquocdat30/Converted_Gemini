import React, { useState } from 'react';
import ChapterList from './ChapterList';
import TranslationViewer from './TranslationViewer';

const TranslatorApp = ({ chapters, apiKey }) => {
  const [translatedChapters, setTranslatedChapters] = useState([...chapters]);

  const handleUpdateTranslation = (index, translatedContent) => {
    const updated = [...translatedChapters];
    updated[index].content = translatedContent;
    setTranslatedChapters(updated);
  };

  return (
    <div style={{ display: 'flex', gap: 30 }}>
      <div style={{ flex: 1 }}>
        <ChapterList
          chapters={chapters}
          apiKey={apiKey}
          onTranslate={handleUpdateTranslation}
        />
      </div>
      <div style={{ flex: 2 }}>
        <TranslationViewer chapters={translatedChapters} />
      </div>
    </div>
  );
};

export default TranslatorApp;
