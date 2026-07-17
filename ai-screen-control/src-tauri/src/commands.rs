// Tauri Commands - Handle Screen Control and AI Integration

use serde::{Serialize, Deserialize};
use std::process::Command;

#[derive(Serialize, Deserialize, Debug)]
pub struct ScreenshotResult {
  pub success: bool,
  pub message: String,
  pub data: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct AIRequest {
  pub question: String,
  pub screenshot: Option<String>,
  pub api_key: String,
  pub model: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct AIResponse {
  pub success: bool,
  pub response: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct MouseControl {
  pub x: i32,
  pub y: i32,
  pub button: String,
  pub action: String, // "move", "click", "drag"
}

#[derive(Serialize, Deserialize, Debug)]
pub struct KeyboardControl {
  pub keys: Vec<String>,
  pub action: String, // "press", "release", "type"
  pub text: Option<String>,
}

// Take a screenshot using platform-specific tools
#[tauri::command]
pub async fn screenshot() -> Result<ScreenshotResult, String> {
  #[cfg(target_os = "linux")]
  {
    let output = Command::new("gnome-screenshot")
      .arg("-f")
      .arg("/tmp/screenshot.png")
      .output()
      .map_err(|e| e.to_string())?;

    if output.status.success() {
      return Ok(ScreenshotResult {
        success: true,
        message: "Screenshot saved".to_string(),
        data: Some("/tmp/screenshot.png".to_string()),
      });
    }
  }

  #[cfg(target_os = "windows")]
  {
    let output = Command::new("powershell")
      .arg("-Command")
      .arg("[System.Windows.Forms.Screen]::PrimaryScreen | ForEach-Object { $bitmap = New-Object System.Drawing.Bitmap($_.Bounds.Width, $_.Bounds.Height); $graphics = [System.Drawing.Graphics]::FromImage($bitmap); $graphics.CopyFromScreen($_.Bounds.Location, [System.Drawing.Point]::Empty, $_.Bounds.Size); $bitmap.Save('C:\\\\temp\\\\screenshot.png'); $graphics.Dispose(); $bitmap.Dispose() }")
      .output()
      .map_err(|e| e.to_string())?;

    if output.status.success() {
      return Ok(ScreenshotResult {
        success: true,
        message: "Screenshot saved".to_string(),
        data: Some("C:\\temp\\screenshot.png".to_string()),
      });
    }
  }

  #[cfg(target_os = "macos")]
  {
    let output = Command::new("screencapture")
      .arg("-x")
      .arg("/tmp/screenshot.png")
      .output()
      .map_err(|e| e.to_string())?;

    if output.status.success() {
      return Ok(ScreenshotResult {
        success: true,
        message: "Screenshot saved".to_string(),
        data: Some("/tmp/screenshot.png".to_string()),
      });
    }
  }

  Err("Failed to take screenshot".to_string())
}

// Send request to Claude API
#[tauri::command]
pub async fn send_to_ai(request: AIRequest) -> Result<AIResponse, String> {
  let client = reqwest::Client::new();

  let body = serde_json::json!({
    "model": request.model,
    "messages": [
      {
        "role": "user",
        "content": [
          {
            "type": "text",
            "text": request.question
          },
          {
            "type": "image",
            "source": {
              "type": "base64",
              "media_type": "image/png",
              "data": request.screenshot
            }
          }
        ]
      }
    ]
  });

  let response = client
    .post("https://api.anthropic.com/v1/messages")
    .header("x-api-key", &request.api_key)
    .header("anthropic-version", "2023-06-01")
    .json(&body)
    .send()
    .await
    .map_err(|e| e.to_string())?;

  let result = response.json::<serde_json::Value>().await.map_err(|e| e.to_string())?;

  let response_text = result["content"][0]["text"]
    .as_str()
    .unwrap_or("No response")
    .to_string();

  Ok(AIResponse {
    success: true,
    response: response_text,
  })
}

// Control mouse
#[tauri::command]
pub async fn control_mouse(control: MouseControl) -> Result<String, String> {
  #[cfg(target_os = "linux")]
  {
    match control.action.as_str() {
      "move" => {
        Command::new("xdotool")
          .args(&["mousemove", &control.x.to_string(), &control.y.to_string()])
          .output()
          .map_err(|e| e.to_string())?;
      }
      "click" => {
        let button = match control.button.as_str() {
          "left" => "1",
          "right" => "3",
          "middle" => "2",
          _ => "1",
        };
        Command::new("xdotool")
          .args(&["click", button])
          .output()
          .map_err(|e| e.to_string())?;
      }
      _ => {}
    }
  }

  #[cfg(target_os = "windows")]
  {
    let ps_cmd = match control.action.as_str() {
      "move" => format!(
        "[System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point({}, {})",
        control.x, control.y
      ),
      "click" => "[System.Windows.Forms.SendKeys]::SendWait('+{{F10}}')".to_string(),
      _ => String::new(),
    };

    Command::new("powershell")
      .arg("-Command")
      .arg(ps_cmd)
      .output()
      .map_err(|e| e.to_string())?;
  }

  Ok("Mouse controlled".to_string())
}

// Control keyboard
#[tauri::command]
pub async fn control_keyboard(control: KeyboardControl) -> Result<String, String> {
  #[cfg(target_os = "linux")]
  {
    match control.action.as_str() {
      "type" => {
        if let Some(text) = control.text {
          Command::new("xdotool")
            .args(&["type", &text])
            .output()
            .map_err(|e| e.to_string())?;
        }
      }
      "press" => {
        for key in control.keys {
          Command::new("xdotool")
            .args(&["key", &key])
            .output()
            .map_err(|e| e.to_string())?;
        }
      }
      _ => {}
    }
  }

  Ok("Keyboard controlled".to_string())
}

// Get window information
#[tauri::command]
pub async fn get_window_info() -> Result<serde_json::Value, String> {
  Ok(serde_json::json!({
    "platform": std::env::consts::OS,
    "arch": std::env::consts::ARCH,
  }))
}
