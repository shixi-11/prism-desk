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
    MessageBox MB_OK|MB_ICONEXCLAMATION "Please close this installation of Prism Desk, then run Setup again." /SD IDOK
    Abort
  prism_target_ready:
!macroend
