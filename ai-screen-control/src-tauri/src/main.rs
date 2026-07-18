// AI Screen Control - Tauri 2 backend entry point
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod media;
use commands::{screenshot, send_to_ai, control_mouse, control_keyboard, get_window_info};
use media::{check_media_tools, analyze_media_local};

fn main() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![
      screenshot,
      send_to_ai,
      control_mouse,
      control_keyboard,
      get_window_info,
      check_media_tools,
      analyze_media_local
    ])
    .run(tauri::generate_context!())
    .expect("error while running AI Screen Control");
}
