import React, { useState } from 'react';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';
import '../styles/VideoAnalyzer.css';

interface VideoAnalyzerProps {
  videoUrl?: string;
  onAnalyze?: (analysis: string) => void;
  loading?: boolean;
}

export default function VideoAnalyzer({
  videoUrl = '',
  onAnalyze,
  loading = false,
}: VideoAnalyzerProps) {
  const [url, setUrl] = useState(videoUrl);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [analysisPrompt, setAnalysisPrompt] = useState('');

  const handleAnalyze = () => {
    if (url && analysisPrompt) {
      onAnalyze?.(analysisPrompt);
    }
  };

  return (
    <div className="video-analyzer">
      <h3>🎥 Video Analysis (Gemini)</h3>

      <div className="video-url-input">
        <label htmlFor="video-url">YouTube Video URL</label>
        <input
          id="video-url"
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://youtube.com/watch?v=..."
          disabled={loading}
        />
      </div>

      {url && (
        <div className="video-preview">
          <div className="video-controls">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="control-btn"
            >
              {isPlaying ? <Pause size={20} /> : <Play size={20} />}
            </button>
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="control-btn"
            >
              {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
          </div>
          <p className="video-status">
            {isPlaying ? 'Playing...' : 'Ready to analyze'}
          </p>
        </div>
      )}

      <div className="analysis-prompt">
        <label htmlFor="analysis-prompt">What do you want to know about this video?</label>
        <textarea
          id="analysis-prompt"
          value={analysisPrompt}
          onChange={(e) => setAnalysisPrompt(e.target.value)}
          placeholder="E.g., Summarize the main points, What's the title?, When does the action start?"
          disabled={loading}
          rows={4}
        />
      </div>

      <button
        className="analyze-btn"
        onClick={handleAnalyze}
        disabled={!url || !analysisPrompt || loading}
      >
        {loading ? 'Analyzing...' : 'Analyze Video'}
      </button>
    </div>
  );
}
