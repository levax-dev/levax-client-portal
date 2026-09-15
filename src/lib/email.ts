import "server-only"

import { Resend } from "resend"

function getResend() {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return null
  return new Resend(apiKey)
}

const from = process.env.RESEND_FROM_EMAIL ?? "Levax Client Portal <notifications@example.com>"

export async function sendInviteEmail(to: string, orgName: string, inviteUrl: string) {
  const resend = getResend()
  if (!resend) {
    console.warn(`RESEND_API_KEY not set — skipping invite email to ${to}. Link: ${inviteUrl}`)
    return
  }

  await resend.emails.send({
    from,
    to,
    subject: `You've been invited to join ${orgName} on Levax`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>You're invited to ${orgName}</h2>
        <p>You've been invited to join the Levax client portal. Click below to set up your account.</p>
        <p><a href="${inviteUrl}" style="display:inline-block;padding:10px 20px;background:#4f46e5;color:#fff;border-radius:6px;text-decoration:none;">Accept invite</a></p>
        <p style="color:#666;font-size:12px;">If you weren't expecting this, you can ignore this email.</p>
      </div>
    `,
  })
}

export async function sendTicketNotificationEmail(
  to: string,
  subject: string,
  message: string,
  link: string
) {
  const resend = getResend()
  if (!resend) {
    console.warn(`RESEND_API_KEY not set — skipping notification email to ${to}.`)
    return
  }

  await resend.emails.send({
    from,
    to,
    subject,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <p>${message}</p>
        <p><a href="${link}" style="display:inline-block;padding:10px 20px;background:#4f46e5;color:#fff;border-radius:6px;text-decoration:none;">View in Levax</a></p>
      </div>
    `,
  })
}
