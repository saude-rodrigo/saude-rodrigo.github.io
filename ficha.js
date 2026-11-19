/* v18 — prontuário: diagnósticos por tipo, medicamentos, sintomas, exames, resumo e ficha inicial.
   Este arquivo vem DEPOIS de prontuario.js e substitui as versões mais simples das funções abaixo. */

var TD=[['conf','Diagnóstico confirmado'],['inv','Em investigação / suspeita'],['rel','Condição relatada (sem documento)'],['ant','Antecedente / histórico']];
var EST=[['a pedir','Sugerido'],['pedido','Solicitado pelo médico'],['agendado','Agendado'],['realizado','Realizado'],['resultado','Resultado disponível']];
var CATS=['Hemograma','Metabolismo','Função hepática','Renal','Tireoide','Hormônios','Inflamação','Outras'];
var editEx=-1,sintSel='',catAberta={};
function tdNome(k){var r='';TD.forEach(function(t){if(t[0]===k)r=t[1]});return r||'Condição relatada (sem documento)'}
function estNome(k){var r='';EST.forEach(function(t){if(t[0]===k)r=t[1]});return r||k}
function idadeDe(s){var m=/^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s||'');if(!m)return'';var h=new Date(),a=h.getFullYear()-m[3];if(h.getMonth()+1<+m[2]||(h.getMonth()+1===+m[2]&&h.getDate()<+m[1]))a--;return a}
var ALIAS={'pcr':'proteina c reativa','ck':'cpk|creatinoquinase|ck total','cpk':'cpk|creatinoquinase|ck total','b12':'b12|cobalamina','vitamina d':'vitamina d|25-oh','ferritina':'ferritina','tsh':'tsh','t4 livre':'t4','hemograma':'hemograma|eritrocitos|leucocitos|plaquetas|hemoglobina','vhs':'vhs|hemossedimenta'};
function casaNome(nExame,alvo){
  var n=norm(nExame),a=norm(alvo).replace(/\(.*?\)/g,'').trim();if(!a)return false;
  var al=ALIAS[a];if(al)return new RegExp(al).test(n)&&(a!=='hemograma'||/eritro|leuc|plaq|hemoglobina$|^hemoglobina$/.test(n));
  if(/urin/.test(n)&&!/urin/.test(a))return false;
  if(/^relacao|\//.test(n)&&!/relacao|\//.test(a))return false;
  return n.indexOf(a)>-1||a.indexOf(n)>-1&&n.length>3;
}
function ultMatch(p,alvo){var r=null;p.exames.forEach(function(e){if(casaNome(e.n,alvo)&&(!r||dkey(e.d)>=dkey(r.d)))r=e});return r}
function antTxt(p,x){
  var a=ultMatch(p,x.n);if(!a)return'sem resultado no histórico — isso não prova que nunca foi feito';
  if(norm(x.n)==='hemograma')return'último hemograma no histórico: '+a.d;
  return'último resultado: '+vtxt(a)+' '+(a.u||'')+' em '+a.d+' (histórico)';
}
function catDe(e){return e.cat||catExame(e.n)}

/* ---------- diagnósticos ---------- */
function diagForm(x,i){
  return'<label>Diagnóstico ou condição</label><input id="dg_n" value="'+esc(x.n||'')+'">'+
    '<label>Situação</label><select id="dg_t">'+TD.map(function(t){return'<option value="'+t[0]+'"'+(t[0]===(x.tipo||'rel')?' selected':'')+'>'+t[1]+'</option>'}).join('')+'</select>'+
    '<label>Desde quando / quando (opcional)</label><input id="dg_d" value="'+esc(x.desde||'')+'" placeholder="Ex.: 2019, 03/2021, julho de 2026">'+
    '<label>Documento que confirma (opcional)</label><input id="dg_doc" value="'+esc(x.doc||'')+'" placeholder="Ex.: laudo, receita, relatório médico">'+
    '<label>Observação (opcional)</label><input id="dg_o" value="'+esc(x.obs||'')+'">'+
    '<div class="row"><button class="btn" onclick="saveDiag('+i+')">'+(i<0?'Adicionar':'Salvar')+'</button>'+(i<0?'':'<button class="btn sec" onclick="diagEd=-1;render(true)">Cancelar</button>')+'</div>';
}
function saveDiag(i){
  var n=val('dg_n');if(!n){alert('Escreva o diagnóstico.');return}
  var p=P();if(!p.diag)p.diag=[];
  if(i<0&&p.diag.some(function(x){return!x.fim&&norm(x.n)===norm(n)})){alert('Este registro já existe.');return}
  var o=Object.assign({},i>=0?p.diag[i]:{},{n:n,tipo:val('dg_t')||'rel',desde:val('dg_d'),doc:val('dg_doc'),obs:val('dg_o')});
  if(!o.em)o.em=nowStr();
  if(i<0)p.diag.push(o);else{logAnt('diag',p.diag[i]);p.diag[i]=o}
  diagEd=-1;save();render(true);toast('Salvo.');
}
function vDiag(p){
  if(!p.diag)p.diag=[];
  var h='<div class="card"><p class="mut" style="margin:0">Registre o que foi informado por médicos ou relatado por você. O app não sugere nem calcula diagnósticos. <b>Suspeitas não são diagnósticos.</b></p></div>';
  var at=p.diag.map(function(x,i){return{x:x,i:i}}),ativos=at.filter(function(o){return!o.x.fim}),enc=at.filter(function(o){return o.x.fim});
  h+='<div class="card">';
  if(!ativos.length)h+='<div class="empty">Nenhum registro.</div>';
  TD.forEach(function(t){
    var l=ativos.filter(function(o){return(o.x.tipo||'rel')===t[0]});if(!l.length)return;
    h+='<div class="grp">'+t[1]+'</div>';
    l.forEach(function(o){
      if(o.i===diagEd){h+=diagForm(o.x,o.i);return}
      h+='<div class="li"><b>'+esc(o.x.n)+'</b>'+(o.x.desde?' <span class="tag t-info">'+esc(o.x.desde)+'</span>':'')+(o.x.doc?' <span class="tag t-ok">doc: '+esc(o.x.doc)+'</span>':'')+(o.x.obs?'<div class="mut">'+esc(o.x.obs)+'</div>':'')+
        '<div class="row" style="margin-top:4px"><button class="btn sm sec" onclick="diagEd='+o.i+';render(true)">Editar</button><button class="btn sm sec" onclick="encerraDiag('+o.i+')">Encerrar</button></div></div>';
    });
  });
  h+='</div>';
  if(diagEd<0)h+='<div class="card"><h2>Adicionar</h2>'+diagForm({},-1)+'</div>';
  if(enc.length)h+='<details class="card"><summary>Encerrados ('+enc.length+')</summary>'+enc.map(function(o){return'<div class="li"><b>'+esc(o.x.n)+'</b> <span class="mut">encerrado em '+esc(o.x.fim)+'</span> <button class="btn sm sec" onclick="reativaDiag('+o.i+')">Reativar</button></div>'}).join('')+'</details>';
  return h;
}

/* ---------- medicamentos ---------- */
function medSit(m){return m.sit==='confirmado'?['uso confirmado','t-ok']:['uso pendente de confirmação','t-lim']}
function usoForm(m,i){
  var tem=!!(m.motivo||m.finalidade||m.compra||m.qtd||m.hor||m.freq||m.presc||m.inicio||m.efeitos||m.nota&&m.nota!=='—');
  return'<div class="li"><label>Tipo</label><select id="u_t">'+TIPOS_USO.map(function(t){return'<option'+(t===(m.tipo||'Medicamento')?' selected':'')+'>'+esc(t)+'</option>'}).join('')+'</select>'+
   '<label>Nome</label><input id="u_n" value="'+esc(m.n||'')+'">'+
   '<label>Dose</label><input id="u_d" value="'+esc(m.dose||'')+'" placeholder="Ex.: 50 mg">'+
   '<label>Situação do uso</label><select id="u_s"><option value="pendente"'+(m.sit!=='confirmado'?' selected':'')+'>Uso pendente de confirmação</option><option value="confirmado"'+(m.sit==='confirmado'?' selected':'')+'>Uso confirmado</option></select>'+
   '<details class="mais"'+(tem&&i>=0?' open':'')+'><summary>Mais detalhes (opcional)</summary>'+
   '<div class="row wrap"><div><label>Frequência</label><input id="u_fq" value="'+esc(m.freq||'')+'" placeholder="Ex.: 1x ao dia, SOS"></div><div><label>Horário(s)</label><input id="u_h" value="'+esc(m.hor||'')+'" placeholder="Ex.: 22:00"></div></div>'+
   '<label>Indicação (para quê)</label><input id="u_m" value="'+esc(m.motivo||'')+'">'+
   '<div class="row wrap"><div><label>Médico prescritor</label><input id="u_p" value="'+esc(m.presc||'')+'"></div><div><label>Início</label><input id="u_i" value="'+esc(m.inicio||'')+'" placeholder="mm/aaaa"></div></div>'+
   '<label>Efeitos adversos percebidos</label><input id="u_e" value="'+esc(m.efeitos||'')+'" placeholder="Só o que você notou">'+
   '<label>Pontos para revisar com o médico</label><input id="u_o" value="'+esc(m.nota&&m.nota!=='—'?m.nota:'')+'">'+
   '<label>Estoque (avisa quando estiver acabando)</label>'+
   '<div class="row wrap"><div><label>Data da compra</label><input type="date" id="u_c" value="'+esc(m.compra||'')+'"></div><div><label>Qtd. comprada</label><input type="number" inputmode="decimal" id="u_q" value="'+esc(m.qtd||'')+'"></div></div>'+
   '<div class="row wrap"><div><label>Qtd. por vez</label><input type="number" inputmode="decimal" step="0.25" id="u_pv" value="'+esc(m.porVez||'')+'"></div><div><label>Vezes por dia</label><input type="number" inputmode="decimal" id="u_vd" value="'+esc(m.vezes||'')+'"></div><div><label>Avisar com (dias)</label><input type="number" inputmode="numeric" id="u_av" value="'+esc(m.aviso||'7')+'"></div></div></details>'+
   '<div class="row"><button class="btn" onclick="saveUso('+i+')">'+(i<0?'Adicionar':'Salvar')+'</button>'+(i<0?'':'<button class="btn sec" onclick="editUso=-1;render(true)">Cancelar</button>')+'</div></div>';
}
function saveUso(i){
  var n=val('u_n');if(!n){alert('Informe o nome.');return}
  var p=P();
  if(i<0&&p.meds.some(function(m){return norm(m.n)===norm(n)})){alert('Este medicamento já está cadastrado.');return}
  var o=Object.assign({},i>=0?p.meds[i]:{},{tipo:val('u_t'),n:n,dose:val('u_d'),sit:val('u_s')||'pendente',freq:val('u_fq'),hor:val('u_h'),motivo:val('u_m'),presc:val('u_p'),inicio:val('u_i'),efeitos:val('u_e'),nota:val('u_o'),compra:val('u_c'),qtd:val('u_q'),porVez:val('u_pv'),vezes:val('u_vd'),aviso:val('u_av')||'7'});
  if(i<0){p.meds.push(o);if(tab==='adicionar'){editUso=-1;save();toast('Medicamento adicionado.');goSaude('meds');return}}
  else{logAnt('med',p.meds[i]);p.meds[i]=o}
  editUso=-1;save();render(true);
}
function vMeds(p){
  var h='<div class="row" style="margin-bottom:8px"><button class="btn" onclick="goAdd(\'med\')">'+IC.plus+' Adicionar medicamento</button></div><div class="card">';
  if(!p.meds.length)h+='<div class="empty">Nada cadastrado.</div>';
  TIPOS_USO.forEach(function(t){
    var its=[];p.meds.forEach(function(m,i){if((m.tipo||'Medicamento')===t)its.push(i)});
    if(!its.length)return;
    h+='<div class="grp">'+esc(t)+'</div>';
    its.forEach(function(i){
      var m=p.meds[i];
      if(i===editUso){h+=usoForm(m,i);return}
      var s=medSit(m);
      h+='<div class="li"><b>'+esc(m.n)+'</b> <span class="tag t-info">'+esc(m.dose||'dose não informada')+'</span> <span class="tag '+s[1]+'">'+s[0]+'</span>'+
        (m.freq||m.hor?'<div class="mut">'+esc([m.freq,m.hor].filter(Boolean).join(' · '))+'</div>':'')+
        (m.motivo?'<div class="mut">Indicação: '+esc(m.motivo)+'</div>':'')+(m.presc?'<div class="mut">Prescritor: '+esc(m.presc)+'</div>':'')+
        (m.efeitos?'<div class="mut">Efeitos percebidos: '+esc(m.efeitos)+'</div>':'')+
        estoqueHtml(m)+(m.nota&&m.nota!=='—'?'<div class="mut">Para revisar: '+esc(m.nota)+'</div>':'')+
        '<div class="row" style="margin-top:4px">'+(m.sit==='confirmado'?'':'<button class="btn sm" onclick="confirmaUso('+i+')">Confirmar uso</button>')+'<button class="btn sm sec" onclick="editUso='+i+';render(true)">Editar</button><button class="btn sm sec" onclick="encerraUso('+i+')">Suspender / encerrar</button></div></div>';
    });
  });
  h+='<p class="mut" style="margin:10px 0 0">O app não altera tratamentos nem sugere doses. Não interrompa, inicie nem ajuste remédios sem o prescritor.</p></div>';
  var old=p.medsOld||[];
  if(old.length)h+='<details class="card"><summary>Encerrados ('+old.length+')</summary>'+old.map(function(m,i){return'<div class="li"><b>'+esc(m.n)+'</b> <span class="mut">'+esc(m.dose||'')+' · encerrado em '+esc(m.fim||'')+'</span><div><button class="btn sm sec" onclick="reativaUso('+i+')">Voltar a usar</button></div></div>'}).join('')+'</details>';
  return h;
}
function confirmaUso(i){var p=P();logAnt('med',p.meds[i]);p.meds[i].sit='confirmado';save();render(true);toast('Uso confirmado.')}

/* ---------- sintomas ---------- */
var FREQ=['Ocasional','Algumas vezes por semana','Diário','Constante'];
var ESTS=[['relatado','Relatado'],['investigar','A investigar'],['monitorar','Observar (não registrado como presente)']];
function sintLog(p){if(!p.sintLog)p.sintLog=[];return p.sintLog}
function sintHist(p,n){return sintLog(p).filter(function(x){return norm(x.n)===norm(n)}).sort(function(a,b){return(a.t||'')<(b.t||'')?-1:1})}
function vSintomas(p){
  if(!p.sint)p.sint=[];
  var h='<div class="row" style="margin-bottom:8px"><button class="btn" onclick="goAdd(\'sint\')">'+IC.plus+' Registrar sintoma</button></div>';
  h+='<div class="card"><p class="mut" style="margin:0">Sintomas relatados não são diagnósticos. Os marcados “observar” <b>não contam como presentes</b> até você mudar a situação.</p></div>';
  var grupos={};p.sint.forEach(function(s,i){(grupos[s.grupo||'Outros']=grupos[s.grupo||'Outros']||[]).push(i)});
  if(!p.sint.length)h+='<div class="card"><div class="empty">Nenhum sintoma acompanhado. Use “Registrar sintoma”.</div></div>';
  Object.keys(grupos).forEach(function(g){
    h+='<div class="card"><h2>'+esc(g)+'</h2>';
    grupos[g].forEach(function(i){
      var s=p.sint[i],hs=sintHist(p,s.n),vals=hs.slice(-5).map(function(x){return x.int}),ult=hs[hs.length-1],es=ESTS.filter(function(e){return e[0]===s.estado})[0]||ESTS[0];
      h+='<div class="li"><div class="exr"><div><b>'+esc(s.n)+'</b><div class="mut">'+(ult?'Último: '+esc(ult.d)+' · '+ult.int+'/10':'Sem registro de intensidade')+(vals.length>1?' · evolução '+vals.join(' → '):'')+'</div></div>'+
        '</div>'+
        '<div class="row" style="margin-top:4px;align-items:center"><select style="flex:1 1 auto;min-width:0" onchange="setSintEstado('+i+',this.value)">'+ESTS.map(function(e){return'<option value="'+e[0]+'"'+(e[0]===s.estado?' selected':'')+'>'+e[1]+'</option>'}).join('')+'</select><button class="btn sm" style="flex:0 0 auto" onclick="sintSel=\''+esc(s.n).replace(/'/g,"\\'")+'\';goAdd(\'sint\')">Registrar</button></div></div>';
    });
    h+='</div>';
  });
  h+='<details class="card"><summary>Calendário e diário completo do dia</summary>'+vHistorico()+'</details>';
  return h;
}
function setSintEstado(i,e){var p=P();logAnt('sint',p.sint[i]);p.sint[i].estado=e;save();render(true)}
function vSintReg(){
  var p=P();if(!p.sint)p.sint=[];
  var d=new Date(),hh=pad(d.getHours())+':'+pad(d.getMinutes());
  var h='<div class="card"><h2>Registrar sintoma</h2><label>Qual sintoma?</label><select id="sg_n" onchange="sintSel=this.value">'+p.sint.map(function(s){return'<option'+(norm(s.n)===norm(sintSel)?' selected':'')+'>'+esc(s.n)+'</option>'}).join('')+'<option value="__outro">Outro…</option></select>'+
    '<input id="sg_o" class="hide" placeholder="Nome do sintoma" style="margin-top:6px">'+
    '<label>Intensidade: <b id="sg_iv">5</b>/10</label><input type="range" id="sg_i" min="0" max="10" value="5" oninput="document.getElementById(\'sg_iv\').textContent=this.value">'+
    '<div class="row wrap"><div><label>Horário</label><input type="time" id="sg_h" value="'+hh+'"></div><div><label>Duração</label><input id="sg_du" placeholder="Ex.: 2 horas, o dia todo"></div></div>'+
    '<label>Frequência</label><select id="sg_f"><option value="">—</option>'+FREQ.map(function(f){return'<option>'+f+'</option>'}).join('')+'</select>'+
    '<label>Onde (localização)</label><input id="sg_l" placeholder="Opcional">'+
    '<div class="row wrap"><div><label>O que melhora</label><input id="sg_m"></div><div><label>O que piora</label><input id="sg_p"></div></div>'+
    '<label>Observações</label><input id="sg_ob">'+
    '<div class="row"><button class="btn" onclick="saveSint()">Salvar</button></div></div>';
  h+='<details class="card"><summary>Registro completo do dia (dor, sono, pressão, urina, hidratação…)</summary>'+vDiario()+'</details>';
  return h;
}
function saveSint(){
  var p=P(),n=val('sg_n');if(n==='__outro'||!n){n=val('sg_o')}
  var sel=document.getElementById('sg_n');if(sel&&sel.value==='__outro'){document.getElementById('sg_o').classList.remove('hide')}
  if(!n||n==='__outro'){alert('Escolha ou escreva o sintoma.');return}
  if(!p.sint)p.sint=[];
  if(!p.sint.some(function(s){return norm(s.n)===norm(n)}))p.sint.push({n:n,grupo:'Outros',estado:'relatado'});
  var d=new Date(),iso=d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
  sintLog(p).push({n:n,int:+val('sg_i'),d:pad(d.getDate())+'/'+pad(d.getMonth()+1)+'/'+d.getFullYear(),t:iso+'T'+(val('sg_h')||'00:00'),hora:val('sg_h'),dur:val('sg_du'),freq:val('sg_f'),onde:val('sg_l'),mel:val('sg_m'),pior:val('sg_p'),obs:val('sg_ob'),em:nowStr()});
  sintSel='';save();toast('Sintoma registrado.');goSaude('sint');
}
document.addEventListener('change',function(e){if(e.target&&e.target.id==='sg_n'){var o=document.getElementById('sg_o');if(o)o.classList.toggle('hide',e.target.value!=='__outro')}});

/* ---------- exames: resultados por categoria + exames em avaliação ---------- */
function exForm(e,i){
  return'<div class="li"><label>Exame</label><input id="ex_n" value="'+esc(e.n)+'"><div class="row wrap"><div><label>Resultado</label><input id="ex_v" value="'+esc(vtxt(e)==='—'?'':vtxt(e))+'"></div><div><label>Unidade</label><input id="ex_u" value="'+esc(e.u||'')+'"></div></div>'+
    '<div class="row wrap"><div><label>Referência do laboratório</label><input id="ex_r" value="'+esc(refTxt(e))+'" placeholder="Ex.: 70 a 99, < 190, Negativo"></div><div><label>Data da coleta</label><input id="ex_d" value="'+esc(e.d)+'" inputmode="numeric"></div></div>'+
    '<p class="mut">Confira com o laudo original. A versão anterior fica guardada no histórico.</p>'+
    '<div class="row"><button class="btn" onclick="saveEx('+i+')">Salvar correção</button><button class="btn sec" onclick="editEx=-1;render(true)">Cancelar</button></div></div>';
}
function parseRefIn(t,e){
  t=(t||'').trim();delete e.min;delete e.max;delete e.ref;delete e.refT;if(!t)return;
  var m;
  if((m=/^(\d[\d.,]*)\s*(?:a|à|-|–|até)\s*(\d[\d.,]*)$/.exec(t))){e.min=numBR(m[1]);e.max=numBR(m[2]);e.ref=t}
  else if((m=/^<\s*(\d[\d.,]*)$/.exec(t))){e.max=numBR(m[1])-1e-6;e.ref=t}
  else if((m=/^>\s*(\d[\d.,]*)$/.exec(t))){e.min=numBR(m[1])+1e-6;e.ref=t}
  else e.refT=t;
}
function saveEx(i){
  var p=P(),old=p.exames[i],d=val('ex_d');
  if(!/^\d{2}\/\d{2}\/\d{4}$/.test(d)){alert('Data no formato dd/mm/aaaa.');return}
  var n=val('ex_n');if(!n){alert('Informe o nome do exame.');return}
  logAnt('exame',old);
  var o=Object.assign({},old,{n:n,u:val('ex_u'),d:d,corrigido:nowStr()}),t=val('ex_v');
  if(/^[\d.,]+$/.test(t)&&!isNaN(numBR(t))){o.v=numBR(t);delete o.vt}else{o.v=null;o.vt=t}
  if(t===''){alert('Informe o resultado.');return}
  parseRefIn(val('ex_r'),o);delete o.semRef;
  p.exames[i]=o;editEx=-1;save();render(true);toast('Correção salva.');
}
function exLinha(p,i,e){
  var f=flag(e),doc=docDoExame(p,e);
  if(i===editEx)return exForm(e,i);
  return'<div class="li"><div class="exr"><div><b>'+esc(e.n)+'</b><div class="mut">'+esc(e.d)+(refTxt(e)?' · ref. '+esc(refTxt(e)):' · sem referência lida')+'</div></div><div style="text-align:right"><b>'+esc(vtxt(e))+' '+esc(e.u||'')+'</b><br><span class="tag '+f[1]+'">'+f[0]+'</span></div></div>'+
    '<div class="row" style="margin-top:4px"><button class="btn sm sec" onclick="editEx='+i+';render(true)">Corrigir</button>'+(doc>=0?'<button class="btn sm sec" onclick="abreDoc('+doc+')">Ver laudo original</button>':(e.orig?'<span class="mut">Fonte: '+esc(e.orig)+'</span>':''))+'</div></div>';
}
function docDoExame(p,e){
  var r=-1;(p.docs||[]).forEach(function(d,k){if(d.id&&((e.docId&&d.id===e.docId)||(!e.docId&&e.orig&&d.file===e.orig)))r=k});return r;
}
function vExamesN(p){
  var h='<div class="row" style="margin-bottom:8px"><button class="btn" onclick="goAdd(\'exame\')">'+IC.upl+' Importar ou digitar</button></div>';
  var ult=ultExames(p),fora=ult.filter(function(e){return flag(e)[1]==='t-hi'});
  if(p.exames.length){
    var ds=p.exames.map(function(e){return e.d}).filter(function(x,k,a){return a.indexOf(x)===k}).sort(function(a,b){return dkey(a)<dkey(b)?-1:1});
    h+='<div class="aviso" style="margin-bottom:8px">'+IC.warn+'<span>Resultados de <b>'+esc(ds[0]+(ds.length>1?' a '+ds[ds.length-1]:''))+'</b> são históricos e não representam necessariamente a condição atual. A interpretação é ato médico.</span></div>';
    if(fora.length)h+='<div class="card"><h2>Fora da referência do laboratório ('+fora.length+')</h2>'+fora.map(function(e){return'<div class="exr li"><span>'+esc(e.n)+'<div class="mut">'+esc(e.d)+' · ref. '+esc(refTxt(e))+'</div></span><b style="white-space:nowrap">'+esc(vtxt(e))+' '+esc(e.u||'')+'</b></div>'}).join('')+'</div>';
    var g={};p.exames.forEach(function(e,i){var c=catDe(e);(g[c]=g[c]||[]).push({e:e,i:i})});
    CATS.concat(Object.keys(g).filter(function(c){return CATS.indexOf(c)<0})).forEach(function(c){
      if(!g[c])return;
      var porNome={};g[c].forEach(function(o){(porNome[o.e.n]=porNome[o.e.n]||[]).push(o)});
      var nomes=Object.keys(porNome).sort(),nf=nomes.filter(function(n){var l=porNome[n].slice().sort(function(a,b){return dkey(b.e.d)<dkey(a.e.d)?-1:1});return flag(l[0].e)[1]==='t-hi'}).length;
      h+='<details class="card"'+(catAberta[c]?' open':'')+' ontoggle="catAberta[\''+c+'\']=this.open"><summary><b>'+c+'</b> <span class="mut">'+nomes.length+' exame(s)</span>'+(nf?' <span class="pill hi">'+nf+' fora</span>':'')+'</summary>';
      nomes.forEach(function(n){
        var l=porNome[n].slice().sort(function(a,b){return dkey(b.e.d)<dkey(a.e.d)?-1:1});
        h+=exLinha(p,l[0].i,l[0].e);
        if(l.length>1)h+='<details style="margin-left:10px"><summary class="mut">Anteriores ('+(l.length-1)+')</summary>'+l.slice(1).map(function(o){return exLinha(p,o.i,o.e)}).join('')+'</details>';
      });
      h+='</details>';
    });
  }else h+='<div class="card"><div class="empty">Nenhum resultado cadastrado.</div></div>';
  /* exames em avaliação */
  var ev=p.pend.map(function(x,i){return{x:x,i:i}}).filter(function(o){return o.x.s!=='descartado'&&o.x.s!=='removido'});
  h+='<div class="card"><h2>Exames em avaliação</h2><p class="mut" style="margin:0 0 6px"><b>Sugerido</b> é só uma ideia para conversar com o médico — <b>não é pedido médico</b>. Só vira “Solicitado” quando o médico pedir.</p>';
  if(!ev.length)h+='<div class="mut">Nenhum.</div>';
  EST.forEach(function(es){
    var l=ev.filter(function(o){return(o.x.s||'a pedir')===es[0]});if(!l.length)return;
    h+='<div class="grp">'+es[1]+' ('+l.length+')</div>';
    l.forEach(function(o){
            h+='<div class="li"><div class="exr" style="align-items:center"><div style="min-width:0"><b>'+esc(o.x.n)+'</b>'+(o.x.cond?' <span class="tag t-lim">só se o médico avaliar necessário</span>':'')+
        '<div class="mut">'+(o.x.esp?esc(o.x.esp)+' · ':'')+esc(antTxt(p,o.x))+'</div></div>'+
        '<select style="flex:0 0 132px;min-width:0" onchange="mudaPend('+o.i+',this.value)">'+EST.map(function(e){return'<option value="'+e[0]+'"'+(e[0]===(o.x.s||'a pedir')?' selected':'')+'>'+e[1]+'</option>'}).join('')+'<option value="descartado">Tirar da lista</option></select></div></div>';
    });
  });
  if(ev.some(function(o){return o.x.s==='pedido'}))h+='<button class="btn" style="margin-top:8px" onclick="agendarColeta()">📅 Agendar coleta dos solicitados</button>';
  h+='</div>';
  h+='<div class="card"><h2>Adicionar à lista</h2><label>Nome do exame (vários: separe por vírgula)</label><input id="pn" placeholder="Ex.: Hemograma completo">'+
    '<div class="row wrap"><div><label>Situação</label><select id="pst">'+EST.map(function(e){return'<option value="'+e[0]+'">'+e[1]+'</option>'}).join('')+'</select></div>'+
    '<div><label>Especialidade</label><select id="pesp">'+espList().map(function(e){return'<option'+(e===lastEsp?' selected':'')+'>'+esc(e)+'</option>'}).join('')+'<option>Outra…</option></select></div></div>'+
    '<button class="btn" onclick="addPend2()">Adicionar</button></div>';
  return h;
}
function mudaPend(i,s){if(s==='descartado'){descartaPend(i);return}setPend(i,s);render(true)}
function marcaFeito(p,nome,data){
  p.pend.forEach(function(x){if((x.s==='pedido'||x.s==='agendado')&&casaNome(nome,x.n)){x.s='resultado';x.dataRes=data}});
}

/* ---------- importação de laudo paginado: conferência ---------- */
function renderLaudo(i,r){
  var nf=r.ex.filter(function(e){return flag(e)[1]==='t-hi'}).length,sr=r.ex.filter(function(e){return e.semRef}).length;
  var h='<div class="aviso" style="margin-bottom:8px">'+IC.warn+'<span><b>Confira com o PDF antes de salvar.</b> Resultados de '+esc(r.data||'data não encontrada')+' serão guardados como históricos.</span></div>';
  if(r.paciente)h+='<div class="mut">Paciente no laudo: <b>'+esc(r.paciente)+'</b>'+(r.nasc?' · nascimento '+esc(r.nasc):'')+'</div>';
  var pn=P().nasc;if(r.nasc&&pn&&r.nasc!==pn)h+='<div class="aviso ruim" style="margin:6px 0">'+IC.warn+'<span>A data de nascimento do laudo ('+esc(r.nasc)+') é diferente da cadastrada neste perfil ('+esc(pn)+'). Confira se o perfil está certo.</span></div>';
  h+='<p class="mut">'+r.ex.length+' resultado(s) lido(s); '+nf+' fora da referência do laboratório; '+sr+' sem referência lida (não são classificados).</p>';
  var g={};r.ex.forEach(function(e,j){(g[e.cat||'Outras']=g[e.cat||'Outras']||[]).push(j)});
  CATS.forEach(function(c){
    if(!g[c])return;
    h+='<details class="card" style="padding:8px 12px"><summary><b>'+c+'</b> <span class="mut">'+g[c].length+'</span></summary>';
    g[c].forEach(function(j){
      var e=r.ex[j],f=flag(e);
      h+='<div class="li"><div style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="s'+i+'_e'+j+'_c" checked style="width:auto"><input class="xi" id="s'+i+'_e'+j+'_n" value="'+esc(e.n)+'"></div>'+
        '<div class="row wrap" style="margin-top:4px"><input class="xi" style="flex:1 1 90px" id="s'+i+'_e'+j+'_v" value="'+esc(e.v!=null?String(e.v).replace('.',','):e.vt)+'" aria-label="Resultado"><input class="xi" style="flex:1 1 70px" id="s'+i+'_e'+j+'_u" value="'+esc(e.u||'')+'" aria-label="Unidade"><input class="xi" style="flex:1 1 100px" id="s'+i+'_e'+j+'_r" value="'+esc(refTxt(e))+'" placeholder="referência" aria-label="Referência"></div>'+
        '<span class="tag '+f[1]+'">'+f[0]+'</span></div>';
    });
    h+='</details>';
  });
  return h;
}
function saveLaudo(i,r,d){
  var p=P(),n=0,skip=0,push=[];
  r.ex.forEach(function(e0,j){
    var c=document.getElementById('s'+i+'_e'+j+'_c');if(!c||!c.checked)return;
    var nome=val('s'+i+'_e'+j+'_n'),t=val('s'+i+'_e'+j+'_v');if(!nome||t==='')return;
    var dd=r.datas&&r.datas.length>1?e0.d:d;
    if(p.exames.some(function(x){return norm(x.n)===norm(nome)&&x.d===dd})){skip++;return}
    var e={n:nome,u:val('s'+i+'_e'+j+'_u'),d:dd,cat:e0.cat,grupo:e0.grupo,orig:r.file};
    if(/^[\d.,]+$/.test(t)&&!isNaN(numBR(t)))e.v=numBR(t);else{e.v=null;e.vt=t}
    var rt=val('s'+i+'_e'+j+'_r');if(rt===refTxt(e0)){['min','max','ref','refT'].forEach(function(k){if(e0[k]!=null)e[k]=e0[k]})}else parseRefIn(rt,e);
    p.exames.push(e);push.push(e);n++;
    linkRel(p,nome);marcaFeito(p,nome,dd);
  });
  r._push=push;
  return{n:n,res:n+' exames salvos'+(skip?', '+skip+' já existiam (não duplicados)':'')};
}

/* ---------- Saúde: cartões, identificação, peso, especialidades ---------- */
function secCards(p){
  var diag=(p.diag||[]).filter(function(x){return!x.fim}),ue=ultExames(p),fora=ue.filter(function(e){return flag(e)[1]==='t-hi'}).length;
  var dts=p.exames.map(function(e){return e.d}).sort(function(a,b){return dkey(b)<dkey(a)?-1:1}),tr=tendencia(p);
  var conf=diag.filter(function(x){return x.tipo==='conf'}).length,inv=diag.filter(function(x){return x.tipo==='inv'}).length;
  var pend=p.meds.filter(function(m){return m.sit!=='confirmado'}).length;
  var ns=(p.sint||[]).length;
  return secRow(IC.heart,'Visão geral','Identificação, peso e evolução (7 dias): <b>'+tr[0]+'</b>',"","goSaude('geral')")+
    secRow(IC.bolt,'Sintomas',ns?ns+' acompanhado(s)':'Nenhum acompanhado',"","goSaude('sint')")+
    secRow(IC.pill,'Medicamentos',p.meds.length?esc(p.meds.slice(0,3).map(function(m){return m.n}).join(' • '))+(p.meds.length>3?' …':''):'Nenhum cadastrado',pend?'<span class="pill">'+pend+' a confirmar</span>':'',"goSaude('meds')")+
    secRow(IC.flask,'Exames',p.exames.length?'Último: '+esc(dts[0])+' · '+ue.length+' tipo(s)':'Nenhum resultado ainda',fora?'<span class="pill hi">'+fora+' fora da ref.</span>':'',"goSaude('exames')")+
    secRow(IC.clip,'Diagnósticos',diag.length?conf+' confirmado(s) · '+inv+' em investigação · '+(diag.length-conf-inv)+' outros':'Nenhum registrado',"","goSaude('diag')")+
    secRow(IC.cal,'Consultas',(p.agenda.length?p.agenda.length+' agendada(s)':'Nada agendado'),"","goCons('proximas')")+
    secRow(IC.folder,'Documentos',(p.docs.length?p.docs.length+' arquivo(s)':'Nenhum documento'),"","goTab('arquivos')")+
    secRow(IC.hist,'Histórico','Linha do tempo, incluindo alterações',"","goSaude('hist')")+
    '<div class="row" style="margin-top:6px"><button class="btn sec" onclick="compartilhaPront()">'+IC.share+' Compartilhar resumo</button></div>';
}
function saudeSub(p){
  var T={diag:'Diagnósticos',sint:'Sintomas',meds:'Medicamentos',exames:'Exames',geral:'Visão geral',hist:'Histórico'};
  var h=voltaBtn("saudeSec=null;render()",T[saudeSec]||'Saúde')+'<p class="mut" style="margin:-4px 0 10px 4px">Prontuário de '+esc(nome1(p))+'</p>';
  if(saudeSec==='diag')return h+vDiag(p);
  if(saudeSec==='sint')return h+vSintomas(p);
  if(saudeSec==='meds')return h+vMeds(p);
  if(saudeSec==='exames')return h+vExamesN(p);
  if(saudeSec==='geral')return h+vGeral(p);
  return h+vLinha(p);
}
function identHtml(p){
  var id=idadeDe(p.nasc);
  return'<div class="card"><h2>Identificação</h2>'+
    '<div class="li"><b>'+esc(p.nome)+'</b><div class="mut">'+(p.nasc?'Nascimento '+esc(p.nasc)+(id!==''?' · '+id+' anos':''):'Nascimento não informado')+' · Altura: '+(p.altura?esc(p.altura):'não informada')+' · Sexo ao nascer: '+(p.sexoNasc?esc(p.sexoNasc):'não confirmado')+'</div></div>'+
    '<details class="mais"><summary>Editar</summary><label>Nome</label><input id="id_n" value="'+esc(p.nome)+'"><div class="row wrap"><div><label>Nascimento</label><input id="id_d" value="'+esc(p.nasc||'')+'" placeholder="dd/mm/aaaa" inputmode="numeric"></div><div><label>Altura (cm)</label><input id="id_a" value="'+esc(p.altura||'')+'" inputmode="numeric"></div></div>'+
    '<label>Sexo registrado ao nascer</label><select id="id_s"><option value="">Não confirmado</option><option'+(p.sexoNasc==='Masculino'?' selected':'')+'>Masculino</option><option'+(p.sexoNasc==='Feminino'?' selected':'')+'>Feminino</option></select><button class="btn" onclick="saveIdent()">Salvar</button></details></div>';
}
function saveIdent(){
  var p=P(),d=val('id_d');if(d&&!/^\d{2}\/\d{2}\/\d{4}$/.test(d)){alert('Nascimento no formato dd/mm/aaaa.');return}
  logAnt('ident',{n:p.nome,nasc:p.nasc,altura:p.altura,sexoNasc:p.sexoNasc});
  p.nome=val('id_n')||p.nome;p.nasc=d;p.altura=val('id_a');p.sexoNasc=val('id_s');save();render(true);toast('Salvo.');
}
function pesoHtml(p){
  var l=(p.peso||[]).slice().sort(function(a,b){return dkey(b.d)<dkey(a.d)?-1:1});
  return'<div class="card"><h2>Peso</h2>'+(l.length?l.map(function(x){return'<div class="exr"><span>'+esc(x.d||x.per||'')+(x.obs?' <span class="mut">'+esc(x.obs)+'</span>':'')+'</span><b>'+esc(String(x.v).replace('.',','))+' kg</b></div>'}).join(''):'<div class="mut">Nenhum peso registrado.</div>')+
    '<details class="mais"><summary>Adicionar peso</summary><div class="row wrap"><div><label>Peso (kg)</label><input id="pw_v" inputmode="decimal"></div><div><label>Data</label><input id="pw_d" value="'+nowStr().slice(0,10)+'" inputmode="numeric"></div></div><label>Observação (opcional)</label><input id="pw_o"><button class="btn" onclick="addPeso()">Salvar</button></details></div>';
}
function addPeso(){
  var p=P(),v=numBR(val('pw_v')),d=val('pw_d');
  if(isNaN(v)||!/^\d{2}\/\d{2}\/\d{4}$/.test(d)){alert('Informe peso e data (dd/mm/aaaa).');return}
  if(!p.peso)p.peso=[];
  if(p.peso.some(function(x){return x.d===d&&+x.v===v})){alert('Este peso já está registrado.');return}
  p.peso.push({v:v,d:d,obs:val('pw_o')});save();render(true);
}
function especHtml(p){
  var e=p.espec||{},ks=Object.keys(e);if(!ks.length)return'';
  return'<div class="card"><h2>Acompanhamento por especialidade</h2>'+ks.map(function(k){return'<details><summary><b>'+esc(k)+'</b></summary><ul>'+e[k].map(function(x){return'<li>'+esc(x)+'</li>'}).join('')+'</ul></details>'}).join('')+'<p class="mut" style="margin:6px 0 0">Entram automaticamente no resumo da especialidade correspondente.</p></div>';
}
function vGeral(p){return identHtml(p)+pesoHtml(p)+especHtml(p)+vGeralBase(p)}

/* ---------- resumo para o médico ---------- */
ESP['Neurologista']=ESP['Neurologista']||{sint:['dor','rig','fad'],ex:['Vitamina B12','Vitamina D','TSH','Glicemia de jejum','Hemograma','Sódio','Potássio','Magnésio','CK'],pend:[],q:['Os problemas de memória podem estar relacionados aos medicamentos?','Existe alguma condição neurológica que possa explicar a rigidez muscular constante?','As dores e a fadiga são compatíveis apenas com fibromialgia?','É necessário investigar alguma doença neuromuscular?','Há indicação de eletroneuromiografia?','Quais exames laboratoriais são necessários para investigar fadiga, rigidez e alterações cognitivas?','Como diferenciar problemas de memória associados à ansiedade e depressão daqueles relacionados a TDAH?','Há necessidade de avaliação neuropsicológica?','É necessário revisar as medicações em conjunto com o psiquiatra?']};
ESP['Psiquiatra']=ESP['Psiquiatra']||{sint:['fad'],ex:['TSH','Vitamina B12','Vitamina D'],pend:[],q:['As medicações podem estar contribuindo para sonolência, fadiga ou alterações de memória?','É necessário revisar o tratamento medicamentoso?','Como investigar sintomas sugestivos de TDAH?']};
function relNomes(p,c){return(getRel(p)||[]).concat(c.ex||[])}
function resumoHtml(p,esp,c){
  var h='<h3>Resumo para consulta — '+esc(esp)+'</h3><div class="mut">Gerado em '+nowStr()+' · informações relatadas pelo paciente/acompanhante e registradas no app</div>';
  var id=idadeDe(p.nasc),pw=(p.peso||[]).slice().sort(function(a,b){return dkey(b.d)<dkey(a.d)?-1:1})[0];
  h+='<h4>1. Identificação</h4><ul><li>'+esc(p.nome)+(p.nasc?' · nascimento '+esc(p.nasc)+(id!==''?' ('+id+' anos)':''):'')+'</li>'+(p.altura?'<li>Altura: '+esc(p.altura)+' cm</li>':'')+(pw?'<li>Último peso registrado: '+esc(String(pw.v).replace('.',','))+' kg ('+esc(pw.d)+')</li>':'')+'</ul>';
  var dg=(p.diag||[]).filter(function(x){return!x.fim});
  h+='<h4>2. Diagnósticos e antecedentes</h4>';
  if(!dg.length)h+='<div class="mut">Nenhum registrado.</div>';
  TD.forEach(function(t){var l=dg.filter(function(x){return(x.tipo||'rel')===t[0]});if(!l.length)return;h+='<div><b>'+t[1]+'</b></div><ul>'+l.map(function(x){return'<li>'+esc(x.n)+(x.desde?' ('+esc(x.desde)+')':'')+(x.obs?' — '+esc(x.obs):'')+'</li>'}).join('')+'</ul>'});
  var mc=p.meds.filter(function(m){return m.sit==='confirmado'}),mp=p.meds.filter(function(m){return m.sit!=='confirmado'});
  h+='<h4>3. Medicamentos e doses confirmadas</h4>';
  h+=mc.length?'<ul>'+mc.map(function(m){return'<li>'+esc(m.n)+' — '+esc(m.dose||'dose não informada')+(m.freq?', '+esc(m.freq):'')+(m.hor?' ('+esc(m.hor)+')':'')+(m.motivo?'. Indicação: '+esc(m.motivo):'')+(m.presc?'. Prescritor: '+esc(m.presc):'')+(m.efeitos?'. Efeitos percebidos: '+esc(m.efeitos):'')+'</li>'}).join('')+'</ul>':'<div class="mut">Nenhum com uso confirmado.</div>';
  if(mp.length)h+='<div><b>Relatados, uso ainda NÃO confirmado</b></div><ul>'+mp.map(function(m){return'<li>'+esc(m.n)+' — dose relatada: '+esc(m.dose||'não confirmada')+(m.freq?', '+esc(m.freq):'')+'</li>'}).join('')+'</ul>';
  h+='<h4>4. Sintomas atuais e evolução</h4>';
  var ss=(p.sint||[]).filter(function(s){return s.estado!=='monitorar'}),mon=(p.sint||[]).filter(function(s){return s.estado==='monitorar'});
  if(!ss.length&&!p.diario.length)h+='<div class="mut">Sem registros.</div>';
  if(ss.length)h+='<ul>'+ss.map(function(s){var hs=sintHist(p,s.n),v=hs.slice(-4).map(function(x){return x.int}),u=hs[hs.length-1];return'<li>'+esc(s.n)+(s.estado==='investigar'?' (a investigar)':'')+(u?': '+v.join(' → ')+'/10, último em '+esc(u.d)+(u.onde?', '+esc(u.onde):'')+(u.dur?', duração '+esc(u.dur):''):': sem intensidade registrada')+'</li>'}).join('')+'</ul>';
  if(mon.length)h+='<div class="mut">A observar (não registrados como presentes): '+esc(mon.map(function(s){return s.n}).join(', '))+'.</div>';
  var last=p.diario.slice(-2).reverse();
  if(last.length)h+='<div><b>Diário do dia</b></div><ul>'+last.map(function(x){return'<li>'+esc(x.d)+': dor '+(x.dor||0)+'/10, rigidez '+(x.rig||0)+'/10, fadiga '+(x.fad||0)+'/10'+(x.obs?' ('+esc(x.obs)+')':'')+'</li>'}).join('')+'</ul>';
  var nomes=relNomes(p,c),ex=[],vistos={};
  ultExames(p).forEach(function(e){if(nomes.some(function(n){return casaNome(e.n,n)})&&!vistos[e.n]){vistos[e.n]=1;ex.push(e)}});
  h+='<h4>5. Exames anteriores relevantes (com datas)</h4>';
  h+=ex.length?'<ul>'+ex.map(function(e){return'<li>'+esc(e.d)+' — '+esc(e.n)+': <b>'+esc(vtxt(e))+' '+esc(e.u||'')+'</b>'+(refTxt(e)?' (ref. do laboratório: '+esc(refTxt(e))+')':'')+'</li>'}).join('')+'</ul><div class="mut">Resultados antigos são históricos, não necessariamente atuais.</div>':'<div class="mut">Nenhum resultado relevante registrado.</div>';
  var alt=ultExames(p).filter(function(e){return flag(e)[1]==='t-hi'});
  h+='<h4>6. Alterações laboratoriais (fora da referência do próprio laboratório)</h4>';
  h+=alt.length?'<ul>'+alt.map(function(e){return'<li>'+esc(e.d)+' — '+esc(e.n)+': <b>'+esc(vtxt(e))+' '+esc(e.u||'')+'</b> (ref. '+esc(refTxt(e))+')</li>'}).join('')+'</ul>':'<div class="mut">Nenhuma registrada.</div>';
  var sol=p.pend.filter(function(x){return x.s==='pedido'||x.s==='agendado'}),sug=p.pend.filter(function(x){return(x.s||'a pedir')==='a pedir'&&(!x.esp||x.esp===esp||x.esp==='Clínico geral'||true)});
  h+='<h4>7. Exames pendentes ou sugeridos para discussão</h4>';
  if(sol.length)h+='<div><b>Já solicitados por médico</b></div><ul>'+sol.map(function(x){return'<li>'+esc(x.n)+(x.s==='agendado'?' (agendado)':'')+'</li>'}).join('')+'</ul>';
  if(sug.length)h+='<div><b>Sugeridos para discutir — NÃO são pedidos médicos</b></div><ul>'+sug.map(function(x){var a=ultMatch(p,x.n);return'<li>'+esc(x.n)+(x.cond?' (condicionado à avaliação médica)':'')+' — '+esc(a?(norm(x.n)==='hemograma'?'último hemograma: '+a.d:'último resultado no histórico: '+a.d):'sem resultado no histórico')+'</li>'}).join('')+'</ul>';
  if(!sol.length&&!sug.length)h+='<div class="mut">Nenhum.</div>';
  var ac=(p.espec&&p.espec[esp])||[];
  if(ac.length)h+='<h4>Pontos em acompanhamento nesta especialidade</h4><ul>'+ac.map(function(x){return'<li>'+esc(x)+'</li>'}).join('')+'</ul>';
  var qs=getPerg(p).filter(function(x){return x.trim()});
  h+='<h4>8. Perguntas para a consulta</h4>'+(qs.length?'<ol>'+qs.map(function(q){return'<li>'+esc(q)+'</li>'}).join('')+'</ol>':'<div class="mut">Nenhuma pergunta escrita.</div>');
  var ob=(p.obs&&p.obs[esp])||'';if(ob.trim())h+='<h4>Observações</h4><div>'+esc(ob).replace(/\n/g,'<br>')+'</div>';
  return h+'<div class="mut" style="margin-top:10px">Resumo de apoio, sem interpretação diagnóstica. Não é documento médico nem prescrição.</div>';
}
function vPreparar(p){
  var pe=proxEsp(p);if(pe&&espAuto!==pe.id){espAuto=pe.id;espSel=pe.k}
  var c=ESP[espSel]||{sint:['s','dor','rig','fad','res'],ex:[],pend:[],q:['Quais exames e orientações você recomenda?']};
  var h='<div class="card noprint"><h2>Resumo para o médico</h2><label>Especialidade</label><select id="es" onchange="espSel=this.value;render(true)">'+espList().map(function(k){return'<option'+(k===espSel?' selected':'')+'>'+esc(k)+'</option>'}).join('')+'</select>'+
    '<p class="mut" style="margin:6px 0 0">Montado sozinho com o que já está no prontuário.</p>'+
    '<div class="row" style="margin-top:6px"><button class="btn" onclick="window.print()">🖨️ PDF</button><button class="btn sec" onclick="compartilhaResumo()">'+IC.share+' Compartilhar</button></div>'+
    (window.G&&G.connected()?'<button class="btn sec" style="width:100%" onclick="resumoDrive()">☁ Salvar no Drive</button><p id="gmsg" class="mut"></p>':'')+'</div>';
  h+=editConsulta(p);
  h+='<div class="card"><div class="sheet" id="sheetres">'+resumoHtml(p,espSel,c)+'</div></div>';
  return h;
}
function textoPront(p){
  var d=document.createElement('div');d.innerHTML=resumoHtml(p,'Geral',{ex:[],sint:[]});
  var t=d.innerText||d.textContent||'';return 'PRONTUÁRIO — '+p.nome+'\n'+t.replace(/\n{3,}/g,'\n\n');
}

/* ---------- ficha inicial (JSON) + privacidade ---------- */
function mergeFicha(p,f){
  var n={diag:0,meds:0,sint:0,peso:0,pend:0,perg:0,espec:0};
  var id=f.identificacao||{};
  if(id.nome&&(!p.nome||p.nome.split(' ').length<2))p.nome=id.nome;
  ['nasc','altura','sexoNasc'].forEach(function(k){if(id[k]&&!p[k])p[k]=id[k]});
  if(!p.diag)p.diag=[];(f.diag||[]).forEach(function(x){if(p.diag.some(function(y){return norm(y.n)===norm(x.n)}))return;x.em=nowStr();p.diag.push(x);n.diag++});
  (f.meds||[]).forEach(function(x){if(p.meds.some(function(y){return norm(y.n).split(' ')[0]===norm(x.n).split(' ')[0]}))return;p.meds.push(x);n.meds++});
  if(!p.sint)p.sint=[];(f.sint||[]).forEach(function(x){if(p.sint.some(function(y){return norm(y.n)===norm(x.n)}))return;p.sint.push(x);n.sint++});
  if(!p.peso)p.peso=[];(f.peso||[]).forEach(function(x){if(p.peso.some(function(y){return y.d===x.d&&+y.v===+x.v}))return;p.peso.push(x);n.peso++});
  (f.pend||[]).forEach(function(x){if(p.pend.some(function(y){return norm(y.n)===norm(x.n)&&y.s!=='descartado'}))return;p.pend.push(x);n.pend++});
  if(!p.espec)p.espec={};Object.keys(f.espec||{}).forEach(function(k){var l=p.espec[k]=p.espec[k]||[];f.espec[k].forEach(function(x){if(l.indexOf(x)<0){l.push(x);n.espec++}})});
  if(!p.perg)p.perg={};Object.keys(f.perg||{}).forEach(function(k){var l=p.perg[k]=p.perg[k]||(ESP[k]?ESP[k].q.slice():[]);f.perg[k].forEach(function(x){if(!l.some(function(y){return norm(y)===norm(x)})){l.push(x);n.perg++}})});
  return n;
}
function importaFicha(inp){
  var f=inp.files[0];if(!f)return;
  f.text().then(function(t){
    var j;try{j=JSON.parse(t)}catch(e){alert('Arquivo inválido.');return}
    if(j.app!=='saude-a-dois-ficha'){alert('Este arquivo não é uma ficha do Saúde a Dois.');return}
    if(j.pessoa&&j.pessoa!==S.cur){alert('Esta ficha é do perfil “'+j.pessoa+'”. Troque para esse perfil antes de importar.');return}
    if(!confirm('Importar a ficha para '+P().nome+'? Nada será apagado e itens que já existem não são duplicados.'))return;
    var n=mergeFicha(P(),j);save();render(true);
    toast('Ficha importada: '+n.diag+' diagnósticos, '+n.meds+' medicamentos, '+n.sint+' sintomas, '+n.pend+' exames em avaliação.');
  });
  inp.value='';
}
function exportaPessoa(){var p=P(),o=JSON.parse(JSON.stringify(p));dl('saude-'+S.cur+'.json','application/json',JSON.stringify(o,null,1))}
function apagaPessoa(){
  var p=P();
  if(!confirm('Apagar TODOS os dados de '+p.nome+' deste aparelho (exames, sintomas, medicamentos, documentos)? Os de outra pessoa não são afetados. Isso não pode ser desfeito. Exporte antes, se quiser guardar.'))return;
  if(prompt('Para confirmar, digite o primeiro nome ('+nome1(p)+'):')!==nome1(p))return;
  var ids=(p.docs||[]).filter(function(d){return d.id}).map(function(d){return S.cur+'/'+d.id});
  var nome=p.nome;S.profiles[S.cur]={nome:nome,bio:[],exames:[],pend:[],meds:[],diario:[],agenda:[]};
  save();Promise.all(ids.map(function(k){return idbDel(k).catch(function(){})})).then(function(){render(true);toast('Dados apagados.')});
}
function idbDel(k){return idb().then(function(db){return new Promise(function(res,rej){var t=db.transaction('f','readwrite');t.objectStore('f').delete(k);t.oncomplete=res;t.onerror=rej})})}
function compartilhaDoc(i){
  var d=P().docs[i];if(!d||!d.id)return;
  idbGet(S.cur+'/'+d.id).then(function(b){
    if(!b){alert('O original não está neste aparelho.');return}
    var f=new File([b],d.file,{type:d.mime||b.type});
    if(navigator.canShare&&navigator.canShare({files:[f]}))navigator.share({files:[f],title:d.file}).catch(function(){});
    else baixaDoc(i);
  });
}
function baixaDoc(i){
  var d=P().docs[i];if(!d||!d.id)return;
  idbGet(S.cur+'/'+d.id).then(function(b){if(!b){alert('O original não está neste aparelho.');return}var u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download=d.file;document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(u)},30000)});
}

/* recebe PDFs/fotos do menu Compartilhar do Android */
function recebeCompartilhado(){
  if(!/[?&]share=/.test(location.search)||!window.caches)return;
  var t=setInterval(function(){
    var l=document.getElementById('lockscr');if(l&&!l.classList.contains('hide'))return;
    clearInterval(t);
    caches.open('saude-share').then(function(c){return c.keys().then(function(ks){
      return Promise.all(ks.map(function(k){return c.match(k).then(function(r){return r.blob().then(function(b){return new File([b],decodeURIComponent(k.url.split('/').pop()),{type:b.type})})})}))
    })}).then(function(fs){
      history.replaceState(null,'',location.pathname);caches.delete('saude-share');
      if(!fs.length)return;
      goAdd('doc');toast('Recebido pelo Compartilhar. Será salvo em '+nome1(P())+' — confira o perfil.');readFiles(fs);
    });
  },300);
}
pintaIcones();
render();
recebeCompartilhado();
