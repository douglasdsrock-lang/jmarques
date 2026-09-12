import assert from 'node:assert/strict';
import worker from './src/index.js';

const originalFetch = globalThis.fetch;
const externalCalls = [];

globalThis.fetch = async (url, options) => {
  externalCalls.push({ url: String(url), options });
  return Response.json({ ok: true });
};

const env = {
  GOOGLE_APPS_SCRIPT_URL: 'https://script.google.com/macros/s/test/exec',
  INTEGRATION_SECRET: 'test-secret',
  ALLOWED_ORIGINS: 'https://example.com'
};

const submission = {
  nome: 'Maria Silva',
  email: 'maria@example.com',
  instagram: '@maria',
  whatsapp: '(11) 99999-9999',
  segmento: 'Marca pessoal',
  objetivo: 'Quero melhorar a conversão do meu perfil.',
  website: '',
  startedAt: String(Date.now() - 5_000)
};

const validResponse = await worker.fetch(new Request('https://api.example.com/api/diagnostico', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Origin': 'https://example.com'
  },
  body: JSON.stringify(submission)
}), env);

assert.equal(validResponse.status, 200);
assert.deepEqual(await validResponse.json(), { ok: true });
assert.equal(externalCalls.length, 1);
assert.equal(externalCalls[0].url, env.GOOGLE_APPS_SCRIPT_URL);

const invalidOriginResponse = await worker.fetch(new Request('https://api.example.com/api/diagnostico', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Origin': 'https://untrusted.example'
  },
  body: JSON.stringify(submission)
}), env);

assert.equal(invalidOriginResponse.status, 403);

const invalidEmailResponse = await worker.fetch(new Request('https://api.example.com/api/diagnostico', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Origin': 'https://example.com'
  },
  body: JSON.stringify({ ...submission, email: 'email-invalido' })
}), env);

assert.equal(invalidEmailResponse.status, 422);
assert.equal(externalCalls.length, 1);

globalThis.fetch = originalFetch;
console.log('Worker integration tests passed.');
