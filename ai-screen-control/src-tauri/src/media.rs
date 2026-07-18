// Local video & audio analysis — no cloud API required.
//
// Pipeline:
//   YouTube URL --(yt-dlp)--> local file
//   video file --(ffmpeg)--> sampled frames --> Ollama vision model (llava etc.)
//   audio track --(ffmpeg)--> wav --(whisper CLI)--> transcript
//   transcript + frame notes + question --> Ollama --> final answer
//
// Everything runs on the user's machine: ffmpeg, yt-dlp and whisper are free
// local tools, Ollama serves the models at http://localhost:11434.

use base64::{engine::general_purpose::STANDARD as B64, Engine as _};
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::process::Command;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tauri::Emitter;

const OLLAMA_URL: &str = "http://localhost:11434";
const FRAME_COUNT: usize = 6;

#[derive(Serialize, Deserialize, Debug)]
pub struct MediaTools {
  pub ffmpeg: bool,
  pub ffprobe: bool,
  pub ytdlp: bool,
  pub whisper: bool,
  pub ollama: bool,
  pub ollama_models: Vec<String>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct MediaAnalysis {
  pub success: bool,
  pub answer: String,
  pub transcript: Option<String>,
  pub frame_notes: Vec<String>,
}

fn has_cmd(cmd: &str, arg: &str) -> bool {
  Command::new(cmd)
    .arg(arg)
    .output()
    .map(|o| o.status.success())
    .unwrap_or(false)
}

fn emit_progress(app: &tauri::AppHandle, stage: &str, detail: &str, percent: u8) {
  let _ = app.emit(
    "media-progress",
    serde_json::json!({ "stage": stage, "detail": detail, "percent": percent }),
  );
}

fn http_client(secs: u64) -> Result<reqwest::Client, String> {
  reqwest::Client::builder()
    .timeout(Duration::from_secs(secs))
    .build()
    .map_err(|e| e.to_string())
}

// Which local helper tools are installed?
#[tauri::command]
pub async fn check_media_tools() -> Result<MediaTools, String> {
  let ffmpeg = has_cmd("ffmpeg", "-version");
  let ffprobe = has_cmd("ffprobe", "-version");
  let ytdlp = has_cmd("yt-dlp", "--version");
  let whisper = has_cmd("whisper", "--help");

  let mut ollama = false;
  let mut ollama_models = Vec::new();
  if let Ok(client) = http_client(4) {
    if let Ok(resp) = client.get(format!("{}/api/tags", OLLAMA_URL)).send().await {
      if resp.status().is_success() {
        ollama = true;
        if let Ok(v) = resp.json::<serde_json::Value>().await {
          if let Some(models) = v["models"].as_array() {
            for m in models {
              if let Some(name) = m["name"].as_str() {
                ollama_models.push(name.to_string());
              }
            }
          }
        }
      }
    }
  }

  Ok(MediaTools { ffmpeg, ffprobe, ytdlp, whisper, ollama, ollama_models })
}

fn work_dir() -> Result<PathBuf, String> {
  let stamp = SystemTime::now()
    .duration_since(UNIX_EPOCH)
    .map_err(|e| e.to_string())?
    .as_millis();
  let dir = std::env::temp_dir().join(format!("aisc-media-{}", stamp));
  std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
  Ok(dir)
}

fn is_youtube_or_url(source: &str) -> bool {
  source.starts_with("http://") || source.starts_with("https://")
}

fn is_audio_file(path: &Path) -> bool {
  matches!(
    path
      .extension()
      .and_then(|e| e.to_str())
      .unwrap_or("")
      .to_lowercase()
      .as_str(),
    "mp3" | "wav" | "m4a" | "aac" | "ogg" | "opus" | "flac" | "wma"
  )
}

fn download_with_ytdlp(url: &str, dir: &Path) -> Result<PathBuf, String> {
  let template = dir.join("media.%(ext)s");
  let output = Command::new("yt-dlp")
    .args([
      "-f",
      "bv*[height<=720]+ba/b[height<=720]/b",
      "--max-filesize",
      "1000M",
      "--no-playlist",
      "-o",
    ])
    .arg(&template)
    .arg(url)
    .output()
    .map_err(|e| format!("yt-dlp failed to start: {}", e))?;

  if !output.status.success() {
    return Err(format!(
      "yt-dlp could not download the video: {}",
      String::from_utf8_lossy(&output.stderr)
    ));
  }

  // Find whichever extension yt-dlp produced (mp4 / mkv / webm ...)
  let entries = std::fs::read_dir(dir).map_err(|e| e.to_string())?;
  for entry in entries.flatten() {
    let p = entry.path();
    if p
      .file_name()
      .and_then(|n| n.to_str())
      .map(|n| n.starts_with("media."))
      .unwrap_or(false)
    {
      return Ok(p);
    }
  }
  Err("yt-dlp finished but no media file was found".to_string())
}

fn media_duration_secs(path: &Path) -> f64 {
  Command::new("ffprobe")
    .args([
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
    ])
    .arg(path)
    .output()
    .ok()
    .and_then(|o| String::from_utf8(o.stdout).ok())
    .and_then(|s| s.trim().parse::<f64>().ok())
    .unwrap_or(60.0)
}

fn extract_frames(path: &Path, dir: &Path, duration: f64) -> Vec<(f64, PathBuf)> {
  let mut frames = Vec::new();
  for i in 0..FRAME_COUNT {
    let t = duration * (i as f64 + 0.5) / FRAME_COUNT as f64;
    let out = dir.join(format!("frame_{}.jpg", i));
    let ok = Command::new("ffmpeg")
      .args(["-y", "-ss", &format!("{:.2}", t), "-i"])
      .arg(path)
      .args(["-frames:v", "1", "-vf", "scale='min(768,iw)':-2", "-q:v", "4"])
      .arg(&out)
      .output()
      .map(|o| o.status.success())
      .unwrap_or(false);
    if ok && out.exists() {
      frames.push((t, out));
    }
  }
  frames
}

fn extract_audio_wav(path: &Path, dir: &Path) -> Option<PathBuf> {
  let out = dir.join("audio.wav");
  let ok = Command::new("ffmpeg")
    .args(["-y", "-i"])
    .arg(path)
    .args(["-vn", "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le"])
    .arg(&out)
    .output()
    .map(|o| o.status.success())
    .unwrap_or(false);
  if ok && out.exists() {
    Some(out)
  } else {
    None
  }
}

fn transcribe_with_whisper(wav: &Path, dir: &Path) -> Option<String> {
  let ok = Command::new("whisper")
    .arg(wav)
    .args(["--model", "base", "--output_format", "txt", "--fp16", "False", "--output_dir"])
    .arg(dir)
    .output()
    .map(|o| o.status.success())
    .unwrap_or(false);
  if !ok {
    return None;
  }
  std::fs::read_to_string(dir.join("audio.txt"))
    .ok()
    .map(|s| s.trim().to_string())
    .filter(|s| !s.is_empty())
}

async fn ollama_generate(
  model: &str,
  prompt: &str,
  images: Vec<String>,
) -> Result<String, String> {
  let client = http_client(600)?;
  let mut body = serde_json::json!({
    "model": model,
    "prompt": prompt,
    "stream": false
  });
  if !images.is_empty() {
    body["images"] = serde_json::json!(images);
  }
  let resp = client
    .post(format!("{}/api/generate", OLLAMA_URL))
    .json(&body)
    .send()
    .await
    .map_err(|e| format!("Ollama request failed: {}", e))?;
  if !resp.status().is_success() {
    return Err(format!(
      "Ollama returned an error ({}). Is the model '{}' pulled? Try: ollama pull {}",
      resp.status(),
      model,
      model
    ));
  }
  let v = resp
    .json::<serde_json::Value>()
    .await
    .map_err(|e| e.to_string())?;
  Ok(v["response"].as_str().unwrap_or("").to_string())
}

fn truncate(s: &str, max: usize) -> String {
  if s.chars().count() <= max {
    s.to_string()
  } else {
    let cut: String = s.chars().take(max).collect();
    format!("{}\n[...transcript truncated...]", cut)
  }
}

// Analyze a local video/audio file or a YouTube/web URL — fully offline AI.
#[tauri::command]
pub async fn analyze_media_local(
  app: tauri::AppHandle,
  source: String,
  question: String,
  vision_model: Option<String>,
  text_model: Option<String>,
) -> Result<MediaAnalysis, String> {
  let vision_model = vision_model.unwrap_or_else(|| "llava".to_string());
  let text_model = text_model.unwrap_or_else(String::new);
  let text_model = if text_model.trim().is_empty() { vision_model.clone() } else { text_model };

  if !has_cmd("ffmpeg", "-version") {
    return Err("ffmpeg is not installed. Install it from ffmpeg.org (it's free) and try again.".to_string());
  }

  let dir = work_dir()?;
  let result = run_analysis(&app, &dir, &source, &question, &vision_model, &text_model).await;
  let _ = std::fs::remove_dir_all(&dir);
  result
}

async fn run_analysis(
  app: &tauri::AppHandle,
  dir: &Path,
  source: &str,
  question: &str,
  vision_model: &str,
  text_model: &str,
) -> Result<MediaAnalysis, String> {
  // 1. Resolve the source to a local file
  let file: PathBuf = if is_youtube_or_url(source) {
    if !has_cmd("yt-dlp", "--version") {
      return Err(
        "yt-dlp is not installed, so YouTube/web videos can't be fetched. Install it free with: pip install yt-dlp (or download from github.com/yt-dlp). Local files work without it.".to_string(),
      );
    }
    emit_progress(app, "download", "Downloading video with yt-dlp...", 5);
    download_with_ytdlp(source, dir)?
  } else {
    let p = PathBuf::from(source.trim());
    if !p.exists() {
      return Err(format!("File not found: {}", p.display()));
    }
    p
  };

  let audio_only = is_audio_file(&file);
  let duration = media_duration_secs(&file);

  // 2. Frames -> vision model
  let mut frame_notes: Vec<String> = Vec::new();
  if !audio_only {
    emit_progress(app, "frames", "Extracting frames with ffmpeg...", 20);
    let frames = extract_frames(&file, dir, duration);
    if frames.is_empty() {
      return Err("Could not extract any frames from this file — is it a valid video?".to_string());
    }
    let total = frames.len();
    for (i, (t, frame_path)) in frames.iter().enumerate() {
      emit_progress(
        app,
        "vision",
        &format!("Analyzing frame {}/{} with {}...", i + 1, total, vision_model),
        25 + ((i * 35) / total) as u8,
      );
      let bytes = std::fs::read(frame_path).map_err(|e| e.to_string())?;
      let b64 = B64.encode(&bytes);
      let prompt = format!(
        "This is frame {}/{} of a video, taken at {:.0} seconds. Describe what is visible, focusing on anything relevant to this question: {}",
        i + 1, total, t, question
      );
      match ollama_generate(vision_model, &prompt, vec![b64]).await {
        Ok(desc) => frame_notes.push(format!("[{:.0}s] {}", t, desc.trim())),
        Err(e) => {
          if i == 0 {
            // First frame failing usually means the model/Ollama is missing — surface it.
            return Err(e);
          }
        }
      }
    }
  }

  // 3. Audio -> whisper transcript (optional, best-effort)
  let mut transcript: Option<String> = None;
  if has_cmd("whisper", "--help") {
    emit_progress(app, "audio", "Extracting audio track...", 62);
    if let Some(wav) = extract_audio_wav(&file, dir) {
      emit_progress(app, "transcribe", "Transcribing speech locally with Whisper...", 68);
      transcript = transcribe_with_whisper(&wav, dir);
    }
  } else if audio_only {
    return Err(
      "This is an audio file but Whisper is not installed. Install it free with: pip install openai-whisper".to_string(),
    );
  }

  // 4. Synthesize the final answer with a local text model
  emit_progress(app, "answer", &format!("Composing answer with {}...", text_model), 85);
  let mut context = String::new();
  if let Some(t) = &transcript {
    context.push_str(&format!("AUDIO TRANSCRIPT:\n{}\n\n", truncate(t, 8000)));
  }
  if !frame_notes.is_empty() {
    context.push_str("VIDEO FRAMES (sampled, with timestamps):\n");
    for note in &frame_notes {
      context.push_str(note);
      context.push('\n');
    }
    context.push('\n');
  }
  if context.is_empty() {
    return Err("No usable content could be extracted from this media file.".to_string());
  }

  let final_prompt = format!(
    "You are analyzing a {} that is about {:.0} seconds long. Below is data extracted from it locally.\n\n{}USER QUESTION: {}\n\nAnswer the question based only on the data above. Answer in the same language as the question.",
    if audio_only { "audio recording" } else { "video" },
    duration,
    context,
    question
  );

  let answer = ollama_generate(text_model, &final_prompt, Vec::new()).await?;
  emit_progress(app, "done", "Done", 100);

  Ok(MediaAnalysis {
    success: true,
    answer: answer.trim().to_string(),
    transcript,
    frame_notes,
  })
}
