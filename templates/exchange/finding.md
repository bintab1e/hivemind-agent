---
schema_version: 1
kind: finding
version_id: CURRENT_TRACK_VERSION
repo_commit: FULL_GIT_COMMIT_SHA
title: "발견한 취약점의 구체적인 내용"
finding_of: "H-서버가-발급한-ID"
file_path: "fs/nfsd/nfs4proc.c"
scope:
  - "fs/nfsd/"
code_refs:
  - "fs/nfsd/nfs4proc.c#nfsd4_open"
angle: runtime-reproduction
access_requirements:
  - "auth_null"
verified_impacts:
  - "kasan_write"
impact: "문제가 성립할 때 발생하는 보안 영향"
reproduction_command: "독립 사용자 공간 C PoC를 컴파일하고 실행해 KASAN 로그를 얻은 명령"
poc_source: "PoC 파일의 UTF-8 원문을 JSON 문자열로 인코딩"
poc_sha256: "PoC 원문의 SHA-256"
kasan_log: "BUG: KASAN: ... 로그 원문을 JSON 문자열로 인코딩"
kasan_sha256: "KASAN 로그 원문의 SHA-256"
created_at: "YYYY-MM-DDTHH:MM:SSZ"
---

## 취약점

어떤 입력과 코드 경로에서 어떤 잘못된 동작이 발생하는지 적는다.

## 재현 및 근거

해당 커밋의 코드 위치, 입력·실행 명령, 관찰한 결과를 적는다. PoC는 깨끗한 대상 소스에서 외부 입력으로 재현하는 `main` 함수가 있는 독립 사용자 공간 C 프로그램이어야 한다. 커널 diff, initcall, 모듈, KUnit 또는 커널 내부 하네스는 취약점 PoC로 보고하지 않는다. 지지 검증 ID 없이도 실제 PoC와 KASAN 원문으로 보고할 수 있다. 가능하면 로컬 MCP의 `queue_finding`에 두 파일 경로를 전달한다.

## 영향과 한계

`access_requirements`에는 실제 재현에 필요한 조건만 넣는다. 허용값은 `auth_null`, `auth_unix`, `rpcsec_gss`, `authenticated_client`, `malicious_server`, `local_user`, `local_privileged`이다. `verified_impacts`에는 PoC·KASAN 또는 실제 결과로 직접 확인한 항목만 넣는다. 허용값은 `kasan_read`, `kasan_write`, `controlled_read`, `controlled_write`, `rce`, `lpe`, `info_leak`이다. 가능성이나 후속 발전 가능성만 있는 항목은 제외하고, 영향 범위와 아직 확인하지 못한 조건을 본문에서 구분한다.
