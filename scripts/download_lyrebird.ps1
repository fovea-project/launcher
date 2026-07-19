$ErrorActionPreference = 'Stop'

$version = "14.5.5"
$url = "https://archive.torproject.org/tor-package-archive/torbrowser/$version/tor-expert-bundle-windows-x86_64-$version.tar.gz"
$tarFile = "tor-expert.tar.gz"
$extractDir = "tor-expert"
$targetExe = "src-tauri\lyrebird.exe"

Write-Host "Downloading Tor Expert Bundle v$version..."
Invoke-WebRequest -Uri $url -OutFile $tarFile

Write-Host "Extracting..."
New-Item -ItemType Directory -Force -Path $extractDir | Out-Null
tar -xzf $tarFile -C $extractDir

Write-Host "Moving lyrebird.exe..."
if (Test-Path "$extractDir\tor\pluggable_transports\lyrebird.exe") {
    Move-Item -Path "$extractDir\tor\pluggable_transports\lyrebird.exe" -Destination $targetExe -Force
    Write-Host "Success! lyrebird.exe placed in src-tauri/."
} else {
    Write-Host "Error: lyrebird.exe not found in the bundle." -ForegroundColor Red
}

Write-Host "Cleaning up..."
Remove-Item -Recurse -Force $extractDir
Remove-Item -Force $tarFile
