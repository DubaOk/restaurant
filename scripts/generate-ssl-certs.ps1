# Self-signed TLS certs for local Docker HTTPS (nginx/ssl)
$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$sslDir = Join-Path $root "nginx\ssl"
New-Item -ItemType Directory -Force -Path $sslDir | Out-Null

$cert = Join-Path $sslDir "cert.pem"
$key = Join-Path $sslDir "key.pem"

$subj = "/CN=localhost/O=Burmalda/C=BY"
$san = "subjectAltName=DNS:localhost,DNS:127.0.0.1,IP:127.0.0.1"

function Invoke-OpenSslLocal {
    openssl req -x509 -nodes -days 825 -newkey rsa:2048 `
        -keyout $key -out $cert `
        -subj $subj `
        -addext $san
}

function Invoke-OpenSslDocker {
    $mount = "${sslDir}:/ssl"
    docker run --rm -v $mount alpine/openssl req -x509 -nodes -days 825 `
        -newkey rsa:2048 `
        -keyout /ssl/key.pem -out /ssl/cert.pem `
        -subj $subj `
        -addext $san
}

if (Get-Command openssl -ErrorAction SilentlyContinue) {
    Invoke-OpenSslLocal
}
elseif (Get-Command docker -ErrorAction SilentlyContinue) {
    Invoke-OpenSslDocker
}
else {
    Write-Host "Need openssl or Docker to generate certificates."
    exit 1
}

Write-Host "Certificates written to $sslDir"
