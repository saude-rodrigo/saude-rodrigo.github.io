/* =====================================================================
   v17 — Prontuário por pessoa, botão Adicionar, busca, arquivos,
   consultas (próximas / preparar / depois) e leitura de fotos (OCR)
   Tudo roda neste aparelho. Nada é apagado: edições guardam a versão antiga.
   ===================================================================== */
var saudeSec=null,consSec='proximas',addSec=null,qBusca='',diagEd=-1,docFil='todos',linhaFil='todos',linhaMax=40,espAuto='';

function nome1(p){return String(p.nome||'').split(' ')[0]}
function goSaude(s){saudeSec=s||null;goTab('saude')}
function goCons(s){consSec=s||'proximas';goTab('consultas')}
function goAdd(s){addSec=s||null;goTab('adicionar')}
function logAnt(tipo,o){var p=P();if(!p.log)p.log=[];p.log.push({t:tipo,em:nowStr(),antes:JSON.parse(JSON.stringify(o))})}
function norm(s){return String(s==null?'':s).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase()}
function ultExames(p){var u={};p.exames.forEach(function(e){var o=u[e.n];if(!o||dkey(e.d)>=dkey(o.d))u[e.n]=e});return Object.keys(u).sort().map(function(k){return u[k]})}
function voltaBtn(fn,t){return'<div class="dt"><button class="lock" style="color:var(--g)" onclick="'+fn+'" aria-label="Voltar">'+IC.back+'</button><h2>'+t+'</h2></div>'}

/* ---------- arquivos originais neste aparelho (IndexedDB) ---------- */
var IDBP=null;
function idb(){return IDBP||(IDBP=new Promise(function(ok,no){try{var r=indexedDB.open('saude_arquivos',1);r.onupgradeneeded=function(){r.result.createObjectStore('f')};r.onsuccess=function(){ok(r.result)};r.onerror=function(){no(r.error)}}catch(e){no(e)}}))}
function idbPut(k,v){return idb().then(function(d){return new Promise(function(ok,no){var t=d.transaction('f','readwrite');t.objectStore('f').put(v,k);t.oncomplete=ok;t.onerror=function(){no(t.error)}})})}
function idbGet(k){return idb().then(function(d){return new Promise(function(ok,no){var q=d.transaction('f').objectStore('f').get(k);q.onsuccess=function(){ok(q.result)};q.onerror=function(){no(q.error)}})})}

/* ---------- itens do prontuário (linha do tempo e busca) ---------- */
function itens(p){
  var r=[];
  (p.diag||[]).forEach(function(x){r.push({cat:'Diagnóstico',t:x.n,s:(x.obs||'')+(x.fim?' (encerrado em '+x.fim+')':''),d:x.desde||'',go:"goSaude('diag')"})});
  p.diario.forEach(function(x,i){
    var sn=x.sint?Object.keys(x.sint).join(', '):'',u=x.uri||{sint:[]};
    r.push({cat:'Sintoma',t:'Dor '+(x.dor||0)+'/10 · Fadiga '+(x.fad||0)+'/10',s:[sn,x.onde,(x.gat||[]).join(', '),(u.sint||[]).join(', '),u.cor?'urina '+u.cor:'',x.obs,x.psis?'pressão '+x.psis+'x'+x.pdia:''].filter(Boolean).join(' · '),d:x.d.slice(0,10),go:'verDet('+i+')'});
  });
  (p.sintLog||[]).forEach(function(x){r.push({cat:'Sintoma',t:x.n+(x.int!=null&&x.int!==''?' '+x.int+'/10':''),s:[x.sit?'situação: '+sitNome(x.sit):'',x.inv?'em investigação':'',x.onde,x.dur,x.mel?'melhora: '+x.mel:'',x.pior?'piora: '+x.pior:'',x.obs].filter(Boolean).join(' · '),d:x.d,go:"goSaude('sint')"})});
  p.exames.forEach(function(e){r.push({cat:'Exame',t:e.n+': '+vtxt(e)+' '+e.u,s:flag(e)[0],d:e.d,go:"goSaude('exames')"})});
  p.pend.forEach(function(x){if(x.s==='removido'||x.s==='descartado')return;r.push({cat:'Exame '+(x.s==='pedido'?'pedido pelo médico':x.s==='realizado'?'realizado':'a pedir'),t:x.n,s:x.esp||'',d:x.dataRes||'',go:"goSaude('exames')"})});
  p.meds.forEach(function(m){r.push({cat:'Medicamento',t:m.n+(m.dose?' — '+m.dose:''),s:[m.tipo,m.motivo,m.finalidade].filter(Boolean).join(' · '),d:m.compra?fmtDate(m.compra):'',go:"goSaude('meds')"})});
  (p.medsOld||[]).forEach(function(m){r.push({cat:'Medicamento encerrado',t:m.n+(m.dose?' — '+m.dose:''),s:'encerrado em '+(m.fim||''),d:m.fim||'',go:"goSaude('meds')"})});
  (p.consultas||[]).forEach(function(c){r.push({cat:'Consulta',t:c.esp,s:c.nota,d:c.d,go:"goCons('depois')"})});
  p.agenda.forEach(function(a){r.push({cat:'Consulta agendada',t:a.t,s:(a.l||'')+' '+a.h,d:fmtDate(a.d),go:"goCons('proximas')"})});
  p.docs.forEach(function(d){r.push({cat:'Documento',t:d.nome||d.file,s:d.tipo+(d.res?' · '+d.res:''),d:d.d||'',go:"goTab('arquivos')"})});
  p.bio.forEach(function(b){r.push({cat:'Bioimpedância',t:'Peso '+nz(b.peso)+' kg · gordura '+nz(b.pgc)+'%',s:'',d:b.d,go:"goSaude('geral')"})});
  (p.log||[]).forEach(function(l){r.push({cat:'Alteração',t:({med:'Medicamento',diag:'Diagnóstico',exame:'Exame',sint:'Sintoma',ident:'Identificação'}[l.t]||l.t)+': '+((l.antes&&l.antes.n)||''),s:'versão anterior guardada',d:(l.em||'').slice(0,10),go:"goSaude('"+(l.t==='diag'?'diag':'meds')+"')"})});
  return r;
}
function tokD(s){var m=String(s||'').trim();return/^\d{1,2}\/\d{1,2}(\/\d{2,4})?$/.test(m)||/^\d{1,2}\/\d{4}$/.test(m)||/^\d{4}$/.test(m)}
function casaData(d,q){
  d=String(d||'');var a=q.split('/');
  if(a.length===1)return d.slice(6)===q||d.slice(-4)===q;
  if(a.length===3){var dd=a[0].length===1?'0'+a[0]:a[0],mm=a[1].length===1?'0'+a[1]:a[1],aa=a[2].length===2?'20'+a[2]:a[2];return d.slice(0,10)===dd+'/'+mm+'/'+aa}
  if(a[1].length===4){var m1=a[0].length===1?'0'+a[0]:a[0];return d.slice(3,10)===m1+'/'+a[1]}
  var d1=a[0].length===1?'0'+a[0]:a[0],m2=a[1].length===1?'0'+a[1]:a[1];return d.slice(0,5)===d1+'/'+m2;
}
function buscar(p,q){
  q=String(q||'').trim();if(!q)return[];
  var tk=q.split(/\s+/).filter(Boolean),dts=tk.filter(tokD),txt=tk.filter(function(t){return!tokD(t)}).map(function(t){return norm(t).replace(/s$/,'')});
  return itens(p).filter(function(it){
    if(dts.length&&!dts.every(function(dq){return casaData(it.d,dq)}))return false;
    var b=norm(it.cat+' '+it.t+' '+it.s);
    return txt.every(function(t){return b.indexOf(t)>-1||b.replace(/s\b/g,'').indexOf(t)>-1});
  });
}
function buscaHtml(p,q){
  var r=buscar(p,q);
  if(!r.length)return'<div class="card empty">Nada encontrado para “'+esc(q)+'”.<br><span class="mut">Tente o nome, a categoria (exames, remédios, sintomas…) ou uma data (15/11/2026, 11/2026).</span></div>';
  r.sort(function(a,b){return dkey(b.d)<dkey(a.d)?-1:dkey(b.d)>dkey(a.d)?1:0});
  return'<div class="card"><h2>'+r.length+' resultado(s)</h2>'+r.slice(0,60).map(function(it){
    return'<button class="res" onclick="'+it.go+'"><span class="tag t-info">'+esc(it.cat)+'</span><b>'+esc(it.t)+'</b>'+(it.s?'<span class="mut">'+esc(String(it.s).slice(0,90))+'</span>':'')+(it.d?'<span class="mut">'+esc(it.d)+'</span>':'')+'</button>';
  }).join('')+(r.length>60?'<div class="mut">Mostrando 60. Refine a busca.</div>':'')+'</div>';
}
function doBusca(v){
  qBusca=v;var p=P(),b=document.getElementById('bres'),s=document.getElementById('sechome');
  if(b)b.innerHTML=v.trim()?buscaHtml(p,v):'';
  if(s)s.classList.toggle('hide',!!v.trim());
}

/* ---------- INÍCIO ---------- */
function rowIn(ic,t,sub,pill,fn){return'<button class="rin" onclick="'+fn+'"><span class="si">'+ic+'</span><span class="sb"><b>'+t+'</b><span>'+sub+'</span></span>'+(pill||'')+'<em>›</em></button>'}
function vInicio(){
  var p=P(),hoje=isoHoje(),h='<div class="hello"><h2>Olá, '+esc(nome1(p))+'</h2></div>'+emergCard(p)+alertaHtml();
  var ag=p.agenda.filter(function(x){return x.d>=hoje}).sort(function(a,b){return(a.d+(a.h||'')).localeCompare(b.d+(b.h||''))})[0];
  var u=p.diario.length?p.diario[p.diario.length-1]:null;
  h+='<div class="card rows">'+
    rowIn(IC.cal,'Próxima consulta',ag?esc(ag.t):'Nada marcado',ag?'<span class="pill">'+fmtDate(ag.d).slice(0,5)+' '+esc(ag.h||'')+'</span>':'',"goCons('proximas')")+
    rowIn(IC.pill,'Medicamentos em uso',p.meds.length?p.meds.length+' cadastrado(s)':'Nenhum cadastrado','',"goSaude('meds')")+
    rowIn(IC.wave,'Sintomas recentes',u?'Dor ('+(u.dor||0)+'/10) · Fadiga ('+(u.fad||0)+'/10)':'Nenhum registro','',"goSaude('sint')")+'</div>';
  h+='<div class="g2 tiles"><button class="tl dark" onclick="goAdd(\'exame\')">'+IC.upl+'<b>Importar exame</b></button><button class="tl" onclick="goAdd(\'sint\')">'+IC.wave+'<b>Registrar sintoma</b></button>'+
    '<button class="tl" onclick="goAdd(\'med\')">'+IC.pill+'<b>Medicamento</b></button><button class="tl" onclick="goAdd(\'consulta\')">'+IC.cal+'<b>Consulta</b></button></div>';
  h+=aguaHtml(p)+lembResumo();
  h+='<details class="card alert"><summary><b>⚠️ Procure urgência se houver</b></summary><ul style="margin:6px 0 0;padding-left:18px"><li>Grande quantidade de sangue nas fezes</li><li>Fezes pretas</li><li>Tontura forte ou desmaio</li><li>Fraqueza intensa</li><li>Dor abdominal forte, dor no peito ou falta de ar importante</li></ul></details>';
  if(syncTxt)h+='<p class="mut" style="text-align:right">'+esc(syncTxt)+'</p>';
  return h;
}

