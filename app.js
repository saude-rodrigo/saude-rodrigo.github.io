/* ---------- armazenamento ---------- */
var KEY='saude_dois_proto_v1';
function load(){try{var r=localStorage.getItem(KEY);return r?JSON.parse(r):null}catch(e){return null}}
function persist(){try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}}
function save(){var pr=S.profiles&&S.profiles[S.cur];if(pr)pr.updatedAt=Date.now();persist();if(window.schedulePush)schedulePush()}
function toast(t){var d=document.createElement('div');d.className='toast';d.textContent=t;document.body.appendChild(d);setTimeout(function(){d.remove()},4200)}

function seed(){
  return {pin:'',cur:'douglas',profiles:{douglas:{"nome":"Douglas Igor Marques","bio":[],"exames":[],"pend":[],"meds":[],"diario":[],"agenda":[]},rodrigo:{"nome":"Rodrigo","bio":[],"exames":[],"pend":[],"meds":[],"diario":[],"agenda":[]}}};
}
var S=load()||seed();
(function(){
  if(!S.profiles)S.profiles={};
  if(!S.profiles.familia)S.profiles.familia={nome:'Família',bio:[],exames:[],pend:[],meds:[],diario:[],agenda:[],docs:[],lembretes:[]};
  if(!S.profiles.familia.lembretes)S.profiles.familia.lembretes=[];
  if(!S.sync)S.sync={};
  var D={dias:[1,2,3,4,5],ini:'08:00',fim:'18:00',dur:60,qtd:14,cals:''};
  if(!S.disp)S.disp=D;else for(var k in D)if(S.disp[k]==null)S.disp[k]=D[k];
})();

function P(){var p=S.profiles[S.cur];if(!p.docs)p.docs=[];return p}
function nz(x){return(x==null||x===''||(typeof x==='number'&&isNaN(x)))?'—':x}

/* ---------- utilidades ---------- */
function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function flag(e){
  var v=e.v,lo=e.min,hi=e.max;
  if(hi!=null&&v>hi)return['alterado','t-hi'];
  if(lo!=null&&v<lo)return['alterado','t-hi'];
  if(e.lim)return['no limite','t-lim'];
  return['ok','t-ok'];
}
function refTxt(e){if(e.ref)return e.ref;if(e.min!=null&&e.max!=null)return e.min+' – '+e.max;return ''}
function pad(n){return(n<10?'0':'')+n}
function fmtDate(iso){if(!iso)return'';var p=iso.split('-');return p[2]+'/'+p[1]+'/'+p[0]}
function nowStr(){var d=new Date();return pad(d.getDate())+'/'+pad(d.getMonth()+1)+'/'+d.getFullYear()+' '+pad(d.getHours())+':'+pad(d.getMinutes())}

/* ---------- bloqueio ---------- */
function showLock(){
  document.getElementById('lockscr').classList.remove('hide');
  document.getElementById('locks').textContent=S.pin?'Digite seu PIN':'Crie um PIN de 4 a 6 números';
  document.getElementById('pin').value='';
}
function unlock(){
  var v=document.getElementById('pin').value;
  if(!/^\d{4,6}$/.test(v)){document.getElementById('locks').textContent='Use de 4 a 6 números';return}
  if(!S.pin){S.pin=v;save()}
  else if(S.pin!==v){document.getElementById('locks').textContent='PIN incorreto';return}
  document.getElementById('lockscr').classList.add('hide');
}
function lockNow(){showLock()}

/* ---------- navegação ---------- */
var tab='resumo';
document.getElementById('nav').addEventListener('click',function(e){
  var b=e.target.closest('button');if(!b)return;
  tab=b.dataset.t;
  [].forEach.call(this.children,function(x){x.classList.toggle('on',x===b)});
  render();
});
document.getElementById('seg').addEventListener('click',function(e){
  var b=e.target.closest('button');if(!b)return;
  S.cur=b.dataset.p;editUso=-1;save();
  [].forEach.call(this.children,function(x){x.classList.toggle('on',x===b)});
  render();
});
function render(keep){
  var v=document.getElementById('view');
  var fn={resumo:vResumo,importar:vImportar,exames:vExames,diario:vDiario,agenda:vAgenda,consulta:vConsulta,remedios:vRemedios,google:vGoogle}[tab];
  v.innerHTML=fn();
  atualizaBadge();
  if(!keep)window.scrollTo(0,0);
}


/* ---------- estoque dos remédios ---------- */
function isoHoje(){var d=new Date();return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())}
function isoBr(s){var x=String(s||'').split('-');return x.length===3?x[2]+'/'+x[1]+'/'+x[0]:''}
function numE(v){var n=parseFloat(String(v||'').replace(',','.'));return isNaN(n)?0:n}
/* devolve {fim:'aaaa-mm-dd', faltam:dias} ou null se faltar dado */
function estoque(m){
  var q=numE(m.qtd),dia=numE(m.porVez)*numE(m.vezes);
  if(!m.compra||q<=0||dia<=0)return null;
  var ini=new Date(m.compra+'T12:00:00'),dias=Math.floor(q/dia);
  var fim=new Date(ini.getTime()+dias*86400000);
  var hoje=new Date(isoHoje()+'T12:00:00');
  return{fim:fim.getFullYear()+'-'+pad(fim.getMonth()+1)+'-'+pad(fim.getDate()),faltam:Math.round((fim-hoje)/86400000),aviso:parseInt(m.aviso,10)||7};
}
function estoqueHtml(m){
  var e=estoque(m);
  if(!e)return m.compra?'<div class="mut">Estoque: preencha quantidade e posologia para calcular.</div>':'';
  var cor=e.faltam<=0?'t-hi':(e.faltam<=e.aviso?'t-lim':'t-ok');
  var tx=e.faltam<0?'acabou há '+(-e.faltam)+' dia(s)':e.faltam===0?'acaba hoje':'faltam '+e.faltam+' dia(s)';
  return'<div><span class="mut">Estoque:</span> <span class="tag '+cor+'">'+tx+'</span> <span class="mut">(até '+isoBr(e.fim)+'; comprado em '+isoBr(m.compra)+')</span></div>';
}
function comprei(i){
  var m=P().meds[i];
  var q=prompt('Quantas unidades você comprou agora?',m.qtd||'');
  if(q===null)return;
  if(numE(q)<=0){alert('Informe uma quantidade.');return}
  m.qtd=String(numE(q));m.compra=isoHoje();save();render(true);toast('Compra registrada: '+m.n);
}
function alertasEstoque(){
  var out=[];
  Object.keys(S.profiles).forEach(function(k){
    (S.profiles[k].meds||[]).forEach(function(m){
      var e=estoque(m);
      if(e&&e.faltam<=e.aviso)out.push({quem:S.profiles[k].nome.split(' ')[0],n:m.n,e:e});
    });
  });
  out.sort(function(x,y){return x.e.faltam-y.e.faltam});
  return out;
}
function alertaHtml(){
  var al=alertasEstoque();if(!al.length)return'';
  var h='<div class="card alert"><h2>🛒 Hora de comprar</h2><ul style="margin:0;padding-left:18px">';
  al.forEach(function(a){
    var tx=a.e.faltam<0?'acabou há '+(-a.e.faltam)+' dia(s)':a.e.faltam===0?'acaba hoje':'acaba em '+a.e.faltam+' dia(s) ('+isoBr(a.e.fim)+')';
    h+='<li><b>'+esc(a.n)+'</b> ('+esc(a.quem)+'): '+tx+'</li>';
  });
  return h+'</ul></div>';
}
function avisoBtnHtml(){
  if(!('Notification' in window))return'';
  if(Notification.permission==='granted')return'<p class="mut">🔔 Avisos neste aparelho ativados (aparecem quando você abre o app).</p>';
  if(Notification.permission==='denied')return'<p class="mut">🔔 Avisos bloqueados nas configurações do navegador.</p>';
  return'<button class="btn sm sec" onclick="ativaAvisos()">🔔 Ativar avisos neste aparelho</button>';
}
function ativaAvisos(){Notification.requestPermission().then(function(){render(true);notificaEstoque(true)})}
function notificaEstoque(forca){
  try{
    if(!('Notification' in window)||Notification.permission!=='granted')return;
    var al=alertasEstoque(),lv=lembVencidos();if(!al.length&&!lv.length)return;
    var k='nt:'+isoHoje();if(!forca&&localStorage.getItem(k))return;localStorage.setItem(k,'1');
    var partes=[];
    if(al.length)partes.push('Comprar: '+al.map(function(a){return a.n+' ('+a.quem+')'}).join(', '));
    if(lv.length)partes.push('Lembretes: '+lv.map(function(x){return x.t}).join('; '));
    var op={body:partes.join(' · '),icon:'icon-192.png',tag:'estoque'};
    if(navigator.serviceWorker&&navigator.serviceWorker.ready)navigator.serviceWorker.ready.then(function(r){r.showNotification('Saúde a Dois',op)});
    else new Notification('Saúde a Dois',op);
  }catch(e){}
}
function atualizaBadge(){
  var b=document.querySelector('#nav button[data-t=remedios]');if(!b)return;
  var o=b.querySelector('.bdg');if(o)o.remove();
  var n=alertasEstoque().length;
  if(n){var s=document.createElement('span');s.className='bdg';s.textContent=n;b.appendChild(s)}
}

/* ---------- sincronização automática entre aparelhos (via Drive) ---------- */
var syncTxt='',syncBusy=false,syncTimer=null;
function schedulePush(k){
  if(!(window.G&&G.connected()))return;
  clearTimeout(syncTimer);syncTimer=setTimeout(function(){syncProfile(S.cur).then(function(){return syncProfile('familia')}).catch(function(){})},4000);
}
function syncProfile(perfil){
  return G.pull(perfil).then(function(r){
    if(!S.sync)S.sync={};
    var p=S.profiles[perfil],ls=S.sync[perfil]||0,locChg=(p.updatedAt||0)>ls;
    var temDados=!!(p.exames.length||p.meds.length||p.bio.length||p.diario.length||p.agenda.length||p.pend.length||(p.lembretes&&p.lembretes.length));
    function enviar(){return G.push(perfil,p).then(function(){S.sync[perfil]=Date.now()+3000;persist();return 'enviado'})}
    function trazer(){
      r.dados.updatedAt=Date.now();S.profiles[perfil]=r.dados;persist();S.sync[perfil]=Date.now();persist();return 'trazido';
    }
    if(!r)return temDados?enviar():'nada';
    var remChg=r.modificadoEm>ls;
    if(remChg&&!locChg)return trazer();
    if(locChg&&!remChg)return enviar();
    if(!locChg&&!remChg)return 'igual';
    if(confirm('Os dados de '+p.nome.split(' ')[0]+' mudaram neste aparelho e também no outro.\n\nOK = usar a versão do Drive (do outro aparelho)\nCancelar = manter a deste aparelho e enviar'))return trazer();
    return enviar();
  });
}
function syncAll(){
  if(syncBusy||!(window.G&&G.connected()))return Promise.resolve();
  syncBusy=true;
  var ps=Object.keys(S.profiles),mudou=false;
  return ps.reduce(function(pr,k){return pr.then(function(){return syncProfile(k).then(function(x){if(x==='trazido')mudou=true})})},Promise.resolve())
   .then(function(){syncTxt='☁ Sincronizado às '+nowStr().slice(11);syncBusy=false;if(mudou&&tab!=='google'){render(true)}else if(tab==='resumo')render(true);atualizaBadge();notificaEstoque()})
   .catch(function(e){syncBusy=false;syncTxt='☁ Não sincronizou: '+(e&&e.message?e.message:'erro')});
}
function autoSync(){
  if(!(window.G&&G.configured()))return;
  if(G.connected())return syncAll();
  G.silent().then(syncAll).catch(function(){syncTxt='☁ Sincronização pausada: toque no ☁ para conectar';if(tab==='resumo')render(true)});
}
document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible')autoSync()});

