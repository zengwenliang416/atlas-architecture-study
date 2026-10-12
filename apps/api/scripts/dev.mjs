import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';

const tsc = spawn('pnpm', ['exec', 'tsc', '-p', 'tsconfig.json', '--watch', '--preserveWatchOutput'], {
  stdio: ['ignore', 'inherit', 'inherit'],
});

const started = Date.now();
while (!existsSync('dist/main.js')) {
  if (Date.now() - started > 60_000) {
    console.error('tsc did not emit dist/main.js');
    tsc.kill('SIGTERM');
    process.exit(1);
  }
  await new Promise((resolve) => setTimeout(resolve, 200));
}

const node = spawn('node', ['--env-file=../../.env', '--watch', 'dist/main.js'], {
  stdio: 'inherit',
});

function shutdown() {
  tsc.kill('SIGTERM');
  node.kill('SIGTERM');
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
node.on('exit', (code) => {
  tsc.kill('SIGTERM');
  process.exit(code ?? 0);
});
