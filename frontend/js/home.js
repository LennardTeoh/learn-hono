import { renderShell } from './ui.js'

async function init() {
  // This is all the home page needs to build the Nav Bar and Footer
  await renderShell()
}

init().catch(console.error)