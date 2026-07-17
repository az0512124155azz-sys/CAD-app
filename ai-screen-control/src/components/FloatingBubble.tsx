import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, Camera, Settings, ChevronUp } from 'lucide-react';
import '../styles/FloatingBubble.css';

interface FloatingBubbleProps {
  onScreenshot: () => void;
  onSettings: () => void;
  onToggle: () => void;
  messageCount: number;
}

export default function FloatingBubble({
  onScreenshot,
  onSettings,
  onToggle,
  messageCount,
}: FloatingBubbleProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [position, setPosition] = useState({ x: window.innerWidth - 120, y: window.innerHeight - 150 });
  const bubbleRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef({ x: 0, y: 0, bubbleX: 0, bubbleY: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      bubbleX: position.x,
      bubbleY: position.y,
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (dragStart.current.x === 0) return;

      const deltaX = e.clientX - dragStart.current.x;
      const deltaY = e.clientY - dragStart.current.y;

      setPosition({
        x: dragStart.current.bubbleX + deltaX,
        y: dragStart.current.bubbleY + deltaY,
      });
    };

    const handleMouseUp = () => {
      dragStart.current = { x: 0, y: 0, bubbleX: 0, bubbleY: 0 };
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [position]);

  return (
    <div
      ref={bubbleRef}
      className={`floating-bubble ${isExpanded ? 'expanded' : 'collapsed'}`}
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 10000,
      }}
    >
      <div className="bubble-main" onMouseDown={handleMouseDown}>
        <button
          className="bubble-btn main-btn"
          onClick={() => setIsExpanded(!isExpanded)}
          title="AI Screen Control"
        >
          <MessageCircle size={24} />
          {messageCount > 0 && <span className="message-badge">{messageCount}</span>}
        </button>
      </div>

      {isExpanded && (
        <div className="bubble-menu">
          <button
            className="bubble-btn menu-btn"
            onClick={() => {
              onScreenshot();
              setIsExpanded(false);
            }}
            title="Take Screenshot"
          >
            <Camera size={20} />
          </button>

          <button
            className="bubble-btn menu-btn"
            onClick={() => {
              onSettings();
              setIsExpanded(false);
            }}
            title="Settings"
          >
            <Settings size={20} />
          </button>

          <button
            className="bubble-btn menu-btn collapse-btn"
            onClick={() => setIsExpanded(false)}
            title="Collapse"
          >
            <ChevronUp size={20} />
          </button>
        </div>
      )}
    </div>
  );
}
