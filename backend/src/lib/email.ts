import type { Bindings } from '../types'

type EmailInput = {
  to: string
  subject: string
  html: string
  text: string
}

export async function sendTransactionalEmail(env: Bindings, input: EmailInput): Promise<void> {
  if (!env.RESEND_API_KEY) {
    if (env.ENVIRONMENT !== 'production') {
      console.log('[DEV EMAIL]', JSON.stringify(input))
      return
    }
    throw new Error('RESEND_API_KEY is not configured.')
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text
    })
  })

  if (!response.ok) {
    const body = await response.text()
    console.error('Email send failed:', response.status, body)
    throw new Error('Unable to send email.')
  }
}

export function verificationEmail(name: string, url: string): Pick<EmailInput, 'subject' | 'html' | 'text'> {
  const safeName = escapeHtml(name)
  const safeUrl = escapeHtml(url)
  return {
    subject: 'Verify your PetitBakery email',
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto"><h2>Verify your email</h2><p>Hi ${safeName},</p><p>Confirm your address to activate your PetitBakery account.</p><p><a href="${safeUrl}" style="display:inline-block;background:#111827;color:#fff;padding:12px 18px;border-radius:10px;text-decoration:none">Verify email</a></p><p>This link expires in 60 minutes.</p></div>`,
    text: `Hi ${name}, verify your PetitBakery email: ${url}\nThis link expires in 60 minutes.`
  }
}

export function resetPasswordEmail(name: string, url: string): Pick<EmailInput, 'subject' | 'html' | 'text'> {
  const safeName = escapeHtml(name)
  const safeUrl = escapeHtml(url)
  return {
    subject: 'Reset your PetitBakery password',
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto"><h2>Reset your password</h2><p>Hi ${safeName},</p><p>Use the secure link below to choose a new password.</p><p><a href="${safeUrl}" style="display:inline-block;background:#111827;color:#fff;padding:12px 18px;border-radius:10px;text-decoration:none">Reset password</a></p><p>This link expires in 30 minutes. If you did not request this, ignore this email.</p></div>`,
    text: `Hi ${name}, reset your PetitBakery password: ${url}\nThis link expires in 30 minutes.`
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[char] || char))
}
