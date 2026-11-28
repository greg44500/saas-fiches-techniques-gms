<#
Collecte depuis Windows des archives chiffrées sur le VPS, sans port entrant
au domicile et sans envoyer de clé privée de déchiffrement vers le VPS.
#>
param(
    [Parameter(Mandatory = $true)][string] $Server,
    [Parameter(Mandatory = $true)][string] $Login,
    [Parameter(Mandatory = $true)][string] $IdentityFile,
    [Parameter(Mandatory = $true)][string] $Destination
)

$ErrorActionPreference = 'Stop'
if (-not (Test-Path -LiteralPath $Destination -PathType Container)) {
    throw "Le disque de destination est absent."
}
if (-not (Test-Path -LiteralPath $IdentityFile -PathType Leaf)) {
    throw "La clé privée SSH locale est absente."
}

$remote = ('{0}@{1}' -f $Login, $Server)
$sshOptions = @('-i', $IdentityFile, '-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=yes')
$folders = & ssh @sshOptions $remote 'find /var/backups/fichepilot/spool -mindepth 1 -maxdepth 1 -type d -name "20*" -printf "%f\n"'
if ($LASTEXITCODE -ne 0) {
    throw "Impossible de consulter le spool distant."
}

foreach ($folder in $folders) {
    if ($folder -notmatch '^\d{8}T\d{6}Z$') { continue }
    $target = Join-Path $Destination $folder
    $marker = Join-Path $target '.verified'
    if (Test-Path -LiteralPath $marker) { continue }

    $source = ('{0}:/var/backups/fichepilot/spool/{1}' -f $remote, $folder)
    & scp @sshOptions -r $source $Destination
    if ($LASTEXITCODE -ne 0) {
        throw "Échec du transfert : $folder."
    }

    $manifest = Join-Path $target 'SHA256SUMS'
    if (-not (Test-Path -LiteralPath $manifest -PathType Leaf)) {
        throw "Manifest SHA256 manquant : $folder."
    }

    $verified = 0
    foreach ($line in Get-Content -LiteralPath $manifest) {
        if ($line -notmatch '^([0-9a-f]{64})\s{2}([A-Za-z0-9._-]+)$') {
            throw "Ligne SHA256 invalide : $folder."
        }
        $expected = $Matches[1]
        $filename = $Matches[2]
        $file = Join-Path $target $filename
        if (-not (Test-Path -LiteralPath $file -PathType Leaf)) {
            throw "Archive attendue absente : $folder."
        }
        $actual = (Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash.ToLowerInvariant()
        if ($actual -ne $expected) {
            throw "Empreinte SHA256 incorrecte : $folder."
        }
        $verified++
    }
    if ($verified -ne 2) {
        throw "Nombre d'archives inattendu : $folder."
    }
    New-Item -Path $marker -ItemType File -Force | Out-Null
    Write-Output "Archives transférées et intègres : $folder"
}
