import React, { useState } from 'react';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import '../styles/SettingsPanel.css';

interface SettingsPanelProps {
  apiKey: string;
  onApiKeyChange: (key: string) => void;
  onClose: () => void;
}

export default function SettingsPanel({
  apiKey,
  onApiKeyChange,
  onClose,
}: SettingsPanelProps) {
  const [showKey, setShowKey] = useState(false);
  const [tempKey, setTempKey] = useState(apiKey);

  const handleSave = () => {
    onApiKeyChange(tempKey);
    onClose();
  };

  return (
    <div className="settings-panel">
      <div className="settings-header">
        <button className="back-btn" onClick={onClose}>
          <ArrowLeft size={20} />
        </button>
        <h1>Settings</h1>
      </div>

      <div className="settings-content">
        <div className="setting-group">
          <label htmlFor="api-key">Claude API Key</label>
          <div className="api-key-input">
            <input
              id="api-key"
              type={showKey ? 'text' : 'password'}
              value={tempKey}
              onChange={(e) => setTempKey(e.target.value)}
              placeholder="sk-ant-..."
            />
            <button
              className="toggle-btn"
              onClick={() => setShowKey(!showKey)}
              type="button"
            >
              {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <p className="help-text">
            Get your API key from{' '}
            <a href="https://console.anthropic.com/account/keys" target="_blank" rel="noopener noreferrer">
              console.anthropic.com
            </a>
          </p>
        </div>

        <div className="setting-group">
          <h3>Available Models</h3>
          <ul className="models-list">
            <li>claude-3-5-sonnet-20241022 (Latest)</li>
            <li>claude-3-opus-20250219</li>
            <li>claude-3-haiku-20240307</li>
          </ul>
        </div>

        <div className="setting-group">
          <h3>Features</h3>
          <label className="checkbox-label">
            <input type="checkbox" defaultChecked disabled />
            <span>Screen Capture</span>
          </label>
          <label className="checkbox-label">
            <input type="checkbox" defaultChecked disabled />
            <span>Screen Control (Coming Soon)</span>
          </label>
          <label className="checkbox-label">
            <input type="checkbox" defaultChecked disabled />
            <span>Video Analysis (Coming Soon)</span>
          </label>
        </div>

        <div className="setting-group">
          <h3>Info</h3>
          <p className="info-text">Version: 1.0.0</p>
          <p className="info-text">Platform: {navigator.platform}</p>
        </div>
      </div>

      <div className="settings-footer">
        <button className="cancel-btn" onClick={onClose}>
          Cancel
        </button>
        <button className="save-btn" onClick={handleSave}>
          Save Changes
        </button>
      </div>
    </div>
  );
}
