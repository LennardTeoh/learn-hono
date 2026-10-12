import { renderShell } from './ui.js'

async function init() {
  await renderShell()
  document.getElementById('contact-form')?.addEventListener('submit', (event) => {
    event.preventDefault()
    const name = document.getElementById('contact-name').value.trim()
    const email = document.getElementById('contact-email').value.trim()
    const message = document.getElementById('contact-message').value.trim()
    const subject = encodeURIComponent(`Lumière inquiry from ${name}`)
    const body = encodeURIComponent(`${message}\n\nFrom: ${name} <${email}>`)
    location.href = `mailto:lumiere.csproject@gmail.com?subject=${subject}&body=${body}`
  })
}

init().catch(console.error)
