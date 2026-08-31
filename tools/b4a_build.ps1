param(
    [string]$B4ABuilder = $env:B4A_BUILDER,
    [string]$Project = (Join-Path $PSScriptRoot "..\AeroCalculator.b4a")
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

# B4ABuilder command-line syntax depends on the installed B4A generation.
# Keep the executable and project explicit. Add release/signing options only
# in a controlled release environment, never in pull-request CI.
& $B4ABuilder $Project
if ($LASTEXITCODE -ne 0) {
    throw "B4A build failed with exit code $LASTEXITCODE."
}
