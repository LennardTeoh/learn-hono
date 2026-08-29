import { spawnSync } from 'node:child_process'

const run = (command) => {
  const result = spawnSync('backend/node_modules/.bin/wrangler', ['d1', 'execute', 'petitbakery-db', '--remote', '--command', command, '--json'], { encoding: 'utf8' })
  if (result.status !== 0) {
    process.stderr.write(result.stderr || result.stdout || 'Wrangler migration preflight failed.\n')
    process.exit(result.status ?? 1)
  }
  return JSON.parse(result.stdout).flatMap((batch) => batch.results || [])
}

const tables = run("SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('users', 'orders');").map((row) => row.name)
const users = tables.includes('users') ? Number(run('SELECT count(*) AS users FROM users;')[0]?.users || 0) : 0
const orders = tables.includes('orders') ? Number(run('SELECT count(*) AS orders FROM orders;')[0]?.orders || 0) : 0
if (users || orders) {
  console.error('Legacy users or orders exist; refusing Better Auth cutover. Write an explicit preservation migration.')
  process.exit(1)
}
console.log('✓ Better Auth cutover preflight passed (legacy users/orders are empty).')