/* ---------- lembretes rápidos (compartilhados entre os aparelhos) ---------- */
function agendaNome(sp){var id=window.APP_CONFIG&&APP_CONFIG.CALENDAR_ID,n=id==='primary'?'principal do Google':(id?'da família':'"Saúde"');return(sp?' ':'')+n}
function F(){return S.profiles.familia}
function saveFam(){F().updatedAt=Date.now();persist();schedulePush()}
function lembHtml(){
  var L=F().lembretes,pend=L.filter(function(x){return!x.feito}),hoje=isoHoje(),h='<div class="card"><h2>📝 Lembretes</h2>';
  h+='<input id="l_t" placeholder="Escreva um lembrete rápido (ex.: marcar retorno com o endócrino)">'+
     '<div class="row wrap"><div style="flex:1;min-width:130px"><label>Data (opcional)</label><input type="date" id="l_d"></div>'+
     '<div style="flex:1;min-width:110px"><label>Hora (opcional)</label><input type="time" id="l_h"></div></div>';
  if(window.G&&G.connected())h+='<label style="display:flex;gap:8px;align-items:center;color:var(--ink)"><input type="checkbox" id="l_g" style="width:auto">Colocar também na agenda '+agendaNome()+' (precisa de data)</label>';
  else h+='<p class="mut" style="margin:4px 0">Para colocar na agenda do Google, conecte o ☁ primeiro.</p>';
  h+='<button class="btn" style="width:100%;margin-top:6px" onclick="addLemb()">Salvar lembrete</button>';
  if(!pend.length)h+='<div class="empty">Nenhum lembrete pendente.</div>';
  pend.sort(function(x,y){return(x.d||'9999').localeCompare(y.d||'9999')});
  pend.forEach(function(x){
    var i=L.indexOf(x),atras=x.d&&x.d<hoje,tag=x.d?'<span class="tag '+(atras?'t-hi':(x.d===hoje?'t-lim':'t-info'))+'">'+isoBr(x.d)+(x.h?' '+esc(x.h):'')+(atras?' · atrasado':(x.d===hoje?' · hoje':''))+'</span> ':'';
    h+='<div style="padding:8px 0;border-top:1px solid var(--line)">'+tag+esc(x.t)+
       '<div class="mut">'+(x.por?'por '+esc(x.por):'')+(x.gid?' · 📅 na agenda':'')+'</div>'+
       '<div class="row" style="margin-top:4px"><button class="btn sm" onclick="doneLemb('+i+')">✓ Feito</button><button class="btn sm sec" onclick="delLemb('+i+')">Apagar</button></div></div>';
  });
  var feitos=L.length-pend.length;
  if(feitos)h+='<p class="mut" style="margin:8px 0 0">'+feitos+' concluído(s). <a href="#" onclick="limpaFeitos();return false">Limpar concluídos</a></p>';
  return h+'</div>';
}
function addLemb(){
  var t=val('l_t');if(!t){alert('Escreva o lembrete.');return}
  var d=val('l_d'),hh=val('l_h'),g=document.getElementById('l_g'),querAg=g&&g.checked;
  var o={id:Date.now(),t:t,d:d,h:hh,por:P().nome.split(' ')[0],feito:false};
  function guarda(){F().lembretes.push(o);saveFam();render(true)}
  if(querAg){
    if(!d){alert('Para colocar na agenda, escolha a data.');return}
    G.createEvent({t:'📝 '+t,d:d,h:hh||'09:00',l:'',p:'Lembrete do app Saúde a Dois (criado por '+o.por+')'},'familia')
      .then(function(id){o.gid=id;guarda();toast('Lembrete salvo e colocado na agenda.')})
      .catch(function(e){alert('Não consegui colocar na agenda: '+e.message+'\n\nO lembrete foi salvo só no app.');guarda()});
  }else{guarda()}
}
function tiraDaAgenda(x){if(x&&x.gid&&window.G&&G.connected())G.deleteEvent(x.gid).catch(function(){toast('O evento continua na agenda Google. Remova por lá.')})}
function doneLemb(i){var x=F().lembretes[i];x.feito=true;tiraDaAgenda(x);x.gid='';saveFam();render(true)}
function delLemb(i){var x=F().lembretes[i];if(!confirm('Apagar este lembrete?'))return;tiraDaAgenda(x);F().lembretes.splice(i,1);saveFam();render(true)}
function limpaFeitos(){F().lembretes=F().lembretes.filter(function(x){return!x.feito});saveFam();render(true)}
function lembVencidos(){return F().lembretes.filter(function(x){return!x.feito&&x.d&&x.d<=isoHoje()})}

/* ---------- Resumo ---------- */
function trendTxt(bio){
  if(bio.length<2)return'';
  var a=bio[0],b=bio[bio.length-1],pa=+a.peso,pb=+b.peso;
  if(isNaN(pa)||isNaN(pb)||pa===pb)return'';
  var dif=Math.abs(pb-pa).toFixed(1).replace('.',',');
  if(pb>pa)return'<p class="mut" style="margin:4px 0 0">O peso subiu '+dif+' kg entre '+a.d+' e '+b.d+'. Vale levar ao médico ou ao endocrinologista.</p>';
  return'<p class="mut" style="margin:4px 0 0">O peso caiu '+dif+' kg entre '+a.d+' e '+b.d+'.</p>';
}
function vResumo(){
  var p=P(),h=alertaHtml()+lembHtml();
  if(syncTxt)h+='<p class="mut" style="margin:0 0 6px;text-align:right">'+esc(syncTxt)+'</p>';
  h+='<div class="card alert"><h2>⚠️ Procure urgência se houver</h2><ul style="margin:0;padding-left:18px">'+
     '<li>Grande quantidade de sangue nas fezes</li><li>Fezes pretas</li><li>Tontura ou desmaio</li><li>Fraqueza intensa</li>'+
     '<li>Dor abdominal forte, dor no peito ou falta de ar importante</li></ul></div>';
  if(!p.bio.length&&!p.exames.length){
    return h+'<div class="card empty">Ainda não há dados de <b>'+esc(p.nome)+'</b>.<br>Use as abas Exames, Diário e Agenda para começar.</div>';
  }
  if(p.bio.length){
    var b=p.bio[p.bio.length-1];
    function bv(x){return+x.peso||+x.pgc||+x.musc||0}
    var mx=Math.max.apply(null,p.bio.map(bv))||1;
    h+='<div class="card"><h2>Bioimpedância — evolução</h2>';
    p.bio.forEach(function(x){
      var t=[];
      if(x.peso!=='' && x.peso!=null)t.push('peso '+x.peso+' kg');
      if(x.pgc!=='' && x.pgc!=null)t.push('gordura '+x.pgc+'%');
      else if(x.gord!=='' && x.gord!=null)t.push('gordura '+x.gord+' kg');
      if(x.musc!=='' && x.musc!=null)t.push('músculo '+x.musc+' kg');
      h+='<div class="mut">'+x.d+' · '+t.join(' · ')+'</div><div class="bar" style="width:'+Math.round(bv(x)/mx*100)+'%"></div>';
    });
    h+='<p class="mut" style="margin:8px 0 0">Última ('+b.d+'): gordura '+nz(b.pgc)+'% · visceral <b>'+nz(b.visc)+'</b> (ref. 1–9) · IMC '+nz(b.imc)+(b.rcq!==''&&b.rcq!=null?' · cintura-quadril '+nz(b.rcq):'')+(b.tmb?' · TMB '+b.tmb+' kcal':'')+'.</p>'+
       trendTxt(p.bio)+'</div>';
  }
  var ult={};
  p.exames.forEach(function(e){var o=ult[e.n];if(!o||dkey(e.d)>=dkey(o.d))ult[e.n]=e});
  var alt=Object.keys(ult).map(function(k){return ult[k]}).filter(function(e){return flag(e)[1]==='t-hi'});
  h+='<div class="card"><h2>Exames fora da faixa ('+alt.length+')</h2>';
  if(!alt.length)h+='<div class="mut">'+(p.exames.length?'Nenhum no resultado mais recente de cada exame.':'Nenhum exame cadastrado.')+'</div>';
  alt.forEach(function(e){h+='<div>'+esc(e.n)+' <span class="tag t-hi">'+e.v+' '+esc(e.u)+'</span> <span class="mut">'+esc(e.d)+'</span></div>'});
  h+='<p class="mut" style="margin:6px 0 0">Mostra só o resultado mais recente de cada exame. Os valores podem não descrever a situação atual.</p></div>';
  var pend=p.pend.length;
  h+='<div class="card"><h2>Pendências</h2><b>'+pend+'</b> exames pendentes. <b>'+p.agenda.length+'</b> compromissos na agenda.</div>';
  return h;
}

/* ---------- Exames ---------- */
function vExames(){
  var p=P(),h='<div class="card"><h2>Resultados</h2>';
  if(!p.exames.length)h+='<div class="empty">Nenhum resultado cadastrado.</div>';
  else{
    h+='<table><tr><th>Exame</th><th>Valor</th><th>Ref.</th><th></th></tr>';
    p.exames.forEach(function(e){
      var f=flag(e);
      h+='<tr><td>'+esc(e.n)+'<div class="mut">'+e.d+'</div></td><td>'+e.v+' '+esc(e.u)+'</td><td class="mut">'+esc(refTxt(e))+'</td><td><span class="tag '+f[1]+'">'+f[0]+'</span></td></tr>';
    });
    h+='</table>';
  }
  h+='<p class="mut">Referências do laudo. A interpretação é ato médico.</p></div>';
  var esps=espList();
  h+='<div class="card"><h2>Exames pendentes</h2>'+
     '<p class="mut" style="margin:0 0 6px"><b>a pedir</b>: você quer pedir ao médico. <b>pedido</b>: o médico já pediu e falta marcar a coleta.</p>'+
     '<label>Adicionar exame (escreva o nome)</label><input id="pn" placeholder="Ex.: Hemograma completo">'+
     '<label>Para qual médico / especialidade?</label><select id="pesp">'+
     esps.map(function(e){return'<option'+(e===lastEsp?' selected':'')+'>'+esc(e)+'</option>'}).join('')+'<option>Outra…</option></select>'+
     '<label>Tipo de exame</label><select id="pty"><option>Automático</option>'+TIPOS.map(function(t){return'<option>'+esc(t)+'</option>'}).join('')+'</select><button class="btn" onclick="addPend()">Adicionar</button><p class="mut">Pode escrever vários de uma vez, separados por vírgula.</p>';
  if(!p.pend.length)h+='<div class="empty">Nada pendente.</div>';
  esps.forEach(function(e){
    var its=[];p.pend.forEach(function(x,i){if(x.esp===e)its.push(i)});
    if(!its.length)return;
    its.sort(function(a,b){return tipoIdx(p.pend[a])-tipoIdx(p.pend[b])});
    h+='<div style="margin-top:12px;font-weight:700;color:var(--pri)">'+esc(e)+' ('+its.length+')</div>';
    its.forEach(function(i){
      var x=p.pend[i];
      h+='<div style="padding:6px 0;border-bottom:1px solid var(--line)"><label style="display:flex;gap:8px;align-items:center;margin:0;color:var(--ink);font-size:15px">'+
      (x.s==='pedido'?'<input type="checkbox" class="pc" data-i="'+i+'" style="width:auto">':'<span style="width:18px"></span>')+esc(x.n)+' <span class="tag t-info">'+esc(x.tipo||tipoOf(x.n))+'</span></label>'+
      '<div class="row wrap" style="margin-top:4px"><select onchange="setPend('+i+',this.value)">'+
      ['a pedir','pedido'].map(function(t){return'<option'+(t===x.s?' selected':'')+'>'+t+'</option>'}).join('')+'</select>'+
      '<select onchange="setEsp('+i+',this.value)">'+esps.map(function(t){return'<option'+(t===x.esp?' selected':'')+'>'+esc(t)+'</option>'}).join('')+'<option>Outra…</option></select>'+
      '<select onchange="setTipo('+i+',this.value)">'+TIPOS.map(function(t){return'<option'+(t===(x.tipo||tipoOf(x.n))?' selected':'')+'>'+esc(t)+'</option>'}).join('')+'</select>'+
      '<button class="btn sm sec" style="flex:0 0 auto" onclick="delPend('+i+')" aria-label="Remover">✕</button></div></div>';
    });
  });
  if(p.pend.some(function(x){return x.s==='pedido'}))h+='<button class="btn" onclick="agendarColeta()">📅 Agendar coleta (marcados)</button>'+
    '<p class="mut">Marque os exames com pedido médico que serão feitos no mesmo dia, mesmo de especialidades diferentes. O app cria um único evento na agenda com a lista.</p>';
  h+='<p class="mut">Cada especialidade tem a sua lista: ao gerar o resumo da consulta, só aparecem os exames "a pedir" daquele médico. Quando o resultado chega (importando o laudo), o exame sai desta lista sozinho.</p></div>';
  h+='<div class="card"><h2>Novo resultado</h2>'+
     '<p class="mut" style="margin:0 0 8px">Envie o PDF do laudo e o app lê os valores sozinho. Você só confere antes de salvar.</p>'+
     '<button class="btn" onclick="goTab(\'importar\')">📄 Importar PDF do exame</button>'+
     '<details style="margin-top:14px"><summary class="mut">Digitar manualmente (só se não tiver o PDF)</summary>'+
     '<label>Exame</label><input id="en"><div class="row"><div><label>Valor</label><input id="ev" inputmode="decimal"></div><div><label>Unidade</label><input id="eu"></div></div>'+
     '<div class="row"><div><label>Ref. mínima</label><input id="emin" inputmode="decimal"></div><div><label>Ref. máxima</label><input id="emax" inputmode="decimal"></div></div>'+
     '<label>Data</label><input id="ed" type="date"><button class="btn sec" onclick="addExame()">Adicionar manualmente</button></details></div>';
  return h;
}
function goTab(t){tab=t;[].forEach.call(document.getElementById('nav').children,function(x){x.classList.toggle('on',x.dataset.t===t)});render()}
function setPend(i,s){P().pend[i].s=s;save()}
function delPend(i){if(confirm('Remover "'+P().pend[i].n+'" da lista?')){P().pend.splice(i,1);save();render()}}
var lastEsp='Clínico geral';
function espList(){var l=Object.keys(ESP);P().pend.forEach(function(x){if(x.esp&&l.indexOf(x.esp)<0)l.push(x.esp)});return l}
function askEsp(){var n=prompt('Nome da especialidade ou do médico:');return n?n.trim():''}
function setEsp(i,v){if(v==='Outra…'){v=askEsp();if(!v){render();return}}P().pend[i].esp=v;save();render()}
function addPend(){
  var t=val('pn');if(!t)return;
  var e=document.getElementById('pesp').value;
  if(e==='Outra…'){e=askEsp();if(!e)return}
  lastEsp=e;
  var ty=document.getElementById('pty').value;
  t.split(',').forEach(function(n){n=n.trim();if(n)P().pend.push({n:n,s:'a pedir',esp:e,tipo:ty==='Automático'?tipoOf(n):ty})});
  save();render();
}
function guessEsp(n){
  n=n.toLowerCase();
  if(/colonoscop|ferritina|sangue oculto|calprotectina|transferrina/.test(n))return'Coloproctologista / Gastro';
  if(/\bck\b|cpk|vitamina d|b12|c[áa]lcio|f[óo]sforo|\bvhs\b/.test(n))return'Reumatologista';
  if(/espirometria/.test(n))return'Pneumologista';
  if(/elastografia|ultrassom|ultrassonografia/.test(n))return'Hepatologista';
  return'Clínico geral';
}
function addExame(){
  var n=val('en'),v=parseFloat(val('ev').replace(',','.'));
  if(!n||isNaN(v)){alert('Preencha o exame e o valor.');return}
  var mn=parseFloat(val('emin').replace(',','.')),mx=parseFloat(val('emax').replace(',','.'));
  P().exames.push({n:n,v:v,u:val('eu'),min:isNaN(mn)?undefined:mn,max:isNaN(mx)?undefined:mx,d:fmtDate(val('ed'))||nowStr().slice(0,10)});
  save();render();
}
function val(id){var e=document.getElementById(id);return e?e.value.trim():''}
function agendarColeta(){
  var sel=[].slice.call(document.querySelectorAll('.pc')).filter(function(c){return c.checked}).map(function(c){return P().pend[+c.dataset.i].n});
  if(!sel.length){alert('Marque ao menos um exame com pedido médico.');return}
  tab='agenda';
  [].forEach.call(document.getElementById('nav').children,function(x){x.classList.toggle('on',x.dataset.t==='agenda')});
  render();
  document.getElementById('at').value='Coleta de exames';
  document.getElementById('ap').value='Exames: '+sel.join('; ')+'.\nJejum de 8 a 12 h, salvo orientação do laboratório. Levar pedido médico e documento.';
}

