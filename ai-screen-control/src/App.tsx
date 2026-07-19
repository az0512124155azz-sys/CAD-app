import React, { useState, useRef, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Mic, Send, Settings, Loader } from 'lucide-react';
import FloatingBubble from './components/FloatingBubble';
import ChatInterface from './components/ChatInterface';
import SettingsPanel from './components/SettingsPanel';
import VideoAnalyzer from './components/VideoAnalyzer';
import './App.css';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface OllamaStatus {
  connected: boolean;
  models: string[];
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [apiKey, setApiKey] = useState(localStorage.getItem('claude_api_key') || '');
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [isBubbleVisible, setIsBubbleVisible] = useState(true);
  const [ollama, setOllama] = useState<OllamaStatus>({ connected: false, models: [] });
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('claude_api_key', apiKey);
  }, [apiKey]);

  // Live connection status — polls Ollama every 5s so the badge flips
  // to "connected" within seconds of Ollama starting up.
  useEffect(() => {
    let alive = true;
    const check = () => {
      invoke<OllamaStatus>('check_ollama')
        .then((s) => { if (alive) setOllama(s); })
        .catch(() => { if (alive) setOllama({ connected: false, models: [] }); });
    };
    check();
    const id = setInterval(check, 5000);
    return () => { alive = false; clearInterval(id); };
  }, []);

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

  // Prefer a vision-capable local model when chatting through Ollama.
  // llama3.2-vision (mllama) is skipped — many Ollama builds can't run it.
  const pickOllamaModel = () => {
    const models = ollama.models.filter((m) => !m.includes('llama3.2-vision'));
    for (const pref of ['gemma3', 'llava', 'moondream', 'qwen3-vl', 'qwen2.5vl', 'minicpm-v']) {
      const hit = models.find((m) => m.includes(pref));
      if (hit) return hit;
    }
    return models[0] || 'gemma3';
  };

  const sendMessage = async (text?: string) => {
    const messageText = text || input;
    if (!messageText.trim()) return;
    if (!apiKey && !ollama.connected) {
      addMessage({
        role: 'assistant',
        content: '❌ Not connected. Add a Claude API key in Settings, or start Ollama (free local AI).',
      });
      return;
    }

    addMessage({
      role: 'user',
      content: messageText,
    });

    setInput('');
    setLoading(true);

    try {
      const result: any = apiKey
        ? await invoke('send_to_ai', {
            question: messageText,
            screenshot: screenshot,
            apiKey: apiKey,
            model: 'claude-3-5-sonnet-20241022',
          })
        : await invoke('send_to_ollama', {
            question: messageText,
            screenshot: screenshot,
            model: pickOllamaModel(),
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

  if (showVideo) {
    return <VideoAnalyzer onClose={() => setShowVideo(false)} />;
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
        showVideoAnalyzer={() => setShowVideo(true)}
        toggleBubble={() => setIsBubbleVisible(!isBubbleVisible)}
        ollamaConnected={ollama.connected}
        ollamaModel={ollama.connected ? pickOllamaModel() : ''}
        hasApiKey={!!apiKey}
      />
    </div>
  );
}
