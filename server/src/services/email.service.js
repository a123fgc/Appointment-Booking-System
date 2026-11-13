import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { formatDateTime } from '../utils/time.js';

/* ---------- Transport ---------- */

let transporter = null;

function getTransporter() {
  if (!env.smtpEnabled) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    });
  }
  return transporter;
}

// SMTP set na ho to email sirf console mein print hoti hai (development ke liye)
async function send({ to, subject, text, html }) {
  const t = getTransporter();

  if (!t) {
    console.log('\n--- Email (SMTP set nahi, sirf console) ---');
    console.log(`To:      ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(text);
    console.log('--- end ---\n');
    return;
  }

  await t.sendMail({ from: env.MAIL_FROM, to, subject, text, html });
}

/* ---------- Helpers ---------- */

// Email ki HTML mein user ka likha hua text mehfooz tareeqe se dikhane ke liye
const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[c]);

const price = (cents) => `Rs. ${(cents / 100).toLocaleString('en-PK')}`;

// Booking ki tafseel: text aur HTML dono ke liye
function details(b) {
  const rows = [
    ['Service', b.service_name],
    ['Staff', b.staff_name],
    ['Time', formatDateTime(b.start_time)],
    ['Duration', `${b.duration_min} minute`],
    ['Price', price(b.price_cents)],
  ];
  if (b.notes) rows.push(['Note', b.notes]);

  return {
    text: rows.map(([k, v]) => `${k}: ${v}`).join('\n'),
    html: `<table style="border-collapse:collapse">${rows
      .map(
        ([k, v]) =>
          `<tr><td style="padding:4px 16px 4px 0;color:#666">${esc(k)}</td><td style="padding:4px 0"><strong>${esc(v)}</strong></td></tr>`
      )
      .join('')}</table>`,
  };
}

function layout(title, intro, d) {
  return {
    text: `${title}\n\n${intro}\n\n${d.text}\n\n${env.CLIENT_URL}/appointments`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px">
        <h2 style="margin:0 0 12px">${esc(title)}</h2>
        <p>${esc(intro)}</p>
        ${d.html}
        <p style="margin-top:20px"><a href="${esc(env.CLIENT_URL)}/appointments">View your appointments</a></p>
      </div>`,
  };
}

// Customer aur staff dono ko alag alag message bhejna
function toBoth(booking, make) {
  return Promise.all([
    send({ to: booking.customer_email, ...make('customer') }),
    send({ to: booking.staff_email, ...make('staff') }),
  ]);
}

/* ---------- Booking ki emails ---------- */

export function sendBookingConfirmed(b) {
  const d = details(b);
  return toBoth(b, (who) => {
    const title = who === 'customer' ? 'Your booking is confirmed' : 'New booking received';
    const intro =
      who === 'customer'
        ? `${b.customer_name}, Your appointment has been confirmed.`
        : `${b.staff_name}, ${b.customer_name} has booked an appointment with you.`;
    return { subject: title, ...layout(title, intro, d) };
  });
}

export function sendBookingRescheduled(b, oldStart) {
  const d = details(b);
  const old = formatDateTime(oldStart);
  return toBoth(b, (who) => {
    const title = 'Appointment rescheduled';
    const intro =
      who === 'customer'
        ? `${b.customer_name}, Your appointment has been successfully rescheduled from ${old} to the new time.`
        : `${b.staff_name}, ${b.customer_name} Appointment successfully rescheduled from ${old} to the new time.`;
    return { subject: title, ...layout(title, intro, d) };
  });
}

// cancelledByRole: 'customer' | 'staff' | 'admin'. Jis ne cancel ki use bhi tasdeeq milti hai.
export function sendBookingCancelled(b, cancelledByRole) {
  const d = details(b);
  const by =
    cancelledByRole === 'customer'
      ? 'customer ne'
      : cancelledByRole === 'staff'
        ? 'staff ne'
        : 'admin ne';

  return toBoth(b, (who) => {
    const title = 'Appointment cancelled';
    const intro =
      who === 'customer'
        ? `${b.customer_name}, Your appointment ${by} cancelled.`
        : `${b.staff_name}, ${b.customer_name} Appointment ${by} cancelled.`;
    return { subject: title, ...layout(title, intro, d) };
  });
}