const HEADERS = [
  'ID',
  'Recebido em',
  'Nome',
  'E-mail',
  'Instagram',
  'WhatsApp',
  'Segmento',
  'Maior desafio',
  'Status'
];

const OWNER_EMAIL = 'joao@jvmarques.com.br';
const SENDER_NAME = 'João Marques';
const REPLY_TO_EMAIL = 'joao@jvmarques.com.br';

function doPost(event) {
  try {
    const payload = JSON.parse(event.postData.contents || '{}');
    const properties = PropertiesService.getScriptProperties();
    const expectedSecret = properties.getProperty('INTEGRATION_SECRET');
    const spreadsheetId = properties.getProperty('SPREADSHEET_ID');
    const sheetName = properties.getProperty('SHEET_NAME') || 'Diagnósticos';

    if (!expectedSecret || payload.secret !== expectedSecret) {
      return jsonResponse({ ok: false, error: 'unauthorized' });
    }

    if (!spreadsheetId || !payload.submission || !payload.submission.id) {
      return jsonResponse({ ok: false, error: 'invalid_configuration_or_payload' });
    }

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);

    try {
      const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
      const sheet = spreadsheet.getSheetByName(sheetName) || spreadsheet.insertSheet(sheetName);
      ensureHeaders(sheet);

      const existingRow = findSubmissionRow(sheet, payload.submission.id);
      if (existingRow) {
        const currentStatus = sheet.getRange(existingRow, 9).getValue();
        if (currentStatus !== 'E-mails enviados') {
          sendLeadEmails(payload.submission);
          sheet.getRange(existingRow, 9).setValue('E-mails enviados');
        }
        return jsonResponse({ ok: true, duplicate: true });
      }

      const lead = payload.submission;
      const receivedAt = Utilities.formatDate(
        new Date(lead.createdAt),
        'America/Sao_Paulo',
        'dd/MM/yyyy HH:mm:ss'
      );

      sheet.appendRow([
        safeCell(lead.id),
        receivedAt,
        safeCell(lead.nome),
        safeCell(lead.email),
        safeCell(lead.instagram),
        safeCell(lead.whatsapp),
        safeCell(lead.segmento),
        safeCell(lead.objetivo),
        'Registrado'
      ]);

      sendLeadEmails(lead);
      sheet.getRange(sheet.getLastRow(), 9).setValue('E-mails enviados');

      return jsonResponse({ ok: true, duplicate: false });
    } finally {
      lock.releaseLock();
    }
  } catch (error) {
    console.error(error);
    return jsonResponse({ ok: false, error: 'internal_error' });
  }
}

function ensureHeaders(sheet) {
  if (sheet.getLastRow() > 0) return;

  const headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
  headerRange
    .setValues([HEADERS])
    .setFontWeight('bold')
    .setFontColor('#ffffff')
    .setBackground('#f26522');

  sheet.setFrozenRows(1);
  sheet.setColumnWidth(1, 250);
  sheet.setColumnWidth(2, 145);
  sheet.setColumnWidth(3, 180);
  sheet.setColumnWidth(4, 220);
  sheet.setColumnWidth(5, 160);
  sheet.setColumnWidth(6, 160);
  sheet.setColumnWidth(7, 190);
  sheet.setColumnWidth(8, 420);
  sheet.setColumnWidth(9, 110);
}

function findSubmissionRow(sheet, submissionId) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;

  const match = sheet
    .getRange(2, 1, lastRow - 1, 1)
    .createTextFinder(submissionId)
    .matchEntireCell(true)
    .findNext();

  return match ? match.getRow() : null;
}

function sendLeadEmails(lead) {
  const firstName = String(lead.nome || '').trim().split(/\s+/)[0] || 'Olá';
  const ownerSubject = `Novo pedido de diagnóstico — ${lead.nome}`;
  const ownerText = [
    'Novo pedido de diagnóstico recebido.',
    '',
    `Nome: ${lead.nome}`,
    `E-mail: ${lead.email}`,
    `Instagram: ${lead.instagram}`,
    `WhatsApp: ${lead.whatsapp}`,
    `Segmento: ${lead.segmento}`,
    '',
    'Maior desafio:',
    lead.objetivo,
    '',
    `ID: ${lead.id}`
  ].join('\n');

  const ownerHtml = `
    <div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;color:#171719">
      <div style="padding:28px 30px;background:#111113;border-radius:18px 18px 0 0;color:#fff">
        <div style="color:#f26522;font-size:12px;font-weight:700;letter-spacing:1.8px;text-transform:uppercase">Novo lead</div>
        <h1 style="margin:10px 0 0;font-size:26px">Pedido de diagnóstico</h1>
      </div>
      <div style="padding:28px 30px;border:1px solid #ece7e1;border-top:0;border-radius:0 0 18px 18px">
        ${emailField('Nome', lead.nome)}
        ${emailField('E-mail', lead.email)}
        ${emailField('Instagram', lead.instagram)}
        ${emailField('WhatsApp', lead.whatsapp)}
        ${emailField('Segmento', lead.segmento)}
        ${emailField('Maior desafio', lead.objetivo)}
        <p style="margin:24px 0 0;color:#8a8178;font-size:12px">ID: ${escapeHtml(lead.id)}</p>
      </div>
    </div>`;

  MailApp.sendEmail({
    to: OWNER_EMAIL,
    replyTo: lead.email,
    name: SENDER_NAME,
    subject: ownerSubject,
    body: ownerText,
    htmlBody: ownerHtml
  });

  const clientSubject = 'Recebi seu pedido de diagnóstico';
  const clientText = [
    `Olá, ${firstName}!`,
    '',
    'Recebi seus dados e vou analisar o seu perfil com atenção.',
    'Você terá um retorno em até 48 horas úteis.',
    '',
    'Se precisar complementar alguma informação, basta responder a este e-mail.',
    '',
    'Até breve,',
    SENDER_NAME
  ].join('\n');

  MailApp.sendEmail(lead.email, clientSubject, clientText);
}

function emailField(label, value) {
  return `<div style="margin:0 0 18px">
    <div style="margin-bottom:5px;color:#f26522;font-size:11px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase">${escapeHtml(label)}</div>
    <div style="font-size:16px;line-height:1.5">${escapeHtml(value)}</div>
  </div>`;
}

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function safeCell(value) {
  const text = String(value == null ? '' : value);
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