/* ---------- SAÚDE (prontuário) ---------- */
function tendencia(p){
  var dias=ultDias(7);function m(ks){var v=[];p.diario.forEach(function(x){if(ks.indexOf(pDia(x.d))>-1){v.push((+x.dor||0)+(+x.fad||0))}});return v.length?v.reduce(function(a,b){return a+b},0)/v.length/2:null}
  var a=m(dias.slice(0,4).map(function(d){return d.k})),b=m(dias.slice(4).map(function(d){return d.k}));
  if(a==null||b==null)return['Sem dados suficientes',''];
  var d=b-a;return d>=1?['Subindo','↗']:d<=-1?['Diminuindo','↘']:['Estável','↗'];
}
function secRow(ic,tit,sub,extra,fn){return'<button class="sec" onclick="'+fn+'"><span class="si">'+ic+'</span><span class="sb"><b>'+tit+'</b><span>'+sub+'</span></span>'+(extra||'')+'<em>›</em></button>'}
function secCards(p){
  var diag=(p.diag||[]).filter(function(x){return!x.fim}),u=p.diario.length?p.diario[p.diario.length-1]:null,ue=ultExames(p),fora=ue.filter(function(e){return flag(e)[1]==='t-hi'}).length;
  var dts=p.exames.map(function(e){return e.d}).sort(function(a,b){return dkey(b)<dkey(a)?-1:1}),tr=tendencia(p);
  return secRow(IC.clip,'Diagnósticos',diag.length?esc(diag.map(function(x){return x.n}).join(' • ')):'Nenhum registrado',"","goSaude('diag')")+
    secRow(IC.bolt,'Sintomas',u?'Último registro: '+esc(u.d.slice(0,10))+' · Dor '+(u.dor||0)+' · Fadiga '+(u.fad||0):'Nenhum registro ainda',"","goSaude('sint')")+
    secRow(IC.pill,'Medicamentos',p.meds.length?esc(p.meds.slice(0,4).map(function(m){return m.n+(m.dose?' '+m.dose:'')}).join(' • '))+(p.meds.length>4?' …':''):'Nenhum cadastrado',"","goSaude('meds')")+
    secRow(IC.flask,'Exames',p.exames.length?'Último exame de '+esc(dts[0])+' · '+ue.length+' tipo(s)':'Nenhum resultado ainda',fora?'<span class="pill hi">'+fora+' fora da faixa</span>':'',"goSaude('exames')")+
    secRow(IC.bars,'Visão geral','Evolução (7 dias): <b>'+tr[0]+'</b>',"","goSaude('geral')")+
    secRow(IC.hist,'Histórico','Tudo em ordem de data, incluindo alterações',"","goSaude('hist')")+
    '<div class="row" style="margin-top:6px"><button class="btn sec" onclick="compartilhaPront()">'+IC.share+' Compartilhar resumo</button></div>';
}
function vSaude(){
  var p=P();
  if(saudeSec)return saudeSub(p);
  return'<div class="pg">'+IC.heart+'<div><h2 style="font-size:28px;font-family:Georgia,serif">Saúde</h2><p class="mut">Prontuário de '+esc(nome1(p))+'</p></div><button class="btn nv" style="margin-left:auto" onclick="goAdd()">'+IC.plus+' Adicionar</button></div>'+
    '<div class="srch">'+IC.search+'<input id="busca" type="search" placeholder="Pesquisar no prontuário" value="'+esc(qBusca)+'" oninput="doBusca(this.value)" autocomplete="off"></div>'+
    '<div id="bres">'+(qBusca.trim()?buscaHtml(p,qBusca):'')+'</div><div id="sechome" class="'+(qBusca.trim()?'hide':'')+'">'+secCards(p)+'</div>';
}
function saudeSub(p){
  var T={diag:'Diagnósticos',sint:'Sintomas',meds:'Medicamentos',exames:'Exames',geral:'Visão geral',hist:'Histórico'};
  var h=voltaBtn("saudeSec=null;render()",T[saudeSec]||'Saúde')+'<p class="mut" style="margin:-4px 0 10px 4px">Prontuário de '+esc(nome1(p))+'</p>';
  if(saudeSec==='diag')return h+vDiag(p);
  if(saudeSec==='sint')return h+vHistorico();
  if(saudeSec==='meds')return h+vMeds(p);
  if(saudeSec==='exames')return h+vExamesN(p);
  if(saudeSec==='geral')return h+vGeral(p);
  return h+vLinha(p);
}

/* diagnósticos: só o que a própria pessoa registra */
function vDiag(p){
  if(!p.diag)p.diag=[];
  var h='<div class="card"><p class="mut" style="margin:0">Registre aqui o que um médico já informou. O app não sugere nem calcula diagnósticos.</p></div><div class="card">';
  var at=p.diag.map(function(x,i){return{x:x,i:i}});
  var ativos=at.filter(function(o){return!o.x.fim}),enc=at.filter(function(o){return o.x.fim});
  if(!ativos.length)h+='<div class="empty">Nenhum diagnóstico registrado.</div>';
  ativos.forEach(function(o){
    if(o.i===diagEd){h+=diagForm(o.x,o.i);return}
    h+='<div class="li"><b>'+esc(o.x.n)+'</b>'+(o.x.desde?' <span class="tag t-info">desde '+esc(o.x.desde)+'</span>':'')+(o.x.obs?'<div class="mut">'+esc(o.x.obs)+'</div>':'')+
      '<div class="row" style="margin-top:4px"><button class="btn sm sec" onclick="diagEd='+o.i+';render(true)">Editar</button><button class="btn sm sec" onclick="encerraDiag('+o.i+')">Encerrar</button></div></div>';
  });
  h+='</div>';
  if(diagEd<0)h+='<div class="card"><h2>Adicionar diagnóstico</h2>'+diagForm({},-1)+'</div>';
  if(enc.length)h+='<details class="card"><summary>Encerrados ('+enc.length+')</summary>'+enc.map(function(o){return'<div class="li"><b>'+esc(o.x.n)+'</b> <span class="mut">encerrado em '+esc(o.x.fim)+'</span><div><button class="btn sm sec" onclick="reativaDiag('+o.i+')">Reativar</button></div></div>'}).join('')+'</details>';
  return h;
}
function diagForm(x,i){
  return'<label>Diagnóstico</label><input id="dg_n" value="'+esc(x.n||'')+'" placeholder="Como o médico informou">'+
    '<label>Desde quando (opcional)</label><input id="dg_d" value="'+esc(x.desde||'')+'" placeholder="Ex.: 2019 ou 03/2021">'+
    '<label>Observação (opcional)</label><input id="dg_o" value="'+esc(x.obs||'')+'">'+
    '<div class="row"><button class="btn" onclick="saveDiag('+i+')">'+(i<0?'Adicionar':'Salvar')+'</button>'+(i<0?'':'<button class="btn sec" onclick="diagEd=-1;render(true)">Cancelar</button>')+'</div>';
}
function saveDiag(i){
  var n=val('dg_n');if(!n){alert('Escreva o diagnóstico.');return}
  var p=P();if(!p.diag)p.diag=[];
  var o={n:n,desde:val('dg_d'),obs:val('dg_o'),em:nowStr()};
  if(i<0)p.diag.push(o);else{logAnt('diag',p.diag[i]);o.em=p.diag[i].em||o.em;p.diag[i]=o}
  diagEd=-1;save();render(true);toast('Salvo.');
}
function encerraDiag(i){var p=P();if(!confirm('Encerrar "'+p.diag[i].n+'"? Ele continua guardado em “Encerrados”.'))return;logAnt('diag',p.diag[i]);p.diag[i].fim=nowStr().slice(0,10);save();render(true)}
function reativaDiag(i){var p=P();delete p.diag[i].fim;save();render(true)}

/* medicamentos */
function vMeds(p){
  var h='<div class="row" style="margin-bottom:8px"><button class="btn" onclick="goAdd(\'med\')">'+IC.plus+' Adicionar medicamento</button></div>';
  h+='<div class="card">';
  if(!p.meds.length)h+='<div class="empty">Nada cadastrado.</div>';
  TIPOS_USO.forEach(function(t){
    var its=[];p.meds.forEach(function(m,i){if((m.tipo||'Medicamento')===t)its.push(i)});
    if(!its.length)return;
    h+='<div class="grp">'+esc(t)+'</div>';
    its.forEach(function(i){
      var m=p.meds[i];
      if(i===editUso){h+=usoForm(m,i);return}
      h+='<div class="li"><b>'+esc(m.n)+'</b> <span class="tag t-info">'+esc(m.dose||'dose não informada')+'</span>'+
        (m.motivo?'<div class="mut">Motivo: '+esc(m.motivo)+'</div>':'')+(m.finalidade?'<div class="mut">Para que serve: '+esc(m.finalidade)+'</div>':'')+
        estoqueHtml(m)+(m.nota&&m.nota!=='—'?'<div class="mut">Para revisar: '+esc(m.nota)+'</div>':'')+
        '<div class="row" style="margin-top:4px"><button class="btn sm" onclick="comprei('+i+')">🛒 Comprei</button><button class="btn sm sec" onclick="editUso='+i+';render(true)">Editar</button><button class="btn sm sec" onclick="encerraUso('+i+')">Encerrar uso</button></div></div>';
    });
  });
  h+='<p class="mut" style="margin:10px 0 0">Não interrompa, inicie nem ajuste remédios sem o prescritor.</p></div>';
  var old=p.medsOld||[];
  if(old.length)h+='<details class="card"><summary>Encerrados ('+old.length+')</summary>'+old.map(function(m,i){return'<div class="li"><b>'+esc(m.n)+'</b> <span class="mut">'+esc(m.dose||'')+' · encerrado em '+esc(m.fim||'')+'</span><div><button class="btn sm sec" onclick="reativaUso('+i+')">Voltar a usar</button></div></div>'}).join('')+'</details>';
  return h;
}
function usoForm(m,i){
  var tem=!!(m.motivo||m.finalidade||m.compra||m.qtd||m.nota&&m.nota!=='—');
  return'<div class="li"><label>Tipo</label><select id="u_t">'+TIPOS_USO.map(function(t){return'<option'+(t===(m.tipo||'Medicamento')?' selected':'')+'>'+esc(t)+'</option>'}).join('')+'</select>'+
   '<label>Nome</label><input id="u_n" value="'+esc(m.n||'')+'">'+
   '<label>Dose / como uso</label><input id="u_d" value="'+esc(m.dose||'')+'" placeholder="Ex.: 50 mg à noite">'+
   '<details class="mais"'+(tem&&i>=0?' open':'')+'><summary>Mais detalhes (opcional)</summary>'+
   '<label>Por que estou usando</label><input id="u_m" value="'+esc(m.motivo||'')+'">'+
   '<label>Para que serve</label><input id="u_f" value="'+esc(m.finalidade||'')+'">'+
   '<label>Estoque: avisa quando estiver acabando</label>'+
   '<div class="row wrap"><div><label>Data da compra</label><input type="date" id="u_c" value="'+esc(m.compra||'')+'"></div><div><label>Qtd. comprada</label><input type="number" inputmode="decimal" id="u_q" value="'+esc(m.qtd||'')+'"></div></div>'+
   '<div class="row wrap"><div><label>Qtd. por vez</label><input type="number" inputmode="decimal" step="0.25" id="u_pv" value="'+esc(m.porVez||'')+'"></div><div><label>Vezes por dia</label><input type="number" inputmode="decimal" id="u_vd" value="'+esc(m.vezes||'')+'"></div><div><label>Avisar com (dias)</label><input type="number" inputmode="numeric" id="u_av" value="'+esc(m.aviso||7)+'"></div></div>'+
   '<label>Pontos para revisar com o médico</label><input id="u_o" value="'+esc(m.nota&&m.nota!=='—'?m.nota:'')+'"></details>'+
   '<div class="row"><button class="btn" onclick="saveUso('+i+')">'+(i<0?'Adicionar':'Salvar')+'</button>'+(i<0?'':'<button class="btn sec" onclick="editUso=-1;render(true)">Cancelar</button>')+'</div></div>';
}
function saveUso(i){
  var n=val('u_n');if(!n){alert('Informe o nome.');return}
  var o={tipo:val('u_t'),n:n,dose:val('u_d'),motivo:val('u_m'),finalidade:val('u_f'),nota:val('u_o'),compra:val('u_c'),qtd:val('u_q'),porVez:val('u_pv'),vezes:val('u_vd'),aviso:val('u_av')||'7'};
  var p=P();
  if(i<0){p.meds.push(o);if(tab==='adicionar'){editUso=-1;save();toast('Medicamento adicionado.');goSaude('meds');return}}
  else{logAnt('med',p.meds[i]);p.meds[i]=o}
  editUso=-1;save();render(true);
}
function encerraUso(i){
  var p=P(),m=p.meds[i];if(!confirm('Encerrar o uso de "'+m.n+'"? Fica guardado em “Encerrados”.'))return;
  if(!p.medsOld)p.medsOld=[];m.fim=nowStr().slice(0,10);p.medsOld.push(m);p.meds.splice(i,1);editUso=-1;save();render(true);
}
function reativaUso(i){var p=P(),m=p.medsOld.splice(i,1)[0];delete m.fim;p.meds.push(m);save();render(true)}
function delUso(i){encerraUso(i)}

