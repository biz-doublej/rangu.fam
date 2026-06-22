use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, TrayIconBuilder, TrayIconEvent},
    Manager, WindowEvent,
};

/// 메인 창을 보이게 + 최소화 해제 + 포커스. (트레이 '열기'/더블클릭 공통)
fn show_main_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // ── 시스템 트레이 ──────────────────────────────────────────────
            // 메뉴: '랑구 택틱스 열기' / '완전 종료'
            let show_i = MenuItem::with_id(app, "show", "랑구 택틱스 열기", true, None::<&str>)?;
            let quit_i = MenuItem::with_id(app, "quit", "완전 종료", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_i, &quit_i])?;

            TrayIconBuilder::with_id("main-tray")
                // 번들에 박힌 앱 아이콘을 트레이 아이콘으로 재사용(추가 에셋 불필요)
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("랑구 택틱스")
                .menu(&menu)
                // 좌클릭은 메뉴를 열지 않음 → 우클릭에서 메뉴 표시(요건). 좌더블클릭은 아래 이벤트로 복원.
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => show_main_window(app),
                    "quit" => app.exit(0), // 트레이 핸들러 포함 전부 정리하고 프로세스 종료
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    // 아이콘 좌클릭 더블 → 창 복원
                    if let TrayIconEvent::DoubleClick {
                        button: MouseButton::Left,
                        ..
                    } = event
                    {
                        show_main_window(tray.app_handle());
                    }
                })
                .build(app)?;

            Ok(())
        })
        // ── 닫기(X) 가로채기 → 종료 대신 트레이로 숨기기 ────────────────────
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                let _ = window.hide(); // 백그라운드 상주(트레이에서 복원/종료)
                api.prevent_close(); // 실제 닫힘/종료 취소
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
