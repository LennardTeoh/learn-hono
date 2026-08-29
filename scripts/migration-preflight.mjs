import { spawnSync } from 'node:child_process'

const args = ['--prefix', 'backend', 'wrangler', 'd1', 'execute', 'petitbakery-db', '--remote', '--command', 'SELECT (SELECT count(*) FROM users) AS users, (SELECT count(*) FROM orders) AS orders;', '--json']
const result = spawnSync('npx', args, { encoding: 'utf8' })
if (result.status !== 0) process.exit(result.status ?? 1)
const match = result.stdout.match(/"users"\s*:\s*(\d+)[\s\S]*"orders"\s*:\s*(\d+)/)
if (!match || Number(match[1]) || Number(match[2])) {
  console.error('Legacy users or orders exist; refusing Better Auth cutover. Write an explicit preservation migration.')
  process.exit(1)
}
console.log('✓ Better Auth cutover preflight passed (legacy users/orders are empty).')