/* exames */
function vExamesN(p){
  var h='<div class="row" style="margin-bottom:8px"><button class="btn" onclick="goAdd(\'exame\')">'+IC.upl+' Importar ou digitar</button></div><div class="card"><h2>Resultados</h2>';
  if(!p.exames.length)h+='<div class="empty">Nenhum resultado cadastrado.</div>';
  else{
    var g={};p.exames.forEach(function(e){(g[e.n]=g[e.n]||[]).push(e)});
    Object.keys(g).sort().forEach(function(n){
      var l=g[n].slice().sort(function(a,b){return dkey(b.d)<dkey(a.d)?-1:1}),e=l[0],f=flag(e);
      h+='<div class="li"><div class="exr"><div><b>'+esc(n)+'</b><div class="mut">'+esc(e.d)+' · ref. '+esc(refTxt(e))+'</div></div><div style="text-align:right"><b>'+esc(vtxt(e))+' '+esc(e.u)+'</b><br><span class="tag '+f[1]+'">'+f[0]+'</span></div></div>'+
        (l.length>1?'<details><summary class="mut">Anteriores ('+(l.length-1)+')</summary>'+l.slice(1).map(function(x){return'<div class="mut">'+esc(x.d)+': '+esc(vtxt(x))+' '+esc(x.u)+' — '+flag(x)[0]+'</div>'}).join('')+'</details>':'')+'</div>';
    });
  }
  h+='<p class="mut" style="margin:8px 0 0">Referências do laudo. A interpretação é ato médico.</p></div>';
  var pd=p.pend.map(function(x,i){return{x:x,i:i}}),ped=pd.filter(function(o){return o.x.s==='pedido'}),apd=pd.filter(function(o){return o.x.s==='a pedir'}),real=pd.filter(function(o){return o.x.s==='realizado'});
  function lista(l,pedido){
    if(!l.length)return'<div class="mut">Nenhum.</div>';
    return l.map(function(o){var x=o.x;return'<div class="li"><label style="display:flex;gap:8px;align-items:center;margin:0;color:var(--ink);font-size:15px">'+(pedido?'<input type="checkbox" class="pc" data-i="'+o.i+'" style="width:auto">':'')+esc(x.n)+' <span class="tag t-info">'+esc(x.esp||'')+'</span></label>'+
      '<div class="row" style="margin-top:4px">'+(pedido?'<button class="btn sm sec" onclick="setPend('+o.i+',\'a pedir\');render(true)">Ainda não foi pedido</button>':'<button class="btn sm sec" onclick="setPend('+o.i+',\'pedido\');render(true)">O médico já pediu</button>')+'<button class="btn sm sec" style="flex:0 0 auto" onclick="descartaPend('+o.i+')" aria-label="Descartar">✕</button></div></div>'}).join('');
  }
  h+='<div class="card"><h2>Pedidos pelo médico</h2><p class="mut" style="margin:0 0 4px">Exames que o médico já solicitou e ainda não têm resultado.</p>'+lista(ped,true)+
    (ped.length?'<button class="btn" onclick="agendarColeta()">📅 Agendar coleta dos marcados</button>':'')+'</div>';
  h+='<div class="card"><h2>Quero pedir ao médico</h2><p class="mut" style="margin:0 0 4px">Sugestões suas. <b>Ainda não foram solicitados.</b></p>'+lista(apd,false)+'</div>';
  h+='<div class="card"><h2>Adicionar à lista</h2><label>Nome do exame (vários: separe por vírgula)</label><input id="pn" placeholder="Ex.: Hemograma completo">'+
    '<div class="row wrap"><div><label>Situação</label><select id="pst"><option value="a pedir">Quero pedir ao médico</option><option value="pedido">O médico já pediu</option></select></div>'+
    '<div><label>Especialidade</label><select id="pesp">'+espList().map(function(e){return'<option'+(e===lastEsp?' selected':'')+'>'+esc(e)+'</option>'}).join('')+'<option>Outra…</option></select></div></div>'+
    '<button class="btn" onclick="addPend2()">Adicionar</button></div>';
  if(real.length)h+='<details class="card"><summary>Já realizados ('+real.length+')</summary>'+real.map(function(o){return'<div class="li">'+esc(o.x.n)+' <span class="mut">'+esc(o.x.dataRes||'')+'</span></div>'}).join('')+'</details>';
  return h;
}
function descartaPend(i){var p=P();if(!confirm('Tirar "'+p.pend[i].n+'" da lista? Ele continua guardado no histórico.'))return;p.pend[i].s='descartado';save();render(true)}
function addPend2(){
  var t=val('pn');if(!t){alert('Escreva o nome do exame.');return}
  var esp=val('pesp');if(esp==='Outra…'){esp=askEsp();if(!esp)return}
  lastEsp=esp;var st=val('pst')||'a pedir',p=P();
  t.split(',').forEach(function(n){n=n.trim();if(n)p.pend.push({n:n,s:st,esp:esp,tipo:tipoOf(n)})});
  save();render(true);
}

/* visão geral */
function vGeralBase(p){
  var h=evolChart(p)+evolTiles(p).replace(/onclick="goTab\('diario'\)"/g,'onclick="goSaude(\'sint\')"');
  if(p.bio.length){
    var b=p.bio[p.bio.length-1];
    function bv(x){return+x.peso||+x.pgc||+x.musc||0}
    var mx=Math.max.apply(null,p.bio.map(bv))||1;
    h+='<div class="card"><h2>Bioimpedância</h2>';
    p.bio.forEach(function(x){var t=[];if(x.peso!==''&&x.peso!=null)t.push('peso '+x.peso+' kg');if(x.pgc!==''&&x.pgc!=null)t.push('gordura '+x.pgc+'%');else if(x.gord!==''&&x.gord!=null)t.push('gordura '+x.gord+' kg');if(x.musc!==''&&x.musc!=null)t.push('músculo '+x.musc+' kg');
      h+='<div class="mut">'+x.d+' · '+t.join(' · ')+'</div><div class="bar" style="width:'+Math.round(bv(x)/mx*100)+'%"></div>'});
    h+='<p class="mut" style="margin:8px 0 0">Última ('+b.d+'): gordura '+nz(b.pgc)+'% · visceral <b>'+nz(b.visc)+'</b> · IMC '+nz(b.imc)+'</p>'+trendTxt(p.bio)+'</div>';
  }
  var alt=ultExames(p).filter(function(e){return flag(e)[1]==='t-hi'});
  h+='<div class="card"><h2>Exames fora da faixa ('+alt.length+')</h2>';
  if(!alt.length)h+='<div class="mut">'+(p.exames.length?'Nenhum no resultado mais recente de cada exame.':'Nenhum exame cadastrado.')+'</div>';
  alt.forEach(function(e){h+='<div>'+esc(e.n)+' <span class="tag t-hi">'+esc(vtxt(e))+' '+esc(e.u)+'</span> <span class="mut">'+esc(e.d)+'</span></div>'});
  return h+'<p class="mut" style="margin:6px 0 0">Mostra só o resultado mais recente de cada exame. Os valores podem não descrever a situação atual.</p></div>';
}

/* histórico: linha do tempo */
function vLinha(p){
  var all=itens(p).filter(function(x){return x.d&&dkey(x.d)!=='0'});
  var cats=['todos','Sintoma','Exame','Medicamento','Consulta','Documento','Alteração'];
  var fl=all.filter(function(x){return linhaFil==='todos'||x.cat.indexOf(linhaFil)===0});
  fl.sort(function(a,b){return dkey(b.d)<dkey(a.d)?-1:dkey(b.d)>dkey(a.d)?1:0});
  var h='<div class="chips" style="margin-bottom:8px">'+cats.map(function(c){return'<button class="chip'+(linhaFil===c?' on':'')+'" onclick="linhaFil=\''+c+'\';linhaMax=40;render(true)">'+(c==='todos'?'Tudo':c)+'</button>'}).join('')+'</div><div class="card">';
  if(!fl.length)h+='<div class="empty">Nada registrado.</div>';
  fl.slice(0,linhaMax).forEach(function(it){h+='<button class="res" onclick="'+it.go+'"><span class="mut">'+esc(it.d)+'</span><span class="tag t-info">'+esc(it.cat)+'</span><b>'+esc(it.t)+'</b>'+(it.s?'<span class="mut">'+esc(String(it.s).slice(0,80))+'</span>':'')+'</button>'});
  if(fl.length>linhaMax)h+='<button class="btn sec" onclick="linhaMax+=40;render(true)">Mostrar mais</button>';
  return h+'</div>';
}