/* ---------- Diário ---------- */
function vDiario(){
  var p=P();
  var h='<div class="card"><h2>Como você está hoje?</h2>'+
  '<label>Sangue nas fezes</label><select id="ds"><option>nenhum</option><option>pouco</option><option>moderado</option><option>muito</option></select>'+
  '<label><input type="checkbox" id="dpre" style="width:auto"> Fezes pretas</label>'+
  '<label><input type="checkbox" id="dtont" style="width:auto"> Tontura ou desmaio</label>'+
  sl('dor','Dor muscular')+sl('rig','Rigidez')+sl('fad','Fadiga')+sl('res','Falta de ar')+
  '<label>Observações (sono, remédio, esforço)</label><textarea id="dobs" rows="2"></textarea>'+
  '<button class="btn" onclick="addDia()">Salvar registro</button></div>';
  h+='<div class="card"><h2>Registros</h2>';
  if(!p.diario.length)h+='<div class="empty">Nenhum registro ainda.</div>';
  p.diario.slice().reverse().forEach(function(x){
    h+='<div style="padding:6px 0;border-bottom:1px solid var(--line)"><b>'+x.d+'</b><br>'+
    'Sangue: '+esc(x.s)+(x.pre?' · <span class="tag t-hi">fezes pretas</span>':'')+(x.tont?' · <span class="tag t-hi">tontura</span>':'')+
    '<div class="mut">Dor '+x.dor+' · Rigidez '+x.rig+' · Fadiga '+x.fad+' · Falta de ar '+x.res+'</div>'+
    (x.obs?'<div class="mut">'+esc(x.obs)+'</div>':'')+'</div>';
  });
  return h+'</div>';
}
function sl(id,t){return'<label>'+t+': <b id="'+id+'v">0</b>/10</label><input type="range" id="'+id+'" min="0" max="10" value="0" oninput="document.getElementById(\''+id+'v\').textContent=this.value">'}
function addDia(){
  var x={d:nowStr(),s:val('ds'),pre:document.getElementById('dpre').checked,tont:document.getElementById('dtont').checked,
    dor:val('dor'),rig:val('rig'),fad:val('fad'),res:val('res'),obs:val('dobs')};
  P().diario.push(x);save();
  var grave=x.pre||x.tont||x.s==='muito'||+x.res>=7;
  render();
  if(grave)alert('Atenção: esses sinais podem exigir avaliação urgente. Procure um pronto atendimento.');
}


/* ---------- horários livres (lê a agenda do Google: só livre/ocupado) ---------- */
var dispRes=null,dispBusy=[],dispMsg='';
var DSEM=['dom','seg','ter','qua','qui','sex','sáb'];
function hm2min(s){var p=String(s||'0:0').split(':');return(parseInt(p[0],10)||0)*60+(parseInt(p[1],10)||0)}
function dtLocal(iso,min){var p=iso.split('-');return new Date(+p[0],+p[1]-1,+p[2],Math.floor(min/60),min%60,0)}
function hhmm(d){return pad(d.getHours())+':'+pad(d.getMinutes())}
function saveDisp(){
  var d=S.disp,g=function(i){var e=document.getElementById(i);return e?e.value.trim():''};
  var dias=[];for(var i=0;i<7;i++){var c=document.getElementById('dp_d'+i);if(c&&c.checked)dias.push(i)}
  d.dias=dias;d.ini=g('dp_ini')||'08:00';d.fim=g('dp_fim')||'18:00';
  d.dur=Math.max(15,parseInt(g('dp_dur'),10)||60);d.qtd=Math.min(60,Math.max(1,parseInt(g('dp_qtd'),10)||14));
  d.cals=g('dp_cals');persist();
}
/* blocos livres de um dia: janela [ini,fim] menos os ocupados, com pelo menos "dur" minutos */
function blocosDia(iso,busy,d){
  var ini=hm2min(d.ini),fim=hm2min(d.fim),agora=new Date();
  var a=dtLocal(iso,ini),b=dtLocal(iso,fim);
  if(iso===isoHoje()){var m=Math.ceil((agora.getHours()*60+agora.getMinutes())/30)*30;if(m>ini)a=dtLocal(iso,m)}
  if(b<=a)return[];
  var oc=busy.filter(function(x){return x.e>a&&x.s<b}).map(function(x){return{s:Math.max(x.s,a),e:Math.min(x.e,b)}}).sort(function(x,y){return x.s-y.s});
  var out=[],cur=a.getTime();
  oc.forEach(function(x){if(x.s>cur)out.push([cur,x.s]);cur=Math.max(cur,x.e)});
  if(cur<b.getTime())out.push([cur,b.getTime()]);
  return out.filter(function(x){return(x[1]-x[0])/60000>=d.dur});
}
function calcDisp(){
  saveDisp();
  if(!window.G||!G.connected()){alert('Toque em ☁ e conecte ao Google primeiro.');return}
  var d=S.disp;
  if(!d.dias.length){alert('Marque ao menos um dia da semana.');return}
  var ini=new Date();ini.setHours(0,0,0,0);
  var fim=new Date(ini.getTime()+d.qtd*86400000);
  var ids=['primary'];d.cals.split(/[,;\s]+/).forEach(function(c){if(c&&ids.indexOf(c)<0)ids.push(c)});
  dispMsg='Lendo a agenda…';dispRes=null;render(true);
  G.freeBusy(ids,ini.toISOString(),fim.toISOString()).then(function(r){
    dispBusy=r.busy.map(function(x){return{s:new Date(x.s).getTime(),e:new Date(x.e).getTime()}});
    var dias=[];
    for(var i=0;i<d.qtd;i++){
      var dt=new Date(ini.getTime()+i*86400000+43200000);
      var iso=dt.getFullYear()+'-'+pad(dt.getMonth()+1)+'-'+pad(dt.getDate());
      if(d.dias.indexOf(dt.getDay())<0)continue;
      var bl=blocosDia(iso,dispBusy,d);
      dias.push({iso:iso,sem:DSEM[dt.getDay()],blocos:bl});
    }
    dispRes=dias;
    dispMsg=r.erros.length?'Não consegui ler: '+r.erros.join(', ')+'. Confira se essa agenda foi compartilhada com a conta conectada.':'';
    render(true);
  }).catch(function(e){dispMsg='Erro: '+e.message;dispRes=null;render(true)});
}
function usaHorario(iso,min){
  var h=pad(Math.floor(min/60))+':'+pad(min%60);
  var d=document.getElementById('ad'),t=document.getElementById('ah');
  if(d)d.value=iso;if(t)t.value=h;
  var f=document.getElementById('at');if(f){f.focus();f.scrollIntoView({behavior:'smooth',block:'center'})}
  toast('Horário '+fmtDate(iso)+' às '+h+' colocado no compromisso.');
}
function conflito(iso,h){
  if(!dispBusy.length)return'';
  var a=dtLocal(iso,hm2min(h)).getTime(),b=a+3600000;
  return dispBusy.some(function(x){return x.e>a&&x.s<b})?'ATENÇÃO: esse horário parece ocupado na sua agenda.\n\n':'';
}
function dispHtml(){
  var d=S.disp;
  var h='<div class="card"><h2>🕒 Meus horários livres</h2>'+
  '<p class="mut">Lê só o "livre/ocupado" da sua agenda do Google (sem títulos nem nomes) e mostra os horários vagos para marcar médicos e exames.</p>'+
  '<details><summary class="mut" style="cursor:pointer;margin-bottom:6px">Ajustar horário de trabalho e dias</summary>'+
  '<label>Dias que posso marcar</label><div>'+DSEM.map(function(n,i){return'<label style="display:inline-block;margin-right:10px"><input type="checkbox" id="dp_d'+i+'" style="width:auto" '+(d.dias.indexOf(i)>-1?'checked':'')+' onchange="saveDisp()"> '+n+'</label>'}).join('')+'</div>'+
  '<div class="row"><div><label>Das</label><input id="dp_ini" type="time" value="'+d.ini+'" onchange="saveDisp()"></div><div><label>Até</label><input id="dp_fim" type="time" value="'+d.fim+'" onchange="saveDisp()"></div></div>'+
  '<div class="row"><div><label>Duração mínima (min)</label><input id="dp_dur" type="number" min="15" step="15" value="'+d.dur+'" onchange="saveDisp()"></div><div><label>Olhar quantos dias</label><input id="dp_qtd" type="number" min="1" max="60" value="'+d.qtd+'" onchange="saveDisp()"></div></div>'+
  '<label>Outras agendas a considerar (e-mails, separados por vírgula)</label><input id="dp_cals" value="'+esc(d.cals)+'" placeholder="Opcional" onchange="saveDisp()">'+
  '</details>'+
  (window.G&&G.connected()?'<button class="btn" style="width:100%;margin:8px 0" onclick="calcDisp()">Ver meus horários livres</button>':'<div class="empty">Conecte ao Google (☁) para ver seus horários.</div>');
  if(dispMsg)h+='<p class="mut">'+esc(dispMsg)+'</p>';
  if(dispRes){
    if(!dispRes.length)h+='<div class="empty">Nenhum dia nos dias marcados.</div>';
    dispRes.forEach(function(x){
      h+='<div style="padding:6px 0;border-bottom:1px solid var(--line)"><b>'+x.sem+' '+fmtDate(x.iso).slice(0,5)+'</b> ';
      if(!x.blocos.length)h+='<span class="mut">sem horário livre</span>';
      x.blocos.forEach(function(b){
        var s=new Date(b[0]),e=new Date(b[1]);
        h+='<button class="btn sm sec" style="margin:2px 4px 2px 0" onclick="usaHorario(\''+x.iso+'\','+(s.getHours()*60+s.getMinutes())+')">'+hhmm(s)+'–'+hhmm(e)+'</button>';
      });
      h+='</div>';
    });
    h+='<p class="mut">Toque num horário para colocá-lo no "Novo compromisso" logo abaixo.</p>';
  }
  return h+'</div>';
}

