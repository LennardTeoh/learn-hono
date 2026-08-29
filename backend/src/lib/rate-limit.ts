export async function enforceRateLimit(
  db: D1Database,
  key: string,
  limit: number,
  windowSeconds: number
): Promise<boolean> {
  const now = Math.floor(Date.now() / 1000)
  const bucket = Math.floor(now / windowSeconds) * windowSeconds

  const row = await db
    .prepare('SELECT count FROM rate_limits WHERE key = ? AND window_start = ?')
    .bind(key, bucket)
    .first<{ count: number }>()

  if (!row) {
    await db
      .prepare('INSERT OR REPLACE INTO rate_limits (key, window_start, count) VALUES (?, ?, 1)')
      .bind(key, bucket)
      .run()
    return true
  }

  if (row.count >= limit) return false

  await db
    .prepare('UPDATE rate_limits SET count = count + 1 WHERE key = ? AND window_start = ?')
    .bind(key, bucket)
    .run()

  return true
}