/* compartilhar */
function textoPront(p){
  var L=['PRONTUÁRIO — '+p.nome,'Gerado em '+nowStr()+' (app Saúde a Dois)',''];
  var dg=(p.diag||[]).filter(function(x){return!x.fim});
  L.push('DIAGNÓSTICOS REGISTRADOS');L.push(dg.length?dg.map(function(x){return'- '+x.n+(x.desde?' (desde '+x.desde+')':'')}).join('\n'):'- nenhum registrado');L.push('');
  L.push('EM USO');L.push(p.meds.length?p.meds.map(function(m){return'- '+m.n+(m.dose?' — '+m.dose:'')+(m.motivo?' ('+m.motivo+')':'')}).join('\n'):'- nenhum cadastrado');L.push('');
  L.push('EXAMES (resultado mais recente de cada)');L.push(p.exames.length?ultExames(p).map(function(e){return'- '+e.n+': '+vtxt(e)+' '+e.u+' (ref. '+refTxt(e)+') em '+e.d}).join('\n'):'- nenhum');L.push('');
  L.push('SINTOMAS RECENTES');var ds=p.diario.slice(-3).reverse();L.push(ds.length?ds.map(function(x){return'- '+x.d+': dor '+(x.dor||0)+'/10, rigidez '+(x.rig||0)+'/10, fadiga '+(x.fad||0)+'/10'+(x.sint&&Object.keys(x.sint).length?'; '+Object.keys(x.sint).join(', '):'')+(x.obs?' ('+x.obs+')':'')}).join('\n'):'- sem registros');
  L.push('');L.push('Resumo de apoio feito pelo paciente. Não é documento médico.');
  return L.join('\n');
}
function compartilhaPront(){compartilhaTxt('Prontuário — '+nome1(P()),textoPront(P()))}
function compartilhaTxt(titulo,txt){
  if(navigator.share){navigator.share({title:titulo,text:txt}).catch(function(){});return}
  try{navigator.clipboard.writeText(txt).then(function(){toast('Texto copiado. Cole onde quiser enviar.')},function(){alert(txt)})}catch(e){alert(txt)}
}

/* ---------- ADICIONAR ---------- */
function vAdicionar(){
  var p=P();
  if(!addSec){
    return'<div class="pg">'+IC.plus+'<div><h2>Adicionar</h2><p class="mut">para '+esc(nome1(p))+' — o que você quer registrar?</p></div></div>'+
    '<div class="g2 tiles"><button class="tl" onclick="goAdd(\'sint\')">'+IC.wave+'<b>Sintoma</b></button><button class="tl" onclick="goAdd(\'med\')">'+IC.pill+'<b>Medicamento</b></button>'+
    '<button class="tl" onclick="goAdd(\'exame\')">'+IC.flask+'<b>Exame</b></button><button class="tl" onclick="goAdd(\'consulta\')">'+IC.cal+'<b>Consulta</b></button>'+
    '<button class="tl wide" onclick="goAdd(\'doc\')">'+IC.upl+'<b>Documento (foto ou PDF)</b></button></div>';
  }
  var back=voltaBtn("addSec=null;render()",{sint:'Registrar sintoma',med:'Novo medicamento',exame:'Novo exame',consulta:'Nova consulta',doc:'Novo documento'}[addSec]);
  if(addSec==='sint')return back+vSintReg();
  if(addSec==='med')return back+'<div class="card">'+usoForm({tipo:'Medicamento'},-1)+'</div>';
  if(addSec==='consulta')return back+formConsulta();
  var h=back+'<div class="card"><h2>'+(addSec==='exame'?'Foto ou PDF do exame':'Foto ou PDF do documento')+'</h2>'+
    '<p class="mut" style="margin:0 0 8px">O app lê o texto, mostra o que encontrou para você conferir e só salva depois. O arquivo original fica guardado.</p>'+pickBtns()+'</div>';
  if(addSec==='exame')h+='<details class="card"><summary><b>Digitar um resultado</b></summary><label>Exame</label><input id="en"><div class="row"><div><label>Valor</label><input id="ev" inputmode="decimal"></div><div><label>Unidade</label><input id="eu"></div></div>'+
    '<label>Data</label><input id="ed" type="date" value="'+isoHoje()+'"><details class="mais"><summary>Referência do laudo (opcional)</summary><div class="row"><div><label>Mínima</label><input id="emin" inputmode="decimal"></div><div><label>Máxima</label><input id="emax" inputmode="decimal"></div></div></details>'+
    '<button class="btn" onclick="addExame()">Salvar resultado</button></details>';
  return h;
}
function pickBtns(){
  return'<div class="row"><label class="btn" style="text-align:center;margin:0">'+IC.cam+' Tirar foto<input type="file" accept="image/*" capture="environment" hidden onchange="irImportar(this.files)"></label>'+
    '<label class="btn sec" style="text-align:center;margin:0">'+IC.upl+' PDF ou imagem<input type="file" accept="application/pdf,image/*" multiple hidden onchange="irImportar(this.files)"></label></div>';
}
function irImportar(files){var f=[].slice.call(files);addSec=null;tab='arquivos';render();readFiles(f)}
function formConsulta(){
  return'<div class="card"><label>Consulta com…</label><input id="at" list="espl" placeholder="Ex.: Reumatologista"><datalist id="espl">'+espList().map(function(e){return'<option value="'+esc(e)+'">'}).join('')+'</datalist>'+
    '<div class="row"><div><label>Data</label><input id="ad" type="date"></div><div><label>Hora</label><input id="ah" type="time" value="08:00"></div></div>'+
    '<details class="mais"><summary>Mais detalhes (opcional)</summary><label>Local</label><input id="al"><label>Preparo / notas</label><textarea id="ap" rows="2" placeholder="Jejum, levar pedido…"></textarea></details>'+
    '<button class="btn" style="width:100%" onclick="addAg(\'s\')">Salvar consulta</button>'+
    '<p class="mut" style="margin:6px 0 0">'+(window.G&&G.connected()?'☁ Ao salvar, a consulta vai sozinha para o Google Agenda.':'Conecte o ☁ para as consultas irem sozinhas ao Google Agenda.')+'</p>'+
    '<details class="mais"><summary>Outras opções</summary><div class="row"><button class="btn sec" onclick="addAg(\'g\')">Abrir no Google Agenda</button><button class="btn sec" onclick="addAg(\'i\')">Arquivo .ics</button></div></details></div>';
}

/* ---------- ARQUIVOS ---------- */
function docTipoCat(t){return/laudo|biomped/.test(t)?'Exames':/receita/.test(t)?'Receitas':/pedido/.test(t)?'Pedidos':'Outros'}
function vArquivos(){
  var p=P(),h='<div class="pg">'+IC.folder+'<div><h2>Arquivos</h2><p class="mut">Documentos de '+esc(nome1(p))+'</p></div></div>'+
    '<div class="card"><h2>Importar</h2><p class="mut" style="margin:0 0 8px">PDF ou foto de exame, receita ou pedido. Você confere antes de salvar.</p>'+pickBtns()+'<div id="impst" class="mut" style="margin-top:6px"></div></div><div id="staging">'+renderStaged()+'</div>';
  var cats=['todos','Exames','Receitas','Pedidos','Outros'];
  h+='<div class="chips" style="margin-bottom:8px">'+cats.map(function(c){return'<button class="chip'+(docFil===c?' on':'')+'" onclick="docFil=\''+c+'\';render(true)">'+(c==='todos'?'Todos':c)+'</button>'}).join('')+'</div><div class="card"><h2>Documentos</h2>';
  var ds=p.docs.map(function(d,i){return{d:d,i:i}}).filter(function(o){return docFil==='todos'||docTipoCat(o.d.tipo)===docFil}).reverse();
  if(!ds.length)h+='<div class="empty">Nenhum documento.</div>';
  ds.forEach(function(o){var d=o.d;
    h+='<div class="li"><span class="tag t-info">'+esc(d.tipo)+'</span> <b>'+esc(d.file)+'</b><div class="mut">'+esc(d.d||'sem data')+' · '+esc(d.res||'')+(d.ocr?' · lido por foto':'')+' · importado em '+esc(d.em||'')+'</div>'+
      '<div class="row" style="margin-top:4px">'+(d.id?'<button class="btn sm sec" onclick="abreDoc('+o.i+')">Abrir</button><button class="btn sm sec" onclick="compartilhaDoc('+o.i+')">Compartilhar</button><button class="btn sm sec" onclick="baixaDoc('+o.i+')">Baixar</button>':'<span class="mut">original não guardado</span>')+(d.drive?'<a class="btn sm sec" style="text-align:center;text-decoration:none" target="_blank" rel="noopener" href="https://drive.google.com/file/d/'+esc(d.drive)+'/view">No Drive ↗</a>':'')+'</div></div>';
  });
  h+='</div><details class="card"><summary><b>Exportar, Drive e backup</b></summary>'+
    '<p class="mut">Planilhas abrem no Google Planilhas ou no Excel.</p><div class="row"><button class="btn sec" onclick="exportReg(\'exames\')">Exames</button><button class="btn sec" onclick="exportReg(\'bio\')">Bioimpedância</button></div>'+
    '<div class="row" style="margin-top:8px"><button class="btn sec" onclick="exportReg(\'diario\')">Sintomas</button><button class="btn sec" onclick="exportReg(\'meds\')">Medicamentos</button></div>'+
    '<div class="row" style="margin-top:8px"><button class="btn sec" onclick="goTab(\'google\')">☁ Drive e sincronização</button></div>'+
    '<div class="row" style="margin-top:8px"><button class="btn sec" onclick="exportBackup()">⬇️ Salvar backup</button><label class="btn sec" style="margin:8px 0 0;text-align:center">⬆️ Restaurar<input type="file" accept="application/json,.json" hidden onchange="importBackup(this.files[0])"></label></div>'+
    '<div class="row" style="margin-top:8px"><label class="btn sec" style="margin:8px 0 0;text-align:center">Importar ficha (.json)<input type="file" accept=".json,application/json" style="display:none" onchange="importaFicha(this)"></label></div>'+
    '<p class="mut">O backup guarda os dois perfis. Guarde em local seguro: contém dados de saúde.</p></details>';
  h+='<details class="card"><summary><b>Privacidade e segurança</b></summary><p class="mut">Tudo fica neste aparelho (PIN no app). A leitura de PDFs e fotos é feita no próprio aparelho: <b>nenhum arquivo é enviado para inteligência artificial externa</b>. Só vai ao Google Drive o que você mandar, se conectar o Drive.</p><div class="row"><button class="btn sec" onclick="exportaPessoa()">Exportar dados de '+esc(nome1(P()))+'</button><button class="btn sec" style="color:var(--bad)" onclick="apagaPessoa()">Excluir dados de '+esc(nome1(P()))+'</button></div></details>';
  return h;
}
function abreDoc(i){
  var p=P(),d=p.docs[i];if(!d||!d.id)return;
  idbGet(S.cur+'/'+d.id).then(function(b){
    if(!b){alert('O original não está mais neste aparelho (talvez tenha sido importado em outro). '+(d.drive?'Abra pelo Drive.':''));return}
    var u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.target='_blank';a.rel='noopener';document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(u)},60000);
  }).catch(function(){alert('Não consegui abrir o arquivo.')});
}

