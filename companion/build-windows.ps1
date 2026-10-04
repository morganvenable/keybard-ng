$ErrorActionPreference = 'Stop'
Push-Location $PSScriptRoot
try {
    python -m pip install -r requirements.txt 'pyinstaller>=6.11,<7'
    if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed' }
    python -m unittest discover -s tests -v
    if ($LASTEXITCODE -ne 0) { throw 'Companion tests failed' }
    python -m context_companion --smoke-test
    if ($LASTEXITCODE -ne 0) { throw 'UI smoke test failed' }
    python -m PyInstaller --noconfirm --clean --onedir --windowed --name KeybardContext --hidden-import hid launcher.py
    if ($LASTEXITCODE -ne 0) { throw 'Windows packaging failed' }
    Copy-Item -Recurse -Force browser-extension dist/KeybardContext/browser-extension
    Copy-Item README.md dist/KeybardContext/README.md
    Copy-Item -Recurse -Force examples dist/KeybardContext/examples
    $env:KEYBARD_CONTEXT_SMOKE = '1'
    try {
        $process = Start-Process -FilePath "$PSScriptRoot/dist/KeybardContext/KeybardContext.exe" -ArgumentList '--smoke-test' -PassThru
        if (-not $process.WaitForExit(20000)) { $process.Kill(); throw 'Packaged UI smoke test timed out' }
        if ($process.ExitCode -ne 0) { throw "Packaged UI smoke test failed ($($process.ExitCode))" }
    } finally { Remove-Item Env:KEYBARD_CONTEXT_SMOKE -ErrorAction SilentlyContinue }
    Compress-Archive -Force -Path dist/KeybardContext -DestinationPath dist/KeybardContext-Windows.zip
} finally { Pop-Location }
