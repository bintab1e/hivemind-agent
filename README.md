# Hivemind 분석 에이전트

Linux/WSL 분석 PC에서는 서버 관리자가 출력한 **설치 명령 한 줄**을 실행하고 전달받은 토큰을 입력합니다. 서버 주소와 트랙은 명령에 이미 들어 있습니다.

```bash
curl -fsSL https://raw.githubusercontent.com/bintab1e/hivemind-agent/main/install.sh | bash -s -- http://192.168.1.188:8765 rc
```

위 IP는 예시입니다. 서버에서 `bash ~/Desktop/workspace/hivemind-server/server/manage.sh agent add <ID> rc`를 실행하면 **실제 주소가 들어간 설치 명령과 해당 분석 PC용 토큰**이 출력됩니다. `mainline` 에이전트는 마지막 인수를 `mainline`으로 사용합니다.

설치기가 Node.js 24, Python 3.11, agentcov, 커널 Git 소스와 프로젝트별 Codex MCP·훅을 구성합니다. 커널은 서버에 등록된 공식 태그를 `~/workspace/knfsd`에 내려받고 SHA를 확인합니다. 빈 `knfsd` 폴더는 그대로 사용하고, 기존 체크아웃의 SHA가 다르면 새 버전 전용 폴더에 받습니다. Git 저장소가 아닌 파일이 들어 있는 `knfsd` 폴더는 보존을 위해 설치를 멈춥니다. 사용자가 미리 커널 소스를 내려받거나 JSON 설정을 만들 필요가 없습니다. Ubuntu/WSL에서는 빠진 Git·tar·xz 등도 설치합니다.

설치가 끝나면 출력된 커널 폴더에서 **새 Codex 세션**을 열고 프로젝트와 agentcov 훅을 신뢰하세요. 설치기는 열람 이벤트를 기록하는 `PostToolUse`만 유지하고, 아무 작업도 하지 않는 `PreToolUse`와 매 턴 전체 저장소 보고서를 만드는 무거운 `Stop` 훅은 제거합니다. 과거 `Stop`이 만든 `.agentcov/coverage.json`은 삭제하지만 원본 열람 이력인 `.agentcov/events.jsonl`은 보존합니다. stdio MCP는 가설·반박·PoC/KASAN 보고를 즉시 서버로 보내고, 동기화 에이전트는 기록된 이벤트에서 NFS·RPC include closure 범위의 LCOV와 작은 요약 JSON을 직접 생성해 5분마다 보냅니다. 상세 범위·명령·세션은 로컬 이벤트 원본에 보존하고 서버는 LCOV에서 파일·줄 커버리지를 계산합니다. 로컬 telemetry 배치는 최신 1개만 유지하고 서버 전송도 그 배치만 시도합니다. 서버가 capability를 공개하면 gzip으로 전송합니다. systemd가 있는 Linux에서는 `systemctl --user status hivemind-agent`로 상태를 확인합니다. WSL에 systemd가 없다면 해당 세션의 백그라운드 동기화로 실행됩니다.

중간 분석 메모는 MCP로 보내지 않습니다. 가설이 생기면 기존 가설을 검색하고, 활성 가설이면 그 ID에서 검증합니다. 같은 커밋에서 폐기된 가설이면 재검증하지 않습니다. 깨끗한 대상 소스에서 외부 입력으로 재현하는 독립 사용자 공간 C PoC와 KASAN 로그를 얻으면 `queue_finding`으로 바로 보고하고, 반례는 `queue_verification`의 `refutes`로 기록합니다. 커널 diff나 커널 내부 하네스는 PoC로 보고하지 않습니다. 취약점 보고에는 실제 `access_requirements`를 적고, `verified_impacts`에는 PoC·KASAN 또는 실제 결과로 직접 확인한 영향만 기록하며 가능성은 제외합니다. 잘못 올린 반박은 `queue_correction`으로 정정합니다. 가설·검증·취약점 보고의 제목은 영어여도 되지만 검증 계획·방법·영향과 Markdown 설명 본문은 한국어로 씁니다. 코드·경로·명령 및 PoC·KASAN 원문은 그대로 보존합니다. **코드 열람률은 검증 결과가 아닙니다.**

Windows 네이티브 또는 수동 설치: [MANUAL.md](MANUAL.md). 중앙 서버 설치: [hivemind-server](https://github.com/bintab1e/hivemind-server).