/* ---------- Agenda ---------- */
function vAgenda(){
  var p=P();
  var h=dispHtml()+'<div class="card"><h2>Novo compromisso</h2>'+
  '<label>Título</label><input id="at" placeholder="Ex.: Consulta com coloproctologista">'+
  '<div class="row"><div><label>Data</label><input id="ad" type="date"></div><div><label>Hora</label><input id="ah" type="time" value="08:00"></div></div>'+
  '<label>Local</label><input id="al"><label>Preparo / notas</label><textarea id="ap" rows="2" placeholder="Jejum de 8–12 h, levar pedido…"></textarea>'+
  (window.G&&G.connected()?'<button class="btn" style="width:100%;margin-bottom:8px" onclick="addAg(\'c\')">☁️ Criar na agenda '+agendaNome()+'</button>':'')+
  '<div class="row"><button class="btn sec" onclick="addAg(\'g\')">📅 Abrir no Google Agenda</button><button class="btn sec" onclick="addAg(\'i\')">⬇️ Arquivo .ics</button></div>'+
  '<p class="mut">Confira os campos acima: eles são a prévia do evento. Com o Google conectado (☁), o botão "Criar na agenda Saúde" grava direto numa agenda própria chamada "Saúde", com alertas de 1 dia e 1 hora antes, e pede sua confirmação antes. Sem conexão, use "Abrir no Google Agenda" ou o arquivo .ics. Só consultas, coletas e retornos devem virar eventos; exames pendentes e remédios ficam no app.</p></div>';
  h+='<div class="card"><h2>Compromissos</h2>';
  if(!p.agenda.length)h+='<div class="empty">Nada agendado.</div>';
  p.agenda.forEach(function(a,i){
    h+='<div style="padding:6px 0;border-bottom:1px solid var(--line)"><b>'+esc(a.t)+'</b><br><span class="mut">'+fmtDate(a.d)+' às '+a.h+(a.l?' · '+esc(a.l):'')+'</span>'+
    (a.p?'<div class="mut">'+esc(a.p)+'</div>':'')+
    '<button class="btn sm sec" onclick="delAg('+i+')" style="margin-top:4px">Remover</button></div>';
  });
  return h+'</div>';
}
function delAg(i){
  var a=P().agenda[i];
  if(a&&a.gid&&window.G&&G.connected())G.deleteEvent(a.gid).then(function(){toast('Evento removido da agenda Saúde.')}).catch(function(){toast('O evento continua na agenda Google. Remova por lá.')});
  P().agenda.splice(i,1);save();render();
}
function addAg(kind){
  var a={t:val('at'),d:val('ad'),h:val('ah')||'08:00',l:val('al'),p:val('ap')};
  if(!a.t||!a.d){alert('Preencha título e data.');return}
  if(kind==='c'){
    if(!confirm(conflito(a.d,a.h)+'Criar na agenda'+agendaNome(true)+'?\n\n'+a.t+'\n'+fmtDate(a.d)+' às '+a.h+(a.l?'\n'+a.l:'')+'\nAlertas: 1 dia e 1 hora antes.'))return;
    G.createEvent(a,S.cur).then(function(id){a.gid=id;P().agenda.push(a);save();render(true);toast('Criado na agenda Saúde.')})
      .catch(function(e){alert(e.message)});
    return;
  }
  P().agenda.push(a);save();
  var s=a.d.replace(/-/g,'')+'T'+a.h.replace(':','')+'00';
  var eh=pad((parseInt(a.h.slice(0,2),10)+1)%24)+a.h.slice(3)+'00';
  var e=a.d.replace(/-/g,'')+'T'+eh.replace(':','');
  if(kind==='g'){
    var u='https://calendar.google.com/calendar/render?action=TEMPLATE&text='+encodeURIComponent(a.t)+
      '&dates='+s+'/'+e+'&ctz=America/Sao_Paulo&location='+encodeURIComponent(a.l)+'&details='+encodeURIComponent(a.p);
    window.open(u,'_blank');
  }else{
    var ics=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Saude a Dois//PT','BEGIN:VEVENT','UID:'+Date.now()+'@saude-dois',
      'DTSTAMP:'+new Date().toISOString().replace(/[-:]/g,'').slice(0,15)+'Z','DTSTART:'+s,'DTEND:'+e,'SUMMARY:'+a.t,
      'LOCATION:'+a.l,'DESCRIPTION:'+a.p.replace(/\n/g,'\\n'),
      'BEGIN:VALARM','TRIGGER:-P1D','ACTION:DISPLAY','DESCRIPTION:Amanhã: '+a.t,'END:VALARM',
      'BEGIN:VALARM','TRIGGER:-PT1H','ACTION:DISPLAY','DESCRIPTION:Em 1 hora: '+a.t,'END:VALARM',
      'END:VEVENT','END:VCALENDAR'].join('\r\n');
    var bl=new Blob([ics],{type:'text/calendar'}),lk=document.createElement('a');
    lk.href=URL.createObjectURL(bl);lk.download='compromisso.ics';document.body.appendChild(lk);lk.click();lk.remove();
  }
  render();
}

/* ---------- Consulta (resumo de 1 página) ---------- */
var ESP={
  'Coloproctologista / Gastro':{sint:['s','pre','tont'],ex:['Hemoglobina','Hemoglobina glicada (HbA1c)','ALT/TGP','GGT','PCR'],pend:['Hemograma','Ferritina','Colonoscopia'],
    q:['Preciso de exame anorretal e de colonoscopia?','Quando é seguro esperar e quando devo ir à urgência?','Hemorroidas explicam o sangramento ou precisa investigar mais?','Os remédios que uso influenciam o intestino?']},
  'Reumatologista':{sint:['dor','rig','fad'],ex:['PCR','TSH','Eosinófilos'],pend:['CK','Vitamina D','Cálcio','Fósforo','B12'],
    q:['A rigidez é de fibromialgia ou outra causa?','Vale pedir CK e vitamina D?','Algum remédio pode estar piorando a fadiga e a rigidez?']},
  'Pneumologista':{sint:['res','fad'],ex:['Eosinófilos','Hemoglobina'],pend:[],
    q:['Preciso de espirometria?','Há suspeita de apneia do sono?','Os sedativos aumentam o risco respiratório?']},
  'Hepatologista':{sint:['fad'],ex:['ALT/TGP','AST/TGO','GGT','Glicemia de jejum','Hemoglobina glicada (HbA1c)','HDL'],pend:['Ferritina'],
    q:['Devo fazer ultrassom e elastografia?','Qual o grau de fibrose?','Qual meta de perda de peso?']},
  'Endocrinologista':{sint:['fad'],ex:['Glicemia de jejum','Hemoglobina glicada (HbA1c)','HDL','TSH'],pend:['Vitamina D'],
    q:['Por que o peso subiu com a tirzepatida?','A dose está adequada?','Preciso repetir exames metabólicos?']},
  'Urologista':{sint:[],ex:['Creatinina'],pend:[],q:['Quais exames investigam as infecções urinárias recorrentes?','Vale colher urocultura durante os sintomas, antes do antibiótico?']},
  'Clínico geral':{sint:['s','dor','rig','fad','res'],ex:[],pend:[],
    q:['Quais exames priorizar?','Como organizar os encaminhamentos?','Há interações entre meus remédios?']}
};
var espSel='Coloproctologista / Gastro';



