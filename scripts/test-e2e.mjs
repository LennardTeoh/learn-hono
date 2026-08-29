import { spawn } from 'node:child_process'

const children = []
const run = (command, args, options = {}) => new Promise((resolve, reject) => {
  const child = spawn(command, args, { stdio: 'inherit', ...options })
  child.on('error', reject)
  child.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`${command} exited ${code}`)))
})
const start = (command, args, options = {}) => {
  const child = spawn(command, args, { stdio: 'inherit', ...options })
  children.push(child)
  return child
}
const waitFor = async (url) => {
  const deadline = Date.now() + 30_000
  while (Date.now() < deadline) {
    try { if ((await fetch(url)).ok) return } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error(`Timed out waiting for ${url}`)
}
const clean = () => run('npm', ['--prefix', 'backend', 'run', 'db:clean:e2e'])

try {
  await run('npm', ['--prefix', 'backend', 'run', 'db:migrate:local'])
  await clean()
  await run('npm', ['--prefix', 'backend', 'run', 'db:migrate:local'])
  start('npm', ['exec', '--', 'wrangler', 'dev', '--local', '--env-file', '.env.e2e', '--port', '8787', '--var', 'APP_ORIGIN:http://localhost:8788', '--var', 'CORS_ORIGIN:http://localhost:8788', '--var', 'BETTER_AUTH_URL:http://localhost:8787', '--var', 'BETTER_AUTH_SECRET:e2e-only-secret-that-is-at-least-32-characters', '--var', 'E2E_TEST_MODE:1'], { cwd: 'backend' })
  start(process.execPath, ['scripts/serve-frontend.mjs'])
  await Promise.all([waitFor('http://localhost:8787/health'), waitFor('http://localhost:8788/')])
  await run('npx', ['cypress', 'run'])
} finally {
  for (const child of children) child.kill('SIGTERM')
  await clean()
}
