/**
 * Cloudflare Worker — 브리프 전용 텔레그램 프록시
 *
 * 시크릿(대시보드 → Settings → Variables):
 *   TELEGRAM_BOT_TOKEN
 *   TELEGRAM_CHAT_ID
 *   BRIEF_API_KEY        ← 클라이언트 brief-proxy-config.js 의 __BRIEF_PROXY_KEY__ 와 동일
 *
 * 배포: 이 파일이 있는 폴더에서
 *   npx wrangler deploy
 *
 * 엔드포인트:
 *   POST {WORKER_URL}/send   body: { apiKey, cardHtml, markdown, markdownFilename?, caption? }
 *   POST {WORKER_URL}/test   body: { apiKey }  — 연결 테스트용 짧은 메시지 1통
 */

const TG = 'https://api.telegram.org';

function jsonResponse(obj, status, cors) {
  const headers = {
    'Content-Type': 'application/json',
    ...cors
  };
  return new Response(JSON.stringify(obj), { status, headers });
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
}

async function sendMessage(token, chatId, text, parseMode) {
  const payload = { chat_id: chatId, text };
  if (parseMode) payload.parse_mode = parseMode;
  const res = await fetch(`${TG}/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json().catch(() => ({}));
  if (!data.ok) {
    throw new Error(data.description || `sendMessage ${res.status}`);
  }
  return data;
}

async function sendDocument(token, chatId, markdown, filename, caption) {
  const form = new FormData();
  form.append('chat_id', String(chatId));
  form.append('document', new Blob([markdown], { type: 'text/plain' }), filename || 'brief.md');
  if (caption) form.append('caption', caption);
  const res = await fetch(`${TG}/bot${token}/sendDocument`, { method: 'POST', body: form });
  const data = await res.json().catch(() => ({}));
  if (!data.ok) {
    throw new Error(data.description || `sendDocument ${res.status}`);
  }
  return data;
}

function authorize(body, env) {
  if (!env.BRIEF_API_KEY || !body || body.apiKey !== env.BRIEF_API_KEY) {
    return false;
  }
  return true;
}

export default {
  async fetch(request, env) {
    const cors = corsHeaders();
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: cors });
    }
    if (request.method !== 'POST') {
      return jsonResponse({ ok: false, error: 'method' }, 405, cors);
    }

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/$/, '') || '/';

    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ ok: false, error: 'json' }, 400, cors);
    }

    if (!authorize(body, env)) {
      return jsonResponse({ ok: false, error: 'unauthorized' }, 401, cors);
    }

    const token = env.TELEGRAM_BOT_TOKEN;
    const chatId = env.TELEGRAM_CHAT_ID;
    if (!token || chatId === undefined || chatId === '') {
      return jsonResponse({ ok: false, error: 'worker_env' }, 500, cors);
    }

    try {
      if (path.endsWith('/test')) {
        await sendMessage(
          token,
          chatId,
          '✅ DASIFILL 브리프 프록시 연결 테스트',
          null
        );
        return jsonResponse({ ok: true }, 200, cors);
      }

      if (path.endsWith('/send')) {
        const { cardHtml, markdown, markdownFilename, caption } = body;
        if (!cardHtml || markdown === undefined) {
          return jsonResponse({ ok: false, error: 'missing_fields' }, 400, cors);
        }
        await sendMessage(token, chatId, cardHtml, 'HTML');
        await sendDocument(
          token,
          chatId,
          markdown,
          markdownFilename || 'DASIFILL_Brief.md',
          caption || ''
        );
        return jsonResponse({ ok: true }, 200, cors);
      }

      return jsonResponse({ ok: false, error: 'path' }, 404, cors);
    } catch (e) {
      return jsonResponse(
        { ok: false, error: String(e && e.message ? e.message : e) },
        502,
        cors
      );
    }
  }
};
