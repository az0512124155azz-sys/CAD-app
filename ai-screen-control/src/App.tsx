import React, { useState, useRef, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Mic, Send, Settings, Loader } from 'lucide-react';
import FloatingBubble from './components/FloatingBubble';
import ChatInterface from './components/ChatInterface';
import SettingsPanel from './components/SettingsPanel';
import './App.css';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState(localStorage.getItem('claude_api_key') || '');
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [isBubbleVisible, setIsBubbleVisible] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('claude_api_key', apiKey);
  }, [apiKey]);

  const takeScreenshot = async () => {
    try {
      const result: any = await invoke('screenshot');
      if (result.success && result.data) {
        setScreenshot(result.data);
        addMessage({
          role: 'assistant',
          content: '📸 Screenshot captured. Ready to analyze.',
        });
      }
    } catch (error) {
      console.error('Screenshot failed:', error);
      addMessage({
        role: 'assistant',
        content: '❌ Failed to capture screenshot.',
      });
    }
  };

  const sendMessage = async (text?: string) => {
    const messageText = text || input;
    if (!messageText.trim() || !apiKey) return;

    addMessage({
      role: 'user',
      content: messageText,
    });

    setInput('');
    setLoading(true);

    try {
      const result: any = await invoke('send_to_ai', {
        question: messageText,
        screenshot: screenshot,
        apiKey: apiKey,
        model: 'claude-3-5-sonnet-20241022',
      });

      if (result.success) {
        addMessage({
          role: 'assistant',
          content: result.response,
        });
      }
    } catch (error) {
      console.error('AI request failed:', error);
      addMessage({
        role: 'assistant',
        content: `❌ Error: ${String(error)}`,
      });
    } finally {
      setLoading(false);
    }
  };

  const addMessage = (msg: Omit<Message, 'id' | 'timestamp'>) => {
    setMessages((prev) => [
      ...prev,
      {
        ...msg,
        id: Date.now().toString(),
        timestamp: new Date(),
      },
    ]);
  };

  if (showSettings) {
    return (
      <SettingsPanel
        apiKey={apiKey}
        onApiKeyChange={setApiKey}
        onClose={() => setShowSettings(false)}
      />
    );
  }

  return (
    <div className="app-container">
      {isBubbleVisible && (
        <FloatingBubble
          onScreenshot={takeScreenshot}
          onSettings={() => setShowSettings(true)}
          onToggle={() => setIsBubbleVisible(false)}
          messageCount={messages.length}
        />
      )}

      <ChatInterface
        messages={messages}
        input={input}
        onInputChange={setInput}
        onSend={sendMessage}
        onScreenshot={takeScreenshot}
        loading={loading}
        inputRef={inputRef}
        screenshot={screenshot}
        showSettings={() => setShowSettings(true)}
        toggleBubble={() => setIsBubbleVisible(!isBubbleVisible)}
      />
    </div>
  );
}
