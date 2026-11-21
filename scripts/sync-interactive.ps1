$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$source = Join-Path $root 'prototype'
$destination = Join-Path $root 'interactive'
$runtimeFiles = @(
    'index.html'
    'prototype.css'
    'prototype.js'
    'table-audio.js'
    'cabin-mesh.js'
    'cabin-view.js'
    'ghost-idle.js'
    'golden-veil.js'
    'skin-mirror.js'
    'art/celadon-brocade-sheet.png'
    'art/celadon-idle.png'
    'art/celadon-idle-expression.png'
    'art/celadon-ghost.png'
    'art/celadon-ghost-expression.png'
    'art/project-stamps.png'
    'art/polygon-cabin.webp'
)

foreach ($file in $runtimeFiles) {
    if (-not (Test-Path -LiteralPath (Join-Path $source $file) -PathType Leaf)) {
        throw "Missing runtime file: prototype/$file"
    }
}

foreach ($file in $runtimeFiles) {
    $target = Join-Path $destination $file
    [void][System.IO.Directory]::CreateDirectory((Split-Path -Parent $target))
    Copy-Item -LiteralPath (Join-Path $source $file) -Destination $target
}
Write-Output "Synced $($runtimeFiles.Count) runtime files to interactive/."
