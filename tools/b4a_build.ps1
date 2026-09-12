param(
    [string]$B4ABuilder = $env:B4A_BUILDER,
    [string]$Project = (Join-Path $PSScriptRoot "..\AeroCalculator.b4a"),
    [ValidateSet("Build", "BuildBundle")]
    [string]$Task = "Build",
    [string]$AdditionalLibrariesFolder = "",
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

# Additional libraries live in the project-local Libraries folder for normal local
# builds. CI can supply a prepared root that also contains vendored community
# libraries extracted from Install/*.zip. A throwaway INI copy keeps the user's IDE
# settings unchanged.
$DefaultIni = Join-Path $env:APPDATA "Anywhere Software\Basic4android\b4xV5.ini"
if (-not (Test-Path $DefaultIni)) {
    throw "B4A INI was not found at: $DefaultIni"
}

if (-not $AdditionalLibrariesFolder) {
    $AdditionalLibrariesFolder = Join-Path $BaseFolder "Libraries"
}
if (-not (Test-Path $AdditionalLibrariesFolder)) {
    throw "Additional libraries folder was not found at: $AdditionalLibrariesFolder"
}
$AdditionalLibrariesFolder = (Resolve-Path $AdditionalLibrariesFolder).Path

$BuildIni = Join-Path $env:TEMP ("b4a_build_" + $PID + ".ini")
$iniText = [IO.File]::ReadAllText($DefaultIni)
if ($iniText -match 'AdditionalLibrariesFolder=[^\r\n]*') {
    $iniText = $iniText -replace 'AdditionalLibrariesFolder=[^\r\n]*', ("AdditionalLibrariesFolder=" + $AdditionalLibrariesFolder)
}
else {
    $iniText += [Environment]::NewLine + "AdditionalLibrariesFolder=" + $AdditionalLibrariesFolder + [Environment]::NewLine
}

$NoSign = $true
if ($KeyFile) {
    if (-not (Test-Path $KeyFile)) {
        throw "Signing keystore was not found at: $KeyFile"
    }
    $NoSign = $false
    $resolvedKey = (Resolve-Path $KeyFile).Path
    if ($iniText -match 'SignKeyFile=[^\r\n]*') {
        $iniText = $iniText -replace 'SignKeyFile=[^\r\n]*', ("SignKeyFile=" + $resolvedKey)
    }
    else {
        $iniText += [Environment]::NewLine + "SignKeyFile=" + $resolvedKey + [Environment]::NewLine
    }
    if ($KeyPassword) {
        if ($iniText -match 'SignKeyPassword=[^\r\n]*') {
            $iniText = $iniText -replace 'SignKeyPassword=[^\r\n]*', ("SignKeyPassword=" + $KeyPassword)
        }
        else {
            $iniText += "SignKeyPassword=" + $KeyPassword + [Environment]::NewLine
        }
    }
    if ($KeyAlias) {
        if ($iniText -match 'SignKeyAlias=[^\r\n]*') {
            $iniText = $iniText -replace 'SignKeyAlias=[^\r\n]*', ("SignKeyAlias=" + $KeyAlias)
        }
        else {
            $iniText += "SignKeyAlias=" + $KeyAlias + [Environment]::NewLine
        }
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
