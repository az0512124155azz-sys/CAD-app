import React, { useEffect, useRef } from 'react';
import { Send, Camera, Settings, MessageSquare, Loader } from 'lucide-react';
import '../styles/ChatInterface.css';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatInterfaceProps {
  messages: Message[];
  input: string;
  onInputChange: (value: string) => void;
  onSend: (text?: string) => void;
  onScreenshot: () => void;
  loading: boolean;
  inputRef: React.RefObject<HTMLInputElement>;
  screenshot: string | null;
  showSettings: () => void;
  toggleBubble: () => void;
}

export default function ChatInterface({
  messages,
  input,
  onInputChange,
  onSend,
  onScreenshot,
  loading,
  inputRef,
  screenshot,
  showSettings,
  toggleBubble,
}: ChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="chat-interface">
      <div className="chat-header">
        <div className="header-title">
          <MessageSquare size={20} />
          <span>AI Screen Control</span>
        </div>
        <div className="header-actions">
          <button className="icon-btn" onClick={showSettings} title="Settings">
            <Settings size={18} />
          </button>
          <button className="icon-btn" onClick={toggleBubble} title="Toggle Bubble">
            <span className="icon-text">⊕</span>
          </button>
        </div>
      </div>

      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="empty-state">
            <MessageSquare size={48} />
            <h2>Welcome to AI Screen Control</h2>
            <p>Take a screenshot and ask questions about what you see,</p>
            <p>or control your screen with AI assistance.</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`message message-${msg.role}`}>
              <div className="message-avatar">
                {msg.role === 'user' ? '👤' : '🤖'}
              </div>
              <div className="message-content">
                <div className="message-text">{msg.content}</div>
                <div className="message-time">
                  {msg.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))
        )}
        {loading && (
          <div className="message message-assistant loading">
            <div className="message-avatar">🤖</div>
            <div className="message-content">
              <Loader className="spinner" size={20} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {screenshot && (
        <div className="screenshot-preview">
          <img src={`file://${screenshot}`} alt="Current screenshot" />
          <button className="remove-btn" onClick={() => onScreenshot()}>
            ✕
          </button>
        </div>
      )}

      <div className="chat-input-area">
        <div className="input-actions">
          <button
            className="action-btn"
            onClick={onScreenshot}
            title="Take Screenshot"
          >
            <Camera size={20} />
          </button>
        </div>

        <div className="input-wrapper">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about the screen or give commands..."
            disabled={loading}
          />
          <button
            className="send-btn"
            onClick={() => onSend()}
            disabled={!input.trim() || loading}
          >
            {loading ? <Loader className="spinner" size={20} /> : <Send size={20} />}
          </button>
        </div>
      </div>
    </div>
  );
}
