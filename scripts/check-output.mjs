#!/usr/bin/env node
// Contract validator for a paper-patent-scout output directory.
// Usage: node scripts/check-output.mjs <output-dir> [--json]
// Exit 0 when every S1 structural check passes, 1 otherwise.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

function die(message) {
  console.error(message);
  process.exit(2);
}

const target = process.argv[2];
if (!target) die('usage: node scripts/check-output.mjs <output-dir>');
const dir = path.resolve(process.cwd(), target);
if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) die(`not a directory: ${dir}`);

const schemaPath = path.join(repoRoot, 'schema', 'output.schema.json');
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
const read = (name) => fs.readFileSync(path.join(dir, name), 'utf8');
const json = (name) => JSON.parse(read(name));

const def = (name) => schema.$defs[name];
const inspect = (obj, name) => ({
  missing: (def(name).required || []).filter((key) => !(key in obj)),
  extraKeys: Object.keys(obj).filter((key) => !Object.keys(def(name).properties || {}).includes(key)),
});

let papers;
let patents;
let run;
let evidenceLines;
let csvLines;
let bibEntries;
try {
  papers = json('papers.json');
  patents = json('patents.json');
  run = json('run.json');
  evidenceLines = read('evidence.md').split(/\r?\n/);
  csvLines = read('candidates.csv').trim().split(/\r?\n/);
  bibEntries = (read('references.bib').match(/^@/gm) || []).length;
} catch (error) {
  console.error(`cannot read contract files in ${dir}: ${error.message}`);
  process.exit(2);
}

const tableRows = evidenceLines.filter((line) => /^\|\s*P(at)?\d+\s*\|/i.test(line)).length;
const csvDataRows = Math.max(csvLines.length - 1, 0);

const report = {
  dir,
  statusLine: evidenceLines[0],
  runStatus: run.status,
  statusesMatch: evidenceLines[0] === `STATUS: ${run.status}`,
  tableRows,
  papers: papers.length,
  patents: patents.length,
  rowsMatchRecords: tableRows === papers.length + patents.length,
  csvRowsWithinRecords: csvDataRows <= tableRows,
  bibMatchesRows: bibEntries === tableRows,
  runIncludedMatchesRows: run.counts?.included === tableRows,
  paperKeys: papers.map((item) => inspect(item, 'paper')),
  patentKeys: patents.map((item) => inspect(item, 'patent')),
  runKeys: inspect(run, 'run'),
};

report.ok =
  report.statusesMatch &&
  report.rowsMatchRecords &&
  report.csvRowsWithinRecords &&
  report.bibMatchesRows &&
  report.runIncludedMatchesRows &&
  [...report.paperKeys, ...report.patentKeys, report.runKeys].every(
    (entry) => entry.missing.length === 0 && entry.extraKeys.length === 0,
  );

console.log(JSON.stringify(report, null, 2));
process.exit(report.ok ? 0 : 1);
