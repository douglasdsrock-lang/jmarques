# Configuração do formulário

O navegador envia os dados para o Cloudflare Worker. O Worker aciona o Apps Script, que registra o lead na planilha, avisa o proprietário por e-mail e envia a confirmação ao usuário. Nenhuma credencial fica exposta no site.

## Arquivos preparados

- `form.js` e `form.css`: envio, validação, feedback e popup.
- `worker/`: API segura para o Google Apps Script.
- `google-apps-script/Code.gs`: registra cada lead, impede linhas duplicadas e envia os dois e-mails.

## Configuração local

1. Na pasta `worker`, copie `.dev.vars.example` para `.dev.vars`.
2. Preencha as cinco variáveis do arquivo local.
3. Execute `npm install` uma vez na pasta `worker`.
4. Execute `npm run dev` para iniciar a API em `http://127.0.0.1:8787`.
5. Sirva o site em `http://127.0.0.1:4177`.

O arquivo `.dev.vars` está ignorado pelo Git e não deve ser enviado ao repositório.

## Google Apps Script

1. Crie ou abra a planilha que receberá os leads e copie o ID presente na URL.
2. Em `Extensões → Apps Script`, cole o conteúdo de `google-apps-script/Code.gs`.
3. Em `Configurações do projeto → Propriedades do script`, crie:
   - `SPREADSHEET_ID`: ID da planilha.
   - `INTEGRATION_SECRET`: a mesma senha longa usada no Worker.
   - `SHEET_NAME`: opcional; o padrão é `Diagnósticos`.
4. Implante como Aplicativo da Web, executando como o proprietário e permitindo acesso a qualquer pessoa.
5. Copie a URL terminada em `/exec` para `GOOGLE_APPS_SCRIPT_URL`.

## Cloudflare

Na publicação, cadastre `GOOGLE_APPS_SCRIPT_URL` e `INTEGRATION_SECRET` como secrets do Worker. Configure `ALLOWED_ORIGINS` com o domínio público completo do site, sem barra no final.

O endpoint público do formulário é `/api/diagnostico`. Durante o desenvolvimento local, `form.js` utiliza automaticamente `http://127.0.0.1:8787/api/diagnostico`.
