$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$source = Join-Path $root 'prototype'
$destination = Join-Path $root 'interactive'
$runtimeFiles = @(
    'index.html'
    'prototype.css'
    'prototype.js'
    'table-audio.js'
    'art/book-prints.js'
    'art/bloodborne.png'
    'art/nightreign.png'
    'card-art.js'
    'cabin-mesh.js'
    'cabin-view.js'
    'ghost-idle.js'
    'golden-veil.js'
    'skin-mirror.js'
    'art/celadon-brocade-sheet.png'
    'art/dream-doll-idle.png'
    'art/celadon-idle.png'
    'art/celadon-idle-expression.png'
    'art/celadon-ghost.png'
    'art/celadon-ghost-expression.png'
    'art/project-stamps.png'
    'portrait-light.js'
)

foreach ($file in $runtimeFiles) {
    if (-not (Test-Path -LiteralPath (Join-Path $source $file) -PathType Leaf)) {
        throw "Missing runtime file: prototype/$file"
    }
}

# Keep the double-click HTML preview in step with the editable PNG sources.
$pngs = [ordered]@{}
foreach ($name in @('bloodborne', 'nightreign')) {
    $pngs[$name] = [Convert]::ToBase64String([IO.File]::ReadAllBytes((Join-Path $source "art/$name.png")))
}
$loader = Join-Path $source 'art/book-prints.js'
$code = [IO.File]::ReadAllText($loader)
$code = $code -replace '(?m)^const offlineBookPNGs = [^;]+;', ('const offlineBookPNGs = ' + ($pngs | ConvertTo-Json -Compress) + ';')
[IO.File]::WriteAllText($loader, $code, [Text.UTF8Encoding]::new($false))

foreach ($file in $runtimeFiles) {
    $target = Join-Path $destination $file
    [void][System.IO.Directory]::CreateDirectory((Split-Path -Parent $target))
    Copy-Item -LiteralPath (Join-Path $source $file) -Destination $target
}
Write-Output "Synced $($runtimeFiles.Count) runtime files to interactive/."