var TIPOS=['Sangue','Urina','Fezes','Imagem','Endoscopia / procedimentos','Funcionais (respiração, sono, coração)','Outros'];
function tipoOf(n){
  n=n.toLowerCase();
  if(/colonoscop|endoscop|retossigmo|anuscop|broncoscop|bi[óo]psia/.test(n))return TIPOS[4];
  if(/ultrassom|ultrassonografia|elastografia|radiografia|raio|tomografia|resson[âa]ncia|densitometria|ecocardio|doppler/.test(n))return TIPOS[3];
  if(/espirometria|polissonografia|eletrocardiograma|\becg\b|ergom|eletroneuromiografia|oximetria/.test(n))return TIPOS[5];
  if(/urina|\beas\b|urocultura|\brac\b/.test(n))return TIPOS[1];
  if(/fezes|calprotectina|coprocultura|parasitol|sangue oculto/.test(n))return TIPOS[2];
  return TIPOS[0];
}
function tipoIdx(x){var k=TIPOS.indexOf(x.tipo||tipoOf(x.n));return k<0?99:k}
function setTipo(i,v){P().pend[i].tipo=v;save();render(true)}
var SUG={
 'Coloproctologista / Gastro':['Hemograma completo','Ferritina + saturação de transferrina','Colonoscopia','Calprotectina fecal','Parasitológico de fezes'],
 'Reumatologista':['CK total (CPK)','Vitamina D (25-OH)','Vitamina B12','Cálcio total + albumina','Fósforo','PCR e VHS','TSH e T4 livre','Aldolase'],
 'Pneumologista':['Espirometria','Radiografia de tórax','Polissonografia (estudo do sono)'],
 'Hepatologista':['Ultrassonografia de abdome','Elastografia hepática','Perfil hepático completo','Tempo de protrombina / INR','Albumina sérica','Anti-HCV'],
 'Endocrinologista':['Glicemia de jejum e HbA1c','Perfil lipídico completo','Creatinina / eTFG','TSH e T4 livre'],
 'Urologista':['EAS (urina tipo 1)','Urocultura com antibiograma','Relação albumina/creatinina na urina'],
 'Clínico geral':['EAS (urina tipo 1)','Urocultura com antibiograma','Hemograma completo','Eletrólitos (sódio, potássio, magnésio)','Creatinina / eTFG','TSH e T4 livre','Vitamina D (25-OH)','Vitamina B12','Ferritina']
};
function relNames(p){var o={};p.exames.forEach(function(e){o[e.n]=1});return Object.keys(o).sort()}
function getRel(p){if(!p.rel)p.rel={};if(!p.rel[espSel])p.rel[espSel]=(ESP[espSel]?ESP[espSel].ex.slice():[]);return p.rel[espSel]}
function togRel(i){var p=P(),n=relNames(p)[i],s=getRel(p),k=s.indexOf(n);if(k>-1)s.splice(k,1);else s.push(n);save();render(true)}
function addSug(j){var n=SUG[espSel][j];P().pend.push({n:n,s:'a pedir',esp:espSel,tipo:tipoOf(n)});save();render(true)}
function addPendHere(){
  var t=val('npe');if(!t)return;
  t.split(',').forEach(function(n){n=n.trim();if(n)P().pend.push({n:n,s:'a pedir',esp:espSel,tipo:tipoOf(n)})});
  save();render(true);
}
function examesBlock(p){
  var h='<div style="margin-top:12px;font-weight:700;color:var(--pri)">Exames para pedir a este médico</div>';
  var mine=[];p.pend.forEach(function(x,i){if(x.esp===espSel&&x.s==='a pedir')mine.push(i)});
  if(!mine.length)h+='<div class="mut">Nenhum ainda.</div>';
  mine.sort(function(a,b){return tipoIdx(p.pend[a])-tipoIdx(p.pend[b])});
  var tl='';
  mine.forEach(function(i){
    var t=p.pend[i].tipo||tipoOf(p.pend[i].n);
    if(t!==tl){tl=t;h+='<div class="mut" style="margin-top:6px"><b>'+esc(t)+'</b></div>'}
    h+='<div class="row" style="align-items:center;margin-bottom:4px"><div>'+esc(p.pend[i].n)+'</div><button class="btn sm sec" style="flex:0 0 auto" onclick="delPend('+i+')" aria-label="Remover">✕</button></div>';
  });
  var sug=(SUG[espSel]||[]).map(function(n,j){return{n:n,j:j}}).filter(function(x){return!p.pend.some(function(q){return q.esp===espSel&&q.n===x.n})});
  if(sug.length)h+='<div class="mut" style="margin-top:6px">Sugestões para discutir com o médico (toque para adicionar):</div><div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px">'+
    sug.sort(function(a,b){return TIPOS.indexOf(tipoOf(a.n))-TIPOS.indexOf(tipoOf(b.n))}).map(function(x){return'<button class="btn sm sec" onclick="addSug('+x.j+')" title="'+esc(tipoOf(x.n))+'">+ '+esc(x.n)+'</button>'}).join('')+'</div>';
  h+='<div class="row" style="margin-top:8px"><input id="npe" placeholder="Outro exame (escreva o nome)"><button class="btn sm" style="flex:0 0 auto" onclick="addPendHere()">Adicionar</button></div>'+
    '<p class="mut" style="margin:4px 0 0">Sem limite: escreva qualquer exame, vários separados por vírgula. As sugestões vêm do seu documento e não substituem a decisão do médico.</p>';
  h+='<div style="margin-top:12px;font-weight:700;color:var(--pri)">Resultados salvos que vão no resumo</div>';
  var names=relNames(p),sel=getRel(p);
  if(!names.length)h+='<div class="mut">Importe um laudo para poder escolher.</div>';
  names.forEach(function(n,i){h+='<label style="display:flex;gap:8px;align-items:center;margin:2px 0;color:var(--ink);font-size:14px"><input type="checkbox" style="width:auto"'+(sel.indexOf(n)>-1?' checked':'')+' onchange="togRel('+i+')">'+esc(n)+'</label>'});
  return h;
}
function getPerg(p){if(!p.perg)p.perg={};if(!p.perg[espSel]){var c=ESP[espSel];p.perg[espSel]=c?c.q.slice():[]}return p.perg[espSel]}
function editConsulta(p){
  var q=getPerg(p),ob=(p.obs&&p.obs[espSel])||'';
  var h='<div class="card noprint"><h2>Minhas perguntas e anotações — '+esc(espSel)+'</h2>'+
    '<p class="mut" style="margin:0 0 6px">Escreva o que quer perguntar a este médico. As perguntas já escritas são sugestões: edite, apague ou acrescente. Tudo entra no resumo abaixo e sai na impressão.</p>';
  q.forEach(function(t,i){h+='<div class="row" style="margin-bottom:4px;align-items:center"><input value="'+esc(t)+'" onchange="setPerg('+i+',this.value)"><button class="btn sm sec" style="flex:0 0 auto" onclick="delPerg('+i+')" aria-label="Remover">✕</button></div>'});
  h+='<div class="row" style="margin-top:6px"><input id="npq" placeholder="Nova pergunta"><button class="btn sm" style="flex:0 0 auto" onclick="addPerg()">Adicionar</button></div>'+
    examesBlock(p)+'<label>Observações extras para o médico</label><textarea rows="3" onchange="saveObs(this.value)" placeholder="Ex.: o sangramento piora depois de esforço…">'+esc(ob)+'</textarea></div>';
  return h;
}
function setPerg(i,v){getPerg(P())[i]=v;save()}
function delPerg(i){getPerg(P()).splice(i,1);save();render(true)}
function addPerg(){var t=val('npq');if(!t)return;getPerg(P()).push(t);save();render(true)}
function saveObs(v){var p=P();if(!p.obs)p.obs={};p.obs[espSel]=v;save();render(true)}
function posConsulta(p){
  var d=new Date(),iso=d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
  var h='<div class="card noprint"><h2>Depois da consulta — '+esc(espSel)+'</h2>'+
    '<label>Data</label><input id="cd" type="date" value="'+iso+'">'+
    '<label>O que o médico disse, pediu ou orientou</label><textarea id="cn" rows="3"></textarea>'+
    '<button class="btn" onclick="addConsulta()">Salvar registro da consulta</button>'+
    '<p class="mut">Se o médico pediu exames, acrescente-os na aba Exames com o status "pedido".</p>';
  var hist=(p.consultas||[]).map(function(c,i){return{c:c,i:i}}).filter(function(x){return x.c.esp===espSel}).reverse();
  if(hist.length){
    h+='<h2 style="margin-top:14px">Consultas anteriores</h2>';
    hist.forEach(function(x){h+='<div style="padding:6px 0;border-bottom:1px solid var(--line)"><b>'+esc(x.c.d)+'</b><div>'+esc(x.c.nota).replace(/\n/g,'<br>')+'</div><button class="btn sm sec" style="margin-top:4px" onclick="delConsulta('+x.i+')">Remover</button></div>'});
  }
  return h+'</div>';
}
function addConsulta(){
  var n=val('cn');if(!n){alert('Escreva o que foi dito ou pedido.');return}
  var p=P();if(!p.consultas)p.consultas=[];
  p.consultas.push({esp:espSel,d:fmtDate(val('cd'))||nowStr().slice(0,10),nota:n});save();render();
}
function delConsulta(i){if(confirm('Remover este registro?')){P().consultas.splice(i,1);save();render()}}
function vConsulta(){
  var h='<div class="card noprint"><h2>Resumo de uma página</h2><label>Especialidade</label><select id="es" onchange="espSel=this.value;render()">'+
    espList().map(function(k){return'<option'+(k===espSel?' selected':'')+'>'+esc(k)+'</option>'}).join('')+'</select>'+
    '<button class="btn" onclick="window.print()">🖨️ Imprimir / salvar PDF</button></div>';
  var p=P(),c=ESP[espSel]||{sint:['s','dor','rig','fad','res'],ex:[],pend:[],q:['Quais exames e orientações você recomenda?']};
  h+=editConsulta(p);
  h+='<div class="card"><div class="sheet"><h3>Resumo para consulta — '+esc(espSel)+'</h3><div class="mut">'+esc(p.nome)+' · gerado em '+nowStr()+'</div>';
  h+='<h4>Sintomas recentes</h4>';
  var last=p.diario.slice(-3).reverse();
  if(!last.length)h+='<div class="mut">Sem registros no diário.</div>';
  else{h+='<ul>';last.forEach(function(x){
    var t=[];
    if(c.sint.indexOf('s')>-1)t.push('sangue nas fezes: '+x.s);
    if(c.sint.indexOf('pre')>-1&&x.pre)t.push('fezes pretas');
    if(c.sint.indexOf('tont')>-1&&x.tont)t.push('tontura/desmaio');
    ['dor','rig','fad','res'].forEach(function(k){if(c.sint.indexOf(k)>-1)t.push({dor:'dor',rig:'rigidez',fad:'fadiga',res:'falta de ar'}[k]+' '+x[k]+'/10')});
    h+='<li>'+x.d+': '+esc(t.join(', '))+(x.obs?' ('+esc(x.obs)+')':'')+'</li>';
  });h+='</ul>'}
  h+='<h4>Exames relevantes</h4>';
  var rel=getRel(p);
  var ex=p.exames.filter(function(e){return rel.indexOf(e.n)>-1}).sort(function(a,b){return a.n<b.n?-1:a.n>b.n?1:(dkey(a.d)<dkey(b.d)?-1:1)});
  if(!ex.length)h+='<div class="mut">Nenhum resultado selecionado para este resumo.</div>';
  else{h+='<ul>';ex.forEach(function(e){h+='<li>'+esc(e.n)+': <b>'+e.v+' '+esc(e.u)+'</b> (ref. '+esc(refTxt(e))+') em '+e.d+'</li>'});h+='</ul>'}
  var pe=p.pend.filter(function(x){return x.s==='a pedir'&&x.esp===espSel});
  if(pe.length){
    h+='<h4>Exames que gostaria de solicitar</h4>';
    TIPOS.forEach(function(t){
      var g=pe.filter(function(x){return(x.tipo||tipoOf(x.n))===t});
      if(!g.length)return;
      h+='<div><b>'+esc(t)+'</b></div><ul>'+g.map(function(x){return'<li>'+esc(x.n)+'</li>'}).join('')+'</ul>';
    });
  }
  if(p.bio.length&&(espSel==='Endocrinologista'||espSel==='Hepatologista')){
    var b=p.bio[p.bio.length-1];
    h+='<h4>Bioimpedância</h4><ul><li>'+b.d+': peso '+b.peso+' kg, gordura '+b.pgc+'%, visceral '+b.visc+', IMC '+b.imc+'</li><li>Peso: '+p.bio.map(function(x){return x.peso}).join(' → ')+' kg</li></ul>';
  }
  h+='<h4>Em uso (remédios, vitaminas e suplementos)</h4>';
  if(!p.meds.length)h+='<div class="mut">Nenhum cadastrado.</div>';
  else{h+='<ul>';p.meds.forEach(function(m){h+='<li>'+esc(m.n)+(m.dose?' — '+esc(m.dose):'')+(m.motivo?'. Motivo: '+esc(m.motivo):'')+(m.finalidade?'. Finalidade: '+esc(m.finalidade):'')+'</li>'});h+='</ul>'}
  var qs=getPerg(p).filter(function(x){return x.trim()});
  h+='<h4>Perguntas para a consulta</h4>'+(qs.length?'<ul>'+qs.map(function(q){return'<li>'+esc(q)+'</li>'}).join('')+'</ul>':'<div class="mut">Nenhuma pergunta escrita.</div>');
  var ob=(p.obs&&p.obs[espSel])||'';
  if(ob.trim())h+='<h4>Observações</h4><div>'+esc(ob).replace(/\n/g,'<br>')+'</div>';
  h+='<div class="mut" style="margin-top:10px">Resumo de apoio feito pelo paciente. Não é documento médico nem prescrição.</div></div></div>';
  h+=posConsulta(p);
  return h;
}

