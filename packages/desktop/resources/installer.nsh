!include "LogicLib.nsh"
!include "FileFunc.nsh"
!include "WinMessages.nsh"

; Keep the executable, application identity and Chinese shortcut names unchanged.
!define /redef APP_FILENAME "lol-assistant"

!ifndef BUILD_UNINSTALLER
  ; NSIS uses the final segment here when Browse selects a different parent folder.
  InstallDir "$LOCALAPPDATA\Programs\lol-assistant"
  Var /GLOBAL LolAssistantRegisteredDirectory

  !define MUI_PAGE_CUSTOMFUNCTION_LEAVE LolAssistantDirectoryLeave

  ; Replace the stock substring check with an exact final-folder check. The stock
  ; callback would otherwise add a new subfolder to older installation locations.
  !macro customPageAfterChangeDir
    !undef MUI_PAGE_CUSTOMFUNCTION_PRE
    !define MUI_PAGE_CUSTOMFUNCTION_PRE LolAssistantInstFilesPre
  !macroend

  !macro customHeader
    Function LolAssistantNormalizeDirectory
      ${If} $INSTDIR == ""
        Return
      ${EndIf}
      Push $0
      Push $1
      Push $2
      ; INSTDIR strips trailing separators, so normalize a drive root in a
      ; regular register before assigning the complete target back to INSTDIR.
      StrCpy $0 $INSTDIR
      StrLen $1 $0
      StrCpy $2 $0 1 1
      ${If} $1 == 2
      ${AndIf} $2 == ":"
        StrCpy $0 "$0\"
      ${EndIf}
      ; Unlike the NSIS instruction, the Windows API also accepts new folders.
      System::Call 'kernel32::GetFullPathNameW(w r0, i ${NSIS_MAX_STRLEN}, w .r1, p 0) i .r2'
      ${If} $2 > 0
      ${AndIf} $2 < ${NSIS_MAX_STRLEN}
        StrCpy $0 $1
      ${EndIf}

      trim_directory_separator:
        StrLen $1 $0
        StrCpy $2 $0 1 -1
        ${If} $1 > 3
        ${AndIf} $2 == "\"
          StrCpy $0 $0 -1
          Goto trim_directory_separator
        ${EndIf}

      ; Existing installations can have a legacy folder name. Reinstall in place.
      ${If} $0 == $LolAssistantRegisteredDirectory
      ${AndIf} $1 > 3
        Goto directory_ready
      ${EndIf}
      ${GetFileName} "$0" $1
      ${If} $1 != "lol-assistant"
        ${If} $2 == "\"
          StrCpy $0 $0 -1
        ${EndIf}
        StrCpy $0 "$0\lol-assistant"
      ${EndIf}
      directory_ready:
      StrCpy $INSTDIR $0
      Pop $2
      Pop $1
      Pop $0
    FunctionEnd

    Function LolAssistantReadRegisteredDirectory
      Push $0
      Push $1
      Push $2
      ReadRegStr $LolAssistantRegisteredDirectory SHELL_CONTEXT "${INSTALL_REGISTRY_KEY}" InstallLocation
      ${If} $LolAssistantRegisteredDirectory != ""
        StrCpy $0 $LolAssistantRegisteredDirectory
        System::Call 'kernel32::GetFullPathNameW(w r0, i ${NSIS_MAX_STRLEN}, w .r1, p 0) i .r2'
        ${If} $2 > 0
        ${AndIf} $2 < ${NSIS_MAX_STRLEN}
          StrCpy $LolAssistantRegisteredDirectory $1
        ${EndIf}
        trim_registered_separator:
          StrLen $0 $LolAssistantRegisteredDirectory
          StrCpy $1 $LolAssistantRegisteredDirectory 1 -1
          ${If} $0 > 3
          ${AndIf} $1 == "\"
            StrCpy $LolAssistantRegisteredDirectory $LolAssistantRegisteredDirectory -1
            Goto trim_registered_separator
          ${EndIf}
      ${EndIf}
      Pop $2
      Pop $1
      Pop $0
    FunctionEnd

    Function LolAssistantDirectoryLeave
      ; The native page commits INSTDIR after its leave callback; update the edit
      ; control as well so the path shown to the user matches the actual target.
      SendMessage $mui.DirectoryPage.Directory ${WM_GETTEXT} ${NSIS_MAX_STRLEN} "STR:$INSTDIR"
      Call LolAssistantReadRegisteredDirectory
      Call LolAssistantNormalizeDirectory
      SendMessage $mui.DirectoryPage.Directory ${WM_SETTEXT} 0 "STR:$INSTDIR"
    FunctionEnd

    Function LolAssistantInstFilesPre
      ; Keep the replaced stock callback referenced without executing its
      ; substring-based directory rewrite (NSIS treats unused code as a warning).
      Push $0
      GetFunctionAddress $0 instFilesPre
      Pop $0
      ; Silent updates must retain the currently installed location exactly.
      ${IfNot} ${isUpdated}
        Call LolAssistantReadRegisteredDirectory
        Call LolAssistantNormalizeDirectory
      ${EndIf}
    FunctionEnd
  !macroend
!endif
