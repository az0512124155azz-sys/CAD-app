import React, { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { Film, X, Loader, CheckCircle2, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import '../styles/VideoAnalyzer.css';

interface MediaTools {
  ffmpeg: boolean;
  ffprobe: boolean;
  ytdlp: boolean;
  whisper: boolean;
  ollama: boolean;
  ollama_models: string[];
}

interface MediaAnalysis {
  success: boolean;
  answer: string;
  transcript: string | null;
  frame_notes: string[];
}

interface Progress {
  stage: string;
  detail: string;
  percent: number;
}

interface VideoAnalyzerProps {
  onClose: () => void;
}

export default function VideoAnalyzer({ onClose }: VideoAnalyzerProps) {
  const [source, setSource] = useState('');
  const [question, setQuestion] = useState('');
  const [visionModel, setVisionModel] = useState('llava');
  const [tools, setTools] = useState<MediaTools | null>(null);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [result, setResult] = useState<MediaAnalysis | null>(null);
  const [error, setError] = useState('');
  const [showTranscript, setShowTranscript] = useState(false);

  useEffect(() => {
    invoke<MediaTools>('check_media_tools')
      .then((t) => {
        setTools(t);
        // Auto-pick an installed vision model (newest first) so it just works.
        const vision = t.ollama_models.find((m) =>
          ['gemma3', 'llava', 'vision', 'moondream', 'qwen2.5vl', 'qwen3-vl', 'minicpm-v'].some(
            (v) => m.includes(v)
          )
        );
        if (vision) setVisionModel(vision);
      })
      .catch(() => setTools(null));

    const unlisten = listen<Progress>('media-progress', (event) => {
      setProgress(event.payload);
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  const analyze = async () => {
    if (!source.trim() || !question.trim() || running) return;
    setRunning(true);
    setError('');
    setResult(null);
    setProgress({ stage: 'start', detail: 'Starting local analysis...', percent: 1 });

    try {
      const res = await invoke<MediaAnalysis>('analyze_media_local', {
        source: source.trim(),
        question: question.trim(),
        visionModel: visionModel.trim() || 'llava',
        textModel: null,
      });
      setResult(res);
    } catch (e) {
      setError(String(e));
    } finally {
      setRunning(false);
      setProgress(null);
    }
  };

  const Tool = ({ ok, name, hint }: { ok: boolean; name: string; hint: string }) => (
    <div className={`tool-row ${ok ? 'ok' : 'missing'}`} title={hint}>
      {ok ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
      <span>{name}</span>
      {!ok && <em>{hint}</em>}
    </div>
  );

  return (
    <div className="video-analyzer">
      <div className="va-header">
        <h3>
          <Film size={18} /> Local Video &amp; Audio Analysis
        </h3>
        <button className="va-close" onClick={onClose} title="Close">
          <X size={18} />
        </button>
      </div>
      <p className="va-sub">
        100% on your computer — frames via ffmpeg, speech via Whisper, understanding via
        Ollama. No cloud API, no key, no cost.
      </p>

      {tools && (
        <div className="va-tools">
          <Tool ok={tools.ffmpeg} name="ffmpeg" hint="Required — install free from ffmpeg.org" />
          <Tool ok={tools.ollama} name="Ollama" hint="Required — install free from ollama.com" />
          <Tool ok={tools.ytdlp} name="yt-dlp" hint="For YouTube links — pip install yt-dlp" />
          <Tool ok={tools.whisper} name="Whisper" hint="For speech-to-text — pip install openai-whisper" />
        </div>
      )}

      <div className="va-field">
        <label htmlFor="va-source">Video / audio file path, or YouTube URL</label>
        <input
          id="va-source"
          type="text"
          value={source}
          onChange={(e) => setSource(e.target.value)}
          placeholder="C:\Videos\clip.mp4  or  https://youtube.com/watch?v=..."
          disabled={running}
        />
      </div>

      <div className="va-field">
        <label htmlFor="va-question">What do you want to know?</label>
        <textarea
          id="va-question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="E.g., Summarize this video, What happens at the start?, What is said about pricing?"
          disabled={running}
          rows={3}
        />
      </div>

      <div className="va-field va-model">
        <label htmlFor="va-model">Vision model (Ollama)</label>
        <input
          id="va-model"
          type="text"
          value={visionModel}
          onChange={(e) => setVisionModel(e.target.value)}
          list="va-models"
          disabled={running}
        />
        <datalist id="va-models">
          {(tools?.ollama_models || []).map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>
      </div>

      <button
        className="analyze-btn"
        onClick={analyze}
        disabled={!source.trim() || !question.trim() || running}
      >
        {running ? (
          <>
            <Loader className="spinner" size={16} /> Analyzing locally...
          </>
        ) : (
          'Analyze (offline)'
        )}
      </button>

      {running && progress && (
        <div className="va-progress">
          <div className="va-progress-bar">
            <div className="va-progress-fill" style={{ width: `${progress.percent}%` }} />
          </div>
          <span>{progress.detail}</span>
        </div>
      )}

      {error && <div className="va-error">{error}</div>}

      {result && (
        <div className="va-result">
          <h4>Answer</h4>
          <div className="va-answer">{result.answer}</div>
          {result.transcript && (
            <div className="va-transcript">
              <button onClick={() => setShowTranscript(!showTranscript)}>
                {showTranscript ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                Transcript
              </button>
              {showTranscript && <pre>{result.transcript}</pre>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
