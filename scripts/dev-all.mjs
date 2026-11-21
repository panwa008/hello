#!/usr/bin/env node
// Runs the API (3001) and the web dev server (5173) together. Ctrl+C stops both.
import { execFileSync, spawn } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..')
const backendDir = join(rootDir, 'backend')
const isWin = process.platform === 'win32'
const npmCmd = isWin ? 'npm.cmd' : 'npm'

function start(name, cwd, args) {
  const child = spawn(npmCmd, args, {
    cwd,
    stdio: 'pipe',
    env: process.env,
    shell: isWin,
  })
  child.name = name
  return child
}

const procs = [
  start('api', backendDir, ['run', 'dev']),
  start('web', rootDir, ['run', 'dev:web']),
]

function killTree(pid) {
  if (!pid) return
  if (isWin) {
    spawn('taskkill', ['/pid', String(pid), '/f', '/t'], { stdio: 'ignore', shell: true })
    return
  }
  let children = []
  try {
    children = execFileSync('ps', ['-o', 'pid=', '--ppid', String(pid)], { encoding: 'utf8' })
      .split(/\s+/)
      .map(Number)
      .filter(Boolean)
  } catch {
    children = []
  }
  for (const childPid of children) killTree(childPid)
  try { process.kill(pid, 'SIGTERM') } catch { /* already gone */ }
}

function killAll() {
  for (const p of procs) {
    if (!p.pid) continue
    killTree(p.pid)
  }
}

for (const p of procs) {
  const tag = p.name === 'api' ? '\x1b[35m[api]\x1b[0m ' : '\x1b[36m[web]\x1b[0m '
  for (const stream of [p.stdout, p.stderr]) {
    stream.on('data', (buf) => {
      const lines = buf.toString().split(/\r?\n/).filter(Boolean)
      if (lines.length) process.stdout.write(lines.map((line) => tag + line).join('\n') + '\n')
    })
  }
  p.on('exit', (code) => {
    console.log(`${tag}exited (${code})`)
    killAll()
    process.exit(code ?? 0)
  })
}

process.on('SIGINT', () => { killAll() })
process.on('SIGTERM', () => { killAll() })
