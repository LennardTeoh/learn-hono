import { spawn, spawnSync } from 'node:child_process'
import { existsSync, writeFileSync } from 'node:fs'
import { randomBytes } from 'node:crypto'

const children = []
const run = (command, args, options = {}) => {
  const child = spawn(command, args, { stdio: 'inherit', shell: process.platform === 'win32', ...options })
  children.push(child)
  return child
}

if (!existsSync('backend/node_modules')) {
  console.error('Install backend dependencies first: cd backend && npm install')
  process.exit(1)
}

if (!existsSync('backend/.dev.vars')) {
  writeFileSync('backend/.dev.vars', [
    'ENVIRONMENT=development',
    'APP_ORIGIN=http://localhost:8788',
    'CORS_ORIGIN=http://localhost:8788',
    'EMAIL_FROM=PetitBakery <onboarding@resend.dev>',
    'SESSION_TTL_SECONDS=604800',
    'PBKDF2_ITERATIONS=600000',
    `PASSWORD_PEPPER=${randomBytes(32).toString('base64')}`,
    'RESEND_API_KEY=',
    'TURNSTILE_SECRET_KEY='
  ].join('\n') + '\n')
  console.log('Created backend/.dev.vars with a local-only password pepper.')
}

const migration = spawnSync('npm', ['--prefix', 'backend', 'run', 'db:migrate:local'], { stdio: 'inherit' })
if (migration.status !== 0) process.exit(migration.status || 1)

console.log('Starting PetitBakery Worker on http://localhost:8787')
console.log('Starting PetitBakery Pages preview on http://localhost:8788')
run('npm', ['--prefix', 'backend', 'run', 'dev'])
run(process.execPath, ['scripts/serve-frontend.mjs'])

const stop = () => {
  for (const child of children) child.kill('SIGTERM')
  process.exit(0)
}
process.on('SIGINT', stop)
process.on('SIGTERM', stop)
