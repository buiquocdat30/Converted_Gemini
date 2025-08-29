import React, { useState } from 'react';
import './TranslationBot.css';
import { parseCommand } from './BotLogic';
import { handleBotAction } from './BotService';

export default function TranslationBot() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isOpen, setIsOpen] = useState(false);

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

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  const toggleBot = () => {
    setIsOpen(!isOpen);
  };

  if (!isOpen) {
    return (
      <div className="bot-toggle-button" onClick={toggleBot}>
        🤖
        <span className="tooltip-text">Mở Translation Bot</span>
      </div>
    );
  }

  return (
    <div className="bot-container">
      <div className="bot-header">
        <span>Translation Bot</span>
        <button className="bot-close-btn" onClick={toggleBot}>✕</button>
      </div>
      <div className="bot-messages">
        {messages.length === 0 ? (
          <div className="bot-welcome">
            <p>🤖 Xin chào! Tôi là Translation Bot, hãy cho tôi biết bạn cần gì:</p>
            <div className="bot-commands">
              <p><strong>Các lệnh hỗ trợ:</strong></p>
              <ul>
                <li><code>dịch [nội dung]</code> - Dịch nội dung</li>
                <li><code>thêm truyện [tên truyện]</code> - Thêm truyện mới</li>
                <li><code>thêm chương [tên chương]</code> - Thêm chương mới</li>
                <li><code>thêm key [api_key]</code> - Thêm API key</li>
              </ul>
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx} className={`bot-message ${msg.sender}`}>
              {msg.text}
            </div>
          ))
        )}
      </div>
      <div className="bot-input">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Nhập lệnh..."
        />
        <button onClick={handleSend}>Gửi</button>
      </div>
    </div>
  );
}
