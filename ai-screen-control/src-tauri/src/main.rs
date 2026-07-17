// Tauri Backend - AI Screen Control

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::menu::{MenuBuilder, MenuItemBuilder};
use tauri::Manager;

mod commands;
use commands::{screenshot, send_to_ai, control_mouse, control_keyboard, get_window_info};

fn main() {
  let quit = MenuItemBuilder::new("Quit").build(tauri::menu::Menu::default(), None);
  let menu = MenuBuilder::new()
    .item(&quit)
    .build()
    .unwrap_or_default();

  tauri::Builder::default()
    .menu(menu)
    .on_menu_event(|app, event| {
      match event.id.as_ref() {
        "quit" => {
          app.exit(0);
        }
        _ => {}
      }
    })
    .invoke_handler(tauri::generate_handler![
      screenshot,
      send_to_ai,
      control_mouse,
      control_keyboard,
      get_window_info
    ])
    .build(tauri::generate_context!())
    .expect("error while building tauri application")
    .run(|_app_handle, event| {
      match event {
        tauri::RunEvent::ExitRequested { api, .. } => {
          api.prevent_exit();
        }
        _ => {}
      }
    });
}
