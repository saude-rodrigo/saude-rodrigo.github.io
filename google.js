/* Integração com o Google: Drive, Planilhas e Agenda.
 *
 * Permissões pedidas (as mais restritas possíveis):
 *  - drive.file: o app só enxerga o que ele mesmo criou no Drive. Seus outros arquivos ficam invisíveis para ele.
 *  - calendar.app.created: o app só mexe na agenda própria que ele cria (“Saúde”), não nas suas outras agendas.
 * O login dura cerca de 1 hora; depois disso é só tocar em ☁ e reconectar.
 */
(function () {
  var CFG = window.APP_CONFIG || {};
  /* Se CALENDAR_ID estiver preenchido (agenda da família), o app grava eventos nela e precisa da permissão calendar.events.
     Sem CALENDAR_ID, usa só a agenda própria “Saúde” (calendar.app.created). */
  var SCOPES = 'https://www.googleapis.com/auth/drive.file ' + (CFG.CALENDAR_ID ? 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.freebusy' : 'https://www.googleapis.com/auth/calendar.app.created');
  var token = null, tokenExp = 0;
  var ROOT = CFG.ROOT_FOLDER || 'Saúde a Dois';
  var TZ = CFG.TIMEZONE || 'America/Sao_Paulo';
  var NOMES = { rodrigo: 'Rodrigo', douglas: 'Douglas', familia: 'Família' };

  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) {} }

  function configured() {
    return !!CFG.GOOGLE_CLIENT_ID && CFG.GOOGLE_CLIENT_ID.indexOf('COLE_AQUI') < 0;
  }
  function connected() { return !!token && Date.now() < tokenExp; }

  /* ---------- login ---------- */
  function loadGis() {
    return new Promise(function (res, rej) {
      if (window.google && google.accounts && google.accounts.oauth2) return res();
      var s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.onload = function () { res(); };
      s.onerror = function () { rej(new Error('Não foi possível carregar o login do Google. Verifique a internet.')); };
      document.head.appendChild(s);
    });
  }
  // Precisa ser chamado direto de um toque do usuário (senão o navegador bloqueia a janela de login).
  function connect() {
    if (!configured()) return Promise.reject(new Error('Falta colar o ID de cliente do Google no arquivo config.js (veja o LEIA-ME).'));
    return loadGis().then(function () {
      return new Promise(function (res, rej) {
        var tc = google.accounts.oauth2.initTokenClient({
          client_id: CFG.GOOGLE_CLIENT_ID,
          scope: SCOPES,
          callback: function (r) {
            if (r.error) return rej(new Error(r.error_description || r.error));
            token = r.access_token;
            tokenExp = Date.now() + ((r.expires_in || 3600) - 60) * 1000;
            lsSet('g_ok', '1');
            res();
          },
          error_callback: function (e) { rej(new Error((e && e.message) || 'Login cancelado.')); }
        });
        tc.requestAccessToken({ prompt: lsGet('g_ok') ? '' : 'consent' });
      });
    });
  }
  // Tenta renovar o acesso sem abrir janela (só funciona se você já autorizou antes). Falha em silêncio.
  function silent() {
    if (!configured() || !lsGet('g_ok')) return Promise.reject(new Error('sem login anterior'));
    return loadGis().then(function () {
      return new Promise(function (res, rej) {
        var t = setTimeout(function () { rej(new Error('sem resposta')); }, 8000);
        var tc = google.accounts.oauth2.initTokenClient({
          client_id: CFG.GOOGLE_CLIENT_ID, scope: SCOPES,
          callback: function (r) {
            clearTimeout(t);
            if (r.error) return rej(new Error(r.error));
            token = r.access_token; tokenExp = Date.now() + ((r.expires_in || 3600) - 60) * 1000; res();
          },
          error_callback: function () { clearTimeout(t); rej(new Error('precisa de toque')); }
        });
        tc.requestAccessToken({ prompt: '' });
      });
    });
  }
  function disconnect() {
    try { if (token && window.google && google.accounts) google.accounts.oauth2.revoke(token, function () {}); } catch (e) {}
    token = null; tokenExp = 0; lsDel('g_ok');
  }
  function need() {
    if (!connected()) return Promise.reject(new Error('A sessão do Google não está ativa. Toque em ☁ e conecte de novo.'));
    return Promise.resolve();
  }

  /* ---------- chamadas ---------- */
  function api(url, opt) {
    opt = opt || {};
    var h = { 'Authorization': 'Bearer ' + token };
    if (opt.json !== undefined) { h['Content-Type'] = 'application/json'; opt.body = JSON.stringify(opt.json); }
    if (opt.headers) for (var k in opt.headers) h[k] = opt.headers[k];
    return fetch(url, { method: opt.method || 'GET', headers: h, body: opt.body }).then(function (r) {
      if (r.status === 204) return null;
      if (!r.ok) {
        return r.text().then(function (t) {
          var m = t; try { var j = JSON.parse(t); m = (j.error && (j.error.message || j.error)) || t; } catch (e) {}
          var err = new Error('Google: ' + m); err.status = r.status; throw err;
        });
      }
      if (opt.text) return r.text();
      var ct = r.headers.get('content-type') || '';
      return ct.indexOf('json') > -1 ? r.json() : r.text();
    });
  }
  function q(s) { return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }

  /* ---------- Drive: pastas ---------- */
  function ensureFolder(nome, parent) {
    var key = 'gf:' + (parent || 'root') + ':' + nome;
    var id = lsGet(key);
    if (id) return Promise.resolve(id);
    var qq = "name='" + q(nome) + "' and mimeType='application/vnd.google-apps.folder' and trashed=false" + (parent ? " and '" + parent + "' in parents" : '');
    return api('https://www.googleapis.com/drive/v3/files?q=' + encodeURIComponent(qq) + '&fields=files(id,name)&pageSize=1')
      .then(function (r) {
        if (r.files && r.files[0]) return r.files[0].id;
        var meta = { name: nome, mimeType: 'application/vnd.google-apps.folder' };
        if (parent) meta.parents = [parent];
        return api('https://www.googleapis.com/drive/v3/files?fields=id', { method: 'POST', json: meta }).then(function (c) { return c.id; });
      })
      .then(function (fid) { lsSet(key, fid); return fid; });
  }
  // Saúde a Dois / Pessoa / sub
  function pessoa(perfil) {
    return ensureFolder(ROOT).then(function (r) { return ensureFolder(NOMES[perfil] || perfil, r); });
  }
  function sub(perfil, nome) {
    return pessoa(perfil).then(function (p) { return ensureFolder(nome, p); });
  }
  function limparCache() {
    try { Object.keys(localStorage).filter(function (k) { return k.indexOf('gf:') === 0 || k.indexOf('gs:') === 0 || k.indexOf('gj:') === 0; }).forEach(lsDel); } catch (e) {}
  }

  /* ---------- Drive: arquivos ---------- */
  function multipart(meta, blob, type, existingId) {
    var b = 'gsd' + Date.now();
    var corpo = new Blob([
      '--' + b + '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n', JSON.stringify(meta),
      '\r\n--' + b + '\r\nContent-Type: ' + type + '\r\n\r\n', blob, '\r\n--' + b + '--'
    ], { type: 'multipart/related; boundary=' + b });
    var url = existingId
      ? 'https://www.googleapis.com/upload/drive/v3/files/' + existingId + '?uploadType=multipart&fields=id,name,modifiedTime'
      : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,modifiedTime';
    return api(url, { method: existingId ? 'PATCH' : 'POST', body: corpo, headers: { 'Content-Type': 'multipart/related; boundary=' + b } });
  }

  // Guarda o PDF original em  Saúde a Dois / Pessoa / Documentos originais
  function uploadOriginal(perfil, file, nome) {
    return need().then(function () { return sub(perfil, 'Documentos originais'); }).then(function (pasta) {
      return multipart({ name: nome, parents: [pasta] }, file, file.type || 'application/pdf');
    });
  }

  /* ---------- Planilhas (registros legíveis) ---------- */
  function criarPlanilha(perfil, tabs) {
    return api('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      json: {
        properties: { title: 'Registros de saúde — ' + (NOMES[perfil] || perfil), locale: 'pt_BR', timeZone: TZ },
        sheets: tabs.map(function (t) { return { properties: { title: t.title } }; })
      }
    }).then(function (s) {
      return sub(perfil, 'Registros').then(function (pasta) {
        return api('https://www.googleapis.com/drive/v3/files/' + s.spreadsheetId + '?addParents=' + pasta + '&removeParents=root&fields=id', { method: 'PATCH', json: {} })
          .then(function () { return s.spreadsheetId; });
      });
    });
  }
  function rangeDe(titulo) { return "'" + titulo.replace(/'/g, "''") + "'"; }

  // tabs = [{title, rows:[[...],[...]]}]  (primeira linha = cabeçalho)
  function syncSheets(perfil, tabs) {
    return need().then(function () {
      var key = 'gs:' + perfil, id = lsGet(key);
      var obter = id ? Promise.resolve(id) : criarPlanilha(perfil, tabs).then(function (nid) { lsSet(key, nid); return nid; });
      return obter.then(function (sid) {
        return api('https://sheets.googleapis.com/v4/spreadsheets/' + sid + '?fields=sheets.properties.title').then(function (info) {
          var existentes = (info.sheets || []).map(function (s) { return s.properties.title; });
          var faltam = tabs.filter(function (t) { return existentes.indexOf(t.title) < 0; });
          var add = faltam.length
            ? api('https://sheets.googleapis.com/v4/spreadsheets/' + sid + ':batchUpdate', {
                method: 'POST', json: { requests: faltam.map(function (t) { return { addSheet: { properties: { title: t.title } } }; }) }
              })
            : Promise.resolve();
          return add;
        }).then(function () {
          return api('https://sheets.googleapis.com/v4/spreadsheets/' + sid + '/values:batchClear', {
            method: 'POST', json: { ranges: tabs.map(function (t) { return rangeDe(t.title); }) }
          });
        }).then(function () {
          return api('https://sheets.googleapis.com/v4/spreadsheets/' + sid + '/values:batchUpdate', {
            method: 'POST',
            json: {
              valueInputOption: 'USER_ENTERED',
              data: tabs.map(function (t) { return { range: rangeDe(t.title) + '!A1', values: t.rows }; })
            }
          });
        }).then(function () { return 'https://docs.google.com/spreadsheets/d/' + sid + '/edit'; });
      });
    }).catch(function (e) {
      if (e.status === 404) { lsDel('gs:' + perfil); }
      throw e;
    });
  }

  /* ---------- Dados do app (sincronizar entre aparelhos) ---------- */
  function achaJson(perfil) {
    return sub(perfil, '_app').then(function (pasta) {
      var key = 'gj:' + perfil, id = lsGet(key);
      if (id) return { pasta: pasta, id: id };
      var qq = "name='dados.json' and '" + pasta + "' in parents and trashed=false";
      return api('https://www.googleapis.com/drive/v3/files?q=' + encodeURIComponent(qq) + '&fields=files(id,modifiedTime)&pageSize=1')
        .then(function (r) {
          var f = r.files && r.files[0];
          if (f) lsSet(key, f.id);
          return { pasta: pasta, id: f ? f.id : null };
        });
    });
  }
  function push(perfil, dados) {
    return need().then(function () { return achaJson(perfil); }).then(function (a) {
      var blob = new Blob([JSON.stringify(dados)], { type: 'application/json' });
      var meta = a.id ? { name: 'dados.json' } : { name: 'dados.json', parents: [a.pasta] };
      return multipart(meta, blob, 'application/json', a.id).then(function (f) { lsSet('gj:' + perfil, f.id); return f; });
    });
  }
  // Devolve {dados, modificadoEm} ou null se ainda não existe no Drive
  function pull(perfil) {
    return need().then(function () { return achaJson(perfil); }).then(function (a) {
      if (!a.id) return null;
      return api('https://www.googleapis.com/drive/v3/files/' + a.id + '?fields=modifiedTime').then(function (m) {
        return api('https://www.googleapis.com/drive/v3/files/' + a.id + '?alt=media', { text: true }).then(function (txt) {
          return { dados: JSON.parse(txt), modificadoEm: Date.parse(m.modifiedTime) };
        });
      });
    });
  }

  /* ---------- Compartilhar a pasta de uma pessoa ---------- */
  function share(perfil, email, papel) {
    return need().then(function () { return pessoa(perfil); }).then(function (pasta) {
      return api('https://www.googleapis.com/drive/v3/files/' + pasta + '/permissions?sendNotificationEmail=true&fields=id', {
        method: 'POST', json: { type: 'user', role: papel === 'writer' ? 'writer' : 'reader', emailAddress: email }
      });
    });
  }

  /* ---------- Agenda ---------- */
  function calId() {
    if (CFG.CALENDAR_ID) return Promise.resolve(CFG.CALENDAR_ID);
    var id = lsGet('gcal');
    if (id) return Promise.resolve(id);
    return api('https://www.googleapis.com/calendar/v3/calendars', {
      method: 'POST', json: { summary: CFG.CALENDAR_NAME || 'Saúde', timeZone: TZ }
    }).then(function (c) { lsSet('gcal', c.id); return c.id; });
  }
  function fimDe(h) {
    var hh = parseInt(h.slice(0, 2), 10) + 1;
    return hh > 23 ? '23:59' : (hh < 10 ? '0' : '') + hh + h.slice(2);
  }
  // a = {t:título, d:'AAAA-MM-DD', h:'HH:MM', l:local, p:notas}
  function createEvent(a, perfil) {
    return need().then(calId).then(function (cid) {
      return api('https://www.googleapis.com/calendar/v3/calendars/' + encodeURIComponent(cid) + '/events', {
        method: 'POST',
        json: {
          summary: a.t,
          location: a.l || undefined,
          description: a.p || undefined,
          start: { dateTime: a.d + 'T' + a.h + ':00', timeZone: TZ },
          end: { dateTime: a.d + 'T' + fimDe(a.h) + ':00', timeZone: TZ },
          reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 1440 }, { method: 'popup', minutes: 60 }] },
          extendedProperties: { private: { app: 'saude-a-dois', perfil: perfil || '' } }
        }
      }).then(function (ev) { return ev.id; });
    });
  }
  function deleteEvent(eventId) {
    return need().then(calId).then(function (cid) {
      return api('https://www.googleapis.com/calendar/v3/calendars/' + encodeURIComponent(cid) + '/events/' + encodeURIComponent(eventId), { method: 'DELETE' });
    });
  }

  /* Horários ocupados (só livre/ocupado, sem títulos nem nomes) das agendas pedidas. */
  function freeBusy(ids, tmin, tmax) {
    return need().then(function () {
      return api('https://www.googleapis.com/calendar/v3/freeBusy', {
        method: 'POST',
        json: { timeMin: tmin, timeMax: tmax, timeZone: TZ, items: ids.map(function (i) { return { id: i }; }) }
      });
    }).then(function (r) {
      var busy = [], erros = [];
      var cs = r.calendars || {};
      Object.keys(cs).forEach(function (k) {
        if (cs[k].errors && cs[k].errors.length) erros.push(k);
        (cs[k].busy || []).forEach(function (b) { busy.push({ s: b.start, e: b.end }); });
      });
      return { busy: busy, erros: erros };
    });
  }

  window.G = {
    configured: configured, connected: connected, connect: connect, silent: silent, disconnect: disconnect,
    uploadOriginal: uploadOriginal, syncSheets: syncSheets, push: push, pull: pull, share: share,
    createEvent: createEvent, deleteEvent: deleteEvent, freeBusy: freeBusy, limparCache: limparCache
  };
})();
