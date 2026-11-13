# Saúde a Dois — guia de instalação

App instalável (PWA) para acompanhar exames, consultas, medicações, sintomas e agenda de Douglas e Rodrigo.
Os dados ficam no aparelho; com a conta Google conectada, vão também para o seu Drive (planilhas) e Agenda.

## 1. Publicar (mesmo jeito dos outros apps: GitHub Pages)

1. No GitHub, crie o repositório **RODRIPSI/saude** (público, como os outros — por isso este pacote **não contém nenhum dado de saúde**).
2. Envie todos os arquivos desta pasta para o repositório.
3. *Settings → Pages* → branch principal, pasta raiz.
4. O app abre em `https://rodripsi.github.io/saude/`.
5. Abra no celular, toque em *Instalar app / Adicionar à tela inicial* e crie o seu PIN (4 a 6 números; cada aparelho tem o seu).

## 2. Carregar os dados iniciais (fora do GitHub)

O arquivo **dados-iniciais-saude.json** (enviado à parte) tem os dados de Douglas e seus. Nunca o coloque no repositório.
No app: aba **Resumo** (ou Ajustes) → **Restaurar** → escolha o arquivo. Depois, delete o arquivo do celular ou guarde no Drive.

## 3. Ligar ao Google (Drive, Planilhas, Agenda)

Todos os apps ficam na origem `https://rodripsi.github.io`, então dá para **reaproveitar o projeto do Google Cloud** que já usa com os outros apps:

1. Em *APIs e serviços → Biblioteca*, ative **Drive API**, **Sheets API** e **Calendar API** (se ainda não estiverem).
2. Se o ID de cliente OAuth já existir com a origem `https://rodripsi.github.io`, use o mesmo; senão crie um (*Aplicativo da Web*, origem JavaScript autorizada acima).
3. Cole o ID em `config.js`, no lugar de `COLE_AQUI.apps.googleusercontent.com`, e publique de novo.
4. Em modo teste, adicione Rodrigo e Douglas como usuários de teste. Aparecerá "app não verificado": *Avançado → continuar*. O acesso dura ~1 hora.

O app cria no Drive: **Saúde a Dois / Rodrigo** e **/ Douglas** (planilha *Registros de saúde*, *Documentos originais*, *Resumos de consulta*) e uma agenda **Saúde**. Compartilhe a pasta de Douglas pelo botão na tela ☁.

Ao atualizar o app depois: aumente o número em `sw.js` (`saude-a-dois-v1` → `v2`...) para o celular pegar a versão nova.

## 4. Uso

- Aba **Importar**: solte PDFs de laudos, bioimpedância, receitas ou pedidos; o app lê e pede sua confirmação antes de salvar.
- Aba **Em uso**: complete suplementos, vitaminas, motivo e finalidade; confirme o nome e a dose dos seus remédios na receita.

## Limites conhecidos

- A integração Google foi testada com simulação, não com a sua conta; pode exigir pequenos ajustes no primeiro teste real.
- A leitura de PDF funciona com PDFs que têm texto; imagens e laudos escaneados ficam só como documento anexado.
- Resultados de exames que não são de sangue (imagem, etc.) são guardados como documento, não como valores.
