import { renderShell } from './ui.js';

async function init() {
  // Renders your top header navigation and footer shell
  await renderShell();
}

init().catch((error) => console.error('Error initializing FAQ page:', error));