const SEGMENTS = new Set([
  'Serviços e consultoria',
  'Loja / produto',
  'Saúde e bem-estar',
  'Infoproduto / educação',
  'Marca pessoal',
  'Outro'
]);

const LOCAL_ORIGINS = new Set([
  'http://localhost:4177',
  'http://127.0.0.1:4177',
  'http://localhost:5500',
  'http://127.0.0.1:5500'
]);

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin');
    const corsHeaders = getCorsHeaders(origin, url.origin, env.ALLOWED_ORIGINS);

    if (request.method === 'OPTIONS') {
      return corsHeaders
        ? new Response(null, { status: 204, headers: corsHeaders })
        : json({ ok: false, message: 'Origem não autorizada.' }, 403);
    }

    if (url.pathname === '/api/health' && request.method === 'GET') {
      return json({ ok: true });
    }

    if (url.pathname !== '/api/diagnostico' || request.method !== 'POST') {
      return json({ ok: false, message: 'Rota não encontrada.' }, 404, corsHeaders);
    }

    if (origin && !corsHeaders) {
      return json({ ok: false, message: 'Origem não autorizada.' }, 403);
    }

    const missingConfiguration = [
      'GOOGLE_APPS_SCRIPT_URL',
      'INTEGRATION_SECRET'
    ].filter((key) => !env[key]);

    if (missingConfiguration.length) {
      console.error('Form integration is missing required environment variables.');
      return json(
        { ok: false, message: 'O formulário ainda está sendo configurado. Tente novamente mais tarde.' },
        503,
        corsHeaders
      );
    }

    const contentLength = Number(request.headers.get('Content-Length') || 0);
    if (contentLength > 16_384) {
      return json({ ok: false, message: 'Os dados enviados são muito grandes.' }, 413, corsHeaders);
    }

    let raw;
    try {
      const body = await request.text();
      if (body.length > 16_384) throw new Error('Payload too large');
      raw = JSON.parse(body);
    } catch {
      return json({ ok: false, message: 'Não foi possível ler os dados enviados.' }, 400, corsHeaders);
    }

    const validation = validateSubmission(raw);
    if (!validation.ok) {
      return json({ ok: false, message: validation.message }, 422, corsHeaders);
    }

    if (validation.isBot) {
      return json({ ok: true }, 200, corsHeaders);
    }

    const submission = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      ...validation.data
    };

    try {
      await appendToGoogleSheet(submission, env);
      return json({ ok: true }, 200, corsHeaders);
    } catch (error) {
      console.error(`Submission ${submission.id} failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return json(
        { ok: false, message: 'Não foi possível concluir o envio agora. Tente novamente em alguns instantes.' },
        502,
        corsHeaders
      );
    }
  }
};

function validateSubmission(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, message: 'Dados inválidos.' };
  }

  if (clean(input.website, 120)) return { ok: true, isBot: true };

  const elapsed = Date.now() - Number(input.startedAt);
  if (!Number.isFinite(elapsed) || elapsed < 1_200 || elapsed > 86_400_000) {
    return { ok: false, message: 'Atualize a página e tente novamente.' };
  }

  const data = {
    nome: clean(input.nome, 100),
    email: clean(input.email, 160).toLowerCase(),
    instagram: clean(input.instagram, 80),
    whatsapp: clean(input.whatsapp, 40),
    segmento: clean(input.segmento, 80),
    objetivo: clean(input.objetivo, 1_500)
  };

  if (Object.values(data).some((value) => !value)) {
    return { ok: false, message: 'Preencha todos os campos antes de enviar.' };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    return { ok: false, message: 'Digite um e-mail válido.' };
  }

  if (!SEGMENTS.has(data.segmento)) {
    return { ok: false, message: 'Selecione um segmento válido.' };
  }

  if (data.nome.length < 2 || data.objetivo.length < 8) {
    return { ok: false, message: 'Conte um pouco mais para que o diagnóstico seja preciso.' };
  }

  return { ok: true, isBot: false, data };
}

async function appendToGoogleSheet(submission, env) {
  const response = await fetch(env.GOOGLE_APPS_SCRIPT_URL, {
    method: 'POST',
    redirect: 'follow',
    headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
    body: JSON.stringify({
      secret: env.INTEGRATION_SECRET,
      submission
    })
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.ok) {
    throw new Error('Google Sheets rejected the submission');
  }
}

function clean(value, maxLength) {
  return String(value ?? '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function getCorsHeaders(origin, workerOrigin, configuredOrigins = '') {
  if (!origin) return null;

  const allowed = new Set([
    ...LOCAL_ORIGINS,
    ...String(configuredOrigins).split(',').map((item) => item.trim()).filter(Boolean)
  ]);

  if (origin !== workerOrigin && !allowed.has(origin)) return null;

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  };
}

function json(payload, status = 200, extraHeaders = null) {
  const headers = new Headers({
    'Content-Type': 'application/json; charset=UTF-8',
    'Cache-Control': 'no-store'
  });

  if (extraHeaders) {
    Object.entries(extraHeaders).forEach(([key, value]) => headers.set(key, value));
  }

  return new Response(JSON.stringify(payload), { status, headers });
}
