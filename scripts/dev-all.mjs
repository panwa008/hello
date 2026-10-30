// Runs the API (3001) and the web dev server (5173) together. Ctrl+C stops both.
import { spawn } from 'node:child_process'
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const procs = [
  ['api', spawn(npm, ['--prefix', '../hello-backend', 'run', 'dev'], { stdio: 'pipe', shell: process.platform === 'win32' })],
  ['web', spawn(npm, ['run', 'dev:web'], { stdio: 'pipe', shell: process.platform === 'win32' })],
]
for (const [name, p] of procs) {
  const tag = name === 'api' ? '\x1b[35m[api]\x1b[0m ' : '\x1b[36m[web]\x1b[0m '
  for (const s of [p.stdout, p.stderr]) s.on('data', (b) => process.stdout.write(b.toString().split('\n').filter(Boolean).map((l) => tag + l).join('\n') + '\n'))
  p.on('exit', (code) => { console.log(`${tag}exited (${code})`); for (const [, q] of procs) q.kill(); process.exit(code ?? 0) })
}
process.on('SIGINT', () => { for (const [, q] of procs) q.kill('SIGINT') })