/* ---------- CONSULTAS ---------- */
function vConsultas(){
  var p=P(),segs=[['proximas','Próximas'],['preparar','Preparar'],['depois','Depois']];
  var h='<div class="segc">'+segs.map(function(s){return'<button class="'+(consSec===s[0]?'on':'')+'" onclick="consSec=\''+s[0]+'\';render()">'+s[1]+'</button>'}).join('')+'</div>';
  if(consSec==='preparar')return h+vPreparar(p);
  if(consSec==='depois')return h+vDepois(p);
  var hoje=isoHoje(),fut=[],pas=[];
  p.agenda.forEach(function(a,i){(a.d>=hoje?fut:pas).push({a:a,i:i})});
  fut.sort(function(x,y){return(x.a.d+x.a.h).localeCompare(y.a.d+y.a.h)});pas.sort(function(x,y){return(y.a.d+y.a.h).localeCompare(x.a.d+x.a.h)});
  h+='<div class="row" style="margin-bottom:8px"><button class="btn" onclick="goAdd(\'consulta\')">'+IC.plus+' Nova consulta</button></div><div class="card"><h2>Próximas</h2>';
  if(!fut.length)h+='<div class="empty">Nada marcado.</div>';
  function it(o){var a=o.a;return'<div class="li"><b>'+esc(a.t)+'</b><div class="mut">'+fmtDate(a.d)+' às '+esc(a.h)+(a.l?' · '+esc(a.l):'')+'</div>'+(a.p?'<div class="mut">'+esc(a.p)+'</div>':'')+
    '<div class="row" style="margin-top:4px"><button class="btn sm" onclick="consSec=\'preparar\';render()">Preparar</button><button class="btn sm sec" onclick="delAg('+o.i+')">Cancelar</button></div></div>'}
  fut.forEach(function(o){h+=it(o)});h+='</div>';
  if(pas.length)h+='<details class="card"><summary>Anteriores ('+pas.length+')</summary>'+pas.map(function(o){var a=o.a;return'<div class="li"><b>'+esc(a.t)+'</b><div class="mut">'+fmtDate(a.d)+' às '+esc(a.h)+'</div></div>'}).join('')+'</details>';
  return h+lembHtml()+dispHtml();
}
function proxEsp(p){
  var hoje=isoHoje(),ag=p.agenda.filter(function(x){return x.d>=hoje}).sort(function(a,b){return(a.d+a.h).localeCompare(b.d+b.h)})[0];
  if(!ag)return null;var t=norm(ag.t),ks=espList(),f=null;
  ks.forEach(function(k){var w=norm(k).split(/[\s\/]+/)[0].replace(/(a|o)$/,'');if(w.length>4&&t.indexOf(w)>-1)f=k});
  return f?{k:f,id:ag.d+ag.t}:null;
}
function vPreparar(p){
  var pe=proxEsp(p);if(pe&&espAuto!==pe.id){espAuto=pe.id;espSel=pe.k}
  var c=ESP[espSel]||{sint:['s','dor','rig','fad','res'],ex:[],pend:[],q:['Quais exames e orientações você recomenda?']};
  var h='<div class="card noprint"><h2>Resumo para o médico</h2><label>Especialidade</label><select id="es" onchange="espSel=this.value;render(true)">'+espList().map(function(k){return'<option'+(k===espSel?' selected':'')+'>'+esc(k)+'</option>'}).join('')+'</select>'+
    '<p class="mut" style="margin:6px 0 0">O resumo é montado sozinho com diagnósticos, medicamentos, exames e sintomas já registrados.</p>'+
    '<div class="row" style="margin-top:6px"><button class="btn" onclick="window.print()">🖨️ PDF</button><button class="btn sec" onclick="compartilhaResumo()">'+IC.share+' Compartilhar</button></div>'+
    (window.G&&G.connected()?'<button class="btn sec" style="width:100%" onclick="resumoDrive()">☁ Salvar no Drive</button><p id="gmsg" class="mut"></p>':'')+'</div>';
  h+=editConsulta(p);
  h+='<div class="card"><div class="sheet" id="sheetres"><h3>Resumo para consulta — '+esc(espSel)+'</h3><div class="mut">'+esc(p.nome)+' · gerado em '+nowStr()+'</div>';
  var dg=(p.diag||[]).filter(function(x){return!x.fim});
  if(dg.length)h+='<h4>Diagnósticos já informados por médicos</h4><ul>'+dg.map(function(x){return'<li>'+esc(x.n)+(x.desde?' (desde '+esc(x.desde)+')':'')+'</li>'}).join('')+'</ul>';
  h+='<h4>Sintomas recentes</h4>';
  var last=p.diario.slice(-3).reverse();
  if(!last.length)h+='<div class="mut">Sem registros.</div>';
  else{h+='<ul>';last.forEach(function(x){
    var t=[];
    if(c.sint.indexOf('s')>-1&&x.s&&x.s!=='nenhum')t.push('sangue nas fezes: '+x.s);
    if(c.sint.indexOf('pre')>-1&&x.pre)t.push('fezes pretas');
    if(x.tont)t.push('tontura/desmaio');
    ['dor','rig','fad','res'].forEach(function(k){if(c.sint.indexOf(k)>-1||!c.sint.length)t.push({dor:'dor',rig:'rigidez',fad:'fadiga',res:'falta de ar'}[k]+' '+(x[k]||0)+'/10')});
    if(x.sint&&Object.keys(x.sint).length)t.push(Object.keys(x.sint).map(function(k){return k.toLowerCase()+' '+x.sint[k]}).join(', '));
    var u=x.uri;if(u&&(u.dif||u.cor||u.vez||(u.sint||[]).length)){var us=[];if(u.dif)us.push('dificuldade '+u.dif+'/10');if(u.cor)us.push('cor '+u.cor.toLowerCase());if(u.ml)us.push(u.ml+' ml');if(u.vez)us.push(u.vez+' vez(es)');(u.sint||[]).forEach(function(s){us.push(s.toLowerCase())});t.push('urina: '+us.join(', '))}
    if(x.psis)t.push('pressão '+x.psis+'×'+x.pdia);
    h+='<li>'+x.d+': '+esc(t.join('; '))+(x.obs?' ('+esc(x.obs)+')':'')+'</li>';
  });h+='</ul>'}
  h+='<h4>Medicamentos em uso</h4>';
  if(!p.meds.length)h+='<div class="mut">Nenhum cadastrado.</div>';
  else{h+='<ul>';p.meds.forEach(function(m){h+='<li>'+esc(m.n)+(m.dose?' — '+esc(m.dose):'')+(m.motivo?'. Motivo: '+esc(m.motivo):'')+(m.finalidade?'. Serve para: '+esc(m.finalidade):'')+'</li>'});h+='</ul>'}
  h+='<h4>Exames relevantes (resultados)</h4>';
  var rel=getRel(p),ex=p.exames.filter(function(e){return rel.indexOf(e.n)>-1}).sort(function(a,b){return a.n<b.n?-1:a.n>b.n?1:(dkey(a.d)<dkey(b.d)?-1:1)});
  if(!ex.length)h+='<div class="mut">Nenhum resultado selecionado.</div>';
  else{h+='<ul>';ex.forEach(function(e){h+='<li>'+esc(e.n)+': <b>'+esc(vtxt(e))+' '+esc(e.u)+'</b> (ref. '+esc(refTxt(e))+') em '+esc(e.d)+'</li>'});h+='</ul>'}
  var ped=p.pend.filter(function(x){return x.s==='pedido'});
  if(ped.length)h+='<h4>Exames já pedidos por médicos (sem resultado ainda)</h4><ul>'+ped.map(function(x){return'<li>'+esc(x.n)+(x.esp?' — pedido por '+esc(x.esp):'')+'</li>'}).join('')+'</ul>';
  var ap=p.pend.filter(function(x){return x.s==='a pedir'&&x.esp===espSel});
  if(ap.length){
    h+='<h4>Exames que gostaria de pedir ao médico (sugestão minha, ainda NÃO solicitados)</h4>';
    TIPOS.forEach(function(t){var g=ap.filter(function(x){return(x.tipo||tipoOf(x.n))===t});if(!g.length)return;h+='<div><b>'+esc(t)+'</b></div><ul>'+g.map(function(x){return'<li>'+esc(x.n)+'</li>'}).join('')+'</ul>'});
  }
  if(p.bio.length&&(espSel==='Endocrinologista'||espSel==='Hepatologista')){var b=p.bio[p.bio.length-1];h+='<h4>Bioimpedância</h4><ul><li>'+b.d+': peso '+b.peso+' kg, gordura '+b.pgc+'%, visceral '+b.visc+', IMC '+b.imc+'</li><li>Peso: '+p.bio.map(function(x){return x.peso}).join(' → ')+' kg</li></ul>'}
  var qs=getPerg(p).filter(function(x){return x.trim()});
  h+='<h4>Perguntas para a consulta</h4>'+(qs.length?'<ul>'+qs.map(function(q){return'<li>'+esc(q)+'</li>'}).join('')+'</ul>':'<div class="mut">Nenhuma pergunta escrita.</div>');
  var ob=(p.obs&&p.obs[espSel])||'';
  if(ob.trim())h+='<h4>Observações</h4><div>'+esc(ob).replace(/\n/g,'<br>')+'</div>';
  return h+'<div class="mut" style="margin-top:10px">Resumo de apoio feito pelo paciente. Não é documento médico nem prescrição.</div></div></div>';
}
function compartilhaResumo(){var e=document.getElementById('sheetres');if(e)compartilhaTxt('Resumo para consulta — '+espSel,e.innerText)}
function resumoDrive(){
  var e=document.getElementById('sheetres'),p=P();if(!e)return;gmsg('Enviando ao Drive…');
  G.saveDoc(S.cur,'Relatórios','Resumo para consulta — '+espSel+' — '+nome1(p)+' — '+isoHoje(),'<html><body>'+e.innerHTML+'</body></html>').then(function(r){
    var m=document.getElementById('gmsg');if(m)m.innerHTML='Salvo em Relatórios. <a href="'+esc(r.url)+'" target="_blank" rel="noopener">Abrir</a>';toast('Resumo salvo no Drive.');
  }).catch(function(x){gmsg(x.message)});
}
function vDepois(p){
  var iso=isoHoje(),h='<div class="card"><h2>Depois da consulta</h2><label>Especialidade</label><select id="es" onchange="espSel=this.value;render(true)">'+espList().map(function(k){return'<option'+(k===espSel?' selected':'')+'>'+esc(k)+'</option>'}).join('')+'</select>'+
    '<label>Data</label><input id="cd" type="date" value="'+iso+'">'+
    '<label>O que o médico disse, pediu ou orientou</label><textarea id="cn" rows="3"></textarea>'+
    '<label>Exames que o médico pediu (separe por vírgula)</label><input id="cex" placeholder="Eles entram em Exames › Pedidos pelo médico">'+
    '<button class="btn" onclick="addConsulta()">Salvar</button></div>';
  var hist=(p.consultas||[]).map(function(c,i){return{c:c,i:i}}).reverse();
  h+='<div class="card"><h2>Consultas anteriores</h2>';
  if(!hist.length)h+='<div class="empty">Nenhuma registrada.</div>';
  hist.forEach(function(x){h+='<div class="li"><b>'+esc(x.c.d)+'</b> <span class="tag t-info">'+esc(x.c.esp)+'</span><div>'+esc(x.c.nota).replace(/\n/g,'<br>')+'</div></div>'});
  return h+'</div>';
}
function addConsulta(){
  var n=val('cn'),ex=val('cex');if(!n&&!ex){alert('Escreva o que foi dito ou pedido.');return}
  var p=P();if(!p.consultas)p.consultas=[];
  var d=fmtDate(val('cd'))||nowStr().slice(0,10);
  p.consultas.push({esp:espSel,d:d,nota:n||'(exames pedidos)'+(ex?': '+ex:'')+''});
  ex.split(',').forEach(function(t){t=t.trim();if(t)p.pend.push({n:t,s:'pedido',esp:espSel,tipo:tipoOf(t),origem:'consulta '+d})});
  save();render();toast('Consulta registrada.');
}

