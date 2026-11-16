import net from 'node:net';
import tls from 'node:tls';
import crypto from 'node:crypto';
import type {
  ConfiguracaoServidorEmail,
  ImagemEmailInline,
  AnexoEmailTemplate,
} from '@/lib/mock-data';

export interface ResultadoEnvioSmtp {
  ok: boolean;
  status: 'entregue' | 'bounce_temporario' | 'bounce_permanente' | 'erro';
  codigo: string;
  resposta: string;
}

export interface MensagemSmtpPayload {
  paraEmail: string;
  paraNome?: string;
  assunto: string;
  html: string;
  remetenteNome?: string;
  remetenteEmail?: string;
  replyTo?: string;
  listUnsubscribeUrl?: string;
  imagensInline?: ImagemEmailInline[];
  anexos?: AnexoEmailTemplate[];
}

function encodeSubjectUtf8(subject: string): string {
  const b64 = Buffer.from(subject, 'utf8').toString('base64');
  return `=?UTF-8?B?${b64}?=`;
}

function extractBase64Parts(dataUrl: string): { mime: string; base64: string } {
  const match = /^data:([^;]+);base64,(.+)$/i.exec(dataUrl || '');
  if (match) {
    return { mime: match[1], base64: match[2] };
  }
  return { mime: 'application/octet-stream', base64: dataUrl || '' };
}

function wrapBase64(b64: string): string {
  return b64.replace(/(.{76})/g, '$1\r\n');
}

function dotStuff(content: string): string {
  return content.replace(/\r?\n/g, '\r\n').replace(/^\./gm, '..');
}

