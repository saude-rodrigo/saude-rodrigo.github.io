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
  var D={dias:[1,2,3,4,5],ini:'08:00',fim:'18:00',dur:60,qtd:14,cals:'',cal:[],calNomes:{},livre:true,nomes:false};
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
var tab='inicio';
document.getElementById('nav').addEventListener('click',function(e){
  var b=e.target.closest('button');if(!b)return;
  tab=b.dataset.t;if(tab==='saude')saudeSec=null;if(tab==='adicionar')addSec=null;
  render();
});
document.getElementById('seg').addEventListener('click',function(e){
  var b=e.target.closest('button');if(!b)return;
  S.cur=b.dataset.p;editUso=-1;save();
  [].forEach.call(this.children,function(x){x.classList.toggle('on',x===b)});
  render();
});
function pintaIcones(){
  [].forEach.call(document.querySelectorAll('[data-ic]'),function(e){e.innerHTML=IC[e.dataset.ic]});
  [].forEach.call(document.querySelectorAll('#seg .u'),function(e){e.innerHTML=IC.user});
  var m={bbell:'bell',bgear:'gear'};
  Object.keys(m).forEach(function(k){var e=document.getElementById(k);if(e)e.innerHTML=IC[m[k]]});
}
function render(keep){
  var v=document.getElementById('view');
  var fn={inicio:vInicio,saude:vSaude,arquivos:vArquivos,consultas:vConsultas,adicionar:vAdicionar,detalhe:vDetalhe,google:vGoogle,config:vConfig}[tab]||vInicio;
  var nv={detalhe:'saude',google:'arquivos',config:''}[tab]!==undefined?{detalhe:'saude',google:'arquivos',config:''}[tab]:tab;
  [].forEach.call(document.getElementById('nav').children,function(x){x.classList.toggle('on',x.dataset.t===nv)});
  v.innerHTML=fn();
  atualizaBadge();
  if(tab==='consultas'&&consSec==='proximas'&&window.autoDisp)autoDisp();
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
  var b=document.querySelector('#nav button[data-t=inicio]');if(!b)return;
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
/* ---- água ---- */
function AG(p){if(!p.agua)p.agua={};if(!p.aguaMeta)p.aguaMeta=2500;if(!p.aguaHoras)p.aguaHoras=['08:00','11:00','14:00','17:00','20:00'];return p}
function litros(ml){return(ml/1000).toFixed(1).replace('.',',')}
var editAgua=false;
function aguaHtml(p){
  AG(p);var hoje=isoHoje(),ml=p.agua[hoje]||0,meta=p.aguaMeta,pc=Math.min(100,Math.round(ml/meta*100));
  var h='<div class="card"><div class="hh"><h2>'+IC.drop+'Hidratação</h2><a href="#" class="ed" onclick="editAgua=!editAgua;render(true);return false">✎ Meta: '+litros(meta)+' L</a></div>'+
    '<div class="agua"><div class="copo"><i style="height:'+pc+'%"></i></div><div class="big">'+litros(ml)+' L <small>de '+litros(meta)+' L</small></div><span class="pct">'+pc+'%</span></div>'+
    '<div class="pbar"><i style="width:'+pc+'%"></i></div>'+
    '<div class="bw"><button onclick="addAgua(200)">+ 200 ml</button><button onclick="addAgua(300)">+ 300 ml</button><button onclick="addAgua(500)">+ 500 ml</button><button class="und" onclick="addAgua(-200)" aria-label="Desfazer 200 ml">↶</button></div>'+
    '<button class="lrow" onclick="editAgua=!editAgua;render(true)">'+IC.bell+'<b>Lembretes:</b><span>'+p.aguaHoras.map(esc).join(' · ')+'</span><em>›</em></button>';
  if(editAgua)h+='<label>Meta do dia (ml) — o ideal é o médico indicar</label><input id="ag_meta" type="number" inputmode="numeric" value="'+meta+'">'+
       '<label>Horários dos lembretes (separe com vírgula)</label><input id="ag_h" value="'+esc(p.aguaHoras.join(', '))+'"><button class="btn" onclick="saveAgua()">Salvar</button><p class="mut" style="margin:6px 0 0">O aviso aparece enquanto o app estiver aberto (ative em ⚙ Configurações).</p>';
  return h+'</div>';
}
function addAgua(ml){var p=AG(P()),k=isoHoje();p.agua[k]=Math.max(0,(p.agua[k]||0)+ml);save();render(true)}
function saveAgua(){
  var p=AG(P()),m=parseInt(val('ag_meta'),10),hs=val('ag_h').split(/[,;\s]+/).filter(function(x){return/^\d{1,2}:\d{2}$/.test(x)}).map(function(x){return(x.length===4?'0':'')+x}).sort();
  if(m>=500)p.aguaMeta=m;if(hs.length)p.aguaHoras=hs;editAgua=false;save();render(true);toast('Salvo.');
}
var avisadoAgua={};
function tickAgua(){
  if(!window.S||!S.profiles||document.getElementById('lockscr')&&!document.getElementById('lockscr').classList.contains('hide'))return;
  var p=AG(P()),d=new Date(),hm=pad(d.getHours())+':'+pad(d.getMinutes()),k=isoHoje()+hm;
  if(p.aguaHoras.indexOf(hm)<0||avisadoAgua[k])return;avisadoAgua[k]=1;
  var falta=Math.max(0,p.aguaMeta-(p.agua[isoHoje()]||0));if(!falta)return;
  var tx='💧 Hora de beber água · faltam '+falta+' ml';toast(tx);
  try{if('Notification' in window&&Notification.permission==='granted')new Notification('Saúde a Dois',{body:tx,icon:'icon-192.png',tag:'agua'})}catch(e){}
}
setInterval(tickAgua,20000);
/* ---- evolução ---- */
function pDia(s){var m=/(\d{2})\/(\d{2})\/(\d{4})/.exec(s||'');return m?m[3]+'-'+m[2]+'-'+m[1]:''}
function ultDias(n){var r=[],d=new Date();for(var i=n-1;i>=0;i--){var x=new Date(d.getFullYear(),d.getMonth(),d.getDate()-i);r.push({k:x.getFullYear()+'-'+pad(x.getMonth()+1)+'-'+pad(x.getDate()),w:DSEM[x.getDay()]})}return r}
function urTile(p){
  var hj=p.diario.filter(function(x){return pDia(x.d)===isoHoje()&&x.uri}),vez=0,ml=0,dif=null,cor='';
  hj.forEach(function(x){vez+=+x.uri.vez||0;ml+=+x.uri.ml||0;if(x.uri.dif!=='')dif=x.uri.dif;if(x.uri.cor)cor=x.uri.cor});
  var tx=!hj.length?'Sem registro hoje':'<b>'+vez+' vez(es) ao banheiro</b>'+(ml?ml+' ml no dia<br>':'')+(dif!==null?'dificuldade '+dif+'/10':'')+(cor?'<br>cor: '+esc(cor.toLowerCase()):'');
  return'<button class="tile" style="width:100%;margin-bottom:12px" onclick="goTab(\'diario\')"><span style="font-size:26px">🚽</span><span><b>Urina hoje</b>'+tx+'</span></button>';
}
function evolChart(p){
  var dias=ultDias(7),W=330,H=170,L=30,B=38,T=14,R=48;
  function med(k,c){var v=p.diario.filter(function(x){return pDia(x.d)===k&&x[c]!==''&&x[c]!=null}).map(function(x){return+x[c]});return v.length?v.reduce(function(a,b){return a+b},0)/v.length:null}
  function X(i){return L+i*(W-L-R)/6}function Y(v){return T+(H-T-B)*(1-v/10)}
  var g='',y0=Y(0);
  [0,5,10].forEach(function(v){g+='<line x1="'+L+'" x2="'+(W-R+14)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="#e3dcc8"/><text x="'+(L-8)+'" y="'+(Y(v)+4)+'" font-size="11" text-anchor="end" fill="#5f6f66">'+v+'</text>'});
  function serie(c,cor,fill){
    var vs=dias.map(function(d){return med(d.k,c)}),s='',run=[];
    function fim(){if(run.length>1){var pts=run.map(function(i){return X(i).toFixed(1)+','+Y(vs[i]).toFixed(1)}).join(' ');
      s+='<polygon points="'+X(run[0]).toFixed(1)+','+y0+' '+pts+' '+X(run[run.length-1]).toFixed(1)+','+y0+'" fill="'+fill+'"/><polyline fill="none" stroke="'+cor+'" stroke-width="2.5" points="'+pts+'"/>'}run=[]}
    vs.forEach(function(v,i){if(v==null)fim();else run.push(i)});fim();
    vs.forEach(function(v,i){if(v!=null)s+='<circle cx="'+X(i).toFixed(1)+'" cy="'+Y(v).toFixed(1)+'" r="4.5" fill="#fff" stroke="'+cor+'" stroke-width="2.5"/>'});
    var ul=-1;vs.forEach(function(v,i){if(v!=null)ul=i});
    if(ul>=0){var v=vs[ul],lab=(Math.round(v*10)/10)+'/10',yy=Y(v);s+='<rect x="'+(W-R+16)+'" y="'+(yy-11)+'" width="40" height="22" rx="11" fill="'+cor+'"/><text x="'+(W-R+36)+'" y="'+(yy+4)+'" font-size="11.5" font-weight="700" text-anchor="middle" fill="#fff">'+lab+'</text>'}
    return{s:s,vs:vs};
  }
  var sf=serie('fad','#d0a53a','rgba(208,165,58,.16)'),sd=serie('dor','#0f5a3e','rgba(15,90,62,.14)'),vazios=[];
  dias.forEach(function(d,i){var tem=sf.vs[i]!=null||sd.vs[i]!=null;if(!tem){vazios.push(i);g+='<circle cx="'+X(i)+'" cy="'+y0+'" r="4.5" fill="#fff" stroke="#aaa" stroke-width="1.5"/>'}
    g+='<text x="'+X(i)+'" y="'+(H-20)+'" font-size="11" text-anchor="middle" fill="#1d2b24">'+d.w+'</text><text x="'+X(i)+'" y="'+(H-6)+'" font-size="9.5" text-anchor="middle" fill="#5f6f66">'+d.k.slice(8)+'/'+d.k.slice(5,7)+'</text>'});
  var sem=vazios.length?'<rect x="'+(X(vazios[0])+(vazios.length>1?10:-24))+'" y="'+(Y(5)-12)+'" width="70" height="22" rx="11" fill="#eee7d3"/><text x="'+(X(vazios[0])+(vazios.length>1?45:11))+'" y="'+(Y(5)+3)+'" font-size="11" text-anchor="middle" fill="#5f6f66">Sem dados</text>':'';
  return'<div class="card"><div class="hh"><h2>'+IC.bars+'Minha evolução <small>· últimos 7 dias</small></h2><span class="lg"><i style="background:#0f5a3e"></i>Dor <i style="background:#d0a53a"></i>Fadiga</span></div>'+
    '<svg class="ev" viewBox="0 0 '+W+' '+H+'">'+g+sem+sf.s+sd.s+'</svg></div>';
}
function evolTiles(p){
  var dias=ultDias(7);
  var sv=p.diario.filter(function(x){return dias.some(function(d){return d.k===pDia(x.d)})&&x.sono}).map(function(x){return+x.sono}),
      sm=sv.length?sv.reduce(function(a,b){return a+b},0)/sv.length:null,
      sh=sm==null?'sem registro':Math.floor(sm)+'h '+pad(Math.round((sm%1)*60))+'min';
  var u=p.diario.length?p.diario[p.diario.length-1]:null,dg='Sem registro';
  if(u&&pDia(u.d)===isoHoje())dg=(u.pre||u.s!=='nenhum')?'Atenção hoje':'Sem alterações hoje';
  var lp=p.diario.filter(function(x){return x.psis}).pop(),pr=lp?'<div class="tag '+((+lp.psis<90||+lp.pdia<60)?'t-hi':'t-ok')+'" style="margin-bottom:12px">Pressão '+lp.psis+'×'+lp.pdia+' ('+lp.d.slice(0,5)+')</div>':'';
  return pr+'<div class="two" style="margin-bottom:12px"><button class="tile" onclick="goTab(\'diario\')">'+IC.bed+'<span><b>Sono</b>'+sh+'<br><span class="mut">média dos últimos 7 dias</span></span></button>'+
    '<button class="tile" onclick="goTab(\'diario\')">'+IC.stom+'<span><b>Sintomas digestivos</b>'+dg+'</span></button></div>'+
    urTile(p)+'<button class="tile" style="width:100%;margin-bottom:12px" onclick="goTab(\'historico\')">'+IC.hist+'<span><b>Histórico</b>Ver registros anteriores, sintomas e evolução</span></button>';
}
var MES=['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
function lembResumo(){
  var L=F().lembretes||[],pend=L.filter(function(x){return!x.feito});
  var h='<div class="card"><div class="hh"><h2>'+IC.bell+'Lembretes <span class="cnt" style="margin-left:6px">'+pend.length+'</span></h2></div>';
  if(!pend.length)h+='<div class="mut">Nenhum pendente.</div>';
  pend.slice(0,4).forEach(function(x){h+='<div class="lit"><i></i><span>'+esc(x.t)+(x.d?' <span class="mut">'+isoBr(x.d).slice(0,5)+'</span>':'')+'</span></div>'});
  return h+'<a class="lk" href="#" onclick="goTab(\'agenda\');return false">Ver todos ›</a></div>';
}
/* ---------- Exames ---------- */
function goTab(t){
  var m={resumo:['inicio'],diario:['adicionar','sint'],historico:['saude','sint'],exames:['saude','exames'],remedios:['saude','meds'],importar:['arquivos'],agenda:['consultas','proximas'],consulta:['consultas','preparar']}[t];
  if(m){t=m[0];if(t==='adicionar')addSec=m[1];else if(t==='saude')saudeSec=m[1];else if(t==='consultas')consSec=m[1]}
  tab=t;render();
}
function setPend(i,s){P().pend[i].s=s;save()}
var lastEsp='Clínico geral';
function espList(){var l=Object.keys(ESP);P().pend.forEach(function(x){if(x.esp&&l.indexOf(x.esp)<0)l.push(x.esp)});return l}
function askEsp(){var n=prompt('Nome da especialidade ou do médico:');return n?n.trim():''}
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
  var dd=fmtDate(val('ed'))||nowStr().slice(0,10);
  P().exames.push({n:n,v:v,u:val('eu'),min:isNaN(mn)?undefined:mn,max:isNaN(mx)?undefined:mx,d:dd});
  linkRel(P(),n);marcaFeito(P(),n,dd);save();toast('Resultado salvo.');goSaude('exames');
}
function val(id){var e=document.getElementById(id);return e?e.value.trim():''}
function agendarColeta(){
  var sel=[].slice.call(document.querySelectorAll('.pc')).filter(function(c){return c.checked}).map(function(c){return P().pend[+c.dataset.i].n});
  if(!sel.length){alert('Marque ao menos um exame com pedido médico.');return}
  addSec='consulta';tab='adicionar';
  render();
  document.getElementById('at').value='Coleta de exames';
  document.querySelector('#ap').closest('details').open=true;
  document.getElementById('ap').value='Exames: '+sel.join('; ')+'.\nJejum de 8 a 12 h, salvo orientação do laboratório. Levar pedido médico e documento.';
}

/* ---------- Diário ---------- */
var SINT=['Câibras','Dormência','Cólicas','Dor de cabeça','Dor de dente','Dor de ouvido','Formigamento','Tontura','Visão embaçada','Cabeça rodando'];
var GAT=['Estresse','Esforço','Mudança de tempo','Comeu diferente','Esqueceu remédio','Dormiu mal'];
var selSint={},selGat={},selUr={},selCor='',selQtd='';
var COR=['Clara','Amarelo claro','Amarelo escuro','Laranja/âmbar','Avermelhada','Marrom','Turva'],QTD=['Pouca','Normal','Muita'],URS=['Dor ao urinar','Ardência','Jato fraco','Esforço para começar','Sensação de não esvaziar','Acordou à noite para urinar','Não consegui urinar'];
function urinBox(){
  function ch(a,sel,fn){return'<div class="chips">'+a.map(function(s,i){return'<button type="button" class="chip'+(sel(s)?' on':'')+'" onclick="'+fn+'('+i+')">'+s+'</button>'}).join('')+'</div>'}
  return'<div class="sl"><label><span>Nível de dificuldade para urinar</span><b><span id="udifv">0</span>/10</b></label><input type="range" id="udif" min="0" max="10" value="0" oninput="document.getElementById(\'udifv\').textContent=this.value"></div>'+
   '<label>Cor da urina</label>'+ch(COR,function(s){return selCor===s},'setCor')+
   '<label>Quanto urinou</label>'+ch(QTD,function(s){return selQtd===s},'setQtd')+
   '<div class="two"><div><label>Total em ml (se medir)</label><input id="uml" type="number" inputmode="numeric" placeholder="opcional"></div><div><label>Vezes ao banheiro</label><input id="uvez" type="number" inputmode="numeric" placeholder="ex.: 6"></div></div>'+
   '<label>O que sentiu</label>'+ch(URS,function(s){return selUr[s]},'togUr')+
   '<label>Observações sobre a urina</label><textarea id="uobs" rows="2" placeholder="Ex.: cheiro forte, saiu devagar..."></textarea>';
}
function keepUr(){var v={dif:val('udif'),ml:val('uml'),vez:val('uvez'),obs:val('uobs')};document.getElementById('urbox').innerHTML=urinBox();['udif','uml','uvez','uobs'].forEach(function(k){var e=document.getElementById(k);if(e)e.value=v[k==='udif'?'dif':k==='uml'?'ml':k==='uvez'?'vez':'obs']});document.getElementById('udifv').textContent=v.dif||0}
function setCor(i){selCor=selCor===COR[i]?'':COR[i];keepUr()}
function setQtd(i){selQtd=selQtd===QTD[i]?'':QTD[i];keepUr()}
function togUr(i){var s=URS[i];if(selUr[s])delete selUr[s];else selUr[s]=1;keepUr()}
var MESES=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'],DSEMLONG=['Dom.','Seg.','Ter.','Qua.','Qui.','Sex.','Sáb.'];
function sintBox(){
  var h='<div class="chips">'+SINT.map(function(s,i){return'<button type="button" class="chip'+(selSint[s]!=null?' on':'')+'" onclick="togSint('+i+')">'+s+'</button>'}).join('')+'</div>';
  Object.keys(selSint).forEach(function(s){var i=SINT.indexOf(s);h+='<div class="sint"><span>'+s+'</span><input type="range" min="0" max="10" value="'+selSint[s]+'" oninput="selSint[SINT['+i+']]=+this.value;this.nextSibling.textContent=this.value"><b>'+selSint[s]+'</b></div>'});
  return h;
}
function togSint(i){var s=SINT[i];if(selSint[s]!=null)delete selSint[s];else selSint[s]=5;document.getElementById('sintbox').innerHTML=sintBox()}
function togGat(i){var s=GAT[i];if(selGat[s])delete selGat[s];else selGat[s]=1;document.getElementById('gatbox').innerHTML=gatBox()}
function gatBox(){return'<div class="chips">'+GAT.map(function(s,i){return'<button type="button" class="chip'+(selGat[s]?' on':'')+'" onclick="togGat('+i+')">'+s+'</button>'}).join('')+'</div>'}
function sl(id,t){return'<div class="sl"><label><span>'+t+'</span><b><span id="'+id+'v">0</span>/10</b></label><input type="range" id="'+id+'" min="0" max="10" value="0" oninput="document.getElementById(\''+id+'v\').textContent=this.value"></div>'}
function addDia(){
  var x={d:nowStr(),s:val('ds'),pre:document.getElementById('dpre').checked,tont:document.getElementById('dtont').checked,
    dor:val('dor'),rig:val('rig'),fad:val('fad'),res:val('res'),obs:val('dobs'),
    sint:JSON.parse(JSON.stringify(selSint)),onde:val('donde'),psis:val('psis'),pdia:val('pdia'),sono:val('sono'),gat:Object.keys(selGat),
    uri:{dif:val('udif'),cor:selCor,qtd:selQtd,ml:val('uml'),vez:val('uvez'),sint:Object.keys(selUr),obs:val('uobs')}};
  P().diario.push(x);save();
  var grave=x.pre||x.tont||x.s==='muito'||+x.res>=7;
  var baixa=(+x.psis&&+x.psis<90)||(+x.pdia&&+x.pdia<60);
  var tv=x.sint['Tontura']!=null&&x.sint['Visão embaçada']!=null;
  var uAlerta=x.uri.cor==='Avermelhada'||x.uri.sint.indexOf('Não consegui urinar')>=0||+x.uri.dif>=8;
  selSint={};selGat={};selUr={};selCor='';selQtd='';
  saudeSec='sint';tab='saude';render();
  if(uAlerta)alert('Atenção na urina: urina avermelhada, não conseguir urinar ou dificuldade muito forte precisam de avaliação médica. Se não urinar por várias horas, tiver dor forte ou febre, procure atendimento hoje.');
  else
  if(grave)alert('Atenção: esses sinais podem exigir avaliação urgente. Procure um pronto atendimento.');
  else if(baixa||tv)alert('Pressão baixa ou tontura com visão embaçada: sente ou deite um pouco, beba água e avise o médico. Se piorar ou desmaiar, procure atendimento.');
  else toast('Registro salvo.');
  if(window.G&&G.connected())G.syncSheets(S.cur,sheetTabs(P())).then(function(){toast('Registro salvo e enviado ao Drive.')}).catch(function(){});
}



/* ---------- configurações ---------- */
var APP_VER='v17 · 19/11/2026';
function vConfig(){
  var conn=window.G&&G.configured()&&G.connected();
  var h='<div class="card"><h2>⚙ Configurações</h2><p class="mut" style="margin:0">Versão do app: <b>'+APP_VER+'</b></p>'+
  '<button class="btn sec" style="margin-top:8px" onclick="atualizaApp()">🔄 Atualizar o app agora</button>'+
  '<p class="mut">Use se uma novidade não aparecer. Seus dados não são apagados.</p></div>';
  h+='<div class="card"><h2>☁ Conta Google</h2>'+
  '<p class="mut" style="margin:0 0 8px">'+(!window.G||!G.configured()?'App ainda não ligado ao Google.':conn?'Conectado (a sessão dura cerca de 1 hora).':'Não conectado.')+'</p>'+
  (conn?'<button class="btn sec sm" onclick="gaDisconnect();render(true)">Desconectar</button> ':(window.G&&G.configured()?'<button class="btn" onclick="gaConnect()">Conectar ao Google</button> ':''))+
  '<button class="btn sec sm" onclick="goTab(\'google\')">Drive e sincronização</button><p id="gmsg" class="mut"></p></div>';
  h+='<div class="card"><h2>🕒 Agenda e horários livres</h2>'+dispConfigHtml()+
  '<p class="mut">As alterações são salvas na hora. Para ver os horários, vá em Agenda.</p></div>';
  h+='<div class="card"><h2>🔔 Avisos</h2>'+avisoBtnHtml()+
  '<p class="mut">Avisos de remédio acabando e lembretes aparecem neste aparelho quando você abre o app.</p></div>';
  h+='<div class="card"><h2>🔒 Segurança</h2><div class="row"><button class="btn sec" onclick="trocaPin()">Trocar PIN</button><button class="btn sec" onclick="lockNow()">Bloquear agora</button></div></div>';
  h+='<div class="card"><h2>💾 Backup</h2><div class="row"><button class="btn sec" onclick="exportBackup()">⬇️ Salvar backup</button>'+
  '<label class="btn sec" style="margin:8px 0 0;text-align:center">⬆️ Restaurar<input type="file" accept="application/json,.json" hidden onchange="importBackup(this.files[0])"></label></div>'+
  '<p class="mut">O backup contém dados de saúde: guarde em local seguro.</p></div>';
  return h;
}
function trocaPin(){
  var a=prompt('Digite o PIN atual');if(a===null)return;
  if(a!==S.pin){alert('PIN incorreto.');return}
  var n=prompt('Novo PIN (4 a 6 números)');if(n===null)return;
  if(!/^\d{4,6}$/.test(n)){alert('Use de 4 a 6 números.');return}
  S.pin=n;save();toast('PIN alterado.');
}
function atualizaApp(){
  var fim=function(){location.reload()};
  var t1=navigator.serviceWorker?navigator.serviceWorker.getRegistrations().then(function(rs){return Promise.all(rs.map(function(r){return r.unregister()}))}):Promise.resolve();
  t1.then(function(){return window.caches?caches.keys().then(function(ks){return Promise.all(ks.map(function(k){return caches.delete(k)}))}):0}).then(fim,fim);
}

/* ---------- horários livres (lê a agenda do Google: só livre/ocupado) ---------- */
var dispRes=null,dispBusy=[],dispMsg='',dispAt=0,dispInfo='';
var DSEM=['dom','seg','ter','qua','qui','sex','sáb'];
function hm2min(s){var p=String(s||'0:0').split(':');return(parseInt(p[0],10)||0)*60+(parseInt(p[1],10)||0)}
function dtLocal(iso,min){var p=iso.split('-');return new Date(+p[0],+p[1]-1,+p[2],Math.floor(min/60),min%60,0)}
function hhmm(d){return pad(d.getHours())+':'+pad(d.getMinutes())}
function saveDisp(){
  if(!document.getElementById('dp_ini'))return;
  var d=S.disp,g=function(i){var e=document.getElementById(i);return e?e.value.trim():''};
  var dias=[];for(var i=0;i<7;i++){var c=document.getElementById('dp_d'+i);if(c&&c.checked)dias.push(i)}
  d.dias=dias;d.ini=g('dp_ini')||'08:00';d.fim=g('dp_fim')||'18:00';
  d.dur=Math.max(15,parseInt(g('dp_dur'),10)||60);d.qtd=Math.min(60,Math.max(1,parseInt(g('dp_qtd'),10)||14));
  var cs=document.querySelectorAll('.dp_c');
  if(cs.length)d.cal=[].filter.call(cs,function(c){return c.checked}).map(function(c){return c.value});
  var lv=document.getElementById('dp_livre'),nm=document.getElementById('dp_nomes');
  if(lv)d.livre=lv.checked;if(nm)d.nomes=nm.checked;
  persist();
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
function calcDisp(silent){
  silent=silent===true;
  saveDisp();
  if(!window.G||!G.connected()){if(!silent)alert('Toque em ☁ e conecte ao Google primeiro.');return}
  var d=S.disp;
  if(!d.dias.length){alert('Marque ao menos um dia da semana.');return}
  var ini=new Date();ini.setHours(0,0,0,0);
  var fim=new Date(ini.getTime()+d.qtd*86400000);
  var ids=(d.cal&&d.cal.length)?d.cal.slice():['primary'];
  String(d.cals||'').split(/[,;\s]+/).forEach(function(c){if(c&&ids.indexOf(c)<0)ids.push(c)});
  if(!silent){dispMsg='Lendo a agenda…';dispRes=null;refreshDisp()}
  dispAt=Date.now();
  G.listBusy(ids,ini.toISOString(),fim.toISOString(),{livre:d.livre,titulos:d.nomes}).then(function(r){
    dispBusy=r.busy.map(function(x){return{s:new Date(x.s).getTime(),e:new Date(x.e).getTime(),t:x.t||''}});
    dispInfo='Li '+r.agendas+(r.agendas===1?' agenda':' agendas')+' e '+r.total+(r.total===1?' compromisso':' compromissos')+' nos próximos '+d.qtd+' dias.';
    var dias=[];
    for(var i=0;i<d.qtd;i++){
      var dt=new Date(ini.getTime()+i*86400000+43200000);
      var iso=dt.getFullYear()+'-'+pad(dt.getMonth()+1)+'-'+pad(dt.getDate());
      if(d.dias.indexOf(dt.getDay())<0)continue;
      var bl=blocosDia(iso,dispBusy,d);
      var d0=dtLocal(iso,0).getTime(),d1=dtLocal(iso,1440).getTime();
      var oc=dispBusy.filter(function(x){return x.e>d0&&x.s<d1}).sort(function(x,y){return x.s-y.s});
      dias.push({iso:iso,sem:DSEM[dt.getDay()],blocos:bl,oc:oc});
    }
    dispRes=dias;
    dispMsg=r.erros.length?'Não consegui ler: '+r.erros.join(', ')+'. Confira se essa agenda foi compartilhada com a conta conectada.':'';
    refreshDisp();
  }).catch(function(e){dispMsg='Erro: '+e.message;if(!silent)dispRes=null;dispAt=0;refreshDisp()});
}
function dispBusyZero(){return dispAt&&!dispBusy.length}
function autoDisp(){
  if(tab!=='agenda'||document.hidden||!window.G||!G.connected())return;
  if(Date.now()-dispAt<120000)return;
  calcDisp(true);
}
setInterval(function(){autoDisp()},180000);
document.addEventListener('visibilitychange',function(){if(!document.hidden)autoDisp()});
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

function dispConfigHtml(){
  var d=S.disp;
  return''+
'<label>Dias que posso marcar</label><div>'+DSEM.map(function(n,i){return'<label style="display:inline-block;margin-right:10px"><input type="checkbox" id="dp_d'+i+'" style="width:auto" '+(d.dias.indexOf(i)>-1?'checked':'')+' onchange="saveDisp()"> '+n+'</label>'}).join('')+'</div>'+
  '<div class="row"><div><label>Das</label><input id="dp_ini" type="time" value="'+d.ini+'" onchange="saveDisp()"></div><div><label>Até</label><input id="dp_fim" type="time" value="'+d.fim+'" onchange="saveDisp()"></div></div>'+
  '<div class="row"><div><label>Duração mínima (min)</label><input id="dp_dur" type="number" min="15" step="15" value="'+d.dur+'" onchange="saveDisp()"></div><div><label>Olhar quantos dias</label><input id="dp_qtd" type="number" min="1" max="60" value="'+d.qtd+'" onchange="saveDisp()"></div></div>'+
  '<label>Agendas que contam como ocupadas</label><div id="dp_callist">'+calListHtml()+'</div>'+
  '<button class="btn sec sm" style="margin:6px 0" onclick="carregaAgendas()">🔄 Carregar minhas agendas do Google</button>'+
  '<label style="display:block;margin-top:6px"><input type="checkbox" id="dp_livre" style="width:auto" '+(d.livre?'checked':'')+' onchange="saveDisp()"> Contar também compromissos marcados como "Disponível"</label>'+
  '<label style="display:block"><input type="checkbox" id="dp_nomes" style="width:auto" '+(d.nomes?'checked':'')+' onchange="saveDisp()"> Mostrar o nome dos compromissos na lista (só neste aparelho)</label>';
}
function calListHtml(){
  var d=S.disp,ids=Object.keys(d.calNomes||{});
  if(!ids.length)return'<p class="mut">Toque em "Carregar minhas agendas" e marque as que têm seus atendimentos. Sem escolher, o app usa só a agenda principal.</p>';
  return ids.map(function(id){return'<label style="display:block"><input type="checkbox" class="dp_c" style="width:auto" value="'+esc(id)+'" '+(d.cal.indexOf(id)>-1?'checked':'')+' onchange="saveDisp()"> '+esc(d.calNomes[id])+'</label>'}).join('');
}
function carregaAgendas(){
  if(!window.G||!G.connected()){alert('Conecte ao Google primeiro (☁).');return}
  G.listCalendars().then(function(l){
    var d=S.disp;d.calNomes={};l.forEach(function(c){d.calNomes[c.id]=c.nome+(c.primary?' (principal)':'')});
    if(!d.cal.length)d.cal=l.filter(function(c){return c.selected&&!/holiday|contacts|weeknum|#/.test(c.id)||c.primary}).map(function(c){return c.id});
    persist();render(true);toast('Agendas carregadas. Marque as que valem.');
  }).catch(function(e){alert(e.message+'\n\nSe falar de permissão, toque em ☁ → Desconectar → Conectar de novo e aceite tudo.')});
}
function dispHtml(){return'<div class="card" id="dispbox">'+dispInner()+'</div>'}
function refreshDisp(){var e=document.getElementById('dispbox');if(e)e.innerHTML=dispInner()}
function dispInner(){
  var d=S.disp;
  var h='<h2>🕒 Meus horários livres</h2>'+
  '<p class="mut">Lê só o "livre/ocupado" da sua agenda do Google (sem títulos nem nomes) e mostra os horários vagos para marcar médicos e exames.</p>'+
  '<p class="mut" style="margin:0 0 6px">Dias e horário de trabalho: <b>'+d.dias.map(function(i){return DSEM[i]}).join(', ')+'</b>, das '+d.ini+' às '+d.fim+', mínimo de '+d.dur+' min. <a href="#" onclick="goTab(\'config\');return false">Ajustar em ⚙ Configurações</a></p>'+
  (window.G&&G.connected()?'<button class="btn" style="width:100%;margin:8px 0" onclick="calcDisp()">Ver meus horários livres</button>':'<div class="empty">Conecte ao Google (☁) para ver seus horários.</div>');
  if(dispMsg)h+='<p class="mut">'+esc(dispMsg)+'</p>';
  if(dispInfo&&dispRes)h+='<p class="mut">'+esc(dispInfo)+(dispBusyZero()?' <b>Nenhum compromisso encontrado: confira em ⚙ Configurações quais agendas contam.</b>':'')+'</p>';
  if(dispRes){
    if(!dispRes.length)h+='<div class="empty">Nenhum dia nos dias marcados.</div>';
    dispRes.forEach(function(x){
      h+='<div style="padding:6px 0;border-bottom:1px solid var(--line)"><b>'+x.sem+' '+fmtDate(x.iso).slice(0,5)+'</b> ';
      if(x.oc&&x.oc.length)h+='<div class="mut" style="margin:2px 0">Ocupado: '+x.oc.map(function(o){return hhmm(new Date(Math.max(o.s,dtLocal(x.iso,0).getTime())))+'–'+hhmm(new Date(o.e))+(o.t?' ('+esc(o.t)+')':'')}).join(' · ')+'</div>';
      if(!x.blocos.length)h+='<span class="mut">sem horário livre</span>';
      x.blocos.forEach(function(b){
        var s=new Date(b[0]),e=new Date(b[1]);
        h+='<button class="btn sm sec" style="margin:2px 4px 2px 0" onclick="usaHorario(\''+x.iso+'\','+(s.getHours()*60+s.getMinutes())+')">'+hhmm(s)+'–'+hhmm(e)+'</button>';
      });
      h+='</div>';
    });
    h+='<p class="mut">Toque num horário para colocá-lo no "Novo compromisso" logo abaixo.</p>';
  }
  if(dispAt)h+='<p class="mut">Atualizado às '+hhmm(new Date(dispAt))+'. Atualiza sozinho ao abrir esta aba e a cada poucos minutos.</p>';
  return h;
}

/* ---------- Agenda ---------- */
function vAgenda(){
  var p=P();
  var h=lembHtml()+dispHtml()+'<div class="card"><h2>Novo compromisso</h2>'+
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
  if(!confirm('Cancelar esta consulta?'))return;P().agenda.splice(i,1);save();render();
}
function addAg(kind){
  var a={t:val('at'),d:val('ad'),h:val('ah')||'08:00',l:val('al'),p:val('ap')};
  if(!a.t||!a.d){alert('Preencha título e data.');return}
  if(kind==='c'){
    if(!confirm(conflito(a.d,a.h)+'Criar na agenda'+agendaNome(true)+'?\n\n'+a.t+'\n'+fmtDate(a.d)+' às '+a.h+(a.l?'\n'+a.l:'')+'\nAlertas: 1 dia e 1 hora antes.'))return;
    G.createEvent(a,S.cur).then(function(id){a.gid=id;P().agenda.push(a);save();goCons('proximas');toast('Criado na agenda Saúde.')})
      .catch(function(e){alert(e.message)});
    return;
  }
  P().agenda.push(a);save();
  if(kind==='s'){goCons('proximas');toast('Consulta salva.');return}
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
  goCons('proximas');
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
/* ---------- Em uso: remédios, vitaminas, suplementos ---------- */
var TIPOS_USO=['Medicamento','Vitamina','Suplemento','Chá / fitoterápico','Outro'];
var editUso=-1;
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
    rows=[['Data','Sangue nas fezes','Fezes pretas','Tontura/desmaio','Dor (0-10)','Rigidez (0-10)','Fadiga (0-10)','Falta de ar (0-10)','Observações','Sintomas','Onde dói','Pressão','Sono (h)','Gatilhos','Urina: dificuldade (0-10)','Urina: cor','Urina: quantidade','Urina (ml)','Vezes ao banheiro','Urina: sintomas','Urina: obs']].concat(p.diario.map(function(x){return[x.d,x.s,x.pre?'sim':'não',x.tont?'sim':'não',x.dor,x.rig,x.fad,x.res,x.obs,x.sint?Object.keys(x.sint).map(function(k){return k+' '+x.sint[k]}).join('; '):'',x.onde||'',x.psis?x.psis+'x'+x.pdia:'',x.sono||'',(x.gat||[]).join('; '),x.uri?x.uri.dif:'',x.uri?x.uri.cor:'',x.uri?x.uri.qtd:'',x.uri?x.uri.ml:'',x.uri?x.uri.vez:'',x.uri?x.uri.sint.join('; '):'',x.uri?x.uri.obs:'']}));
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
function setSt(t){var e=document.getElementById('impst');if(e)e.textContent=t}
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
function discard(i){staged.splice(i,1);document.getElementById('staging').innerHTML=renderStaged()}
function dkey(s){var m=/(\d{2})\/(\d{2})\/(\d{4})/.exec(s||'');return m?m[3]+m[2]+m[1]:'0'}
/* ---------- Google (Drive, Planilhas, Agenda) ---------- */
function sheetTabs(p){
  var num=function(x){return x===''||x==null||isNaN(x)?'':+x};
  return[
    {title:'Histórico de exames',rows:[['Data','Exame','Valor','Unidade','Referência','Situação']].concat(p.exames.slice().sort(function(a,b){return dkey(a.d)<dkey(b.d)?-1:1}).map(function(e){return[e.d,e.n,e.v,e.u,refTxt(e),flag(e)[0]]}))},
    {title:'Bioimpedância',rows:[['Data','Peso (kg)','Massa de gordura (kg)','Massa muscular (kg)','Gordura visceral','IMC','Gordura corporal (%)','Cintura-quadril','TMB (kcal)','Água corporal (L)']].concat(p.bio.map(function(b){return[b.d,num(b.peso),num(b.gord),num(b.musc),num(b.visc),num(b.imc),num(b.pgc),num(b.rcq),num(b.tmb),num(b.agua)]}))},
    {title:'Diário de sintomas',rows:[['Data','Sangue nas fezes','Fezes pretas','Tontura/desmaio','Dor (0-10)','Rigidez (0-10)','Fadiga (0-10)','Falta de ar (0-10)','Observações','Sintomas','Onde dói','Pressão','Sono (h)','Gatilhos','Urina: dificuldade (0-10)','Urina: cor','Urina: quantidade','Urina (ml)','Vezes ao banheiro','Urina: sintomas','Urina: obs']].concat(p.diario.map(function(x){return[x.d,x.s,x.pre?'sim':'não',x.tont?'sim':'não',+x.dor,+x.rig,+x.fad,+x.res,x.obs||'',x.sint?Object.keys(x.sint).map(function(k){return k+' '+x.sint[k]}).join('; '):'',x.onde||'',x.psis?x.psis+'x'+x.pdia:'',x.sono||'',(x.gat||[]).join('; '),x.uri?x.uri.dif:'',x.uri?x.uri.cor:'',x.uri?x.uri.qtd:'',x.uri?x.uri.ml:'',x.uri?x.uri.vez:'',x.uri?x.uri.sint.join('; '):'',x.uri?x.uri.obs:'']}))},
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
setTimeout(autoSync,1200);
if('serviceWorker' in navigator&&location.protocol.indexOf('http')===0){
  var jaTinha=!!navigator.serviceWorker.controller,recarregou=false;
  navigator.serviceWorker.addEventListener('controllerchange',function(){if(jaTinha&&!recarregou){recarregou=true;toast('Versão nova instalada. Reabrindo…');setTimeout(function(){location.reload()},900)}});
  navigator.serviceWorker.register('sw.js').catch(function(){});
}


/* ================= Histórico e detalhes ================= */
var hMes=null,hDia=isoHoje(),hFiltro='todos',detI=-1,compOn=false;
function regCrise(x){var u=x.uri||{sint:[]};return!!(x.pre||x.tont||x.s==='muito'||+x.res>=7||+x.dor>=8||u.cor==='Avermelhada'||(u.sint||[]).indexOf('Não consegui urinar')>=0||+u.dif>=8||(+x.psis&&+x.psis<90)||(+x.pdia&&+x.pdia<60))}
function regSint(x){return!!((x.sint&&Object.keys(x.sint).length)||(x.uri&&x.uri.sint&&x.uri.sint.length))}
function nivelTx(n){n=+n||0;return n<=3?['Leve','t-ok']:n<=6?['Moderada','t-lim']:['Intensa','t-hi']}
function regsDoDia(p,dia,f){
  var r=[];p.diario.forEach(function(x,i){if(pDia(x.d)!==dia)return;if(f==='crises'&&!regCrise(x))return;if(f==='sintomas'&&!regSint(x))return;r.push(i)});
  return r.sort(function(a,b){return p.diario[b].d.slice(11).localeCompare(p.diario[a].d.slice(11))});
}
function vHistorico(){
  var p=P(),n=new Date();if(!hMes)hMes={a:n.getFullYear(),m:n.getMonth()};
  var h='<div class="card"><div class="hh" style="margin:0"><h2>'+IC.hist+'<span>Histórico de saúde<br><small style="font-weight:500">Veja seus registros e acompanhe sua evolução</small></span></h2></div>'+
    '<button class="btn" style="width:100%" onclick="goTab(\'diario\')">＋ Novo registro</button></div>';
  var com={};p.diario.forEach(function(x){if(hFiltro==='crises'&&!regCrise(x))return;if(hFiltro==='sintomas'&&!regSint(x))return;com[pDia(x.d)]=1});
  var prim=new Date(hMes.a,hMes.m,1),off=(prim.getDay()+6)%7,dm=new Date(hMes.a,hMes.m+1,0).getDate(),dprev=new Date(hMes.a,hMes.m,0).getDate();
  h+='<div class="card"><div class="cal-h"><button onclick="histMes(-1)" aria-label="Mês anterior">'+IC.back+'</button><b>'+MESES[hMes.m].charAt(0).toUpperCase()+MESES[hMes.m].slice(1)+' de '+hMes.a+'</b><button onclick="histMes(1)" aria-label="Próximo mês" style="transform:scaleX(-1)">'+IC.back+'</button></div><div class="cal">';
  ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'].forEach(function(d){h+='<span class="w">'+d+'</span>'});
  var tot=Math.ceil((off+dm)/7)*7;
  for(var i=0;i<tot;i++){
    var dnum=i-off+1;
    if(dnum<1)h+='<span class="o">'+(dprev+dnum)+'</span>';
    else if(dnum>dm)h+='<span class="o">'+(dnum-dm)+'</span>';
    else{var iso=hMes.a+'-'+pad(hMes.m+1)+'-'+pad(dnum);h+='<button class="d'+(iso===hDia?' sel':'')+(iso===isoHoje()?' hoje':'')+(com[iso]?' tem':'')+'" onclick="histDia(\''+iso+'\')">'+dnum+'</button>'}
  }
  h+='</div><div class="fil">'+[['todos','Todos',IC.bars],['crises','Crises',IC.warn],['sintomas','Sintomas',IC.heart]].map(function(f){return'<button class="'+(hFiltro===f[0]?'on':'')+'" onclick="histFil(\''+f[0]+'\')">'+f[2]+f[1]+'</button>'}).join('')+'</div></div>';
  var dd=hDia.split('-');h+='<h3 class="dtit">'+(+dd[2])+' de '+MESES[+dd[1]-1]+' de '+dd[0]+'</h3>';
  var rs=regsDoDia(p,hDia,hFiltro);
  if(!rs.length)h+='<div class="card empty">Nenhum registro neste dia'+(hFiltro!=='todos'?' para este filtro':'')+'.</div>';
  rs.forEach(function(i){var x=p.diario[i],hr=+x.d.slice(11,13),dia=hr>=6&&hr<18;
    h+='<div class="rg"><span class="ic '+(dia?'sol':'lua')+'">'+(dia?IC.sun:IC.moon)+'</span><b>'+x.d.slice(11)+'</b><div class="m"><span>'+IC.bolt+'Dor</span><b>'+(x.dor||0)+'/10</b></div><div class="m"><span>'+IC.batt+'Fadiga</span><b>'+(x.fad||0)+'/10</b></div>'+(regCrise(x)?'<span class="tag t-hi">atenção</span>':'')+'<button class="btn nv" onclick="verDet('+i+')">Ver detalhes ›</button></div>';
  });
  h+='<div class="card"><h2>☁ Registros no Drive</h2><p class="mut" style="margin:0 0 6px">Cada registro novo é enviado para a planilha de '+esc(p.nome.split(' ')[0])+' na pasta <b>Saúde a Dois › '+esc(p.nome.split(' ')[0])+' › Registros</b>. Os relatórios em Doc ficam em <b>Relatórios</b>.</p>'+
     (window.G&&G.connected()?'<button class="btn sec" onclick="gaSheets()">Enviar planilha agora</button><p id="gmsg" class="mut"></p>':'<p class="mut" style="margin:0">Conecte o Google em ⚙ Configurações para enviar ao Drive.</p>')+'</div>';
  return h;
}
function histMes(d){var m=hMes.m+d,a=hMes.a;if(m<0){m=11;a--}if(m>11){m=0;a++}hMes={a:a,m:m};render(true)}
function histDia(iso){hDia=iso;render(true)}
function histFil(f){hFiltro=f;render(true)}
function verDet(i){detI=i;compOn=false;goTab('detalhe')}
function chipsTx(a){return a.length?'<div class="chips">'+a.map(function(s){return'<span class="chip">'+esc(s)+'</span>'}).join('')+'</div>':''}
function regHtml(x,p){
  var u=x.uri||{sint:[]},sn=x.sint?Object.keys(x.sint).map(function(k){return k+' '+x.sint[k]+'/10'}):[],L=[];
  L.push('<h2>Registro de saúde — '+esc(p.nome)+'</h2><p><b>'+esc(x.d)+'</b></p>');
  L.push('<h3>Como estava</h3><ul><li>Dor muscular: '+(x.dor||0)+'/10</li><li>Rigidez: '+(x.rig||0)+'/10</li><li>Fadiga: '+(x.fad||0)+'/10</li><li>Falta de ar: '+(x.res||0)+'/10</li></ul>');
  if(sn.length)L.push('<h3>Sintomas associados</h3><ul>'+sn.map(function(s){return'<li>'+esc(s)+'</li>'}).join('')+'</ul>');
  if(x.onde)L.push('<p><b>Onde dói:</b> '+esc(x.onde)+'</p>');
  var ur=[];if(u.dif!==''&&u.dif!=null)ur.push('Dificuldade para urinar: '+u.dif+'/10');if(u.cor)ur.push('Cor: '+esc(u.cor));if(u.qtd)ur.push('Quantidade: '+esc(u.qtd));if(u.ml)ur.push('Total: '+u.ml+' ml');if(u.vez)ur.push('Vezes ao banheiro: '+u.vez);(u.sint||[]).forEach(function(s){ur.push(esc(s))});if(u.obs)ur.push('Obs.: '+esc(u.obs));
  if(ur.length)L.push('<h3>Urina</h3><ul>'+ur.map(function(s){return'<li>'+s+'</li>'}).join('')+'</ul>');
  var ou=[];if(x.psis)ou.push('Pressão: '+x.psis+'×'+x.pdia);if(x.sono)ou.push('Sono: '+x.sono+' h');if(x.s&&x.s!=='nenhum')ou.push('Sangue nas fezes: '+esc(x.s));if(x.pre)ou.push('Fezes pretas');if(x.tont)ou.push('Tontura forte ou desmaio');
  if(ou.length)L.push('<h3>Outros dados</h3><ul>'+ou.map(function(s){return'<li>'+s+'</li>'}).join('')+'</ul>');
  if(x.gat&&x.gat.length)L.push('<h3>Possíveis gatilhos</h3><p>'+esc(x.gat.join(', '))+'</p>');
  if(x.obs)L.push('<h3>Observações</h3><p>'+esc(x.obs)+'</p>');
  L.push('<p><i>Registro feito no app Saúde a Dois. Não substitui avaliação médica.</i></p>');
  return L.join('');
}
function vDetalhe(){
  var p=P(),x=p.diario[detI];
  if(!x)return'<div class="card empty">Registro não encontrado.<br><button class="btn" onclick="goTab(\'historico\')">Voltar ao histórico</button></div>';
  var u=x.uri||{sint:[]},nd=nivelTx(x.dor),nf=nivelTx(x.fad);
  var h='<div class="dt"><button class="lock" style="color:var(--g)" onclick="goTab(\'historico\')" aria-label="Voltar">'+IC.back+'</button><h2>Detalhes do registro</h2></div>'+
    '<div class="card" style="padding:10px 14px"><b>'+IC.cal.replace('<svg','<svg style="width:20px;height:20px;vertical-align:-4px;margin-right:8px"')+esc(x.d.replace(' ',' • '))+'</b></div>'+
    '<div class="g2"><div class="card big2">'+IC.bolt+'<div><span>Dor</span><b>'+(x.dor||0)+' / 10</b></div><span class="tag '+nd[1]+'">'+nd[0]+'</span></div>'+
    '<div class="card big2">'+IC.batt+'<div><span>Fadiga</span><b>'+(x.fad||0)+' / 10</b></div><span class="tag '+nf[1]+'">'+nf[0]+'</span></div></div>'+
    '<div class="card"><div class="mut">Rigidez <b>'+(x.rig||0)+'/10</b> · Falta de ar <b>'+(x.res||0)+'/10</b>'+(x.psis?' · Pressão <b>'+x.psis+'×'+x.pdia+'</b>':'')+(x.sono?' · Sono <b>'+x.sono+' h</b>':'')+'</div></div>';
  var sn=x.sint?Object.keys(x.sint).map(function(k){return k+' '+x.sint[k]}):[];
  if(sn.length)h+='<div class="card"><h2>'+IC.heart+'Sintomas associados</h2>'+chipsTx(sn)+(x.onde?'<p class="mut" style="margin:8px 0 0">Onde dói: '+esc(x.onde)+'</p>':'')+'</div>';
  var temUr=u.dif||u.cor||u.qtd||u.ml||u.vez||(u.sint||[]).length||u.obs;
  if(temUr){
    var nu=nivelTx(u.dif);
    h+='<div class="card"><h2>'+IC.drop+'Sintomas urinários</h2>'+
      '<div class="aviso '+(+u.dif>=7?'ruim':'')+'">'+IC.warn+'<b>Dificuldade para urinar: '+(u.dif||0)+'/10 ('+nu[0].toLowerCase()+')</b></div>'+
      '<div class="mut" style="margin:6px 0">'+[u.cor?'Cor: '+esc(u.cor.toLowerCase()):'',u.qtd?'Quantidade: '+esc(u.qtd.toLowerCase()):'',u.ml?u.ml+' ml':'',u.vez?u.vez+' vez(es) ao banheiro':''].filter(Boolean).join(' · ')+'</div>'+chipsTx(u.sint||[])+(u.obs?'<p class="mut" style="margin:6px 0 0">'+esc(u.obs)+'</p>':'')+'</div>';
  }
  if(x.gat&&x.gat.length)h+='<div class="card"><h2>'+IC.bolt+'Possíveis gatilhos</h2>'+chipsTx(x.gat)+'</div>';
  var ob=[x.obs,x.pre?'Fezes pretas':'',x.tont?'Tontura forte ou desmaio':'',x.s&&x.s!=='nenhum'?'Sangue nas fezes: '+x.s:''].filter(Boolean);
  if(ob.length)h+='<div class="card"><h2>💬 Observações</h2><div class="obs">'+ob.map(esc).join('<br>')+'</div></div>';
  if(compOn){
    var ant=null;for(var j=detI-1;j>=0;j--){ant=p.diario[j];break}
    h+='<div class="card"><h2>'+IC.bars+'Comparar com o registro anterior</h2>';
    if(!ant)h+='<div class="mut">Este é o primeiro registro.</div>';
    else{
      function lin(n,a,b){a=+a||0;b=+b||0;var d=a-b;return'<tr><td>'+n+'</td><td>'+b+'</td><td>'+a+'</td><td>'+(d>0?'▲ +'+d:d<0?'▼ '+d:'=')+'</td></tr>'}
      h+='<table><tr><th></th><th>'+esc(ant.d.slice(0,5)+' '+ant.d.slice(11))+'</th><th>Este</th><th></th></tr>'+lin('Dor',x.dor,ant.dor)+lin('Rigidez',x.rig,ant.rig)+lin('Fadiga',x.fad,ant.fad)+lin('Falta de ar',x.res,ant.res)+lin('Dificuldade urinar',u.dif,(ant.uri||{}).dif)+'</table>';
    }
    h+='</div>';
  }
  h+='<div class="row"><button class="btn sec" onclick="compOn=!compOn;render(true)">'+IC.bars+' Comparar</button><button class="btn" onclick="exportaReg()">'+IC.doc+' Exportar PDF</button></div>'+
    '<button class="btn sec" style="width:100%" onclick="regDrive()">☁ Salvar relatório no Drive</button><p id="gmsg" class="mut"></p>'+
    '<div class="card aviso2"><b>Em caso de dor intensa, dificuldade persistente para urinar, desmaio ou piora, procure um profissional de saúde.</b></div>'+
    '<div class="onlyprint sheet">'+regHtml(x,p)+'</div>';
  return h;
}
function exportaReg(){toast('Na janela que abrir, escolha “Salvar como PDF”.');setTimeout(function(){window.print()},500)}
function regDrive(){
  var p=P(),x=p.diario[detI];if(!x)return;
  if(!(window.G&&G.connected()))return gmsg('Conecte o Google em ⚙ Configurações primeiro.');
  gmsg('Enviando ao Drive…');
  var nome='Registro '+x.d.slice(6,10)+'-'+x.d.slice(3,5)+'-'+x.d.slice(0,2)+' '+x.d.slice(11).replace(':','h')+' — '+p.nome.split(' ')[0];
  G.saveDoc(S.cur,'Relatórios',nome,'<html><body>'+regHtml(x,p)+'</body></html>').then(function(r){
    var e=document.getElementById('gmsg');if(e)e.innerHTML='Salvo em Saúde a Dois › '+esc(p.nome.split(' ')[0])+' › Relatórios. <a href="'+esc(r.url)+'" target="_blank" rel="noopener">Abrir</a>';
    toast('Relatório salvo no Drive.');
  }).catch(function(e){gmsg(e.message)});
}

function vDiario(){
  var p=P(),d=new Date();
  var h='<div class="pg"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="3.5" y="5" width="17" height="16" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg><div><h2>Diário de hoje</h2><p class="mut">'+DSEMLONG[d.getDay()]+', '+d.getDate()+' de '+MESES[d.getMonth()]+'</p></div><a href="#" style="margin-left:auto;font-weight:700" onclick="goTab(\'historico\');return false">Histórico ›</a></div>'+
  '<div class="card"><h2>Como você está?</h2>'+sl('dor','Dor muscular')+sl('rig','Rigidez')+sl('fad','Fadiga')+sl('res','Falta de ar')+'</div>'+
  '<div class="card"><h2>Sintomas de hoje</h2><div id="sintbox">'+sintBox()+'</div></div>'+
  '<div class="card"><h2>Onde dói?</h2><textarea id="donde" rows="2" placeholder="Ex.: costas, ombro, joelho..."></textarea></div>'+
  '<div class="card"><h2>🚽 Urina</h2><div id="urbox">'+urinBox()+'</div></div>'+
  '<div class="card"><h2>Pressão, sono e o que aconteceu</h2>'+
  '<div class="two"><div><label>Pressão (máxima)</label><input id="psis" type="number" inputmode="numeric" placeholder="ex.: 100"></div><div><label>Pressão (mínima)</label><input id="pdia" type="number" inputmode="numeric" placeholder="ex.: 60"></div></div>'+
  '<label>Horas dormidas (opcional)</label><input id="sono" type="number" step="0.5" inputmode="decimal" placeholder="ex.: 7">'+
  '<label>Gatilhos do dia</label><div id="gatbox">'+gatBox()+'</div></div>'+
  '<div class="card"><h2>Sinais de alerta</h2><label>Sangue nas fezes</label><select id="ds"><option>nenhum</option><option>pouco</option><option>moderado</option><option>muito</option></select>'+
  '<label><input type="checkbox" id="dpre" style="width:auto"> Fezes pretas</label>'+
  '<label><input type="checkbox" id="dtont" style="width:auto"> Tontura forte ou desmaio</label>'+
  '<label>Observações (remédio, esforço)</label><textarea id="dobs" rows="2"></textarea></div>'+
  '<button class="btn" style="width:100%;margin:0 0 12px" onclick="addDia()">Salvar registro</button>';
  h+='<div class="card"><h2>Registros</h2>';
  if(!p.diario.length)h+='<div class="empty">Nenhum registro ainda.</div>';
  p.diario.slice().reverse().forEach(function(x){
    var sn=x.sint?Object.keys(x.sint).map(function(k){return k+' '+x.sint[k]}).join(' · '):'';
    h+='<div style="padding:6px 0;border-bottom:1px solid var(--line)"><b>'+x.d+'</b><br>'+
    'Sangue: '+esc(x.s)+(x.pre?' · <span class="tag t-hi">fezes pretas</span>':'')+(x.tont?' · <span class="tag t-hi">tontura</span>':'')+
    '<div class="mut">Dor '+x.dor+' · Rigidez '+x.rig+' · Fadiga '+x.fad+' · Falta de ar '+x.res+'</div>'+
    (sn?'<div class="mut">Sintomas: '+esc(sn)+'</div>':'')+(x.onde?'<div class="mut">Onde dói: '+esc(x.onde)+'</div>':'')+
    (x.uri&&(x.uri.dif||x.uri.cor||x.uri.qtd||x.uri.ml||x.uri.vez||x.uri.sint.length||x.uri.obs)?'<div class="mut">Urina: dificuldade '+(x.uri.dif||0)+'/10'+(x.uri.cor?' · cor '+esc(x.uri.cor.toLowerCase()):'')+(x.uri.qtd?' · '+esc(x.uri.qtd.toLowerCase()):'')+(x.uri.ml?' · '+x.uri.ml+' ml':'')+(x.uri.vez?' · '+x.uri.vez+' vez(es) ao banheiro':'')+(x.uri.sint.length?' · '+esc(x.uri.sint.join(', ')):'')+(x.uri.obs?' · '+esc(x.uri.obs):'')+'</div>':'')+
    (x.psis?'<div class="mut">Pressão '+x.psis+'×'+x.pdia+'</div>':'')+(x.sono?'<div class="mut">Sono '+x.sono+' h</div>':'')+
    (x.gat&&x.gat.length?'<div class="mut">Gatilhos: '+esc(x.gat.join(', '))+'</div>':'')+
    (x.obs?'<div class="mut">'+esc(x.obs)+'</div>':'')+'</div>';
  });
  return h+'</div>';
}