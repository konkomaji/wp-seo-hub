export const TIMEZONES = [
  { label: 'India (IST, UTC+5:30)',           tz: 'Asia/Kolkata' },
  { label: 'UAE / Dubai (GST, UTC+4)',         tz: 'Asia/Dubai' },
  { label: 'Singapore (SGT, UTC+8)',           tz: 'Asia/Singapore' },
  { label: 'Japan (JST, UTC+9)',               tz: 'Asia/Tokyo' },
  { label: 'Thailand (ICT, UTC+7)',            tz: 'Asia/Bangkok' },
  { label: 'UK (GMT/BST, UTC+0/+1)',           tz: 'Europe/London' },
  { label: 'Germany (CET/CEST, UTC+1/+2)',     tz: 'Europe/Berlin' },
  { label: 'France (CET/CEST, UTC+1/+2)',      tz: 'Europe/Paris' },
  { label: 'US East (EST/EDT, UTC-5/-4)',      tz: 'America/New_York' },
  { label: 'US Central (CST/CDT, UTC-6/-5)',  tz: 'America/Chicago' },
  { label: 'US West (PST/PDT, UTC-8/-7)',     tz: 'America/Los_Angeles' },
  { label: 'Canada East (EST/EDT)',            tz: 'America/Toronto' },
  { label: 'Canada West (PST/PDT)',            tz: 'America/Vancouver' },
  { label: 'Australia Sydney (AEST/AEDT)',     tz: 'Australia/Sydney' },
  { label: 'Australia Melbourne (AEST/AEDT)', tz: 'Australia/Melbourne' },
  { label: 'New Zealand (NZST/NZDT)',          tz: 'Pacific/Auckland' },
  { label: 'South Africa (SAST, UTC+2)',       tz: 'Africa/Johannesburg' },
  { label: 'Hong Kong (HKT, UTC+8)',           tz: 'Asia/Hong_Kong' },
  { label: 'Malaysia (MYT, UTC+8)',            tz: 'Asia/Kuala_Lumpur' },
  { label: 'Pakistan (PKT, UTC+5)',            tz: 'Asia/Karachi' },
  { label: 'Bangladesh (BST, UTC+6)',          tz: 'Asia/Dhaka' },
];

export const DEFAULT_TZ = 'Asia/Kolkata';

/** Format a date in a specific IANA timezone */
export function formatInTz(date, tz, opts = {}) {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  const defaultOpts = { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false };
  return new Intl.DateTimeFormat('en-IN', { timeZone: tz || DEFAULT_TZ, ...defaultOpts, ...opts }).format(d);
}

/** Get the effective timezone for a client (client override → global default → IST) */
export function getClientTz(client, settings) {
  return settings?.clientTimezones?.[client?.id] || settings?.defaultTimezone || DEFAULT_TZ;
}

/** Get short offset label e.g. "+5:30" for a timezone */
export function tzOffset(tz) {
  try {
    const now    = new Date();
    const utcMs  = now.getTime();
    const local  = new Date(now.toLocaleString('en-US', { timeZone: tz }));
    const diff   = Math.round((local - utcMs) / 60000);
    const sign   = diff >= 0 ? '+' : '-';
    const abs    = Math.abs(diff);
    const h      = Math.floor(abs / 60);
    const m      = abs % 60;
    return `${sign}${h}${m ? ':' + String(m).padStart(2, '0') : ''}`;
  } catch {
    return '';
  }
}
