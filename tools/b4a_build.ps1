param(
    [string]$B4ABuilder = $env:B4A_BUILDER,
    [string]$Project = (Join-Path $PSScriptRoot "..\AeroCalculator.b4a"),
    [ValidateSet("Build", "BuildBundle")]
    [string]$Task = "Build",
    [string]$KeyFile = "",
    [string]$KeyPassword = "",
    [string]$KeyAlias = "b4a"
)

$ErrorActionPreference = "Stop"

if (-not $B4ABuilder) {
    throw "Set B4A_BUILDER to the full path of B4ABuilder.exe."
}
if (-not (Test-Path $B4ABuilder)) {
    throw "B4ABuilder.exe was not found at: $B4ABuilder"
}
if (-not (Test-Path $Project)) {
    throw "B4A project was not found at: $Project"
}

$B4ABuilder = (Resolve-Path $B4ABuilder).Path
$ProjectPath = (Resolve-Path $Project).Path
$BaseFolder = Split-Path -Parent $ProjectPath

# B4ABuilder tokenizes the -BaseFolder/-Project values with a strict command-line
# parser that rejects quoted paths containing spaces (for example the base folder
# "07. AeroCalculator"). The proven invocation is to launch B4ABuilder from the
# project folder and let it auto-detect the single .b4a project in the current
# folder.
if (-not (Test-Path (Join-Path $BaseFolder "*.b4a"))) {
    throw "No .b4a project file was found in: $BaseFolder"
}

# Additional libraries (for example the community RichString library) live in the
# project-local Libraries folder. B4ABuilder only looks in its global/computed
# library folders, so register the project Libraries folder through the B4A INI
# AdditionalLibrariesFolder setting. A throwaway copy of the INI is used so the
# user's IDE settings are never modified.
$DefaultIni = Join-Path $env:APPDATA "Anywhere Software\Basic4android\b4xV5.ini"
if (-not (Test-Path $DefaultIni)) {
    throw "B4A INI was not found at: $DefaultIni"
}

$LibrariesFolder = Join-Path $BaseFolder "Libraries"
if (-not (Test-Path $LibrariesFolder)) {
    throw "Project Libraries folder was not found at: $LibrariesFolder"
}

$BuildIni = Join-Path $env:TEMP ("b4a_build_" + $PID + ".ini")
$iniText = [IO.File]::ReadAllText($DefaultIni)
$iniText = $iniText -replace 'AdditionalLibrariesFolder=[^\r\n]*', ("AdditionalLibrariesFolder=" + $LibrariesFolder)

$NoSign = $true
if ($KeyFile) {
    if (-not (Test-Path $KeyFile)) {
        throw "Signing keystore was not found at: $KeyFile"
    }
    $NoSign = $false
    $resolvedKey = (Resolve-Path $KeyFile).Path
    $iniText = $iniText -replace 'SignKeyFile=[^\r\n]*', ("SignKeyFile=" + $resolvedKey)
    if ($KeyPassword) {
        $iniText = $iniText -replace 'SignKeyPassword=[^\r\n]*', ("SignKeyPassword=" + $KeyPassword)
    }
    if ($KeyAlias) {
        $iniText = $iniText -replace 'SignKeyAlias=[^\r\n]*', ("SignKeyAlias=" + $KeyAlias)
    }
}
[IO.File]::WriteAllText($BuildIni, $iniText, [Text.Encoding]::UTF8)

# The repository can live under OneDrive, which marks generated folders read-only.
# B4ABuilder's clean step then fails with "access denied" when recreating them.
$ObjectsDir = Join-Path $BaseFolder "Objects"
if (Test-Path $ObjectsDir) {
    attrib -R /S /D (Join-Path $ObjectsDir "*") *> $null
}

try {
    $NoSignArg = "True"
    if (-not $NoSign) {
        $NoSignArg = "False"
    }

    Push-Location $BaseFolder
    try {
        & $B4ABuilder "-Task=$Task" "-NoSign=$NoSignArg" "-ShowWarnings=True" "-INI=$BuildIni"
        if ($LASTEXITCODE -ne 0) {
            throw "B4A build failed with exit code $LASTEXITCODE."
        }
    }
    finally {
        Pop-Location
    }
}
finally {
    Remove-Item -LiteralPath $BuildIni -ErrorAction SilentlyContinue
}
