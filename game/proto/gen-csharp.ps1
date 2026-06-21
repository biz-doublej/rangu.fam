#!/usr/bin/env pwsh
# Unity 클라이언트용 C# proto 코드 생성.
# Grpc.Tools 번들 protoc 를 NuGet 캐시에서 찾아 gen/csharp 에 emit 한다(별도 protoc 설치 불필요).
#
# 사전: 한 번이라도 `dotnet build game/proto/RanguTactics.Proto.csproj` 로 Grpc.Tools 복원.
# 사용: pwsh game/proto/gen-csharp.ps1
# 결과: game/proto/gen/csharp/*.cs → Unity 의 Assets/Scripts/Generated/Proto 로 복사 + Google.Protobuf 런타임 추가.
$ErrorActionPreference = 'Stop'

$protoDir = $PSScriptRoot
$outDir = Join-Path $protoDir 'gen/csharp'

$nuget = if ($env:NUGET_PACKAGES) { $env:NUGET_PACKAGES } else { Join-Path $HOME '.nuget/packages' }
$toolsRoot = Join-Path $nuget 'grpc.tools'
if (-not (Test-Path $toolsRoot)) {
  throw "Grpc.Tools 미복원 — 먼저 'dotnet build game/proto/RanguTactics.Proto.csproj' 실행하세요."
}

$onWindows = $IsWindows -or $env:OS -eq 'Windows_NT'
$exeName = if ($onWindows) { 'protoc.exe' } else { 'protoc' }
$candidates = Get-ChildItem -Path $toolsRoot -Recurse -Filter $exeName -ErrorAction SilentlyContinue
if (-not $candidates) { throw "protoc 를 찾지 못함: $toolsRoot" }
# RID 우선순위(x64 우선)로 최신 버전 선택
$protoc = $candidates |
  Sort-Object @{ E = { if ($_.FullName -match 'x64') { 0 } else { 1 } } }, FullName |
  Select-Object -First 1

New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$protos = (Get-ChildItem -Path (Join-Path $protoDir 'rangu/tactics/v1') -Filter '*.proto').FullName

& $protoc.FullName "-I$protoDir" "--csharp_out=$outDir" @protos
if ($LASTEXITCODE -ne 0) { throw "protoc 실패 (exit $LASTEXITCODE)" }

Write-Host "✅ 생성 완료 → $outDir  (protoc: $($protoc.FullName))"
Write-Host "   Unity: 위 .cs 를 Assets/Scripts/Generated/Proto 로 복사하고 Google.Protobuf 런타임을 추가하세요."