/* ---------- leitura por imagem (OCR neste aparelho) ---------- */
var ocrW=null;
function loadScript(src){return new Promise(function(ok,no){var s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=function(){no(new Error('Não consegui carregar o leitor de fotos. Conecte à internet uma vez e tente de novo.'))};document.head.appendChild(s)})}
function ocrWorker(){
  if(ocrW)return ocrW;
  var base=new URL('ocr/',location.href).href;
  ocrW=(window.Tesseract?Promise.resolve():loadScript('ocr/tesseract.min.js')).then(function(){
    return Tesseract.createWorker('por',1,{workerPath:base+'worker.min.js',corePath:base,langPath:base,gzip:true,workerBlobURL:false,logger:function(m){if(m.status==='recognizing text')setSt('Lendo o texto da imagem… '+Math.round(m.progress*100)+'%')}});
  });
  ocrW.catch(function(){ocrW=null});return ocrW;
}
function prepImg(file){
  return createImageBitmap(file,{imageOrientation:'from-image'}).then(function(bm){
    var s=Math.min(1,2400/Math.max(bm.width,bm.height)),w=Math.round(bm.width*s),h=Math.round(bm.height*s),c=document.createElement('canvas');c.width=w;c.height=h;
    var x=c.getContext('2d');x.drawImage(bm,0,0,w,h);
    var im=x.getImageData(0,0,w,h),d=im.data,mn=255,mx=0,i,g;
    for(i=0;i<d.length;i+=4){g=(d[i]*.3+d[i+1]*.59+d[i+2]*.11)|0;d[i]=d[i+1]=d[i+2]=g;if(g<mn)mn=g;if(g>mx)mx=g}
    var k=mx>mn?255/(mx-mn):1;for(i=0;i<d.length;i+=4){g=Math.max(0,Math.min(255,((d[i]-mn)*k)|0));d[i]=d[i+1]=d[i+2]=g}
    x.putImageData(im,0,0);return c;
  });
}
function ocrImagem(file){return Promise.all([prepImg(file),ocrWorker()]).then(function(a){return a[1].recognize(a[0])}).then(function(r){return r.data.text})}
function ocrPdf(file){
  return Promise.all([file.arrayBuffer().then(function(b){return pdfjsLib.getDocument({data:b}).promise}),ocrWorker()]).then(function(a){
    var doc=a[0],w=a[1],out=[],i=1,n=Math.min(doc.numPages,8);
    function next(){
      if(i>n)return Promise.resolve(out.join('\n'));
      setSt('Lendo a página '+i+' de '+n+'…');
      return doc.getPage(i++).then(function(pg){var vp=pg.getViewport({scale:2.2}),c=document.createElement('canvas');c.width=vp.width;c.height=vp.height;return pg.render({canvasContext:c.getContext('2d'),viewport:vp}).promise.then(function(){return w.recognize(c)})}).then(function(r){out.push(r.data.text);return next()});
    }
    return next();
  });
}
function normOcr(t){
  return t.replace(/\bu[uU][lI1]\/m[lI1]/g,'µUI/mL').replace(/\bm[gq]\/d[lI1]\b/gi,'mg/dL').replace(/\bg\/d[lI1]\b/gi,'g/dL').replace(/\bn[gq]\/m[lI1]\b/gi,'ng/mL').replace(/\bpg\/m[lI1]\b/gi,'pg/mL').replace(/\bU\/[lI1]\b/g,'U/L').replace(/\bm[eE]q\/[lI1]\b/g,'mEq/L').replace(/\bmm[³3]\b/g,'mm³');
}

/* datas, unidades e resultados fora do catálogo */
function acharDatas(t){
  var re=/(\d{2})\/(\d{2})\/(\d{4})/g,m,ach=[],hoje=new Date(),seen={};
  while((m=re.exec(t))){
    var ds=m[0],dt=new Date(+m[3],+m[2]-1,+m[1]);if(+m[2]<1||+m[2]>12||+m[1]<1||+m[1]>31||dt>new Date(hoje.getTime()+864e5)||+m[3]<1990)continue;
    var ctx=t.slice(Math.max(0,m.index-40),m.index).toLowerCase(),pri=/coleta|colhid|realiz|data do exame|exame do dia|emiss|resultado|data\/hora/.test(ctx)?2:/nasc|idade|impress|assin/.test(ctx)?-1:0;
    if(seen[ds]){if(pri>seen[ds].pri)seen[ds].pri=pri;continue}
    seen[ds]={d:ds,pri:pri,t:dt.getTime()};ach.push(seen[ds]);
  }
  ach.sort(function(a,b){return b.pri-a.pri||b.t-a.t});
  return{sug:ach.length&&ach[0].pri>=0?ach[0].d:'',todas:ach.filter(function(x){return x.pri>=0}).map(function(x){return x.d}).slice(0,5)};
}
var UN='mg\\/dL|g\\/dL|ng\\/mL|pg\\/mL|µUI\\/mL|mUI\\/mL|UI\\/mL|UI\\/L|U\\/L|mEq\\/L|mmol\\/L|ng\\/dL|µg\\/dL|mcg\\/dL|mL\\/min|milhões\\/mm³|mil\\/mm³|\\/mm³|\\/µL|fL|pg|%';
function parseGenerico(raw,jaTem){
  var rx=new RegExp('^\\s*([A-Za-zÀ-ú][A-Za-zÀ-ú0-9 ()\\/.,+\\-]{2,55}?)\\s*[.:\\s]\\s*([<>]?\\s*\\d+(?:[.,]\\d+)?)\\s*('+UN+')(?![A-Za-z])(.*)$'),out=[],seen={};
  raw.split('\n').forEach(function(l){
    l=l.replace(/\s+/g,' ').trim();if(l.length<8||l.length>140)return;
    if(/(refer|valor es|data|paciente|crm|p[áa]gina|material|m[ée]todo|nascimento|solicitante|telefone|cpf)/i.test(l.split(/\d/)[0]))return;
    var m=rx.exec(l);if(!m)return;
    var n=m[1].replace(/[.:\s]+$/,'').trim(),v=num(m[2].replace(/[<>\s]/g,''));if(isNaN(v)||n.length<3||seen[n.toLowerCase()])return;
    var nn=norm(n);if(jaTem.some(function(x){var xn=norm(x);return xn===nn||xn.indexOf(nn)===0||nn.indexOf(xn)===0}))return;
    seen[n.toLowerCase()]=1;
    var e={n:n,v:v,u:m[3],inc:true,gen:true},rs=m[4]||'',r2=/(\d+(?:[.,]\d+)?)\s*(?:a|à|-|–|até)\s*(\d+(?:[.,]\d+)?)/.exec(rs),r3=/([<>])\s*(\d+(?:[.,]\d+)?)/.exec(rs);
    if(r2){e.min=num(r2[1]);e.max=num(r2[2])}else if(r3){if(r3[1]==='<'){e.max=num(r3[2])-0.001;e.ref='< '+r3[2]}else{e.min=num(r3[2])+0.001;e.ref='> '+r3[2]}}
    out.push(e);
  });
  return out.slice(0,60);
}

