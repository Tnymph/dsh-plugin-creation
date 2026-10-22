import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const script = path.join(root, 'scripts', 'check-output.mjs');

function run(target) {
  try {
    const stdout = execFileSync(process.execPath, [script, target], {
      cwd: root,
      encoding: 'utf8',
    });
    return { code: 0, report: JSON.parse(stdout) };
  } catch (error) {
    return {
      code: error.status ?? 1,
      report: error.stdout ? JSON.parse(error.stdout) : null,
    };
  }
}

test('validator accepts a contract-consistent output directory', () => {
  const { code, report } = run(path.join(root, 'tests', 'fixtures', 'valid-output'));
  assert.equal(code, 0);
  assert.equal(report.ok, true);
  assert.equal(report.tableRows, 1);
  assert.equal(report.bibMatchesRows, true);
  assert.equal(report.runIncludedMatchesRows, true);
});

test('validator rejects mismatched reference count', () => {
  const { code, report } = run(path.join(root, 'tests', 'fixtures', 'broken-output'));
  assert.equal(code, 1);
  assert.equal(report.ok, false);
  assert.equal(report.bibMatchesRows, false);
});

test('validator rejects missing required paper field', () => {
  const { code, report } = run(path.join(root, 'tests', 'fixtures', 'missing-field-output'));
  assert.equal(code, 1);
  assert.equal(report.ok, false);
  assert.ok(report.paperKeys[0].missing.includes('doi'));
});
