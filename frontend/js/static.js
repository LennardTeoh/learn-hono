import { renderShell } from './ui.js'

async function init() {
  await renderShell()
}

init().catch(console.error)