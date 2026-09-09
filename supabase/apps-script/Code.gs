/**
 * SOMUN '26 — payment-confirmation mailer (Google Apps Script)
 * ─────────────────────────────────────────────────────────────
 * Receives the Supabase mail_queue webhook and sends the
 * confirmation from YOUR Gmail via MailApp (free ~100 mails/day).
 *
 * SETUP (full walkthrough in supabase/MAIL-SETUP.md):
 *  1. Fill MAILER_SECRET below — the SAME string you put in
 *     app_secrets → mailer_secret.
 *  2. OPTIONAL but recommended (keeps the console counter honest):
 *     Project Settings → Script properties → add
 *       SUPABASE_URL         = https://gvhlbnyxysfhfwrflxsg.supabase.co
 *       SUPABASE_SERVICE_KEY = your service_role key (dashboard →
 *                              Settings → API; never commit anywhere)
 *  3. Deploy → New deployment → Web app →
 *       Execute as: Me   ·   Who has access: Anyone
 *     Copy the …/exec URL → app_secrets → mailer_url.
 *  4. First mail triggers a Google consent screen — "Advanced" →
 *     "Go to … (unsafe)" is normal for your own script.
 */

var MAILER_SECRET = 'PASTE-THE-SAME-SECRET-HERE';

var FROM_NAME = "SOMUN '26";
var EVENT = {
  dates: 'October 30 — November 1, 2026',
  venue: 'Silver Oaks International School, Bowrampet Campus',
  email: 'somundelaffairs@gmail.com'
};

function doPost(e) {
  try {
    var p = JSON.parse(e.postData.contents);
    if (p.secret !== MAILER_SECRET) return _txt('rejected: bad secret');
    if (p.template !== 'payment_verified') return _txt('skipped: unknown template ' + p.template);
    return _sendPaymentVerified(p);
  } catch (err) {
    return _txt('error: ' + err);
  }
}

/* Browser ping — open the …/exec URL in a tab, you should see "alive". */
function doGet() {
  return _txt("SOMUN '26 mailer is alive. Waiting for POSTs from Supabase.");
}

function _sendPaymentVerified(p) {
  var name = p.name || 'Delegate';
  var ref  = p.ref_code || '—';
  var amt  = p.amount ? '₹' + p.amount : 'your registration fee';

  var subject = "SOMUN '26 — payment confirmed · " + ref;

  var html =
    '<div style="max-width:560px;margin:0 auto;font-family:Georgia,serif;color:#1c1c1c;">' +
      '<div style="background:#101418;color:#f4efe6;padding:22px 28px;">' +
        '<div style="font-size:12px;letter-spacing:3px;text-transform:uppercase;opacity:.75;">Model United Nations</div>' +
        '<div style="font-size:26px;font-weight:bold;letter-spacing:1px;">SOMUN \'26</div>' +
      '</div>' +
      '<div style="padding:26px 28px;border:1px solid #e4ded2;border-top:none;background:#fffdf8;">' +
        '<p style="font-size:16px;">Dear ' + _esc(name) + ',</p>' +
        '<p style="font-size:15px;line-height:1.6;">Your payment has been received and verified. ' +
        'Your seat at SOMUN \'26 is now <b>confirmed</b> — welcome aboard.</p>' +
        '<table style="width:100%;border-collapse:collapse;margin:18px 0;font-size:14px;">' +
          _row('Reference code', '<b style="letter-spacing:1px;">' + _esc(ref) + '</b>') +
          _row('Amount paid', '<b>' + _esc(amt) + '</b>') +
          (p.pref1 ? _row('Committee preference', _esc(p.pref1)) : '') +
          (p.institution ? _row('Institution', _esc(p.institution)) : '') +
        '</table>' +
        '<p style="font-size:14px;line-height:1.6;"><b>What happens next</b></p>' +
        '<ul style="font-size:14px;line-height:1.7;padding-left:18px;margin:6px 0;">' +
          '<li>Committee allotments arrive by email once processing begins.</li>' +
          '<li>Your pass covers the delegate kit, all three days of meals, socials entry and certificates.</li>' +
          '<li>Keep this mail — the reference code is your identity at the venue.</li>' +
        '</ul>' +
        '<p style="font-size:14px;line-height:1.6;">Questions? Write to ' +
          '<a href="mailto:' + EVENT.email + '" style="color:#8a1f1f;">' + EVENT.email + '</a>.</p>' +
        '<p style="font-size:14px;margin-top:22px;">See you in committee,<br/><b>The SOMUN \'26 Secretariat</b></p>' +
      '</div>' +
      '<div style="padding:16px 28px;background:#f4efe6;font-size:12px;color:#5a5548;line-height:1.6;">' +
        EVENT.dates + ' &nbsp;·&nbsp; ' + EVENT.venue +
      '</div>' +
    '</div>';

  MailApp.sendEmail({
    to: p.to,
    name: FROM_NAME,
    subject: subject,
    htmlBody: html
  });

  _markSent(p.mail_id);

  var left = MailApp.getRemainingDailyQuota();
  return _txt('sent to ' + p.to + ' — daily quota left: ' + left);
}

/* Mark mail_queue.sent_at so the console counter stays truthful.
   Silently skipped when the two script properties are not set. */
function _markSent(mailId) {
  var url = PropertiesService.getScriptProperties().getProperty('SUPABASE_URL');
  var key = PropertiesService.getScriptProperties().getProperty('SUPABASE_SERVICE_KEY');
  if (!url || !key || !mailId) return;
  UrlFetchApp.fetch(url.replace(/\/$/, '') + '/rest/v1/mail_queue?id=eq.' + encodeURIComponent(mailId), {
    method: 'patch',
    contentType: 'application/json',
    headers: { apikey: key, Authorization: 'Bearer ' + key, Prefer: 'return=minimal' },
    payload: JSON.stringify({ sent_at: new Date().toISOString() }),
    muteHttpExceptions: true
  });
}

function _row(k, v) {
  return '<tr>' +
    '<td style="padding:7px 10px;border-bottom:1px solid #eee5d5;color:#6b6350;width:42%;">' + k + '</td>' +
    '<td style="padding:7px 10px;border-bottom:1px solid #eee5d5;">' + v + '</td>' +
  '</tr>';
}

function _esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function _txt(s) {
  return ContentService.createTextOutput(s);
}
