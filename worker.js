// armands.site – Worker: statikus assetek + /api/contact form-végponat
// Küldés: a meglévő Zoho Mail fiók OAuth API-ja (a homelab-tól függetlenül).
// Secretek (CF dashboard → Workers → armands-cv → Variables and Secrets):
//   ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN,
//   CONTACT_FROM (pl. hello@armands.site – Zoho-fiókbeli cím),
//   CONTACT_TO (armand@bozsik.eu), ZOHO_DC (opcionális, alap: eu)

const ALLOWED_ORIGINS = new Set([
  'https://armands.cv',
  'https://www.armands.cv',
  'https://armands.site',
  'https://www.armands.site',
  'https://armands.blog',
  'https://www.armands.blog',
  'https://armands.dev',
  'https://www.armands.dev',
  'https://neumann.armands.dev',
  'https://neumann-armands-dev.cf-584.workers.dev',
]);

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';

    if (url.pathname === '/api/contact' && request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }
    if (url.pathname === '/api/contact' && request.method === 'POST') {
      return handleContact(request, env, origin);
    }

    // Minden más: statikus assetek (az [assets] kötés kezeli).
    // Hiányzó assetnél a kötés kivételt dob (500) – azt 404-gyé fordítjuk,
    // különben a botok és a Lighthouse 500-ast látna minden hiányzó útvonalon.
    try {
      const res = await env.ASSETS.fetch(request);
      if (res && res.status !== 404) return res;
      return notFoundResponse(request);
    } catch {
      return notFoundResponse(request);
    }
  },
};

function corsHeaders(origin) {
  const allow = ALLOWED_ORIGINS.has(origin) ? origin : 'https://armands.cv';
  return {
    'Access-Control-Allow-Origin': allow,
    'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function zohoUrls(env) {
  const dc = env.ZOHO_DC || 'com';
  return {
    accounts: `https://accounts.zoho.${dc}`,
    mail: `https://mail.zoho.${dc}/api`,
  };
}

// Turnstile siteverify (invisible captcha)
async function verifyTurnstile(token, secret, ip) {
  if (!token) return false;
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret, response: token, remoteip: ip }),
    });
    const data = await res.json();
    return data.success === true;
  } catch {
    return false;
  }
}

// 1) refresh token → access token
async function getAccessToken(env, urls) {
  const params = new URLSearchParams({
    refresh_token: env.ZOHO_REFRESH_TOKEN,
    client_id: env.ZOHO_CLIENT_ID,
    client_secret: env.ZOHO_CLIENT_SECRET,
    grant_type: 'refresh_token',
  });
  const res = await fetch(`${urls.accounts}/oauth/v2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    throw new Error(`Zoho OAuth hiba: ${res.status} ${JSON.stringify(data).slice(0, 200)}`);
  }
  return data.access_token;
}

// 2) accountId lekérése (az első Zoho Mail fiók)
async function getAccountId(env, urls, token) {
  const res = await fetch(`${urls.mail}/accounts`, {
    headers: { Authorization: `Zoho-oauthtoken ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  const account = data?.data?.[0];
  if (!res.ok || !account?.accountId) {
    throw new Error(`Zoho accounts hiba: ${res.status} ${JSON.stringify(data).slice(0, 200)}`);
  }
  return account.accountId;
}

// 3) levél küldése
async function sendMail(env, urls, token, accountId, payload) {
  const res = await fetch(`${urls.mail}/accounts/${accountId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Zoho-oauthtoken ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.status?.code !== 200) {
    throw new Error(`Zoho send hiba: ${res.status} ${JSON.stringify(data).slice(0, 200)}`);
  }
}

async function handleContact(request, env, origin) {
  const headers = { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders(origin) };

  const required = ['ZOHO_CLIENT_ID', 'ZOHO_CLIENT_SECRET', 'ZOHO_REFRESH_TOKEN', 'CONTACT_FROM', 'CONTACT_TO'];
  if (required.some((k) => !env[k])) {
    return json({ ok: false, error: 'not_configured' }, 503, headers);
  }

  let data;
  try {
    data = await request.json();
  } catch {
    return json({ ok: false, error: 'invalid_json' }, 400, headers);
  }

  const name = String(data.name || '').trim().slice(0, 120);
  const email = String(data.email || '').trim().slice(0, 200);
  const message = String(data.message || '').trim().slice(0, 5000);

  // Turnstile (invisible captcha) – ha TURNSTILE_SECRET be van állítva, kötelező az ellenőrzés
  if (env.TURNSTILE_SECRET) {
    const token = String(data['cf-turnstile-response'] || data.turnstileToken || '').trim();
    const ip = request.headers.get('CF-Connecting-IP') || '';
    if (!(await verifyTurnstile(token, env.TURNSTILE_SECRET, ip))) {
      return json({ ok: false, error: 'captcha_failed' }, 403, headers);
    }
  }

  if (!name || !message || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ ok: false, error: 'invalid_fields' }, 400, headers);
  }

  const host = new URL(request.url).hostname;
  const subject = `Kapcsolati űrlap (${host}) – ${name}`.slice(0, 250);
  const content = [
    `Név: ${name}`,
    `Email: ${email}`,
    '',
    message,
    '',
    `— ${host} /api/contact`,
  ].join('\n');

  try {
    const urls = zohoUrls(env);
    const token = await getAccessToken(env, urls);
    const accountId = await getAccountId(env, urls, token);
    await sendMail(env, urls, token, accountId, {
      fromAddress: env.CONTACT_FROM,
      toAddress: env.CONTACT_TO,
      subject,
      content,
      mailFormat: 'plaintext',
      askReceipt: 'no',
    });
    return json({ ok: true }, 200, headers);
  } catch (err) {
    console.error('Küldési hiba:', err.message || err);
    return json({ ok: false, error: 'send_failed' }, 502, headers);
  }
}

function json(payload, status, headers) {
  return new Response(JSON.stringify(payload), { status, headers });
}

// Márkás 404 – a főoldal stílusával, visszalinkkel.
// Nyelv az Accept-Language fejléc alapján (a site többi oldala is így vált).
function notFoundResponse(request) {
  const hu = (request.headers.get('Accept-Language') || '').toLowerCase().startsWith('hu');
  const html = `<!doctype html>
<html lang="${hu ? 'hu' : 'en'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>404 — Armand Viktor Bozsik</title>
<style>
  body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center;
         background:#2d2a2e; color:#f8f5ef; font-family:'Montserrat',sans-serif; text-align:center; }
  h1 { font-size:4rem; margin:0 0 0.5rem; color:#ffd866; }
  p { color:#bdbdbd; margin:0 0 2rem; }
  a { display:inline-block; padding:0.7rem 2rem; background:#ffd866; color:#212121;
      border-radius:999px; font-weight:700; text-decoration:none; }
</style>
</head>
<body>
  <main>
    <h1>404</h1>
    <p>${hu ? 'A keresett oldal nem létezik.' : 'The page you are looking for does not exist.'}</p>
    <a href="/">${hu ? 'Vissza a főoldalra' : 'Back to home'}</a>
  </main>
</body>
</html>`;
  return new Response(html, { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
