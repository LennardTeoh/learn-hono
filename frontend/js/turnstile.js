export async function renderTurnstile(containerId) {
  const sitekey = window.APP_CONFIG?.TURNSTILE_SITE_KEY
  if (!sitekey) return null

  for (let i = 0; i < 50 && !window.turnstile; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  if (!window.turnstile) throw new Error('Turnstile failed to load.')

  return new Promise((resolve) => {
    window.turnstile.render(`#${containerId}`, {
      sitekey,
      callback: (token) => resolve(token),
      'expired-callback': () => resolve('')
    })
  })
}
