!define /redef SHORTCUT_NAME "$(prismName)"
!define /redef UNINSTALL_DISPLAY_NAME "$(prismName) ${VERSION}"
!define /ifndef INSTALL_REGISTRY_KEY "Software\${APP_GUID}"
!define MUI_LANGDLL_REGISTRY_ROOT HKCU
!define MUI_LANGDLL_REGISTRY_KEY "${INSTALL_REGISTRY_KEY}"
!define MUI_LANGDLL_REGISTRY_VALUENAME "InstallerLanguage"
!define MUI_LANGDLL_ALWAYSSHOW
!define MUI_LANGDLL_WINDOWTITLE "棱镜 / Prism"
!define MUI_LANGDLL_INFO "请选择安装语言 / Please select a language."
LangString prismName 1033 "Prism"
LangString prismName 2052 "棱镜"
LangString prismName 1028 "棱镜"
LangString prismBusy 1033 "Please close this installation of Prism, then run Setup again."
LangString prismBusy 2052 "请先退出此安装位置的棱镜，再重新运行安装程序。"
LangString prismBusy 1028 "請先退出此安裝位置的棱鏡，再重新執行安裝程式。"
!macro preInit
  ; Read the remembered language from the same registry view used by this x64 installer.
  SetRegView 64
!macroend

!macro customInstall
  WriteRegStr SHELL_CONTEXT "${INSTALL_REGISTRY_KEY}" InstallerLanguage $LANGUAGE
  FileOpen $R0 "$INSTDIR\prism-install-language.txt" w
  FileWrite $R0 "$LANGUAGE"
  FileClose $R0
  FileOpen $R0 "$INSTDIR\prism-install-key.txt" w
  FileWrite $R0 "${INSTALL_REGISTRY_KEY}"
  FileClose $R0
!macroend

!macro customUnInit
  !insertmacro MUI_UNGETLANGUAGE
!macroend

; Do not stop other Prism source checkouts merely because they share an EXE name.
; An in-use target must be closed by the user before replacing its files.
!macro customCheckAppRunning
  StrCpy $R9 0
  prism_target_check:
  IfFileExists "$INSTDIR\Prism.exe" 0 prism_target_ready
  System::Call 'kernel32::CreateFileW(w "$INSTDIR\Prism.exe", i 0x40000000, i 7, p 0, i 3, i 0, p 0) p .r0'
  IntCmp $0 -1 prism_target_wait
  System::Call 'kernel32::CloseHandle(p r0)'
  Goto prism_target_ready
  prism_target_wait:
    IntOp $R9 $R9 + 1
    StrCmp $R9 "40" prism_target_busy
    Sleep 250
    Goto prism_target_check
  prism_target_busy:
    MessageBox MB_OK|MB_ICONEXCLAMATION "$(prismBusy)" /SD IDOK
    Abort
  prism_target_ready:
!macroend