function buildMimeMessage(
  config: ConfiguracaoServidorEmail,
  msg: MensagemSmtpPayload
): string {
  const fromName = (msg.remetenteNome || config.nome_remetente || 'AllDot CRM').replace(/"/g, '');
  const fromEmail = msg.remetenteEmail || config.email_remetente;
  const toHeader = msg.paraNome
    ? `"${msg.paraNome.replace(/"/g, '')}" <${msg.paraEmail}>`
    : `<${msg.paraEmail}>`;

  const mixedBoundary = `----=_Mixed_${crypto.randomBytes(8).toString('hex')}`;
  const relatedBoundary = `----=_Related_${crypto.randomBytes(8).toString('hex')}`;
  const hasInline = Boolean(msg.imagensInline && msg.imagensInline.length > 0);
  const hasAttachments = Boolean(msg.anexos && msg.anexos.length > 0);

  const headers: string[] = [
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${crypto.randomUUID()}@${fromEmail.split('@')[1] || 'alldotcrm.local'}>`,
    `From: "${fromName}" <${fromEmail}>`,
    `To: ${toHeader}`,
    `Subject: ${encodeSubjectUtf8(msg.assunto)}`,
    `MIME-Version: 1.0`,
  ];

  if (msg.replyTo || config.email_resposta) {
    headers.push(`Reply-To: ${msg.replyTo || config.email_resposta}`);
  }
  if (msg.listUnsubscribeUrl) {
    headers.push(`List-Unsubscribe: <${msg.listUnsubscribeUrl}>`);
    headers.push(`List-Unsubscribe-Post: List-Unsubscribe=One-Click`);
  }

  let htmlBody = msg.html || '';
  if (hasInline) {
    for (const img of msg.imagensInline || []) {
      if (img.url_ou_base64 && img.id) {
        htmlBody = htmlBody.split(img.url_ou_base64).join(`cid:${img.id}`);
      }
    }
  }

  const htmlPart = [
    `Content-Type: text/html; charset="UTF-8"`,
    `Content-Transfer-Encoding: base64`,
    ``,
    wrapBase64(Buffer.from(htmlBody, 'utf8').toString('base64')),
  ].join('\r\n');

  let mainBodySection = htmlPart;

  if (hasInline) {
    const relatedParts: string[] = [
      `--${relatedBoundary}`,
      htmlPart,
    ];
    for (const img of msg.imagensInline || []) {
      if (!img.url_ou_base64?.startsWith('data:')) continue;
      const { mime, base64 } = extractBase64Parts(img.url_ou_base64);
      relatedParts.push(
        `--${relatedBoundary}`,
        `Content-Type: ${mime}; name="${img.nome}"`,
        `Content-Transfer-Encoding: base64`,
        `Content-ID: <${img.id}>`,
        `Content-Disposition: inline; filename="${img.nome}"`,
        ``,
        wrapBase64(base64)
      );
    }
    relatedParts.push(`--${relatedBoundary}--`);
    mainBodySection = [
      `Content-Type: multipart/related; boundary="${relatedBoundary}"`,
      ``,
      relatedParts.join('\r\n'),
    ].join('\r\n');
  }

  if (hasAttachments) {
    headers.push(`Content-Type: multipart/mixed; boundary="${mixedBoundary}"`);
    const mixedParts: string[] = [
      `--${mixedBoundary}`,
      mainBodySection,
    ];
    for (const anexo of msg.anexos || []) {
      if (!anexo.conteudo_base64_ou_url?.startsWith('data:')) continue;
      const { mime, base64 } = extractBase64Parts(anexo.conteudo_base64_ou_url);
      mixedParts.push(
        `--${mixedBoundary}`,
        `Content-Type: ${anexo.tipo_mime || mime}; name="${anexo.nome_arquivo}"`,
        `Content-Transfer-Encoding: base64`,
        `Content-Disposition: attachment; filename="${anexo.nome_arquivo}"`,
        ``,
        wrapBase64(base64)
      );
    }
    mixedParts.push(`--${mixedBoundary}--`);
    return `${headers.join('\r\n')}\r\n\r\n${mixedParts.join('\r\n')}`;
  }

  return `${headers.join('\r\n')}\r\n${mainBodySection}`;
}

class SmtpSession {
  private socket: net.Socket | tls.TLSSocket;
  private buffer = '';
  private waiters: Array<{
    resolve: (res: { code: number; message: string }) => void;
    reject: (err: Error) => void;
  }> = [];

  constructor(socket: net.Socket | tls.TLSSocket) {
    this.socket = socket;
    this.bindSocket(socket);
  }

  private bindSocket(sock: net.Socket | tls.TLSSocket) {
    sock.setEncoding('utf8');
    sock.on('data', (chunk: string) => {
      this.buffer += chunk;
      this.processBuffer();
    });
    sock.on('error', (err: Error) => {
      while (this.waiters.length > 0) {
        this.waiters.shift()?.reject(err);
      }
    });
  }

  private processBuffer() {
    const lines = this.buffer.split(/\r?\n/);
    // Keep last incomplete line in buffer
    this.buffer = lines.pop() ?? '';

    const completed: string[] = [];
    for (const line of lines) {
      if (!line) continue;
      completed.push(line);
      // SMTP multiline ends when 4th char is space (e.g. "250 OK")
      if (/^\d{3} /.test(line)) {
        const code = Number(line.slice(0, 3));
        const message = completed.join(' | ');
        completed.length = 0;
        this.waiters.shift()?.resolve({ code, message });
      }
    }
    // If incomplete multiline remains, push back to buffer
    if (completed.length > 0) {
      this.buffer = completed.join('\r\n') + '\r\n' + this.buffer;
    }
  }

  nextResponse(): Promise<{ code: number; message: string }> {
    return new Promise((resolve, reject) => {
      this.waiters.push({ resolve, reject });
    });
  }

  async command(cmd: string): Promise<{ code: number; message: string }> {
    const p = this.nextResponse();
    this.socket.write(`${cmd}\r\n`);
    return p;
  }

  async upgradeToTls(host: string): Promise<void> {
    this.socket.removeAllListeners('data');
    this.socket.removeAllListeners('error');
    const upgraded = await new Promise<tls.TLSSocket>((resolve, reject) => {
      const tlsSock = tls.connect(
        {
          socket: this.socket,
          servername: host,
          rejectUnauthorized: process.env.SMTP_ALLOW_SELF_SIGNED !== 'true',
        },
        () => resolve(tlsSock)
      );
      tlsSock.once('error', reject);
    });
    this.socket = upgraded;
    this.buffer = '';
    this.bindSocket(upgraded);
  }

  close() {
    try {
      this.socket.end();
    } catch {
      // ignore
    }
  }
}

async function openAndAuthenticate(
  config: ConfiguracaoServidorEmail
): Promise<SmtpSession> {
  const host = config.smtp_host.trim();
  const port = Number(config.smtp_porta) || 587;
  const security = config.seguranca || 'tls';

  const socket = await new Promise<net.Socket | tls.TLSSocket>((resolve, reject) => {
    const timeoutMs = 12000;
    if (security === 'ssl') {
      const s = tls.connect(
        {
          host,
          port,
          rejectUnauthorized: process.env.SMTP_ALLOW_SELF_SIGNED !== 'true',
          timeout: timeoutMs,
        },
        () => resolve(s)
      );
      s.once('error', reject);
      s.once('timeout', () => reject(new Error('Timeout na conexão SSL/TLS com servidor SMTP.')));
    } else {
      const s = net.connect({ host, port, timeout: timeoutMs }, () => resolve(s));
      s.once('error', reject);
      s.once('timeout', () => reject(new Error('Timeout na conexão TCP com servidor SMTP.')));
    }
  });

  const session = new SmtpSession(socket);
  const greeting = await session.nextResponse();
  if (greeting.code >= 400) {
    session.close();
    throw new SmtpCommandError(greeting.code, greeting.message);
  }

  let ehlo = await session.command('EHLO alldotcrm.local');
  if (ehlo.code >= 400) {
    ehlo = await session.command('HELO alldotcrm.local');
  }

  if (security === 'tls') {
    const starttls = await session.command('STARTTLS');
    if (starttls.code !== 220) {
      session.close();
      throw new SmtpCommandError(starttls.code, starttls.message);
    }
    await session.upgradeToTls(host);
    await session.command('EHLO alldotcrm.local');
  }

  if (config.usuario_smtp && config.senha_smtp) {
    const hostLower = (config.smtp_host || '').toLowerCase();
    const senhaFinal = hostLower.includes('gmail') || hostLower.includes('google')
      ? config.senha_smtp.replace(/\s+/g, '')
      : config.senha_smtp;

    const authLogin = await session.command('AUTH LOGIN');
    if (authLogin.code === 334) {
      const userRes = await session.command(Buffer.from(config.usuario_smtp.trim(), 'utf8').toString('base64'));
      if (userRes.code !== 334) {
        session.close();
        throw new SmtpCommandError(userRes.code, userRes.message);
      }
      const passRes = await session.command(Buffer.from(senhaFinal, 'utf8').toString('base64'));
      if (passRes.code !== 235) {
        session.close();
        throw new SmtpCommandError(passRes.code, passRes.message);
      }
    } else {
      const plainToken = Buffer.from(
        `\0${config.usuario_smtp.trim()}\0${senhaFinal}`,
        'utf8'
      ).toString('base64');
      const plainRes = await session.command(`AUTH PLAIN ${plainToken}`);
      if (plainRes.code !== 235) {
        session.close();
        throw new SmtpCommandError(plainRes.code, plainRes.message);
      }
    }
  }

  return session;
}

class SmtpCommandError extends Error {
  code: number;
  constructor(code: number, message: string) {
    super(message);
    this.code = code;
  }
}

function classifySmtpCode(code: number): ResultadoEnvioSmtp['status'] {
  if (code >= 200 && code < 300) return 'entregue';
  if (code >= 400 && code < 500) return 'bounce_temporario';
  if (code >= 500 && code < 600) return 'bounce_permanente';
  return 'erro';
}

export async function testarConexaoSmtp(
  config: ConfiguracaoServidorEmail
): Promise<{ ok: boolean; mensagem: string }> {
  let session: SmtpSession | null = null;
  try {
    session = await openAndAuthenticate(config);
    await session.command('QUIT');
    session.close();
    return {
      ok: true,
      mensagem: `Conexão SMTP autenticada com sucesso em ${config.smtp_host}:${config.smtp_porta} (${String(
        config.seguranca || 'tls'
      ).toUpperCase()}).`,
    };
  } catch (err) {
    session?.close();
    const msg = err instanceof Error ? err.message : 'Falha na conexão SMTP';
    return { ok: false, mensagem: msg };
  }
}

export async function enviarEmailViaSmtp(
  config: ConfiguracaoServidorEmail,
  payload: MensagemSmtpPayload
): Promise<ResultadoEnvioSmtp> {
  let session: SmtpSession | null = null;
  try {
    session = await openAndAuthenticate(config);

    const fromRes = await session.command(`MAIL FROM:<${payload.remetenteEmail || config.email_remetente}>`);
    if (fromRes.code >= 400) {
      session.close();
      return {
        ok: false,
        status: classifySmtpCode(fromRes.code),
        codigo: String(fromRes.code),
        resposta: fromRes.message,
      };
    }

    const rcptRes = await session.command(`RCPT TO:<${payload.paraEmail}>`);
    if (rcptRes.code >= 400) {
      session.close();
      return {
        ok: false,
        status: classifySmtpCode(rcptRes.code),
        codigo: String(rcptRes.code),
        resposta: rcptRes.message,
      };
    }

    const dataStart = await session.command('DATA');
    if (dataStart.code !== 354) {
      session.close();
      return {
        ok: false,
        status: classifySmtpCode(dataStart.code),
        codigo: String(dataStart.code),
        resposta: dataStart.message,
      };
    }

    const rawMime = dotStuff(buildMimeMessage(config, payload));
    const dataEnd = await session.command(`${rawMime}\r\n.`);

    try {
      await session.command('QUIT');
    } catch {
      // ignore quit error
    }
    session.close();

    return {
      ok: dataEnd.code >= 200 && dataEnd.code < 300,
      status: classifySmtpCode(dataEnd.code),
      codigo: String(dataEnd.code),
      resposta: dataEnd.message,
    };
  } catch (err) {
    session?.close();
    if (err instanceof SmtpCommandError) {
      return {
        ok: false,
        status: classifySmtpCode(err.code),
        codigo: String(err.code),
        resposta: err.message,
      };
    }
    return {
      ok: false,
      status: 'erro',
      codigo: 'CONN_ERR',
      resposta: err instanceof Error ? err.message : 'Erro desconhecido ao enviar via SMTP.',
    };
  }
}
