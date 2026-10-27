
Option Explicit

' ============================================
' MARCADOR CBA
' Instalador del inicio automatico MONDO
' Windows 10
' ============================================

Dim fso, shell
Dim carpeta, servidor, protocolo, ejecutor
Dim node, npm, wscriptExe
Dim inicioWindows, escritorio
Dim archivo, acceso, comando, resultado

Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")

carpeta = fso.GetParentFolderName(WScript.ScriptFullName)
servidor = fso.BuildPath(carpeta, "servidor.mjs")
protocolo = fso.BuildPath(carpeta, "protocolo.mjs")
ejecutor = fso.BuildPath(carpeta, "iniciar-oculto.vbs")

' 1. COMPROBAR ARCHIVOS

If Not fso.FileExists(servidor) Then
    MsgBox "Falta servidor.mjs en puente-mondo.", _
        vbCritical, "Marcador CBA"
    WScript.Quit 1
End If

If Not fso.FileExists(protocolo) Then
    MsgBox "Falta protocolo.mjs en puente-mondo.", _
        vbCritical, "Marcador CBA"
    WScript.Quit 1
End If

' 2. LOCALIZAR NODE.JS

Function BuscarPrograma(nombre)

    Dim proceso, salida, lineas

    BuscarPrograma = ""

    On Error Resume Next

    Set proceso = shell.Exec( _
        "cmd.exe /d /c where " & nombre _
    )

    If Err.Number <> 0 Then
        Err.Clear
        On Error GoTo 0
        Exit Function
    End If

    salida = Trim(proceso.StdOut.ReadAll)

    If proceso.ExitCode = 0 And Len(salida) > 0 Then
        lineas = Split(salida, vbCrLf)
        BuscarPrograma = Trim(lineas(0))
    End If

    On Error GoTo 0

End Function

Function EntreComillas(texto)
    EntreComillas = Chr(34) & texto & Chr(34)
End Function

Function LiteralVBS(texto)
    LiteralVBS = Chr(34) & _
        Replace(texto, Chr(34), Chr(34) & Chr(34)) & _
        Chr(34)
End Function

node = BuscarPrograma("node.exe")
npm = BuscarPrograma("npm.cmd")

If node = "" Or npm = "" Then
    MsgBox _
        "No se ha encontrado Node.js." & vbCrLf & _
        "Instala Node.js en el PC y vuelve a abrir " & _
        "este instalador.", _
        vbCritical, "Marcador CBA"

    WScript.Quit 1
End If

' 3. PREPARAR DEPENDENCIAS

If Not fso.FileExists( _
    fso.BuildPath(carpeta, "package.json")) Then

    Set archivo = fso.CreateTextFile( _
        fso.BuildPath(carpeta, "package.json"), _
        True, False _
    )

    archivo.WriteLine "{"
    archivo.WriteLine "  ""name"": ""cba-mondo-bridge"","
    archivo.WriteLine "  ""private"": true,"
    archivo.WriteLine "  ""type"": ""module"","
    archivo.WriteLine "  ""dependencies"": {"
    archivo.WriteLine "    ""serialport"": ""^13.0.0"","
    archivo.WriteLine "    ""ws"": ""^8.18.0"""
    archivo.WriteLine "  }"
    archivo.WriteLine "}"

    archivo.Close

End If

If Not fso.FileExists( _
    fso.BuildPath(carpeta, _
        "node_modules\serialport\package.json")) _
Or Not fso.FileExists( _
    fso.BuildPath(carpeta, _
        "node_modules\ws\package.json")) Then

    MsgBox _
        "Se instalaran las dependencias del servidor MONDO." & _
        vbCrLf & "Es necesaria conexion a Internet.", _
        vbInformation, "Marcador CBA"

    shell.CurrentDirectory = carpeta

    comando = "cmd.exe /d /s /c " & Chr(34) & _
        EntreComillas(npm) & _
        " install --no-audit --no-fund" & Chr(34)

    resultado = shell.Run(comando, 1, True)

    If resultado <> 0 Then
        MsgBox _
            "No se pudieron instalar las dependencias." & _
            vbCrLf & "Revisa el error mostrado.", _
            vbCritical, "Marcador CBA"

        WScript.Quit 1
    End If