/* ---------- laudo paginado (ex.: Labormed): usa as referências do próprio laboratório ---------- */
var QUAL='(?:N[ãa]o\\s+reagentes?|Reagentes?|Negativos?|Positivos?|Ausentes?|Presentes?|Normal|Indetect[áa]vel|N[ãa]o\\s+detectado|Detectado|Fracamente\\s+positivo)';
var EXCL_REF=/mulher|feminin|crian|gestante|rec[ée]m|prematuro|fase |menopausa|puberal|adolesc|\bmeses\b|\bdias\b|\bsemanas\b|p[óo]s-|pr[ée]-?diabet|diabetes|limítrof|elevad|risco|meta|categoria|grau|insuficien|intermedi|dislipid|interpreta/i;
var PREF_REF=/n[ãa]o reagente|adulto|homens?|masculin|18 a 60|acima de 20|normal|valores normais|ideal|desej/i;
function catExame(n){
  var s=norm(n);
  if(/glicad|hba1c|glicemia|insulina|homa|colesterol|hdl|ldl|vldl|triglic|lipid|fosfolip|castelli|acido urico|ferro|ferritina|transferrina|vitamina|calcio|fosforo|magnesio|sodio|potassio|cloro|folato|folico|zinco|apolipo|lipoprot/.test(s))return'Metabolismo';
  if(/tsh|\bt3\b|\bt4\b|tiroxina|tireo|tpo/.test(s))return'Tireoide';
  if(/testosteron|fsh|\blh\b|prolactina|cortisol|estradiol|progesteron|dhea|shbg|\bpsa\b|igf|\bpth\b|aldosteron|hormonio|somatomed/.test(s))return'Hormônios';
  if(/pcr|proteina c reativa|vhs|hemossedimenta|reumatoide|anca|antinuclear|\bfan\b|complemento|endomisio|transglutaminase|gliadina/.test(s))return'Inflamação';
  if(/eritrocit|hemacia|hemoglobina|hematocrito|vcm|hcm|chcm|rdw|leucocit|neutrofil|linfocit|monocit|eosinofil|basofil|plaqueta|\bvpm\b|bastonete|segmentado|hemograma/.test(s)&&!/urin|piocito/.test(s))return'Hemograma';
  if(/creatinina|ureia|etfg|filtracao|microalbumin|albumina urin|\brac\b|cistatina|albumina\/creat/.test(s))return'Renal';
  if(/\btgo\b|\btgp\b|\bast\b|\balt\b|ggt|fosfatase|bilirrubina|albumina|proteinas totais|globulina|transaminase/.test(s))return'Função hepática';
  return'Outras';
}
function numBR(s){s=String(s).trim();if(/,/.test(s))s=s.replace(/\./g,'').replace(',','.');else if(/^\d{1,3}(\.\d{3})+$/.test(s))s=s.replace(/\./g,'');return parseFloat(s)}
function refDeLinhas(linhas){
  var c=[],tot=0;
  linhas.forEach(function(l0){
    var l=l0.replace(/^\s*(V\.?R\.?|Valores? de refer[êe]ncia)\s*:?\s*/i,'').trim();
    if(!l||l.length>150||/^[|]/.test(l)||/^(obs|fonte|importante|material|m[ée]todo|interpreta|nota)/i.test(l))return;
    tot++;
    var o=null,r,rg=/(\d[\d.,]*)\s*(?:a|à|-|–|até)\s*(\d[\d.,]*)/g,m;
    while((m=rg.exec(l))){
      if(/^\s*(anos|dias|meses|semanas)/i.test(l.slice(m.index+m[0].length)))continue;
      var a1=numBR(m[1]),a2=numBR(m[2]);if(isNaN(a1)||isNaN(a2))continue;
      o={min:a1,max:a2,ref:m[1]+' a '+m[2]};break;
    }
    if(!o&&(r=/(Inferior|Menor)(?:\s+ou\s+igual)?\s+(?:a|que)\s+(\d[\d.,]*)/i.exec(l))&&!/e\s+inferior/i.test(l)){var x=numBR(r[2]);if(!isNaN(x))o={max:x-1e-6,ref:'< '+r[2]}}
    else if(!o&&(r=/(Superior|Maior)(?:\s+ou\s+igual)?\s+(?:a|que)\s+(\d[\d.,]*)/i.exec(l))&&!/e\s+(inferior|menor)/i.test(l)){var y=numBR(r[2]);if(!isNaN(y))o={min:y+1e-6,ref:'> '+r[2]}}
    else if(!o&&(r=new RegExp('^(?:[A-Za-zÀ-ú ]{0,20}:\\s*)?('+QUAL+')\\s*$','i').exec(l)))o={refT:r[1]};
    if(!o)return;
    o.ctx=l;o.first=/^\s*(V\.?R\.?)/i.test(l0)&&!c.length;c.push(o);
  });
  if(!c.length)return null;
  function ex(o){return EXCL_REF.test(o.ctx.replace(/n[ãa]o reagente/i,'').replace(/normal/i,''))}
  var pref=c.filter(function(o){return(PREF_REF.test(o.ctx)||(o.first&&o.refT))&&!ex(o)});
  var o=pref[0]||(tot===1&&c.length===1&&!ex(c[0])?c[0]:null);
  if(!o)return null;delete o.ctx;return o;
}
var HDR=/^\s*(Paciente:|M[ée]dico:|Sr\. ?\(a\)|Solicitante|C[óo]digo\s|Unidade Coleta|Conv[êe]nio|Pag\.|A interpreta[çc][ãa]o|atos m[ée]dicos|AV\. DAS|Respons[áa]vel T|Matriz:|Assinatura digital|Procedimento realizado|EXAME LIBERADO|Liberado eletronicamente|Anteriores)/i;
function nomeBonito(n){n=n.replace(/^Dosagem de\s+/i,'');if(n.length>5&&n===n.toUpperCase())n=n.charAt(0)+n.slice(1).toLowerCase();return n}
function parseLaudo(raw){
  var L=raw.replace(/\f/g,'\n').split('\n').filter(function(l){return!HDR.test(l)}),out=[],seen={},seg=[];
  var rxRes=new RegExp('^\\s{0,12}([A-Za-zÀ-ú0-9][^|]{1,90}?)[\\s.]*:?[ \\t]{3,}((?:(?:Superior|Inferior|Maior|Menor)(?:\\s+ou\\s+igual)?\\s+(?:a|que)\\s+)?\\d[\\d.,]*|'+QUAL+')\\b[ \\t]*('+UN+'|mg\\/g\\s*Crea\\w*|mL(?:\\/min)?|mm\\/h|mm|\\/uL|\\/μL|µg\\/mL|U\\/mL|nmol\\/L|pmol\\/L|mg\\/L|g\\/L)?(?:[ \\t]+(.*))?$','i');
  function fecha(d){
    var titulo='',i;
    for(i=0;i<seg.length;i++){var t=seg[i].trim();if(t&&!/^(material|m[ée]todo|data\/hora|nota)/i.test(t)&&!/^\S.*:\s*$/.test(t)||/^Resultado/i.test(t)&&false){titulo=t.replace(/[:\s.]+$/,'');if(!rxRes.test(seg[i]))break;titulo='';break}}
    var res=[];
    seg.forEach(function(l,i){
      var tt=l.trim();
      if(/^(VR|V\.R\.?|Obs|Fonte|Importante|Material|M[ée]todo|Interpreta|Nota)/i.test(tt)&&!/^Resultado/i.test(tt))return;
      var m=rxRes.exec(l);if(!m)return;
      if(/^\s*(a|à|até|-)\s+\d/i.test(m[4]||''))return;
      var nome=m[1].replace(/[\s.:]+$/,'').trim();
      if(/^resultado\s*(0\d)?$/i.test(nome)){if(/0[2-9]$/.test(nome))return;nome=titulo}
      if(!nome||nome.length<2||/^(data|sr|c[óo]digo|idade|conv|unidade|solicitante|pag)/i.test(nome))return;
      res.push({i:i,nome:nome,val:m[2],un:(m[3]||'').replace(/\s+/g,' '),rest:(m[4]||'').trim()});
    });
    res.forEach(function(r,k){
      var nx=k+1<res.length?res[k+1].i:seg.length,refL=[];
      if(r.rest&&r.rest.length>2)refL.push(r.rest);
      for(var j=r.i+1;j<nx;j++){var s=seg[j];if(/^\s*(VR|V\.R\.?)/i.test(s)||refL.length)refL.push(s)}
      var ref=refDeLinhas(refL),e={n:nomeBonito(r.nome),u:r.un,d:d,cat:/urin|\beas\b|sum[áa]rio/i.test(titulo)?'Outras':catExame(r.nome),grupo:titulo};
      if(/^\d/.test(r.val)){e.v=numBR(r.val);if(isNaN(e.v))return}else{e.v=null;e.vt=r.val.replace(/\s+/g,' ')}
      if(/^(Superior|Inferior|Maior|Menor)/i.test(r.val)){e.v=null;e.vt=r.val.replace(/\s+/g,' ')}
      if(ref){if(ref.min!=null)e.min=ref.min;if(ref.max!=null)e.max=ref.max;if(ref.ref)e.ref=ref.ref;if(ref.refT)e.refT=ref.refT}
      if(ref==null)e.semRef=true;
      var key=norm(e.n)+'|'+d;if(seen[key])return;seen[key]=1;
      out.push(e);
    });
    seg=[];
  }
  L.forEach(function(l){
    var m=/Data\/Hora Coleta:\s*(\d\d\/\d\d\/\d{4})/i.exec(l);
    if(m)fecha(m[1]);else seg.push(l);
  });
  return out;
}

