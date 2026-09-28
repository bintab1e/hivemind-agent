import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { hash, userspacePocError, validateEvent } from './contract.mjs';
import { handleMessage } from './mcp-agent.mjs';

test('local MCP sends a direct PoC/KASAN finding without a support event', async t => {
  const root = await mkdtemp(path.join(tmpdir(), 'hivemind-mcp-'));
  const home = path.join(root, '.hivemind', 'agent', 'runtime');
  await mkdir(home, { recursive: true });
  await writeFile(path.join(root, 'poc.c'), 'int main(void) { return 0; }\n');
  await writeFile(path.join(root, 'kasan.log'), 'BUG: KASAN: use-after-free in nfsd4_open\nWrite of size 8 at addr deadbeef\n');
  execFileSync('git', ['init', root], { stdio: 'ignore' });
  execFileSync('git', ['-C', root, 'add', 'poc.c'], { stdio: 'ignore' });
  execFileSync('git', ['-C', root, '-c', 'user.name=test', '-c', 'user.email=test@example.com', 'commit', '-m', 'source'], { stdio: 'ignore' });
  const commit = execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  const received = [];
  let findingRevisions = true;
  const server = createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    if (req.url === '/v1/sync/health') return res.end(JSON.stringify({ ok: true, exchange: { finding_revisions: findingRevisions } }));
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (req.url === '/mcp') return res.end(JSON.stringify({ result: { structuredContent: { matches: [] } } }));
    const event = validateEvent(body);
    received.push(event.data);
    const eventId = hash(`${event.data.version_id}\0pc1\0${body.source_path}`);
    res.end(JSON.stringify({ event_id: eventId, hypothesis_id: event.data.kind === 'hypothesis' ? `H-${eventId.slice(0, 12)}` : event.data.verification_of || event.data.finding_of, possible_matches: [] }));
  }).listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(async () => { await new Promise(resolve => server.close(resolve)); await rm(root, { recursive: true, force: true }); });
  const config = { agent_id: 'pc1', track_id: 'rc', version_id: '7.3-rc4', repo_root: root, home, server: `http://127.0.0.1:${server.address().port}` };
  const invoke = (name, args) => handleMessage(config, 'a'.repeat(64), { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } });
  const listed = await handleMessage(config, 'a'.repeat(64), { jsonrpc: '2.0', id: 1, method: 'tools/list' });
  assert(!listed.result.tools.some(tool => tool.name === 'queue_analysis' || tool.name === 'get_recent_analyses'));
  assert(listed.result.tools.some(tool => tool.name === 'queue_finding_revision'));
  assert.match(listed.result.tools.find(tool => tool.name === 'queue_verification').inputSchema.properties.body.description, /한국어/);
  const common = { title: 'NFSD boundary handling', scope: ['fs/nfsd/'], code_refs: ['fs/nfsd/nfs4proc.c#nfsd4_open'], angle: 'runtime-reproduction', body: '## 근거\n동일 커밋에서 재현했다.' };
  const hypothesis = (await invoke('queue_hypothesis', { ...common, claim_key: 'nfsd-boundary', verification_plan: 'PoC를 실행한다', preflight: 'checked' })).result.structuredContent;
  assert.equal(hypothesis.accepted, true);
  const verification = (await invoke('queue_verification', { ...common, verification_of: hypothesis.hypothesis_id, method: '경계값으로 독립 재현했다', verdict: 'refutes', prior_exposure: 'claim_only', based_on_event_ids: [] })).result.structuredContent;
  assert.equal(verification.accepted, true);
  const findingArgs = { ...common, finding_of: hypothesis.hypothesis_id, file_path: 'fs/nfsd/nfs4proc.c', access_requirements: ['auth_null'], verified_impacts: ['kasan_write'], impact: '메모리 오류를 확인했으며 코드 실행은 확인하지 못했다.', reproduction_command: 'cc -o poc poc.c && ./poc', poc_path: 'poc.c', kasan_path: 'kasan.log' };
  const finding = (await invoke('queue_finding', findingArgs)).result.structuredContent;
  assert.equal(finding.accepted, true);
  const english = { ...common, body: '## Evidence\nObserved the same code path.' };
  const invalidHypothesis = (await invoke('queue_hypothesis', { ...english, claim_key: 'english-hypothesis', verification_plan: 'Run a boundary input', preflight: 'checked' })).result;
  assert.equal(invalidHypothesis.isError, true);
  assert.match(invalidHypothesis.content[0].text, /한국어/);
  const invalidVerification = (await invoke('queue_verification', { ...english, verification_of: hypothesis.hypothesis_id, method: 'Static trace', verdict: 'inconclusive', prior_exposure: 'claim_only', based_on_event_ids: [] })).result;
  assert.equal(invalidVerification.isError, true);
  assert.match(invalidVerification.content[0].text, /한국어/);
  const invalidFinding = (await invoke('queue_finding', { ...findingArgs, ...english, impact: 'Memory corruption' })).result;
  assert.equal(invalidFinding.isError, true);
  assert.match(invalidFinding.content[0].text, /한국어/);
  await writeFile(path.join(root, 'kernel-patch.c'), 'diff --git a/fs/nfsd/nfs4proc.c b/fs/nfsd/nfs4proc.c\n--- a/fs/nfsd/nfs4proc.c\n+++ b/fs/nfsd/nfs4proc.c\n@@ -1 +1 @@\n');
  const patchFinding = (await invoke('queue_finding', { ...findingArgs, reproduction_command: 'git apply kernel-patch.c && make', poc_path: 'kernel-patch.c' })).result;
  assert.equal(patchFinding.isError, true);
  assert.match(patchFinding.content[0].text, /커널 패치가 아닌 독립 실행형/);
  await writeFile(path.join(root, 'poc.c'), 'int main(void) { return 1; }\n');
  const dirtyFinding = (await invoke('queue_finding', findingArgs)).result;
  assert.equal(dirtyFinding.isError, true);
  assert.match(dirtyFinding.content[0].text, /깨끗한 커널 소스/);
  execFileSync('git', ['-C', root, 'restore', 'poc.c']);
  await writeFile(path.join(root, 'poc-v2.c'), 'int main(void) { return 2; }\n');
  await writeFile(path.join(root, 'kasan-v2.log'), 'BUG: KASAN: use-after-free in nfsd4_open\nWrite of size 4 at addr deadbeef\n');
  const revision = (await invoke('queue_finding_revision', { ...findingArgs, title: 'NFSD corrected finding', body: '## 정정 근거\nPoC와 보고 원문을 다시 확인했다.', corrects_event_id: finding.event_id, reproduction_command: '/usr/bin/gcc -o poc-v2 poc-v2.c && ./poc-v2', poc_path: 'poc-v2.c', kasan_path: 'kasan-v2.log' })).result.structuredContent;
  assert.equal(revision.accepted, true);
  assert.equal(revision.corrects_event_id, finding.event_id);
  findingRevisions = false;
  const unsupportedRevision = (await invoke('queue_finding_revision', { ...findingArgs, corrects_event_id: revision.event_id, poc_path: 'poc-v2.c', kasan_path: 'kasan-v2.log' })).result;
  assert.equal(unsupportedRevision.isError, true);
  assert.match(unsupportedRevision.content[0].text, /서버를 먼저 업데이트/);
  assert.deepEqual(received.map(item => item.kind), ['hypothesis', 'verification', 'finding', 'finding']);
  assert.equal(received[2].evidence_event_ids, undefined);
  assert.deepEqual(received[2].access_requirements, ['auth_null']);
  assert.deepEqual(received[2].verified_impacts, ['kasan_write']);
  assert.equal(received[3].corrects_event_id, finding.event_id);
  assert.match(await readFile(finding.file, 'utf8'), /BUG: KASAN:/);
  assert.match(await readFile(revision.file, 'utf8'), /return 2/);
});

test('standalone PoC validation accepts common compiler and build-tool forms', () => {
  const source = 'int main(void) { return 0; }\n';
  for (const command of [
    '/usr/bin/gcc -o poc poc.c && ./poc',
    'x86_64-linux-gnu-gcc -o poc poc.c && ./poc',
    'CC=clang make poc && ./poc',
    'cmake --build build && ./build/poc',
    'ninja -C build poc && ./build/poc',
  ]) assert.equal(userspacePocError(source, command), null, command);
  assert.match(userspacePocError(source, './poc'), /컴파일/);
});