/* ---------- Em uso: remédios, vitaminas, suplementos ---------- */
var TIPOS_USO=['Medicamento','Vitamina','Suplemento','Chá / fitoterápico','Outro'];
var editUso=-1;
function vRemedios(){
  var p=P(),h='<div class="card"><h2>Em uso agora</h2><p class="mut" style="margin:0 0 6px">Remédios, vitaminas, suplementos e qualquer outra coisa que você usa, com o motivo e a finalidade de cada um.</p>';
  if(!p.meds.length)h+='<div class="empty">Nada cadastrado.</div>';
  TIPOS_USO.forEach(function(t){
    var its=[];p.meds.forEach(function(m,i){if((m.tipo||'Medicamento')===t)its.push(i)});
    if(!its.length)return;
    h+='<div style="margin-top:10px;font-weight:700;color:var(--pri)">'+esc(t)+'</div>';
    its.forEach(function(i){
      var m=p.meds[i];
      if(i===editUso){h+=usoForm(m,i);return}
      h+='<div style="padding:8px 0;border-bottom:1px solid var(--line)"><b>'+esc(m.n)+'</b> <span class="tag t-info">'+esc(m.dose||'dose não informada')+'</span>'+
        '<div><span class="mut">Motivo:</span> '+(m.motivo?esc(m.motivo):'<span class="mut">não informado</span>')+'</div>'+
        '<div><span class="mut">Finalidade:</span> '+(m.finalidade?esc(m.finalidade):'<span class="mut">não informada</span>')+'</div>'+
        estoqueHtml(m)+
        (m.nota&&m.nota!=='—'?'<div class="mut">Para revisar: '+esc(m.nota)+'</div>':'')+
        '<div class="row" style="margin-top:4px"><button class="btn sm" onclick="comprei('+i+')">🛒 Comprei de novo</button><button class="btn sm sec" onclick="editUso='+i+';render(true)">Editar</button><button class="btn sm sec" onclick="delUso('+i+')">Remover</button></div></div>';
    });
  });
  h+='<p class="mut">Não interrompa, inicie nem ajuste remédios sem o prescritor. A associação de sedativos merece atenção diante de fadiga e problemas respiratórios. Informe também álcool e outros produtos ao médico.</p></div>';
  h+='<div class="card">'+avisoBtnHtml()+'</div>';
  if(editUso<0)h+='<div class="card"><h2>Adicionar</h2>'+usoForm({tipo:'Medicamento'},-1)+'</div>';
  return h;
}
function usoForm(m,i){
  return'<div style="padding:6px 0"><label>Tipo</label><select id="u_t">'+TIPOS_USO.map(function(t){return'<option'+(t===(m.tipo||'Medicamento')?' selected':'')+'>'+esc(t)+'</option>'}).join('')+'</select>'+
   '<label>Nome</label><input id="u_n" value="'+esc(m.n||'')+'">'+
   '<label>Dose / como uso</label><input id="u_d" value="'+esc(m.dose||'')+'" placeholder="Ex.: 50 mg à noite">'+
   '<label>Motivo: por que estou usando</label><input id="u_m" value="'+esc(m.motivo||'')+'" placeholder="Ex.: indicação do médico, exame com valor baixo…">'+
   '<label>Finalidade: para que serve / o que espero</label><input id="u_f" value="'+esc(m.finalidade||'')+'">'+
   '<label>Estoque (opcional): avisa quando estiver acabando</label>'+
   '<div class="row wrap"><div style="flex:1;min-width:120px"><label>Data da compra</label><input type="date" id="u_c" value="'+esc(m.compra||'')+'"></div>'+
   '<div style="flex:1;min-width:120px"><label>Quantidade comprada</label><input type="number" inputmode="decimal" id="u_q" value="'+esc(m.qtd||'')+'" placeholder="Ex.: 30"></div></div>'+
   '<div class="row wrap"><div style="flex:1;min-width:120px"><label>Quantidade por vez</label><input type="number" inputmode="decimal" step="0.25" id="u_pv" value="'+esc(m.porVez||'')+'" placeholder="Ex.: 1"></div>'+
   '<div style="flex:1;min-width:120px"><label>Vezes por dia</label><input type="number" inputmode="decimal" id="u_vd" value="'+esc(m.vezes||'')+'" placeholder="Ex.: 1"></div>'+
   '<div style="flex:1;min-width:120px"><label>Avisar com (dias)</label><input type="number" inputmode="numeric" id="u_av" value="'+esc(m.aviso||7)+'"></div></div>'+
   '<label>Pontos para revisar com o médico (opcional)</label><input id="u_o" value="'+esc(m.nota&&m.nota!=='—'?m.nota:'')+'">'+
   '<div class="row"><button class="btn" onclick="saveUso('+i+')">'+(i<0?'Adicionar':'Salvar')+'</button>'+(i<0?'':'<button class="btn sec" onclick="editUso=-1;render(true)">Cancelar</button>')+'</div></div>';
}
function saveUso(i){
  var n=val('u_n');if(!n){alert('Informe o nome.');return}
  var o={tipo:val('u_t'),n:n,dose:val('u_d'),motivo:val('u_m'),finalidade:val('u_f'),nota:val('u_o'),compra:val('u_c'),qtd:val('u_q'),porVez:val('u_pv'),vezes:val('u_vd'),aviso:val('u_av')||'7'};
  var p=P();if(i<0)p.meds.push(o);else p.meds[i]=o;
  editUso=-1;save();render(true);
}
function delUso(i){if(confirm('Remover "'+P().meds[i].n+'"?')){P().meds.splice(i,1);editUso=-1;save();render(true)}}

/* ---------- Importar PDF ---------- */
var staged=[];
var CAT=[
 {n:'Glicemia de jejum',rx:/Glicemia de Jejum[ .:]*?(\d+[.,]?\d*)\s*mg\/dL/i,u:'mg/dL',min:70,max:99},
 {n:'Hemoglobina glicada (HbA1c)',rx:/Hemoglobina Glicada[\s\S]{0,400}?Resultado[ .:]*(\d+[.,]\d+)\s*%/i,u:'%',min:4.4,max:5.6},
 {n:'ALT/TGP',rx:/ALT\/TGP[^:]{0,60}:\s*(\d+[.,]?\d*)\s*U\/L/i,u:'U/L',max:44.99,ref:'< 45'},
 {n:'AST/TGO',rx:/AST\/TGO[^:]{0,60}:\s*(\d+[.,]?\d*)\s*U\/L/i,u:'U/L',max:34.99,ref:'< 35'},
 {n:'GGT',rx:/GGT[ .]*:\s*(\d+[.,]?\d*)\s*U\/L/i,u:'U/L',max:54.99,ref:'< 55'},
 {n:'PCR',rx:/Prote[ií]na C Reativa[^:]{0,40}:\s*(\d+[.,]\d+)\s*mg\/dL/i,u:'mg/dL',max:0.499,ref:'< 0,50'},
 {n:'Hemoglobina',rx:/HEMOGLOBINA\s+(\d+[.,]\d+)\s*g\/dL/,u:'g/dL',min:12.5,max:17},
 {n:'Eosinófilos',rx:/EOSIN[ÓO]FILOS\s+(\d+[.,]?\d*)\s*%/i,u:'%',min:1,max:5},
 {n:'Leucócitos',rx:/LEUC[ÓO]CITOS\s+([\d.]+)\s*\/mm/i,u:'/mm³',min:3600,max:12000,th:1},
 {n:'Plaquetas',rx:/Plaquetas:?\s+([\d.]+)\s*\/mm/i,u:'/mm³',min:150000,max:450000,th:1},
 {n:'Colesterol total',rx:/Colesterol Total\s+(\d+)\s*mg\/dL/i,u:'mg/dL'},
 {n:'HDL',rx:/Colesterol - HDL\s+(\d+)\s*mg\/dL/i,u:'mg/dL',min:40.01,ref:'> 40'},
 {n:'LDL',rx:/Colesterol - LDL\s+(\d+)\s*mg\/dL/i,u:'mg/dL'},
 {n:'Triglicerídeos',rx:/Triglicer[ií]deos\s+(\d+)\s*mg\/dL/i,u:'mg/dL'},
 {n:'TSH',rx:/TSH Ultrassens[ií]vel[^:]*:\s*(\d+[.,]\d+)/i,u:'µUI/mL',min:0.38,max:5.33},
 {n:'T4 livre',rx:/T4 \(Tiroxina\) Livre[ .]*:\s*(\d+[.,]\d+)/i,u:'ng/dL'},
 {n:'Creatinina',rx:/Creatinina com eTFG[\s\S]{0,300}?Resultado[ .:]*(\d+[.,]\d+)\s*mg\/dL/i,u:'mg/dL',min:0.9,max:1.3},
 {n:'Ácido úrico',rx:/[ÁA]cido [ÚU]rico[ .]*:\s*(\d+[.,]\d+)/i,u:'mg/dL',min:4.4,max:7.6},
 {n:'Potássio',rx:/Pot[áa]ssio[ .]*:\s*(\d+[.,]\d+)/i,u:'mEq/L',min:3.5,max:5.1},
 {n:'Sódio',rx:/S[óo]dio[ .]*:\s*(\d+[.,]?\d*)/i,u:'mEq/L',min:136,max:145},
 {n:'Magnésio',rx:/Magn[ée]sio[ .]*:\s*(\d+[.,]\d+)/i,u:'mg/dL',min:1.7,max:2.4},
 {n:'Ferritina',rx:/Ferritina[^:\d]{0,40}[:.]+\s*(\d+[.,]?\d*)\s*ng\/mL/i,u:'ng/mL'},
 {n:'Vitamina D (25-OH)',rx:/Vitamina D[^:\d]{0,40}:\s*(\d+[.,]?\d*)\s*ng\/mL/i,u:'ng/mL'},
 {n:'Vitamina B12',rx:/(?:Vitamina B12|Cobalamina)[^:\d]{0,30}:\s*(\d+[.,]?\d*)\s*pg\/mL/i,u:'pg/mL'},
 {n:'CK total (CPK)',rx:/(?:CPK|CK Total|Creatinoquinase)[^:\d]{0,30}[:.]+\s*(\d+[.,]?\d*)\s*U\/L/i,u:'U/L'},
 {n:'Cálcio total',rx:/C[áa]lcio Total[ .]*:\s*(\d+[.,]\d+)/i,u:'mg/dL'},
 {n:'Fósforo',rx:/F[óo]sforo[ .]*:\s*(\d+[.,]\d+)/i,u:'mg/dL'}
];
function num(s){return parseFloat(String(s).replace(/\./g,function(m,o,str){return/,/.test(str)?'':'.'}).replace(',','.'))}

