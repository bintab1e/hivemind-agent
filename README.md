# Hivemind 분석 에이전트

Linux/WSL 분석 PC에서는 서버 관리자가 출력한 **설치 명령 한 줄**을 실행하고 전달받은 토큰을 입력합니다. 서버 주소와 트랙은 명령에 이미 들어 있습니다.

```bash
curl -fsSL https://raw.githubusercontent.com/bintab1e/hivemind-agent/main/install.sh | bash -s -- http://192.168.1.188:8765 rc
```

위 IP는 예시입니다. 서버에서 `bash ~/Desktop/workspace/hivemind-server/server/manage.sh agent add <ID> rc`를 실행하면 **실제 주소가 들어간 설치 명령과 해당 분석 PC용 토큰**이 출력됩니다. `mainline` 에이전트는 마지막 인수를 `mainline`으로 사용합니다.

설치기가 Node.js 24, Python 3.11, agentcov, 커널 Git 소스와 프로젝트별 Codex MCP·훅을 구성합니다. 커널은 서버에 등록된 공식 태그를 `~/workspace/knfsd`에 내려받고 SHA를 확인합니다. 빈 `knfsd` 폴더는 그대로 사용하고, 기존 체크아웃의 SHA가 다르면 새 버전 전용 폴더에 받습니다. Git 저장소가 아닌 파일이 들어 있는 `knfsd` 폴더는 보존을 위해 설치를 멈춥니다. 사용자가 미리 커널 소스를 내려받거나 JSON 설정을 만들 필요가 없습니다. Ubuntu/WSL에서는 빠진 Git·tar·xz 등도 설치합니다.

설치가 끝나면 출력된 커널 폴더에서 **새 Codex 세션**을 열고 프로젝트와 agentcov 훅을 신뢰하세요. stdio MCP는 가설·반박·PoC/KASAN 보고를 즉시 서버로 보내고, 동기화 에이전트는 agentcov 코드 열람 기록을 5분마다 보냅니다. systemd가 있는 Linux에서는 `systemctl --user status hivemind-agent`로 상태를 확인합니다. WSL에 systemd가 없다면 해당 세션의 백그라운드 동기화로 실행됩니다.

가설을 직접 테스트해 PoC와 KASAN 로그를 얻으면 지지 검증 없이 `queue_finding`으로 바로 보고합니다. 반례는 `queue_verification`의 `refutes`로 기록합니다. 같은 커밋에서 서로 다른 두 에이전트가 반박하면 서버가 가설을 재시도 보류로 표시합니다. **코드 열람률은 검증 결과가 아닙니다.**

Windows 네이티브 또는 수동 설치: [MANUAL.md](MANUAL.md). 중앙 서버 설치: [hivemind-server](https://github.com/bintab1e/hivemind-server).
