import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { buildCoverageScope } from './coverage-scope.mjs';
import { assertFreshCheckout, selectCoverage } from './sync-agent.mjs';

test('coverage scope follows NFS includes and reports unavailable headers', async () => {
  const root = mkdtempSync(path.join(tmpdir(), 'hivemind-scope-'));
  try {
    for (const directory of ['fs/nfsd', 'net/sunrpc', 'include/linux/sunrpc', 'include/linux']) mkdirSync(path.join(root, directory), { recursive: true });
    writeFileSync(path.join(root, 'fs/nfsd/main.c'), '#include <linux/sunrpc/svc.h>\n');
    writeFileSync(path.join(root, 'include/linux/sunrpc/svc.h'), '#include "../types.h"\n#include <net/missing.h>\n');
    writeFileSync(path.join(root, 'include/linux/types.h'), '/* types */\n');
    writeFileSync(path.join(root, 'include/linux/unrelated.h'), '/* unrelated */\n');
    writeFileSync(path.join(root, 'net/sunrpc/svc.c'), '/* RPC source */\n');
    const scope = await buildCoverageScope(root, ['fs/nfsd/', 'net/sunrpc/']);
    assert.deepEqual([...scope.files].sort(), ['fs/nfsd/main.c', 'include/linux/sunrpc/svc.h', 'include/linux/types.h', 'net/sunrpc/svc.c']);
    assert.deepEqual([...scope.missingIncludes], ['net/missing.h']);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('new commit needs a fresh agentcov checkout', () => {
  const commit = 'a'.repeat(40);
  const nextCommit = 'b'.repeat(40);
  assert.doesNotThrow(() => assertFreshCheckout({ repo_root: 'C:\\audit', repo_commit: commit }, 'C:\\audit', commit));
  assert.doesNotThrow(() => assertFreshCheckout({ repo_root: 'C:\\audit', repo_commit: commit }, 'C:\\audit-next', nextCommit));
  assert.throws(() => assertFreshCheckout({ repo_root: 'C:\\audit', repo_commit: commit }, 'C:\\audit', nextCommit), /fresh repo_root/);
});

test('coverage upload excludes files outside the knfsd scope', () => {
  const lcov = 'TN:\nSF:fs/nfsd/main.c\nDA:1,1\nDA:2,0\nLF:2\nLH:1\nend_of_record\nTN:\nSF:fs/other/main.c\nDA:1,1\nLF:1\nLH:1\nend_of_record\n';
  const report = JSON.stringify({ files: { 'fs/nfsd/main.c': { line_count: 2, read_lines: 1 }, 'fs/other/main.c': { line_count: 1, read_lines: 1 } }, summary: {}, unknown_events: [] });
  const selected = selectCoverage(lcov, report, ['fs/nfsd/'], 'C:\\audit');
  assert(!selected.lcov.includes('fs/other/'));
  assert.deepEqual(Object.keys(JSON.parse(selected.coverageJson).files), ['fs/nfsd/main.c']);
});
