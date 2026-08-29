import { spawn, spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'

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

if (!existsSync('.env')) {
  console.error('Create a repository-root .env before starting the app.')
  process.exit(1)
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
