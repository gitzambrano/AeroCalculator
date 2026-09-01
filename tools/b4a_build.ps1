param(
    [string]$B4ABuilder = $env:B4A_BUILDER,
    [string]$Project = (Join-Path $PSScriptRoot "..\AeroCalculator.b4a"),
    [ValidateSet("Build", "BuildBundle")]
    [string]$Task = "Build"
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

$ProjectPath = (Resolve-Path $Project).Path
$BaseFolder = Split-Path -Parent $ProjectPath
$ProjectFile = Split-Path -Leaf $ProjectPath

$BuilderArgs = @(
    "-Task=$Task",
    "-BaseFolder=$BaseFolder",
    "-Project=$ProjectFile",
    "-NoSign=True",
    "-ShowWarnings=True"
)

& $B4ABuilder @BuilderArgs
if ($LASTEXITCODE -ne 0) {
    throw "B4A build failed with exit code $LASTEXITCODE."
}
