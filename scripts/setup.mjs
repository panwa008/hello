#!/usr/bin/env node
/**
 * Cross-platform `npm run setup`.
 * Installs root + backend deps, copies .env.example → .env when missing,
 * and seeds the SQLite DB (demo login: mayy@hello.app / hello123).
 */
import { spawn } from 'node:child_process'
import { copyFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..')
const backendDir = join(rootDir, 'backend')
const isWin = process.platform === 'win32'
const npmCmd = isWin ? 'npm.cmd' : 'npm'
const tsxBin = join(backendDir, 'node_modules', '.bin', isWin ? 'tsx.cmd' : 'tsx')

const major = Number(process.versions.node.split('.')[0])
if (major !== 20 && major !== 22) {
  console.warn(`[hello] ใช้ Node.js 20 หรือ 22 LTS (แนะนำ 22) — ตอนนี้คือ v${process.versions.node}`)
  console.warn('[hello] Use Node.js 20 or 22 LTS (22 recommended). Download: https://nodejs.org')
}

function run(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: 'inherit',
      env: process.env,
      shell: isWin,
    })
    child.on('error', reject)
    child.on('exit', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`${command} ${args.join(' ')} exited ${code}`))
    })
  })
}

function copyIfMissing(src, dest, label) {
  if (existsSync(dest)) {
    console.log(`[hello] keep existing ${label}`)
    return
  }
  if (!existsSync(src)) {
    console.warn(`[hello] skip ${label}: missing ${src}`)
    return
  }
  copyFileSync(src, dest)
  console.log(`[hello] created ${label}`)
}

console.log('[hello] installing web dependencies…')
await run(npmCmd, ['install'], rootDir)
console.log('[hello] installing API dependencies…')
await run(npmCmd, ['install'], backendDir)

copyIfMissing(join(rootDir, '.env.example'), join(rootDir, '.env'), '.env')
copyIfMissing(join(backendDir, '.env.example'), join(backendDir, '.env'), 'backend/.env')

if (!existsSync(tsxBin)) {
  throw new Error('tsx not found after backend install — cannot seed the database')
}
console.log('[hello] initializing database…')
await run(tsxBin, ['src/seed.ts'], backendDir)

console.log('[hello] setup complete. Next: npm run dev')
console.log('[hello] web http://localhost:5173  ·  api http://localhost:3001/api/health')
console.log('[hello] demo login: mayy@hello.app / hello123')
