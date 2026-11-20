// Reports whether graphify-out/graph.json was built from the current HEAD.
// Usage: npm run graph:status   (exit code 0 = fresh, 1 = stale, 2 = no graph)
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const GRAPH_FILE = 'graphify-out/graph.json';

function readBuiltAtCommit() {
  try {
    const graph = JSON.parse(readFileSync(GRAPH_FILE, 'utf8'));
    return graph.built_at_commit ?? null;
  } catch {
    return null;
  }
}

const builtAt = readBuiltAtCommit();
if (!builtAt) {
  console.log(`graph: no usable ${GRAPH_FILE} (missing or no built_at_commit)`);
  process.exit(2);
}

const head = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
if (builtAt === head) {
  console.log(`graph: FRESH (built from HEAD ${head.slice(0, 7)})`);
  process.exit(0);
}

const behind = execFileSync('git', ['rev-list', '--count', `${builtAt}..HEAD`], { encoding: 'utf8' }).trim();
console.log(`graph: STALE (built from ${builtAt.slice(0, 7)}, HEAD is ${head.slice(0, 7)}, ${behind} commit(s) behind)`);
process.exit(1);