/* ---------- importação: ler, conferir, salvar ---------- */
function getRelE(p,esp){if(!p.rel)p.rel={};if(!p.rel[esp])p.rel[esp]=(ESP[esp]?ESP[esp].ex.slice():[]);return p.rel[esp]}
function linkRel(p,nome){
  var k=nome.toLowerCase().split(' ')[0];
  Object.keys(ESP).forEach(function(esp){
    var nomes=ESP[esp].ex.concat(SUG[esp]||[]);
    if(nomes.some(function(n){return n.toLowerCase().split(' ')[0]===k})){var r=getRelE(p,esp);if(r.indexOf(nome)<0)r.push(nome)}
  });
}
function marcaFeito(p,nome,data){
  var k=nome.toLowerCase().split(' ')[0];if(k.length<4)return;
  p.pend.forEach(function(x){if((x.s==='a pedir'||x.s==='pedido')&&x.n.toLowerCase().indexOf(k)>-1){x.s='realizado';x.dataRes=data}});
}
function stagingRefresh(){var e=document.getElementById('staging');if(e)e.innerHTML=renderStaged()}
function readFiles(files){
  var list=[].slice.call(files).filter(function(f){return/pdf$/i.test(f.name)||f.type==='application/pdf'||/^image\//.test(f.type)||/\.(jpe?g|png|webp|heic)$/i.test(f.name)});
  if(!list.length){setSt('Selecione PDFs ou fotos.');return}
  var chain=Promise.resolve();
  list.forEach(function(f){
    chain=chain.then(function(){return leArquivo(f)}).then(function(r){staged.push(r)},function(e){staged.push({file:f.name,tipo:'erro',msg:String(e&&e.message||e)})});
  });
  chain.then(function(){setSt('Leitura concluída. Confira os dados abaixo antes de salvar.');stagingRefresh()});
}
function leArquivo(f){
  var img=/^image\//.test(f.type)||/\.(jpe?g|png|webp|heic)$/i.test(f.name),p;
  setSt('Lendo '+f.name+'…');
  if(img)p=ocrImagem(f).then(function(t){return{t:t,ocr:true}});
  else{
    if(!window.pdfjsLib)return Promise.reject(new Error('O leitor de PDF não carregou. Conecte à internet e recarregue a página.'));
    pdfjsLib.GlobalWorkerOptions.workerSrc='pdf.worker.min.js';
    p=extract(f).then(function(t){
      if(t.replace(/\s/g,'').length<60){setSt('PDF escaneado: lendo como imagem…');return ocrPdf(f).then(function(t2){return{t:t2,ocr:true}})}
      return{t:t,ocr:false};
    });
  }
  return p.then(function(o){var r=analyze(f.name,normOcr(o.t),o.ocr);r.fileObj=f;if(img)r.thumb=URL.createObjectURL(f);return r});
}
function analyze(name,raw,ocr){
  var t=raw.replace(/[ \t]+/g,' '),r={file:name,raw:raw,ocr:!!ocr};
  if(t.replace(/\s/g,'').length<40){r.tipo='sem texto';return r}
  var dt=acharDatas(t);r.data=dt.sug;r.datas=dt.todas;
  r.nomeOk=norm(t).indexOf(norm(P().nome.split(' ')[0]))>-1;
  if(/bioimped|inbody/i.test(t)){r.tipo='bioimpedância';r.bio=parseBio(t)}
  else if(/(valores? de refer|V\.R\.|resultado|refer[êe]ncia)/i.test(t)&&/(mg\/dL|g\/dL|U\/L|mEq|\/mm|ng\/mL|pg\/mL|µUI|UI\/)/i.test(t)){
    r.tipo='laudo laboratorial';
    var lp=/\f/.test(raw)||/Sr\. ?\(a\)/.test(raw)?parseLaudo(raw):[];
    if(lp.length>=3){r.laudo=true;r.ex=lp;var nm=/Data Nascimento\s*:\s*(\d\d\/\d\d\/\d{4})/i.exec(raw);r.nasc=nm?nm[1]:'';var pc=/(?:Sr\. ?\(a\)|Paciente)\s*:\s*([^\n]+?)(?:\s{3,}|\n)/i.exec(raw);r.paciente=pc?pc[1].trim():'';var ds={};lp.forEach(function(e){ds[e.d]=(ds[e.d]||0)+1});r.datas=Object.keys(ds);r.data=r.datas.sort(function(a,b){return ds[b]-ds[a]})[0]||r.data;}
    else{r.ex=parseLab(t);r.ex=r.ex.concat(parseGenerico(raw,r.ex.map(function(x){return x.n})));}
  }
  else if(/(receita|prescri|posologia|uso oral|comprimido)/i.test(t)){r.tipo='receita';r.lines=candLines(raw,/\b\d+([.,]\d+)?\s?(mg|mcg|µg|ml|g|ui)\b|comprimido|c[áa]psula|gotas/i,30)}
  else if(/(solicit|pedido|requisi)/i.test(t)&&/exame/i.test(t)){r.tipo='pedido de exames';r.lines=candLines(raw,/[A-Za-zÀ-ú]{4}/,60)}
  else{r.tipo='consulta / outro';r.resumo=raw.replace(/\s+/g,' ').slice(0,700)}
  return r;
}
function setData(i,d){var e=document.getElementById('s'+i+'_d');if(e)e.value=d}
function renderStaged(){
  if(!staged.length)return'';
  var h='';
  staged.forEach(function(r,i){
    h+='<div class="card"><h2>'+esc(r.file)+' <span class="tag t-info">'+esc(r.tipo)+'</span>'+(r.ocr?' <span class="tag t-lim">lido de imagem</span>':'')+'</h2>';
    if(r.thumb)h+='<img src="'+r.thumb+'" alt="" style="max-height:130px;max-width:100%;border-radius:8px;margin-bottom:6px">';
    if(r.tipo==='erro'){h+='<div class="mut">Não consegui ler este arquivo: '+esc(r.msg)+'</div><button class="btn sec sm" onclick="discard('+i+')">Descartar</button></div>';return}
    if(r.tipo==='sem texto'){h+='<div class="mut">Não consegui reconhecer texto. Tente uma foto mais nítida, com boa luz e sem cortar as bordas.</div><button class="btn sec sm" onclick="discard('+i+')">Descartar</button></div>';return}
    if(r.ocr)h+='<div class="aviso" style="margin-bottom:8px">'+IC.warn+'<span>Texto lido de imagem pode ter erros. <b>Confira cada valor com o original.</b></span></div>';
    if(!r.nomeOk)h+='<div class="aviso ruim" style="margin-bottom:8px">'+IC.warn+'<span>O nome “'+esc(P().nome.split(' ')[0])+'” não aparece neste documento. Confira se é o perfil certo.</span></div>';
    h+='<label>Data do documento (dd/mm/aaaa)'+(r.data?'':' — <b style="color:var(--bad)">não encontrei, preencha</b>')+'</label><input id="s'+i+'_d" value="'+esc(r.data)+'" inputmode="numeric">';
    if(r.datas&&r.datas.length>1)h+='<div class="chips" style="margin-top:6px"><span class="mut">Outras datas no documento:</span>'+r.datas.map(function(d){return'<button class="chip" onclick="setData('+i+',\''+d+'\')">'+d+'</button>'}).join('')+'</div>';
    if(r.tipo==='laudo laboratorial'&&r.laudo){h+=renderLaudo(i,r)}
    else if(r.tipo==='laudo laboratorial'){
      if(!r.ex.length)h+='<p class="mut">Nenhum resultado foi reconhecido. Você pode digitar em Adicionar › Exame.</p>';
      else{
        var nconf=r.ex.filter(function(e){return e.gen}).length;
        h+='<p class="mut">Encontrei '+r.ex.length+' resultado(s)'+(nconf?'; '+nconf+' marcado(s) “conferir” (lidos de forma automática, vêm desmarcados)':'')+'. Corrija valor e unidade se preciso.</p><div class="tw"><table><tr><th></th><th>Exame</th><th>Valor</th><th>Un.</th><th>Ref.</th></tr>';
        r.ex.forEach(function(e,j){
          h+='<tr'+(e.gen?' class="conf"':'')+'><td><input type="checkbox" id="s'+i+'_e'+j+'_c"'+(e.gen?'':' checked')+' style="width:auto"></td><td><input class="xi" id="s'+i+'_e'+j+'_n" value="'+esc(e.n)+'"></td><td><input class="xi" id="s'+i+'_e'+j+'_v" value="'+e.v+'" inputmode="decimal"></td><td><input class="xi" id="s'+i+'_e'+j+'_u" value="'+esc(e.u)+'"></td><td class="mut">'+esc(refTxt(e))+'</td></tr>';
        });
        h+='</table></div>';
      }
    }else if(r.tipo==='bioimpedância'){
      var b=r.bio,labs={peso:'Peso (kg)',gord:'Massa de gordura (kg)',musc:'Massa muscular esquelética (kg)',visc:'Gordura visceral (nível)',imc:'IMC',pgc:'Gordura corporal (%)',rcq:'Relação cintura-quadril',tmb:'Taxa metabólica basal (kcal)',agua:'Água corporal (L)'};
      h+='<p class="mut">Campos vazios não foram encontrados: preencha ou deixe em branco.</p>';
      Object.keys(labs).forEach(function(k){h+='<label>'+labs[k]+'</label><input id="s'+i+'_b_'+k+'" value="'+esc(b[k])+'" inputmode="decimal">'});
    }else if(r.tipo==='receita'||r.tipo==='pedido de exames'){
      h+='<p class="mut">'+(r.tipo==='receita'?'Marque as linhas que são medicamentos. Elas entram em Saúde › Medicamentos.':'Marque as linhas que são exames pedidos pelo médico. Elas entram em Saúde › Exames › Pedidos pelo médico.')+'</p>';
      if(r.tipo==='pedido de exames')h+='<label>Médico / especialidade que fez o pedido</label><select id="s'+i+'_esp">'+espList().map(function(t){return'<option'+(t===lastEsp?' selected':'')+'>'+esc(t)+'</option>'}).join('')+'</select>';
      if(!r.lines.length)h+='<p class="mut">Não encontrei linhas úteis.</p>';
      r.lines.forEach(function(l,j){h+='<div style="display:flex;gap:6px;align-items:center;margin-bottom:4px"><input type="checkbox" id="s'+i+'_l'+j+'_c" style="width:auto"><input class="xi" id="s'+i+'_l'+j+'_t" value="'+esc(l)+'"></div>'});
    }else{
      h+='<p class="mut">Tipo não reconhecido para extrair valores. Prévia do texto:</p><div class="mut" style="background:var(--bg);padding:8px;border-radius:8px">'+esc(r.resumo)+'…</div><p class="mut">Salvar registra o documento e guarda o original.</p>';
    }
    h+='<label style="display:flex;gap:8px;align-items:center;color:var(--ink)"><input type="checkbox" id="s'+i+'_loc" checked style="width:auto">Guardar o original neste aparelho</label>';
    if(window.G&&G.connected())h+='<label style="display:flex;gap:8px;align-items:center;color:var(--ink)"><input type="checkbox" id="s'+i+'_up" checked style="width:auto">Guardar o original no Drive de '+esc(P().nome.split(' ')[0])+'</label>';
    h+='<div class="row"><button class="btn" onclick="saveStaged('+i+')">Salvar em '+esc(P().nome.split(' ')[0])+'</button><button class="btn sec" onclick="discard('+i+')">Descartar</button></div></div>';
  });
  return h;
}
function saveStaged(i){
  var r=staged[i],p=P(),d=val('s'+i+'_d'),res='',ir=0;
  if(!/^\d{2}\/\d{2}\/\d{4}$/.test(d)){alert('Preencha a data do documento como dd/mm/aaaa.');return}
  if(r.tipo==='laudo laboratorial'&&r.laudo){var sl=saveLaudo(i,r,d);res=sl.res;ir=sl.n}
  else if(r.tipo==='laudo laboratorial'){
    var n=0,skip=0;
    r.ex.forEach(function(e,j){
      if(!document.getElementById('s'+i+'_e'+j+'_c').checked)return;
      var nome=val('s'+i+'_e'+j+'_n'),v=num(val('s'+i+'_e'+j+'_v'));
      if(!nome||isNaN(v))return;
      if(p.exames.some(function(x){return x.n===nome&&x.d===d})){skip++;return}
      p.exames.push({n:nome,v:v,u:val('s'+i+'_e'+j+'_u'),min:e.min,max:e.max,ref:e.ref,d:d,orig:r.file});n++;
      linkRel(p,nome);marcaFeito(p,nome,d);
    });
    res=n+' exames salvos'+(skip?', '+skip+' já existiam':'');ir=n;
  }else if(r.tipo==='bioimpedância'){
    var o={d:d};
    ['peso','gord','musc','visc','imc','pgc','rcq','tmb','agua'].forEach(function(k){var v=num(val('s'+i+'_b_'+k));o[k]=isNaN(v)?'':v});
    if(['peso','gord','musc','visc','imc','pgc'].every(function(k){return o[k]===''})){alert('Preencha ao menos um valor da bioimpedância.');return}
    var ant=p.bio.filter(function(x){return x.d===d})[0];if(ant)logAnt('bio',ant);
    p.bio=p.bio.filter(function(x){return x.d!==d});p.bio.push(o);
    p.bio.sort(function(a,b){return dkey(a.d)<dkey(b.d)?-1:1});
    res='bioimpedância salva';
  }else if(r.tipo==='receita'||r.tipo==='pedido de exames'){
    var c=0;
    r.lines.forEach(function(l,j){
      if(!document.getElementById('s'+i+'_l'+j+'_c').checked)return;
      var t=val('s'+i+'_l'+j+'_t');if(!t)return;
      if(r.tipo==='receita')p.meds.push({tipo:'Medicamento',n:t,dose:'conferir na receita',motivo:'',finalidade:'',nota:'Importado de '+(r.ocr?'foto':'PDF')+'. Confirmar com o prescritor.'});
      else p.pend.push({n:t,s:'pedido',esp:val('s'+i+'_esp')||'Clínico geral',tipo:tipoOf(t),origem:'documento '+d});
      c++;
    });
    res=c+' linhas salvas';
  }else res='registrado';
  var perfil=S.cur,id=Date.now().toString(36)+Math.floor(Math.random()*1e4).toString(36),loc=document.getElementById('s'+i+'_loc'),up=document.getElementById('s'+i+'_up');
  var doc={tipo:r.tipo,file:r.file,d:d,res:res,em:nowStr(),ocr:!!r.ocr};
  if(r.fileObj&&loc&&loc.checked){doc.id=id;doc.mime=r.fileObj.type;doc.size=r.fileObj.size}
  if(r._push&&doc.id)r._push.forEach(function(e){e.docId=doc.id});
  p.docs.push(doc);
  var fobj=r.fileObj,subir=up&&up.checked&&fobj;
  staged.splice(i,1);save();
  if(doc.id)idbPut(perfil+'/'+id,fobj).catch(function(){toast('Salvei os dados, mas não consegui guardar o original neste aparelho.')});
  toast('Salvo: '+res+'.');
  if(subir){
    var k=dkey(d),iso=k.length===8?k.slice(0,4)+'-'+k.slice(4,6)+'-'+k.slice(6):'sem-data';
    G.uploadOriginal(perfil,fobj,iso+' '+r.tipo+' - '+r.file).then(function(x){doc.drive=x.id;persist();toast('Original guardado no Drive.')}).catch(function(e){alert('O arquivo não foi guardado no Drive: '+e.message)});
  }
  if(ir)goSaude('exames');else render();
}

