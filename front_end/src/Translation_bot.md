
# Translation Bot Documentation

## 1. Cấu trúc Bot

```
components/
  ├── TranslationBot.jsx   # UI chat bot
  ├── BotLogic.js          # Xử lý parser lệnh
  ├── BotService.js        # Gọi API / tương tác ConvertContext
  └── TranslationBot.css   # Style cửa sổ chat nhỏ góc phải
```

Luồng hoạt động:

1. Người dùng nhập lệnh vào UI (TranslationBot.jsx).
2. BotLogic.js parse lệnh, xác định loại hành động (dịch, thêm truyện, thêm chương, thêm key...).
3. BotService.js gọi API hoặc xử lý qua ConvertContext theo hành động đã parse.
4. Kết quả trả về UI để hiển thị trong cửa sổ chat.

---

## 2. TranslationBot.jsx (UI chat bot)

```jsx
import React, { useState } from 'react';
import './TranslationBot.css';
import { parseCommand } from './BotLogic';
import { handleBotAction } from './BotService';

export default function TranslationBot() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { sender: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);

    const command = parseCommand(input);
    const response = await handleBotAction(command);
    const botMessage = { sender: 'bot', text: response };

    setMessages(prev => [...prev, botMessage]);
    setInput('');
  };

  return (
    <div className="bot-container">
      <div className="bot-header">Translation Bot</div>
      <div className="bot-messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={`bot-message ${msg.sender}`}>
            {msg.text}
          </div>
        ))}
      </div>
      <div className="bot-input">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Nhập lệnh..."
        />
        <button onClick={handleSend}>Gửi</button>
      </div>
    </div>
  );
}
```

---

## 3. BotLogic.js (Parser lệnh)

```javascript
export function parseCommand(input) {
  const text = input.toLowerCase();

  if (text.startsWith('dịch')) {
    return { type: 'translate', payload: text.replace('dịch', '').trim() };
  }
  if (text.startsWith('thêm truyện')) {
    return { type: 'addStory', payload: text.replace('thêm truyện', '').trim() };
  }
  if (text.startsWith('thêm chương')) {
    return { type: 'addChapter', payload: text.replace('thêm chương', '').trim() };
  }
  if (text.startsWith('thêm key')) {
    return { type: 'addKey', payload: text.replace('thêm key', '').trim() };
  }

  return { type: 'unknown', payload: text };
}
```

---

## 4. BotService.js (Gọi API / dùng ConvertContext)

```javascript
export async function handleBotAction(command) {
  switch (command.type) {
    case 'translate':
      return `Đang dịch: ${command.payload}`;

    case 'addStory':
      // Gọi API thêm truyện
      return `Truyện "${command.payload}" đã được thêm.`;

    case 'addChapter':
      // Gọi API thêm chương
      return `Chương "${command.payload}" đã được thêm.`;

    case 'addKey':
      // Gọi API lưu API Key
      return `API Key "${command.payload}" đã được lưu.`;

    default:
      return `Xin lỗi, tôi chưa hiểu lệnh: ${command.payload}`;
  }
}
```

---

## 5. TranslationBot.css (style cửa sổ chat nhỏ góc phải)

```css
.bot-container {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 300px;
  height: 400px;
  display: flex;
  flex-direction: column;
  border: 1px solid #ccc;
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  font-family: Arial, sans-serif;
}

.bot-header {
  background: #007bff;
  color: white;
  padding: 10px;
  border-radius: 10px 10px 0 0;
  text-align: center;
  font-weight: bold;
}

.bot-messages {
  flex: 1;
  padding: 10px;
  overflow-y: auto;
}

.bot-message {
  margin: 5px 0;
  padding: 8px;
  border-radius: 5px;
  max-width: 80%;
}

.bot-message.user {
  background: #e1f5fe;
  align-self: flex-end;
}

.bot-message.bot {
  background: #f1f1f1;
  align-self: flex-start;
}

.bot-input {
  display: flex;
  border-top: 1px solid #ccc;
}

.bot-input input {
  flex: 1;
  border: none;
  padding: 10px;
  border-radius: 0 0 0 10px;
  outline: none;
}

.bot-input button {
  border: none;
  background: #007bff;
  color: white;
  padding: 10px 15px;
  border-radius: 0 0 10px 0;
  cursor: pointer;
}
```
