import React, { useState } from 'react';
import { Mouse, Keyboard, Zap, AlertCircle } from 'lucide-react';
import '../styles/ScreenControlPanel.css';

interface ScreenControlPanelProps {
  onMouseControl?: (x: number, y: number, action: string) => void;
  onKeyboardControl?: (keys: string[], text?: string) => void;
  onExecuteAction?: (action: string) => void;
  loading?: boolean;
}

export default function ScreenControlPanel({
  onMouseControl,
  onKeyboardControl,
  onExecuteAction,
  loading = false,
}: ScreenControlPanelProps) {
  const [command, setCommand] = useState('');
  const [mouseX, setMouseX] = useState(0);
  const [mouseY, setMouseY] = useState(0);
  const [selectedKey, setSelectedKey] = useState('');

  const handleMouseClick = () => {
    onMouseControl?.(mouseX, mouseY, 'click');
  };

  const handleMouseMove = () => {
    onMouseControl?.(mouseX, mouseY, 'move');
  };

  const handleKeyPress = () => {
    if (selectedKey) {
      onKeyboardControl?.([selectedKey]);
    }
  };

  const handleTypeText = () => {
    if (command) {
      onKeyboardControl?.([], command);
    }
  };

  const executeCommand = () => {
    onExecuteAction?.(command);
  };

  return (
    <div className="screen-control-panel">
      <div className="panel-header">
        <Zap size={20} />
        <h3>Screen Control (Beta)</h3>
      </div>

      <div className="warning-box">
        <AlertCircle size={16} />
        <span>⚠️ Screen control requires explicit permission</span>
      </div>

      {/* Mouse Control */}
      <div className="control-section">
        <h4>
          <Mouse size={18} />
          Mouse Control
        </h4>

        <div className="input-group">
          <label>X Position</label>
          <input
            type="number"
            value={mouseX}
            onChange={(e) => setMouseX(Number(e.target.value))}
            placeholder="0"
            disabled={loading}
          />
        </div>

        <div className="input-group">
          <label>Y Position</label>
          <input
            type="number"
            value={mouseY}
            onChange={(e) => setMouseY(Number(e.target.value))}
            placeholder="0"
            disabled={loading}
          />
        </div>

        <div className="button-group">
          <button
            onClick={handleMouseMove}
            disabled={loading}
            className="btn-secondary"
          >
            Move Mouse
          </button>
          <button
            onClick={handleMouseClick}
            disabled={loading}
            className="btn-secondary"
          >
            Click
          </button>
        </div>
      </div>

      {/* Keyboard Control */}
      <div className="control-section">
        <h4>
          <Keyboard size={18} />
          Keyboard Control
        </h4>

        <div className="input-group">
          <label>Key to Press</label>
          <select
            value={selectedKey}
            onChange={(e) => setSelectedKey(e.target.value)}
            disabled={loading}
          >
            <option value="">Select a key...</option>
            <option value="Enter">Enter</option>
            <option value="Escape">Escape</option>
            <option value="Tab">Tab</option>
            <option value="Space">Space</option>
            <option value="Delete">Delete</option>
            <option value="Backspace">Backspace</option>
            <option value="ArrowUp">Arrow Up</option>
            <option value="ArrowDown">Arrow Down</option>
            <option value="ArrowLeft">Arrow Left</option>
            <option value="ArrowRight">Arrow Right</option>
          </select>
        </div>

        <button
          onClick={handleKeyPress}
          disabled={!selectedKey || loading}
          className="btn-secondary"
        >
          Press Key
        </button>
      </div>

      {/* Text Input */}
      <div className="control-section">
        <h4>Type Text</h4>

        <div className="input-group">
          <label>Text to Type</label>
          <input
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder="Text to type..."
            disabled={loading}
          />
        </div>

        <button
          onClick={handleTypeText}
          disabled={!command || loading}
          className="btn-secondary"
        >
          Type Text
        </button>
      </div>

      {/* AI Commands */}
      <div className="control-section">
        <h4>AI Commands</h4>

        <div className="input-group">
          <label>Command</label>
          <input
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder="E.g., Click the blue button, Scroll down"
            disabled={loading}
          />
        </div>

        <button
          onClick={executeCommand}
          disabled={!command || loading}
          className="btn-primary"
        >
          Execute Command
        </button>
      </div>

      <div className="info-box">
        <p>💡 Tip: Use natural language commands for AI-powered screen control</p>
        <p>Examples: "Click the submit button", "Fill the email field", "Scroll down"</p>
      </div>
    </div>
  );
}