function vImportar(){
  var p=P();
  var h='<div class="card"><h2>Importar documento (PDF)</h2>'+
   '<div class="drop" id="drop" ondragover="event.preventDefault();this.classList.add(\'over\')" ondragleave="this.classList.remove(\'over\')" ondrop="onDrop(event)">'+
   '📄 Arraste os PDFs aqui<br><label class="btn" style="display:inline-block;margin-top:10px">Escolher arquivos'+
   '<input type="file" id="pdfin" accept="application/pdf" multiple hidden onchange="readFiles(this.files)"></label></div>'+
   '<p class="mut">Destino: <b>'+esc(p.nome)+'</b>. A leitura acontece neste aparelho: o PDF não é enviado a nenhum servidor e só o texto lido é guardado, não o arquivo. Precisa de internet apenas para carregar o leitor. Tipos reconhecidos: laudo laboratorial e bioimpedância (leitura de valores); receita, pedido de exames e consulta (linhas para você escolher).</p>'+
   '<div id="impst" class="mut"></div></div><div id="staging">'+renderStaged()+'</div>';
  h+='<div class="card"><h2>Documentos importados</h2>';
  if(!p.docs.length)h+='<div class="empty">Nenhum ainda.</div>';
  p.docs.slice().reverse().forEach(function(d){
    h+='<div style="padding:5px 0;border-bottom:1px solid var(--line)"><span class="tag t-info">'+esc(d.tipo)+'</span> '+esc(d.file)+'<div class="mut">'+esc(d.d||'sem data')+' · '+esc(d.res||'')+' · importado em '+esc(d.em)+'</div></div>';
  });
  h+='</div><div class="card"><h2>Exportar registros</h2>'+
    '<p class="mut" style="margin:0 0 8px">Baixe cada registro em planilha (abre no Google Planilhas ou no Excel). Com o Google conectado (☁), o app atualiza planilhas de registros direto na pasta do Drive.</p>'+
    '<div class="row"><button class="btn sec" onclick="exportReg(\'exames\')">Exames</button><button class="btn sec" onclick="exportReg(\'bio\')">Bioimpedância</button></div>'+
    '<div class="row" style="margin-top:8px"><button class="btn sec" onclick="exportReg(\'diario\')">Diário</button><button class="btn sec" onclick="exportReg(\'meds\')">Em uso</button></div>'+
    '<h2 style="margin-top:16px">Backup</h2><div class="row"><button class="btn sec" onclick="exportBackup()">⬇️ Salvar backup</button>'+
    '<label class="btn sec" style="margin:8px 0 0;text-align:center">⬆️ Restaurar<input type="file" accept="application/json,.json" hidden onchange="importBackup(this.files[0])"></label></div>'+
    '<p class="mut">O backup guarda os dois perfis e fica só no seu arquivo. Guarde-o em local seguro, pois contém dados de saúde.</p>';
  return h+'</div>';
}
function dl(name,mime,txt){var bl=new Blob([txt],{type:mime}),a=document.createElement('a');a.href=URL.createObjectURL(bl);a.download=name;document.body.appendChild(a);a.click();a.remove()}
function csvCell(x){x=(x==null?'':String(x));return/[;"\n]/.test(x)?'"'+x.replace(/"/g,'""')+'"':x}
function toCsv(rows){return'﻿'+rows.map(function(r){return r.map(csvCell).join(';')}).join('\r\n')}
function vc(x){return x==null||x===''?'':String(x).replace('.',',')}
function exportReg(k){
  var p=P(),nm=p.nome.split(' ')[0],rows,file;
  if(k==='exames'){
    file='Historico-de-exames-'+nm+'.csv';
    rows=[['Data','Exame','Valor','Unidade','Referência','Situação']].concat(p.exames.slice().sort(function(a,b){return dkey(a.d)<dkey(b.d)?-1:1}).map(function(e){return[e.d,e.n,vc(e.v),e.u,refTxt(e),flag(e)[0]]}));
  }else if(k==='bio'){
    file='Bioimpedancia-'+nm+'.csv';
    rows=[['Data','Peso (kg)','Massa de gordura (kg)','Massa muscular (kg)','Gordura visceral','IMC','Gordura corporal (%)','Cintura-quadril','TMB (kcal)','Água corporal (L)']].concat(p.bio.map(function(b){return[b.d,vc(b.peso),vc(b.gord),vc(b.musc),vc(b.visc),vc(b.imc),vc(b.pgc),vc(b.rcq),vc(b.tmb),vc(b.agua)]}));
  }else if(k==='diario'){
    file='Diario-de-sintomas-'+nm+'.csv';
    rows=[['Data','Sangue nas fezes','Fezes pretas','Tontura/desmaio','Dor (0-10)','Rigidez (0-10)','Fadiga (0-10)','Falta de ar (0-10)','Observações']].concat(p.diario.map(function(x){return[x.d,x.s,x.pre?'sim':'não',x.tont?'sim':'não',x.dor,x.rig,x.fad,x.res,x.obs]}));
  }else{
    file='Em-uso-'+nm+'.csv';
    rows=[['Tipo','Nome','Dose / uso','Motivo','Finalidade','Pontos para revisar']].concat(p.meds.map(function(m){return[m.tipo||'Medicamento',m.n,m.dose,m.motivo,m.finalidade,m.nota&&m.nota!=='—'?m.nota:'']}));
  }
  if(rows.length<2){alert('Ainda não há registros para exportar.');return}
  dl(file,'text/csv;charset=utf-8',toCsv(rows));
}
function exportBackup(){dl('backup-saude-a-dois.json','application/json',JSON.stringify(Object.assign({},S,{pin:''}),null,1))}
function importBackup(f){
  if(!f)return;
  var r=new FileReader();
  r.onload=function(){
    try{
      var o=JSON.parse(r.result);
      if(!o||!o.profiles||!o.profiles.douglas||!o.profiles.rodrigo)throw new Error('formato');
      if(!confirm('Restaurar este backup vai substituir os dados atuais deste aparelho. Continuar?'))return;
      var pin=S.pin;S=o;S.pin=pin||o.pin||'';save();location.reload();
    }catch(e){alert('Este arquivo não parece ser um backup válido.')}
  };
  r.readAsText(f);
}
function onDrop(ev){ev.preventDefault();readFiles(ev.dataTransfer.files)}
function setSt(t){var e=document.getElementById('impst');if(e)e.textContent=t}
function readFiles(files){
  if(!window.pdfjsLib){setSt('O leitor de PDF não carregou. Conecte à internet e recarregue a página.');return}
  pdfjsLib.GlobalWorkerOptions.workerSrc='pdf.worker.min.js';
  var list=[].slice.call(files).filter(function(f){return/pdf$/i.test(f.name)||f.type==='application/pdf'});
  if(!list.length){setSt('Selecione arquivos PDF.');return}
  var chain=Promise.resolve();
  list.forEach(function(f){
    chain=chain.then(function(){
      setSt('Lendo '+f.name+'…');
      return extract(f).then(function(t){var r=analyze(f.name,t);r.fileObj=f;staged.push(r)})
        .catch(function(e){staged.push({file:f.name,tipo:'erro',msg:String(e&&e.message||e)})});
    });
  });
  chain.then(function(){setSt('Leitura concluída. Confira os dados abaixo antes de salvar.');document.getElementById('staging').innerHTML=renderStaged()});
}
function extract(f){
  return f.arrayBuffer().then(function(buf){return pdfjsLib.getDocument({data:buf}).promise}).then(function(doc){
    var out=[],i=1;
    function next(){
      if(i>doc.numPages)return Promise.resolve(out.join('\n'));
      return doc.getPage(i++).then(function(pg){return pg.getTextContent()}).then(function(tc){
        var rows={};
        tc.items.forEach(function(it){var y=Math.round(it.transform[5]/3);(rows[y]=rows[y]||[]).push(it)});
        Object.keys(rows).map(Number).sort(function(a,b){return b-a}).forEach(function(y){
          out.push(rows[y].sort(function(a,b){return a.transform[4]-b.transform[4]}).map(function(it){return it.str}).join(' '));
        });
        return next();
      });
    }
    return next();
  });
}
function candLines(raw,rx,max){
  var seen={},out=[];
  raw.split('\n').forEach(function(l){
    l=l.replace(/\s+/g,' ').trim();
    if(l.length<4||l.length>110||seen[l]||!rx.test(l))return;
    seen[l]=1;out.push(l);
  });
  return out.slice(0,max||40);
}
function analyze(name,raw){
  var t=raw.replace(/[ \t]+/g,' '),r={file:name,raw:raw};
  if(t.replace(/\s/g,'').length<60){r.tipo='sem texto';return r}
  var m=t.match(/Data\/Hora Coleta:\s*(\d{2}\/\d{2}\/\d{4})/)||t.match(/Exame do dia:\s*(\d{2}\/\d{2}\/\d{4})/)||t.match(/Data\/Hora\s+(\d{2}\/\d{2}\/\d{4})/)||t.match(/(\d{2}\/\d{2}\/\d{4})/);
  r.data=m?m[1]:'';
  var first=P().nome.split(' ')[0].toLowerCase();
  r.nomeOk=t.toLowerCase().indexOf(first)>-1;
  if(/bioimped|inbody/i.test(t)){r.tipo='bioimpedância';r.bio=parseBio(t)}
  else if(/(valores? de refer|V\.R\.|resultado)/i.test(t)&&/(mg\/dL|U\/L|mEq|\/mm|ng\/mL|µUI|UI\/)/i.test(t)){r.tipo='laudo laboratorial';r.ex=parseLab(t)}
  else if(/(receita|prescri|posologia|uso oral|comprimido)/i.test(t)){r.tipo='receita';r.lines=candLines(raw,/\b\d+([.,]\d+)?\s?(mg|mcg|µg|ml|g|ui)\b|comprimido|c[áa]psula|gotas/i,30)}
  else if(/(solicit|pedido|requisi)/i.test(t)&&/exame/i.test(t)){r.tipo='pedido de exames';r.lines=candLines(raw,/[A-Za-zÀ-ú]{4}/,60)}
  else{r.tipo='consulta / outro';r.resumo=raw.replace(/\s+/g,' ').slice(0,700)}
  return r;
}
function parseLab(t){
  var out=[];
  CAT.forEach(function(c){
    var m=t.match(c.rx);if(!m)return;
    var v=c.th?parseFloat(m[1].replace(/\./g,'')):num(m[1]);if(isNaN(v))return;
    out.push({n:c.n,v:v,u:c.u,min:c.min,max:c.max,ref:c.ref,inc:true});
  });
  return out;
}
function parseBio(t){
  function g(rxs){for(var i=0;i<rxs.length;i++){var m=t.match(rxs[i]);if(m){var v=num(m[1]);if(!isNaN(v))return v}}return''}
  return{
    peso:g([/Peso\s*\(kg\)\s*([\d.,]+)/i]),
    gord:g([/Massa de gordura\s*\(kg\)\s*([\d.,]+)/i]),
    musc:g([/Massa\s*Muscular\s*esquel[ée]tica\s*([\d.,]+)\s*kg/i]),
    visc:g([/N[ií]vel de Gordura Visceral\s*([\d.,]+)/i,/Gordura\s*Visceral\s*([\d.,]+)/i]),
    imc:g([/(?:IMC|[ÍI]ndice de Massa Corp[óo]rea)[^\d]{0,40}([\d.,]+)\s*kg\/m/i]),
    pgc:g([/Gordura\s*Corporal\s*([\d.,]+)\s*%/i,/PGC[^\d]{0,40}([\d.,]+)/i]),
    rcq:g([/Rela[çc][ãa]o Cintura-Quadril\s*([\d.,]+)/i]),
    tmb:g([/TMB\)?\s*([\d.,]+)\s*kcal/i,/Taxa metab[óo]lica basal[^\d]{0,20}([\d.,]+)\s*kcal/i]),
    agua:g([/[ÁA]gua\s*Corporal\s*([\d.,]+)\s*L/i])
  };
}
function renderStaged(){
  if(!staged.length)return'';
  var h='';
  staged.forEach(function(r,i){
    h+='<div class="card"><h2>'+esc(r.file)+' <span class="tag t-info">'+esc(r.tipo)+'</span></h2>';
    if(r.tipo==='erro'){h+='<div class="mut">Não consegui ler este arquivo: '+esc(r.msg)+'</div><button class="btn sec sm" onclick="discard('+i+')">Descartar</button></div>';return}
    if(r.tipo==='sem texto'){h+='<div class="mut">Este PDF não tem texto selecionável (provavelmente é imagem escaneada). A leitura por imagem (OCR) ainda não está no protótipo.</div><button class="btn sec sm" onclick="discard('+i+')" style="margin-top:8px">Descartar</button></div>';return}
    if(!r.nomeOk)h+='<div class="tag t-hi" style="display:block;margin-bottom:8px;border-radius:8px;padding:6px 8px">O nome do perfil atual ('+esc(P().nome.split(' ')[0])+') não aparece neste documento. Confira se é o perfil certo.</div>';
    h+='<label>Data do documento (dd/mm/aaaa)</label><input id="s'+i+'_d" value="'+esc(r.data)+'">';
    if(r.tipo==='laudo laboratorial'){
      if(!r.ex.length)h+='<p class="mut">Nenhum exame conhecido foi encontrado. Você pode lançar manualmente na aba Exames.</p>';
      else{
        h+='<p class="mut">Encontrei '+r.ex.length+' exames. As faixas de referência vêm de um catálogo e podem diferir do seu laboratório. Corrija o que estiver errado.</p><table><tr><th></th><th>Exame</th><th>Valor</th><th>Un.</th></tr>';
        r.ex.forEach(function(e,j){
          h+='<tr><td><input type="checkbox" id="s'+i+'_e'+j+'_c" checked style="width:auto"></td><td><input class="xi" id="s'+i+'_e'+j+'_n" value="'+esc(e.n)+'"></td><td><input class="xi" id="s'+i+'_e'+j+'_v" value="'+e.v+'" inputmode="decimal"></td><td><input class="xi" id="s'+i+'_e'+j+'_u" value="'+esc(e.u)+'"></td></tr>';
        });
        h+='</table>';
      }
    }else if(r.tipo==='bioimpedância'){
      var b=r.bio,labs={peso:'Peso (kg)',gord:'Massa de gordura (kg)',musc:'Massa muscular esquelética (kg)',visc:'Gordura visceral (nível)',imc:'IMC',pgc:'Gordura corporal (%)',rcq:'Relação cintura-quadril',tmb:'Taxa metabólica basal (kcal)',agua:'Água corporal (L)'};
      h+='<p class="mut">Campos vazios não foram encontrados: preencha ou deixe em branco.</p>';
      Object.keys(labs).forEach(function(k){h+='<label>'+labs[k]+'</label><input id="s'+i+'_b_'+k+'" value="'+esc(b[k])+'" inputmode="decimal">'});
    }else if(r.tipo==='receita'||r.tipo==='pedido de exames'){
      h+='<p class="mut">'+(r.tipo==='receita'?'Marque as linhas que são medicamentos. Elas entram na aba Remédios.':'Marque as linhas que são exames pedidos. Elas entram como "pedido" nos pendentes.')+'</p>';
      if(r.tipo==='pedido de exames')h+='<label>Médico / especialidade que fez o pedido</label><select id="s'+i+'_esp">'+espList().map(function(t){return'<option'+(t===lastEsp?' selected':'')+'>'+esc(t)+'</option>'}).join('')+'</select>';
      if(!r.lines.length)h+='<p class="mut">Não encontrei linhas úteis.</p>';
      r.lines.forEach(function(l,j){h+='<div style="display:flex;gap:6px;align-items:center;margin-bottom:4px"><input type="checkbox" id="s'+i+'_l'+j+'_c" style="width:auto"><input class="xi" id="s'+i+'_l'+j+'_t" value="'+esc(l)+'"></div>'});
    }else{
      h+='<p class="mut">Tipo não reconhecido para extração de valores. Prévia do texto:</p><div class="mut" style="background:var(--bg);padding:8px;border-radius:8px">'+esc(r.resumo)+'…</div><p class="mut">Salvar registra o documento na lista de importados.</p>';
    }
    if(window.G&&G.connected()&&r.fileObj)h+='<label style="display:flex;gap:8px;align-items:center;color:var(--ink)"><input type="checkbox" id="s'+i+'_up" checked style="width:auto">Guardar o PDF original na pasta de '+esc(P().nome.split(' ')[0])+' no Drive</label>';
    h+='<div class="row"><button class="btn" onclick="saveStaged('+i+')">Salvar em '+esc(P().nome.split(' ')[0])+'</button><button class="btn sec" onclick="discard('+i+')">Descartar</button></div></div>';
  });
  return h;
}
function discard(i){staged.splice(i,1);document.getElementById('staging').innerHTML=renderStaged()}
function dkey(s){var m=/(\d{2})\/(\d{2})\/(\d{4})/.exec(s||'');return m?m[3]+m[2]+m[1]:'0'}
function saveStaged(i){
  var r=staged[i],p=P(),d=val('s'+i+'_d')||nowStr().slice(0,10),res='';
  if(r.tipo==='laudo laboratorial'){
    var n=0,skip=0;
    r.ex.forEach(function(e,j){
      if(!document.getElementById('s'+i+'_e'+j+'_c').checked)return;
      var nome=val('s'+i+'_e'+j+'_n'),v=num(val('s'+i+'_e'+j+'_v'));
      if(!nome||isNaN(v))return;
      if(p.exames.some(function(x){return x.n===nome&&x.d===d})){skip++;return}
      p.exames.push({n:nome,v:v,u:val('s'+i+'_e'+j+'_u'),min:e.min,max:e.max,ref:e.ref,d:d});n++;
      var k=nome.toLowerCase().split(' ')[0];
      if(k.length>3)p.pend=p.pend.filter(function(x){return x.n.toLowerCase().indexOf(k)<0});
    });
    res=n+' exames salvos'+(skip?', '+skip+' já existiam':'');
  }else if(r.tipo==='bioimpedância'){
    var o={d:d};
    ['peso','gord','musc','visc','imc','pgc','rcq','tmb','agua'].forEach(function(k){var v=num(val('s'+i+'_b_'+k));o[k]=isNaN(v)?'':v});
    if(['peso','gord','musc','visc','imc','pgc'].every(function(k){return o[k]===''})){alert('Preencha ao menos um valor da bioimpedância.');return}
    p.bio=p.bio.filter(function(x){return x.d!==d});p.bio.push(o);
    p.bio.sort(function(a,b){return dkey(a.d)<dkey(b.d)?-1:1});
    res='bioimpedância salva';
  }else if(r.tipo==='receita'||r.tipo==='pedido de exames'){
    var c=0;
    r.lines.forEach(function(l,j){
      if(!document.getElementById('s'+i+'_l'+j+'_c').checked)return;
      var t=val('s'+i+'_l'+j+'_t');if(!t)return;
      if(r.tipo==='receita')p.meds.push({tipo:'Medicamento',n:t,dose:'conferir na receita',motivo:'',finalidade:'',nota:'Importado de PDF. Confirmar com o prescritor.'});
      else p.pend.push({n:t,s:'pedido',esp:val('s'+i+'_esp')||'Clínico geral',tipo:tipoOf(t)});
      c++;
    });
    res=c+' linhas salvas';
  }else res='registrado';
  p.docs.push({tipo:r.tipo,file:r.file,d:d,res:res,em:nowStr()});
  var upEl=document.getElementById('s'+i+'_up'),subir=upEl&&upEl.checked&&r.fileObj,perfil=S.cur;
  staged.splice(i,1);save();render();
  toast('Salvo: '+res+'.');
  if(subir){
    var k=dkey(d),iso=k.length===8?k.slice(0,4)+'-'+k.slice(4,6)+'-'+k.slice(6):'sem-data';
    G.uploadOriginal(perfil,r.fileObj,iso+' '+r.tipo+' - '+r.file).then(function(){toast('PDF guardado no Drive.')}).catch(function(e){alert('O PDF não foi guardado no Drive: '+e.message)});
  }
}


/* ---------- Google (Drive, Planilhas, Agenda) ---------- */
function sheetTabs(p){
  var num=function(x){return x===''||x==null||isNaN(x)?'':+x};
  return[
    {title:'Histórico de exames',rows:[['Data','Exame','Valor','Unidade','Referência','Situação']].concat(p.exames.slice().sort(function(a,b){return dkey(a.d)<dkey(b.d)?-1:1}).map(function(e){return[e.d,e.n,e.v,e.u,refTxt(e),flag(e)[0]]}))},
    {title:'Bioimpedância',rows:[['Data','Peso (kg)','Massa de gordura (kg)','Massa muscular (kg)','Gordura visceral','IMC','Gordura corporal (%)','Cintura-quadril','TMB (kcal)','Água corporal (L)']].concat(p.bio.map(function(b){return[b.d,num(b.peso),num(b.gord),num(b.musc),num(b.visc),num(b.imc),num(b.pgc),num(b.rcq),num(b.tmb),num(b.agua)]}))},
    {title:'Diário de sintomas',rows:[['Data','Sangue nas fezes','Fezes pretas','Tontura/desmaio','Dor (0-10)','Rigidez (0-10)','Fadiga (0-10)','Falta de ar (0-10)','Observações']].concat(p.diario.map(function(x){return[x.d,x.s,x.pre?'sim':'não',x.tont?'sim':'não',+x.dor,+x.rig,+x.fad,+x.res,x.obs||'']}))},
    {title:'Em uso',rows:[['Tipo','Nome','Dose / uso','Motivo','Finalidade','Pontos para revisar']].concat(p.meds.map(function(m){return[m.tipo||'Medicamento',m.n,m.dose||'',m.motivo||'',m.finalidade||'',m.nota&&m.nota!=='—'?m.nota:'']}))},
    {title:'Pendentes',rows:[['Especialidade','Tipo','Exame','Status']].concat(p.pend.map(function(x){return[x.esp||'',x.tipo||tipoOf(x.n),x.n,x.s]}))},
    {title:'Consultas',rows:[['Data','Especialidade','O que o médico disse, pediu ou orientou']].concat((p.consultas||[]).map(function(c){return[c.d,c.esp,c.nota]}))}
  ];
}
function gmsg(t){var e=document.getElementById('gmsg');if(e)e.textContent=t}
function vGoogle(){
  var p=P(),nm=p.nome.split(' ')[0];
  var h='<div class="card"><h2>☁ Conta Google</h2>';
  if(!window.G||!G.configured()){
    h+='<p class="mut" style="margin:0">O app ainda não está ligado ao Google. Falta colar o ID de cliente no arquivo <b>config.js</b>. O passo a passo está no <b>LEIA-ME.md</b>. Enquanto isso, tudo funciona, só os dados ficam neste aparelho.</p></div>';
    return h;
  }
  if(!G.connected()){
    h+='<p class="mut" style="margin:0 0 8px">Conecte para guardar PDFs e registros no Drive e criar eventos na agenda "Saúde". O app só enxerga o que ele mesmo cria.</p><button class="btn" onclick="gaConnect()">Conectar ao Google</button><p id="gmsg" class="mut"></p></div>';
    return h;
  }
  h+='<p style="margin:0 0 6px"><span class="tag t-ok">conectado</span> <span class="mut">a sessão dura cerca de 1 hora.</span></p><button class="btn sec sm" onclick="gaDisconnect()">Desconectar</button></div>';
  h+='<div class="card"><h2>Drive — '+esc(nm)+'</h2>'+
    '<p class="mut" style="margin:0 0 8px">Pasta: Saúde a Dois / '+esc(nm)+' / Registros, Documentos originais e Resumos de consulta.</p>'+
    '<button class="btn" onclick="gaSheets()">📊 Atualizar planilhas de registros</button>'+
    '<div class="row" style="margin-top:8px"><button class="btn sec" onclick="gaPush()">⬆️ Enviar dados ao Drive</button><button class="btn sec" onclick="gaPull()">⬇️ Trazer do Drive</button></div>'+
    '<p class="mut">Enviar/trazer sincroniza os dados do perfil entre seus aparelhos. Antes de substituir, o app pergunta.</p>'+
    '<p id="gmsg" class="mut"></p></div>';
  h+='<div class="card"><h2>Compartilhar a pasta de '+esc(nm)+'</h2>'+
    '<label>E-mail da pessoa</label><input id="gshare" type="email" placeholder="nome@gmail.com">'+
    '<label>Permissão</label><select id="grole"><option value="reader">Só ver (leitor)</option><option value="writer">Ver e editar (editor)</option></select>'+
    '<button class="btn" onclick="gaShare()">Compartilhar</button>'+
    '<p class="mut">A pessoa recebe um e-mail do Google. Compartilhe só a pasta do próprio dono dos dados.</p></div>';
  return h;
}
function gaConnect(){G.connect().then(function(){toast('Conectado ao Google.');render(true)}).catch(function(e){gmsg(e.message)})}
function gaDisconnect(){G.disconnect();render(true)}
function gaSheets(){
  gmsg('Atualizando planilhas…');
  G.syncSheets(S.cur,sheetTabs(P())).then(function(url){
    var e=document.getElementById('gmsg');if(e)e.innerHTML='Pronto. <a href="'+esc(url)+'" target="_blank" rel="noopener">Abrir planilha</a>';
    toast('Planilhas atualizadas.');
  }).catch(function(e){gmsg(e.message)});
}
function gaPush(){
  var p=P();gmsg('Enviando…');
  G.push(S.cur,p).then(function(){toast('Dados enviados ao Drive.');gmsg('Enviado em '+nowStr()+'.')}).catch(function(e){gmsg(e.message)});
}
function gaPull(){
  var perfil=S.cur;gmsg('Buscando…');
  G.pull(perfil).then(function(r){
    if(!r){gmsg('Ainda não há dados deste perfil no Drive.');return}
    var local=P().updatedAt||0,quando=new Date(r.modificadoEm).toLocaleString('pt-BR');
    var aviso=r.modificadoEm>local?'O Drive tem uma versão mais nova ('+quando+').':'A versão do Drive ('+quando+') é mais antiga que a deste aparelho.';
    if(!confirm(aviso+'\n\nSubstituir os dados deste aparelho pelos do Drive?'))return gmsg('Nada foi alterado.');
    S.profiles[perfil]=r.dados;S.profiles[perfil].updatedAt=Date.now();save();render(true);toast('Dados trazidos do Drive.');
  }).catch(function(e){gmsg(e.message)});
}
function gaShare(){
  var em=val('gshare');
  if(!/^\S+@\S+\.\S+$/.test(em)){gmsg('Digite um e-mail válido.');return}
  var papel=val('grole');
  if(!confirm('Compartilhar a pasta de '+P().nome.split(' ')[0]+' com '+em+' ('+(papel==='writer'?'pode editar':'só pode ver')+')?'))return;
  G.share(S.cur,em,papel).then(function(){toast('Pasta compartilhada.');gmsg('Compartilhada com '+em+'.')}).catch(function(e){gmsg(e.message)});
}

/* ---------- início ---------- */
(function(){Object.keys(S.profiles).forEach(function(k){var pr=S.profiles[k];(pr.meds||[]).forEach(function(m){if(!m.tipo)m.tipo='Medicamento';if(m.motivo==null)m.motivo='';if(m.finalidade==null)m.finalidade=''});pr.pend=(pr.pend||[]).filter(function(x){return x.s!=='feito'}).map(function(x){x.s=(x.s==='agendado'||x.s==='pedido')?'pedido':'a pedir';if(!x.esp)x.esp=guessEsp(x.n);if(!x.tipo)x.tipo=tipoOf(x.n);return x})})})();
document.querySelectorAll('#seg button').forEach(function(b){b.classList.toggle('on',b.dataset.p===S.cur)});
showLock();
render();
setTimeout(autoSync,1200);
if('serviceWorker' in navigator&&location.protocol.indexOf('http')===0)navigator.serviceWorker.register('sw.js').catch(function(){});
