param(
    [string]$B4AInstallDir = "C:\B4X\B4A",
    [string]$AndroidRoot = "C:\Android",
    [string]$JavaRoot = "C:\java",
    [string]$AdditionalLibrariesRoot = "C:\B4X\AdditionalLibs"
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

function Invoke-Download {
    param([string]$Uri, [string]$OutFile)
    Write-Host "Downloading $Uri"
    Invoke-WebRequest -Uri $Uri -OutFile $OutFile -UseBasicParsing
}

function Expand-With7Zip {
    param([string]$Archive, [string]$Destination)
    New-Item -ItemType Directory -Force -Path $Destination | Out-Null
    & 7z.exe x -y $Archive ("-o" + $Destination) | Out-Host
    if ($LASTEXITCODE -ne 0) {
        throw "7-Zip failed for $Archive with exit code $LASTEXITCODE"
    }
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$tempRoot = Join-Path $env:RUNNER_TEMP "aerocalculator-b4a"
New-Item -ItemType Directory -Force -Path $tempRoot | Out-Null

# B4A 14.0 is the current stable release. The official installer is an Inno Setup
# executable and supports unattended installation on the GitHub-hosted Windows runner.
$b4aInstaller = Join-Path $tempRoot "B4A.exe"
Invoke-Download "https://www.b4x.com/android/files/B4A.exe" $b4aInstaller
New-Item -ItemType Directory -Force -Path $B4AInstallDir | Out-Null
$installArgs = @(
    "/VERYSILENT",
    "/SUPPRESSMSGBOXES",
    "/NORESTART",
    "/SP-",
    ("/DIR=" + $B4AInstallDir)
)
$process = Start-Process -FilePath $b4aInstaller -ArgumentList $installArgs -Wait -PassThru
if ($process.ExitCode -ne 0) {
    throw "B4A installer failed with exit code $($process.ExitCode)"
}

$builder = Get-ChildItem -Path $B4AInstallDir -Filter "B4ABuilder.exe" -File -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $builder) {
    $builder = Get-ChildItem -Path "C:\Program Files", "C:\Program Files (x86)" -Filter "B4ABuilder.exe" -File -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
}
if (-not $builder) {
    throw "B4ABuilder.exe was not found after installing B4A."
}
Write-Host "B4ABuilder: $($builder.FullName)"

# Use the JDK build published in the official B4A installation instructions.
$jdkArchive = Join-Path $tempRoot "jdk-19.0.2.zip"
Invoke-Download "https://www.b4x.com/b4j/files/jdk-19.0.2.zip" $jdkArchive
if (Test-Path $JavaRoot) { Remove-Item -Recurse -Force $JavaRoot }
Expand-With7Zip $jdkArchive $JavaRoot
$javac = Get-ChildItem -Path $JavaRoot -Filter "javac.exe" -File -Recurse | Select-Object -First 1
if (-not $javac) { throw "javac.exe was not found after extracting the B4A JDK." }
$javaBin = Split-Path -Parent $javac.FullName
Write-Host "JavaBin: $javaBin"

# Install the exact Android resources recommended by the current B4A download page.
$sdkToolsArchive = Join-Path $tempRoot "commandlinetools-win.zip"
$resourcesArchive = Join-Path $tempRoot "resources_7_25.zip"
Invoke-Download "https://dl.google.com/android/repository/commandlinetools-win-13114758_latest.zip" $sdkToolsArchive
Invoke-Download "https://github.com/AnywhereSoftware/B4A/releases/download/7_25/resources_7_25.zip" $resourcesArchive
if (Test-Path $AndroidRoot) { Remove-Item -Recurse -Force $AndroidRoot }
Expand-With7Zip $sdkToolsArchive $AndroidRoot
Expand-With7Zip $resourcesArchive $AndroidRoot

$platformFolder = Join-Path $AndroidRoot "platforms\android-36"
$androidJar = Join-Path $platformFolder "android.jar"
if (-not (Test-Path $androidJar)) {
    throw "Android 36 platform was not found at $androidJar"
}

# Assemble project-specific external libraries without modifying tracked source files.
$b4aLibraries = Join-Path $AdditionalLibrariesRoot "B4A"
New-Item -ItemType Directory -Force -Path $b4aLibraries | Out-Null
Get-ChildItem -Path (Join-Path $repoRoot "Libraries") -File | Copy-Item -Destination $b4aLibraries -Force

$installFolder = Join-Path $repoRoot "Install"
if (Test-Path $installFolder) {
    foreach ($archive in Get-ChildItem -Path $installFolder -Filter "*.zip" -File) {
        $extractFolder = Join-Path $tempRoot ("lib-" + $archive.BaseName)
        Expand-With7Zip $archive.FullName $extractFolder
        Get-ChildItem -Path $extractFolder -Recurse -File | Where-Object {
            $_.Extension -in @(".jar", ".xml", ".b4xlib")
        } | ForEach-Object {
            Copy-Item $_.FullName -Destination $b4aLibraries -Force
        }
    }
}

Write-Host "Additional B4A libraries:"
Get-ChildItem -Path $b4aLibraries -File | Select-Object -ExpandProperty Name | Sort-Object | ForEach-Object { Write-Host "  $_" }

# B4ABuilder reads the same settings as the IDE. Creating this small CI-specific INI
# avoids any interactive first-run configuration while keeping the runner ephemeral.
$iniDir = Join-Path $env:APPDATA "Anywhere Software\Basic4android"
New-Item -ItemType Directory -Force -Path $iniDir | Out-Null
$iniPath = Join-Path $iniDir "b4xV5.ini"
$toolsFolder = Join-Path $AndroidRoot "tools"
$ini = @(
    "JavaBin=$javaBin",
    "PlatformFolder=$platformFolder",
    "ToolsFolder=$toolsFolder",
    "AdditionalLibrariesFolder=$AdditionalLibrariesRoot",
    "MaxRamForDex=2048"
) -join [Environment]::NewLine
[IO.File]::WriteAllText($iniPath, $ini + [Environment]::NewLine, [Text.Encoding]::UTF8)
Write-Host "B4A INI: $iniPath"
Get-Content $iniPath | ForEach-Object { Write-Host "  $_" }

# Export paths for subsequent GitHub Actions steps.
if ($env:GITHUB_ENV) {
    Add-Content -Path $env:GITHUB_ENV -Value ("B4A_BUILDER=" + $builder.FullName)
    Add-Content -Path $env:GITHUB_ENV -Value ("B4A_JAVA_BIN=" + $javaBin)
    Add-Content -Path $env:GITHUB_ENV -Value ("B4A_ANDROID_ROOT=" + $AndroidRoot)
    Add-Content -Path $env:GITHUB_ENV -Value ("B4A_PLATFORM_FOLDER=" + $platformFolder)
    Add-Content -Path $env:GITHUB_ENV -Value ("B4A_ADDITIONAL_LIBRARIES=" + $AdditionalLibrariesRoot)
}
