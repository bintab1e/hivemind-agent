---
schema_version: 1
kind: finding
version_id: "VERSION_ID"
repo_commit: "FULL_GIT_COMMIT"
title: "Corrected finding title"
finding_of: "H-xxxxxxxxxxxx"
corrects_event_id: "64_HEX_EVENT_ID"
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
impact: "수정된 PoC로 직접 확인한 영향을 한국어로 작성"
reproduction_command: "cc -o poc corrected-poc.c && ./poc"
poc_source: "수정된 PoC 파일의 UTF-8 원문을 JSON 문자열로 인코딩"
poc_sha256: "수정된 PoC 원문의 SHA-256"
kasan_log: "수정된 BUG: KASAN: ... 로그 원문을 JSON 문자열로 인코딩"
kasan_sha256: "수정된 KASAN 로그 원문의 SHA-256"
created_at: "YYYY-MM-DDTHH:MM:SSZ"
---

## 정정 이유

기존 보고에서 무엇이 잘못됐고 본문·PoC·KASAN을 어떻게 바로잡았는지 한국어로 적는다.

## 재현 및 근거

수정된 전체 재현 절차와 관찰 결과를 적는다. 기존 수락 파일을 덮어쓰지 말고 가능하면 로컬 MCP의 `queue_finding_revision`에 기존 이벤트 ID와 수정된 파일 경로를 전달한다.