End If

' 4. CREAR EJECUTOR OCULTO

Set archivo = fso.CreateTextFile( _
    ejecutor, True, False _
)

archivo.WriteLine "Option Explicit"
archivo.WriteLine "Dim sh, peticion"
archivo.WriteLine "Set sh = CreateObject(""WScript.Shell"")"

archivo.WriteLine "Function ServidorActivo()"
archivo.WriteLine "    ServidorActivo = False"
archivo.WriteLine "    On Error Resume Next"

archivo.WriteLine _
    "    Set peticion = CreateObject(" & _
    """MSXML2.ServerXMLHTTP.6.0"")"

archivo.WriteLine _
    "    peticion.setTimeouts 500, 500, 1000, 1000"

archivo.WriteLine _
    "    peticion.Open ""GET"", " & _
    """http://127.0.0.1:8765/estado"", False"

archivo.WriteLine "    peticion.Send"

archivo.WriteLine "    If Err.Number = 0 Then"
archivo.WriteLine _
    "        ServidorActivo = (peticion.Status = 200)"
archivo.WriteLine "    End If"

archivo.WriteLine "    Err.Clear"
archivo.WriteLine "    On Error GoTo 0"
archivo.WriteLine "End Function"

archivo.WriteLine _
    "sh.CurrentDirectory = " & LiteralVBS(carpeta)

archivo.WriteLine "Do"

archivo.WriteLine _
    "    If ServidorActivo() Then Exit Do"

archivo.WriteLine _
    "    sh.Run " & _
    LiteralVBS( _
        EntreComillas(node) & " " & _
        EntreComillas(servidor) _
    ) & ", 0, True"

archivo.WriteLine "    WScript.Sleep 5000"
archivo.WriteLine "Loop"

archivo.Close

' 5. LOCALIZAR CARPETAS WINDOWS

wscriptExe = shell.ExpandEnvironmentStrings( _
    "%SystemRoot%" _
) & "\System32\wscript.exe"

inicioWindows = shell.SpecialFolders("Startup")
escritorio = shell.SpecialFolders("Desktop")

' 6. CREAR INICIO AUTOMATICO

Set acceso = shell.CreateShortcut( _
    fso.BuildPath( _
        inicioWindows, _
        "CBA - Servidor MONDO.lnk" _
    ) _
)

acceso.TargetPath = wscriptExe
acceso.Arguments = "//B //Nologo " & _
    EntreComillas(ejecutor)

acceso.WorkingDirectory = carpeta
acceso.Description = "Inicio automatico del servidor MONDO"
acceso.WindowStyle = 7

acceso.Save

' 7. CREAR BOTON EN EL ESCRITORIO

Set acceso = shell.CreateShortcut( _
    fso.BuildPath( _
        escritorio, _
        "Iniciar servidor MONDO.lnk" _
    ) _
)

acceso.TargetPath = wscriptExe
acceso.Arguments = "//B //Nologo " & _
    EntreComillas(ejecutor)

acceso.WorkingDirectory = carpeta
acceso.Description = "Iniciar el puente COM4 de MONDO"
acceso.WindowStyle = 7

acceso.Save

' 8. INICIAR AHORA

shell.Run _
    EntreComillas(wscriptExe) & _
    " //B //Nologo " & _
    EntreComillas(ejecutor), _
    0, False

' 9. CONFIRMAR INSTALACION

MsgBox _
    "Instalacion completada." & vbCrLf & vbCrLf & _
    "El servidor se iniciara automaticamente al " & _
    "iniciar sesion en Windows." & vbCrLf & vbCrLf & _
    "Tambien se ha creado el acceso directo:" & _
    vbCrLf & "Iniciar servidor MONDO" & vbCrLf & vbCrLf & _
    "Se ha solicitado el arranque del servidor ahora.", _
    vbInformation, "Marcador CBA"
