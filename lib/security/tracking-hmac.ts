import crypto from 'node:crypto';

function getSecret(): string {
  return (
    process.env.TRACKING_HMAC_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    'alldot-crm-tracking-key'
  );
}

export function assinarLinkRastreamento(token: string, url: string): string {
  return crypto
    .createHmac('sha256', getSecret())
    .update(`${token}|${url}`)
    .digest('hex')
    .slice(0, 32);
}

export function verificarAssinaturaLink(
  token: string,
  url: string,
  sig: string | null
): boolean {
  if (!token || !url || !sig) return false;
  const esperado = assinarLinkRastreamento(token, url);
  const a = Buffer.from(esperado, 'utf8');
  const b = Buffer.from(sig, 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function urlDestinoSegura(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}
