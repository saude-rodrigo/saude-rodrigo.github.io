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
      h+='<div class="li"><div class="exr"><div><b>'+esc(s.n)+'</b><div class="mut">'+(s.primeiro?'Primeiro relato: '+esc(s.primeiro)+' · ':'')+(ult?'Último: '+esc(ult.d)+' · '+ult.int+'/10':'Sem registro de intensidade')+(vals.length>1?' · evolução '+vals.join(' → '):'')+'</div></div>'+
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


/* =====================================================================
   DOCUMENTOS (Arquivos): só guarda o original — não lê nem interpreta resultados
   ===================================================================== */
var TIPOS_DOC=['Exame','Receita','Laudo','Pedido','Outro'];
var docsPend=[],docQ='',docFil2='todos',viewerDoc=null;
function docMsg(t){var e=document.getElementById('impst');if(e)e.textContent=t||''}
function bonito(n){return n.replace(/\.[A-Za-z0-9]{2,5}$/,'').replace(/[_]+/g,' ').replace(/\s+/g,' ').trim()}
function dataSug(file){
  var n=file.name,m=/(\d{2})[-_.\/](\d{2})[-_.\/](\d{4})/.exec(n);if(m)return m[1]+'/'+m[2]+'/'+m[3];
  m=/(\d{4})[-_.](\d{2})[-_.](\d{2})/.exec(n);if(m)return m[3]+'/'+m[2]+'/'+m[1];
  var d=new Date(file.lastModified||Date.now());return pad(d.getDate())+'/'+pad(d.getMonth()+1)+'/'+d.getFullYear();
}
function readFiles(files){
  var list=[].slice.call(files).filter(function(f){return/pdf$/i.test(f.name)||f.type==='application/pdf'||/^image\//.test(f.type)||/\.(jpe?g|png|webp|heic)$/i.test(f.name)});
  if(!list.length){docMsg('Selecione PDFs ou fotos.');return}
  list.forEach(function(f){docsPend.push({file:f,nome:bonito(f.name),d:dataSug(f),tipo:/receita/i.test(f.name)?'Receita':/pedido/i.test(f.name)?'Pedido':/laudo/i.test(f.name)?'Laudo':'Exame',pac:S.cur,drive:true})});
  docMsg('');stagingRefresh();
}
function stagingRefresh(){var e=document.getElementById('staging');if(e)e.innerHTML=renderStaged()}
function renderStaged(){
  var h='';
  docsPend.forEach(function(r,i){
    h+='<div class="card"><h2>Salvar documento</h2><div class="mut">'+esc(r.file.name)+' · '+tamanho(r.file.size)+'</div>'+
      '<label>Paciente</label><div class="segc" id="dp'+i+'">'+Object.keys(S.profiles).filter(function(k){return k==='douglas'||k==='rodrigo'}).map(function(k){return'<button class="'+(r.pac===k?'on':'')+'" onclick="docPac('+i+',\''+k+'\')">'+esc(S.profiles[k].nome.split(' ')[0])+'</button>'}).join('')+'</div>'+
      '<label>Nome do documento</label><input id="dn'+i+'" value="'+esc(r.nome)+'" onchange="docsPend['+i+'].nome=this.value">'+
      '<div class="row wrap"><div><label>Data</label><input id="dd'+i+'" value="'+esc(r.d)+'" inputmode="numeric" placeholder="dd/mm/aaaa" onchange="docsPend['+i+'].d=this.value"></div>'+
      '<div><label>Tipo</label><select onchange="docsPend['+i+'].tipo=this.value">'+TIPOS_DOC.map(function(t){return'<option'+(t===r.tipo?' selected':'')+'>'+t+'</option>'}).join('')+'</select></div></div>'+
      (window.G&&G.connected()?'<label style="display:flex;gap:8px;align-items:center;color:var(--ink)"><input type="checkbox" '+(r.drive?'checked ':'')+'style="width:auto" onchange="docsPend['+i+'].drive=this.checked">Guardar também no Drive</label>':'')+
      '<div class="row"><button class="btn" onclick="docSalva('+i+')">Salvar em '+esc(S.profiles[r.pac].nome.split(' ')[0])+'</button><button class="btn sec" onclick="docsPend.splice('+i+',1);stagingRefresh()">Cancelar</button></div></div>';
  });
  return h;
}
function docPac(i,k){docsPend[i].pac=k;stagingRefresh()}
function tamanho(b){return b>1048576?(b/1048576).toFixed(1).replace('.',',')+' MB':Math.max(1,Math.round(b/1024))+' KB'}
function docSalva(i){
  var r=docsPend[i];r.nome=val('dn'+i)||r.nome;r.d=val('dd'+i)||r.d;
  if(!r.nome.trim()){alert('Dê um nome ao documento.');return}
  if(!/^\d{2}\/\d{2}\/\d{4}$/.test(r.d)){alert('Data no formato dd/mm/aaaa.');return}
  var p=S.profiles[r.pac];if(!p.docs)p.docs=[];
  if(p.docs.some(function(d){return d.file===r.file.name&&d.size===r.file.size})&&!confirm('Este arquivo já está guardado em '+p.nome.split(' ')[0]+'. Salvar outra cópia?'))return;
  var id=Date.now().toString(36)+Math.floor(Math.random()*1e4).toString(36);
  var doc={tipo:r.tipo,file:r.file.name,nome:r.nome.trim(),d:r.d,em:nowStr(),id:id,mime:r.file.type||(/pdf$/i.test(r.file.name)?'application/pdf':''),size:r.file.size};
  p.docs.push(doc);docsPend.splice(i,1);save();
  if(navigator.storage&&navigator.storage.persist)navigator.storage.persist();
  idbPut(r.pac+'/'+id,r.file).then(function(){toast('Documento guardado em '+p.nome.split(' ')[0]+'.')},function(){p.docs=p.docs.filter(function(d){return d!==doc});save();render(true);alert('Não consegui guardar o arquivo neste aparelho (sem espaço?). Nada foi salvo.')});
  if(r.drive&&window.G&&G.connected()){
    var k=dkey(r.d),iso=k.length===8?k.slice(0,4)+'-'+k.slice(4,6)+'-'+k.slice(6):'sem-data';
    G.uploadOriginal(r.pac,r.file,iso+' '+doc.nome).then(function(x){doc.drive=x.id;persist()}).catch(function(e){alert('O arquivo não foi guardado no Drive: '+e.message)});
  }
  render(true);
}
function docArquivo(i){
  var d=P().docs[i];if(!d||!d.id)return Promise.resolve(null);
  return idbGet(S.cur+'/'+d.id).then(function(b){
    if(!b){alert('O original não está mais neste aparelho. '+(d.drive?'Ele está no Drive.':''));return null}
    var ext=(/\.[A-Za-z0-9]{2,5}$/.exec(d.file)||[''])[0],nome=(d.nome||bonito(d.file)).replace(/[\\\/:*?"<>|]+/g,' ').trim()+ext;
    return new File([b],nome,{type:d.mime||b.type||'application/octet-stream'});
  });
}
function compartilhaDoc(i){
  docArquivo(i).then(function(f){
    if(!f)return;
    if(navigator.canShare&&navigator.canShare({files:[f]}))navigator.share({files:[f],title:f.name}).catch(function(){});
    else{salvaArq(f);toast('Este aparelho não abre o menu de compartilhar. Baixei o arquivo.')}
  });
}
function salvaArq(f){var u=URL.createObjectURL(f),a=document.createElement('a');a.href=u;a.download=f.name;document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(u)},30000)}
function baixaDoc(i){docArquivo(i).then(function(f){if(f)salvaArq(f)})}
function renomeiaDoc(i){
  var d=P().docs[i],n=prompt('Novo nome do documento:',d.nome||bonito(d.file));
  if(n===null||!n.trim()||n.trim()===(d.nome||''))return;
  if(!confirm('Renomear para "'+n.trim()+'"?'))return;
  d.nome=n.trim();save();render(true);
}
function excluiDoc(i){
  var p=P(),d=p.docs[i];
  if(!confirm('Excluir "'+(d.nome||d.file)+'" de '+nome1(p)+'? O arquivo será apagado deste aparelho'+(d.drive?' (a cópia no Drive continua lá)':'')+'. Isso não pode ser desfeito.'))return;
  if(!p.log)p.log=[];p.log.push({t:'doc',em:nowStr(),antes:{n:d.nome||d.file,d:d.d,tipo:d.tipo}});
  var id=d.id;p.docs.splice(i,1);save();
  (id?idbDel(S.cur+'/'+id).catch(function(){}):Promise.resolve()).then(function(){render(true);toast('Documento excluído.')});
}
/* visualizador dentro do app (PDF desenhado com pdf.js; imagens direto) */
function visualizaDoc(i){
  var d=P().docs[i];
  docArquivo(i).then(function(f){
    if(!f)return;
    viewerDoc={i:i,f:f,z:1};
    var o=document.getElementById('docv');if(o)o.remove();
    o=document.createElement('div');o.id='docv';
    o.style.cssText='position:fixed;inset:0;z-index:99;background:#2b2b2b;display:flex;flex-direction:column';
    o.innerHTML='<div style="display:flex;gap:6px;align-items:center;padding:8px;background:var(--g);color:#fff"><button class="btn sm sec" style="background:#fff" onclick="fechaVisor()">✕ Fechar</button><b style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(d.nome||d.file)+'</b>'+
      '<button class="btn sm" style="background:var(--gold);color:#fff" onclick="compartilhaDoc('+i+')">Compartilhar</button></div>'+
      '<div style="display:flex;gap:6px;padding:6px 8px;background:#1f1f1f"><button class="btn sm sec" style="background:#fff" onclick="zoomVisor(-0.25)">−</button><button class="btn sm sec" style="background:#fff" onclick="zoomVisor(0.25)">+</button><span id="docvp" style="color:#ddd;align-self:center;font-size:13px"></span><button class="btn sm sec" style="background:#fff;margin-left:auto" onclick="baixaDoc('+i+')">Baixar</button></div>'+
      '<div id="docvc" style="flex:1;overflow:auto;padding:8px;-webkit-overflow-scrolling:touch"></div>';
    document.body.appendChild(o);
    desenhaVisor();
  });
}
function fechaVisor(){var o=document.getElementById('docv');if(o)o.remove();if(viewerDoc&&viewerDoc.doc){try{viewerDoc.doc.destroy()}catch(e){}}viewerDoc=null}
function zoomVisor(dz){if(!viewerDoc)return;viewerDoc.z=Math.max(0.5,Math.min(3,viewerDoc.z+dz));desenhaVisor()}
function desenhaVisor(){
  var v=viewerDoc,c=document.getElementById('docvc');if(!v||!c)return;c.innerHTML='';
  var f=v.f,isImg=/^image\//.test(f.type);
  if(isImg){var u=URL.createObjectURL(f);c.innerHTML='<img src="'+u+'" style="width:'+Math.round(v.z*100)+'%;display:block;margin:0 auto;background:#fff">';return}
  if(!window.pdfjsLib){c.innerHTML='<p style="color:#fff">O visualizador não carregou. Use “Baixar” para abrir o arquivo.</p>';return}
  pdfjsLib.GlobalWorkerOptions.workerSrc='pdf.worker.min.js';
  var go=function(doc){
    v.doc=doc;var P0=document.getElementById('docvp');if(P0)P0.textContent=doc.numPages+' página(s)';
    var W=Math.max(280,(c.clientWidth-16))*v.z,dpr=Math.min(window.devicePixelRatio||1,2),slots=[];
    var obs=('IntersectionObserver' in window)?new IntersectionObserver(function(es){es.forEach(function(en){if(en.isIntersecting){obs.unobserve(en.target);desenhaPag(doc,en.target,W,dpr)}})},{root:c,rootMargin:'600px'}):null;
    for(var n=1;n<=doc.numPages;n++){
      var s=document.createElement('div');s.dataset.n=n;s.style.cssText='background:#fff;margin:0 auto 8px;width:'+W+'px;min-height:'+Math.round(W*1.4)+'px';c.appendChild(s);
      if(obs)obs.observe(s);else desenhaPag(doc,s,W,dpr);
    }
  };
  f.arrayBuffer().then(function(b){return pdfjsLib.getDocument({data:b}).promise}).then(go,function(){c.innerHTML='<p style="color:#fff">Não consegui exibir este PDF aqui. Use “Baixar”.</p>'});
}
function desenhaPag(doc,slot,W,dpr){
  doc.getPage(+slot.dataset.n).then(function(pg){
    var vp0=pg.getViewport({scale:1}),sc=W/vp0.width,vp=pg.getViewport({scale:sc*dpr}),cv=document.createElement('canvas');
    cv.width=vp.width;cv.height=vp.height;cv.style.width=W+'px';cv.style.display='block';
    slot.style.minHeight='0';slot.innerHTML='';slot.appendChild(cv);
    pg.render({canvasContext:cv.getContext('2d'),viewport:vp});
  });
}
function abreDoc(i){visualizaDoc(i)}

function vArquivos(){
  var p=P(),h='<div class="pg">'+IC.folder+'<div><h2>Arquivos</h2><p class="mut">Documentos de '+esc(nome1(p))+' · '+(p.docs.length?p.docs.length+' arquivo(s)':'nenhum ainda')+'</p></div></div>'+
    '<div class="card"><h2>Adicionar documento</h2><p class="mut" style="margin:0 0 8px">Escolha o arquivo, confirme o paciente e salve. O original fica guardado, sem alterações.</p>'+pickBtns()+'<div id="impst" class="mut" style="margin-top:6px"></div></div><div id="staging">'+renderStaged()+'</div>';
  var ds=p.docs.map(function(d,i){return{d:d,i:i}});
  if(p.docs.length>4)h+='<div class="srch">'+IC.search+'<input type="search" placeholder="Buscar documento" value="'+esc(docQ)+'" oninput="docQ=this.value;docLista()" autocomplete="off"></div>';
  h+='<div class="chips" style="margin-bottom:8px">'+['todos'].concat(TIPOS_DOC).map(function(c){return'<button class="chip'+(docFil2===c?' on':'')+'" onclick="docFil2=\''+c+'\';render(true)">'+(c==='todos'?'Todos':c)+'</button>'}).join('')+'</div><div id="doclista">'+docListaHtml(p)+'</div>';
  h+='<details class="card"><summary><b>Exportar, Drive e backup</b></summary>'+
    '<div class="row" style="margin-top:8px"><button class="btn sec" onclick="goTab(\'google\')">☁ Drive e sincronização</button></div>'+
    '<div class="row" style="margin-top:8px"><button class="btn sec" onclick="exportBackup()">⬇️ Salvar backup</button><label class="btn sec" style="margin:8px 0 0;text-align:center">⬆️ Restaurar<input type="file" accept="application/json,.json" hidden onchange="importBackup(this.files[0])"></label></div>'+
    '<div class="row" style="margin-top:8px"><label class="btn sec" style="margin:8px 0 0;text-align:center">Importar ficha (.json)<input type="file" accept=".json,application/json" style="display:none" onchange="importaFicha(this)"></label></div>'+
    '<p class="mut">O backup guarda os dois perfis, mas <b>não inclui os arquivos originais</b> (PDFs e fotos): eles ficam neste aparelho e, se você quiser, no Drive. Guarde em local seguro: contém dados de saúde.</p></details>';
  h+='<details class="card"><summary><b>Privacidade e segurança</b></summary><p class="mut">Os documentos ficam só neste aparelho, atrás do PIN do app, separados por pessoa. O app <b>não lê nem interpreta</b> o conteúdo dos arquivos e não os envia a nenhuma inteligência artificial. Só vão ao Google Drive se você conectar o Drive e marcar essa opção.</p><div class="row"><button class="btn sec" onclick="exportaPessoa()">Exportar dados de '+esc(nome1(p))+'</button><button class="btn sec" style="color:var(--bad)" onclick="apagaPessoa()">Excluir dados de '+esc(nome1(p))+'</button></div></details>';
  return h;
}
function docLista(){var e=document.getElementById('doclista');if(e)e.innerHTML=docListaHtml(P())}
function docListaHtml(p){
  var q=norm(docQ.trim()),ds=p.docs.map(function(d,i){return{d:d,i:i}}).filter(function(o){
    var t=o.d.tipo||'Outro';if(/laudo laboratorial|bioimped|consulta/i.test(t))t='Exame';if(/receita/i.test(t))t='Receita';
    return(docFil2==='todos'||t===docFil2)&&(!q||norm((o.d.nome||o.d.file)+' '+o.d.d+' '+(o.d.tipo||'')).indexOf(q)>-1);
  }).sort(function(a,b){return dkey(b.d.d)<dkey(a.d.d)?-1:dkey(b.d.d)>dkey(a.d.d)?1:0});
  if(!ds.length)return'<div class="card"><div class="empty">'+(p.docs.length?'Nenhum documento neste filtro.':'Nenhum documento ainda.')+'</div></div>';
  var h='',ano=null;
  ds.forEach(function(o){
    var d=o.d,y=(d.d||'').slice(6)||'Sem data';
    if(y!==ano){if(ano!==null)h+='</div>';ano=y;h+='<div class="card"><h2>'+esc(y)+'</h2>'}
    h+='<div class="li"><div class="exr" style="align-items:flex-start"><div style="min-width:0"><b>'+esc(d.nome||bonito(d.file))+'</b><div class="mut">'+esc(d.d||'sem data')+' · '+esc(d.tipo||'Documento')+(d.size?' · '+tamanho(d.size):'')+(d.drive?' · no Drive':'')+'</div></div></div>'+
      (d.id?'<div class="row" style="margin-top:6px"><button class="btn sm" onclick="visualizaDoc('+o.i+')">Visualizar</button><button class="btn sm" style="background:var(--gold)" onclick="compartilhaDoc('+o.i+')">Compartilhar</button></div>'+
        '<div class="row" style="margin-top:4px"><button class="btn sm sec" onclick="baixaDoc('+o.i+')">Baixar</button><button class="btn sm sec" onclick="renomeiaDoc('+o.i+')">Renomear</button><button class="btn sm sec" style="color:var(--bad)" onclick="excluiDoc('+o.i+')">Excluir</button></div>'
        :'<div class="mut" style="margin-top:4px">Original não está neste aparelho.</div><div class="row" style="margin-top:4px"><button class="btn sm sec" onclick="renomeiaDoc('+o.i+')">Renomear</button><button class="btn sm sec" style="color:var(--bad)" onclick="excluiDoc('+o.i+')">Excluir</button></div>')+'</div>';
  });
  return h+'</div>';
}

/* Adicionar: exame = só digitar; documento = arquivo */
function vAdicionar(){
  var p=P();
  if(!addSec){
    return'<div class="pg">'+IC.plus+'<div><h2>Adicionar</h2><p class="mut">para '+esc(nome1(p))+' — o que você quer registrar?</p></div></div>'+
    '<div class="g2 tiles"><button class="tl" onclick="goAdd(\'sint\')">'+IC.wave+'<b>Sintoma</b></button><button class="tl" onclick="goAdd(\'med\')">'+IC.pill+'<b>Medicamento</b></button>'+
    '<button class="tl" onclick="goAdd(\'consulta\')">'+IC.cal+'<b>Consulta</b></button><button class="tl" onclick="goAdd(\'doc\')">'+IC.upl+'<b>Documento</b></button>'+
    '<button class="tl wide" onclick="goAdd(\'exame\')">'+IC.flask+'<b>Digitar um resultado de exame</b></button></div>';
  }
  var back=voltaBtn("addSec=null;render()",{sint:'Registrar sintoma',med:'Novo medicamento',exame:'Resultado de exame',consulta:'Nova consulta',doc:'Novo documento'}[addSec]);
  if(addSec==='sint')return back+vSintReg();
  if(addSec==='med')return back+'<div class="card">'+usoForm({tipo:'Medicamento'},-1)+'</div>';
  if(addSec==='consulta')return back+formConsulta();
  if(addSec==='doc')return back+'<div class="card"><h2>Documento (PDF ou foto)</h2><p class="mut" style="margin:0 0 8px">Escolha o arquivo, confirme o paciente e salve. Exames, receitas e laudos ficam guardados em Arquivos.</p>'+pickBtns()+'<div id="impst" class="mut" style="margin-top:6px"></div></div>';
  return back+'<div class="card"><p class="mut" style="margin:0">Para guardar o PDF do exame, use <b>Documento</b>. Aqui você só digita um resultado, se quiser.</p><label>Exame</label><input id="en"><div class="row"><div><label>Valor</label><input id="ev" inputmode="decimal"></div><div><label>Unidade</label><input id="eu"></div></div>'+
    '<label>Data</label><input id="ed" type="date" value="'+isoHoje()+'"><details class="mais"><summary>Referência do laudo (opcional)</summary><div class="row"><div><label>Mínima</label><input id="emin" inputmode="decimal"></div><div><label>Máxima</label><input id="emax" inputmode="decimal"></div></div></details>'+
    '<button class="btn" onclick="addExame()">Salvar resultado</button></div>';
}
function irImportar(files){var f=[].slice.call(files);addSec=null;tab='arquivos';render();readFiles(f)}

/* =====================================================================
   PREPARAÇÃO PARA CONSULTAS: o usuário escolhe o que entra no resumo
   ===================================================================== */
var SEL_REL={'Neurologista':/mem[oó]ria|aten[cç][aã]o|concentra|rigidez|dor|fadiga|cansa[cç]o/i,'Psiquiatra':/depress|ansied|aten[cç][aã]o|concentra|mem[oó]ria|tdah/i,'Reumatologista':/dor|rigidez|fadiga|cansa|mal-estar|incha[cç]o|reten/i,'Coloproctologista / Gastro':/sangue|abdominal/i,'Endocrinologista':/incha|reten|fadiga|cansa/i,'Pneumologista':/respirat|fadiga/i};
function selGet(p,esp,key,def){var s=p.resSel&&p.resSel[esp];return s&&Object.prototype.hasOwnProperty.call(s,key)?s[key]:def}
function selSet(key,v){var p=P();if(!p.resSel)p.resSel={};(p.resSel[espSel]=p.resSel[espSel]||{})[key]=v;save();atualizaResumo()}
function selGrupo(g,v){
  var p=P();selItens(p,espSel).filter(function(o){return o.g===g}).forEach(function(o){if(!p.resSel)p.resSel={};(p.resSel[espSel]=p.resSel[espSel]||{})[o.k]=v});save();render(true);
}
function selItens(p,esp){
  var r=[],rx=SEL_REL[esp];
  (p.diag||[]).filter(function(x){return!x.fim}).forEach(function(x){r.push({g:'diag',k:'d:'+norm(x.n),t:x.n,sub:tdNome(x.tipo||'rel'),def:true})});
  p.meds.forEach(function(m){r.push({g:'med',k:'m:'+norm(m.n),t:m.n,sub:(m.dose||'')+(m.sit==='confirmado'?'':' · uso não confirmado'),def:true})});
  (p.sint||[]).forEach(function(s){r.push({g:'sint',k:'s:'+norm(s.n),t:s.n,sub:s.estado==='monitorar'?'a observar':'',def:s.estado!=='monitorar'&&(!rx||rx.test(s.n)),rel:!!(rx&&rx.test(s.n))})});
  if(p.diario&&p.diario.length)r.push({g:'sint',k:'diario',t:'Diário do dia (dor, rigidez, fadiga)',sub:'últimos registros',def:!rx||/dor|rigidez|fadiga/.test(String(rx))});
  return r.map(function(o){o.on=selGet(p,esp,o.k,o.def);return o});
}
function selHtml(p,esp){
  var its=selItens(p,esp),G={diag:'Diagnósticos e condições',med:'Medicamentos',sint:'Sintomas'};
  var h='<div class="card noprint"><h2>O que incluir no resumo</h2><p class="mut" style="margin:0 0 6px">Marque ou desmarque. Nada é excluído do prontuário — só deixa de aparecer neste resumo. Em <b>'+esc(esp)+'</b>, os sintomas mais ligados à especialidade já vêm marcados; os outros continuam disponíveis.</p>';
  ['sint','med','diag'].forEach(function(g){
    var l=its.filter(function(o){return o.g===g});if(!l.length)return;
    if(g==='sint')l.sort(function(a,b){return(b.rel?1:0)-(a.rel?1:0)});
    h+='<details'+(g==='sint'?' open':'')+' style="margin-top:6px"><summary><b>'+G[g]+'</b> <span class="mut">'+l.filter(function(o){return o.on}).length+' de '+l.length+'</span></summary>'+
      '<div class="row" style="margin:4px 0"><button class="btn sm sec" onclick="selGrupo(\''+g+'\',true)">Marcar todos</button><button class="btn sm sec" onclick="selGrupo(\''+g+'\',false)">Desmarcar todos</button></div>'+
      l.map(function(o){return'<label style="display:flex;gap:8px;align-items:flex-start;margin:4px 0;color:var(--ink)"><input type="checkbox" style="width:auto;margin-top:3px"'+(o.on?' checked':'')+' onchange="selSet(\''+o.k.replace(/'/g,"\\'")+'\',this.checked)"><span>'+esc(o.t)+(o.rel?' <span class="tag t-info">relevante</span>':'')+(o.sub?'<div class="mut">'+esc(o.sub)+'</div>':'')+'</span></label>'}).join('')+'</details>';
  });
  h+='<div style="margin-top:8px"><label style="display:flex;gap:8px;align-items:center;color:var(--ink);margin:4px 0"><input type="checkbox" style="width:auto"'+(selGet(p,esp,'x:avaliacao',false)?' checked':'')+' onchange="selSet(\'x:avaliacao\',this.checked)">Incluir exames em avaliação (sugeridos/solicitados)</label>'+
    '<label style="display:flex;gap:8px;align-items:center;color:var(--ink);margin:4px 0"><input type="checkbox" style="width:auto"'+(selGet(p,esp,'x:result',false)?' checked':'')+' onchange="selSet(\'x:result\',this.checked)">Incluir resultados de exames lançados à mão</label></div></div>';
  return h;
}
function atualizaResumo(){var e=document.getElementById('sheetres');if(e)e.innerHTML=resumoHtml(P(),espSel)}
function resumoHtml(p,esp){
  var h='<h3>Resumo para consulta — '+esc(esp)+'</h3><div class="mut">Gerado em '+nowStr()+' · informações relatadas pelo paciente ou acompanhante</div>';
  var its=selItens(p,esp),on=function(k){var r=false;its.forEach(function(o){if(o.k===k)r=o.on});return r};
  var id=idadeDe(p.nasc);
  h+='<h4>1. Identificação do paciente</h4><ul><li>'+esc(p.nome)+(p.nasc?' · nascimento '+esc(p.nasc)+(id!==''?' ('+id+' anos)':''):'')+'</li></ul>';
  var dg=(p.diag||[]).filter(function(x){return!x.fim&&on('d:'+norm(x.n))});
  h+='<h4>2. Diagnósticos e antecedentes</h4>';
  if(!dg.length)h+='<div class="mut">Nenhum selecionado.</div>';
  TD.forEach(function(t){var l=dg.filter(function(x){return(x.tipo||'rel')===t[0]});if(!l.length)return;h+='<div><b>'+t[1]+'</b></div><ul>'+l.map(function(x){return'<li>'+esc(x.n)+(x.desde?' ('+esc(x.desde)+')':'')+(x.obs?' — '+esc(x.obs):'')+'</li>'}).join('')+'</ul>'});
  var ms=p.meds.filter(function(m){return on('m:'+norm(m.n))});
  h+='<h4>3. Medicamentos e doses</h4>';
  h+=ms.length?'<ul>'+ms.map(function(m){return'<li>'+esc(m.n)+' — '+esc(m.dose||'dose não informada')+(m.freq?', '+esc(m.freq):'')+(m.hor?' ('+esc(m.hor)+')':'')+(m.motivo?'. Indicação: '+esc(m.motivo):'')+(m.presc?'. Prescritor: '+esc(m.presc):'')+(m.inicio?'. Início: '+esc(m.inicio):'')+(m.efeitos?'. Efeitos percebidos: '+esc(m.efeitos):'')+(m.sit==='confirmado'?'':' <i>(uso relatado, ainda não confirmado)</i>')+'</li>'}).join('')+'</ul>':'<div class="mut">Nenhum selecionado.</div>';
  var ss=(p.sint||[]).filter(function(s){return on('s:'+norm(s.n))});
  h+='<h4>4. Sintomas selecionados e evolução</h4>';
  if(!ss.length&&!on('diario'))h+='<div class="mut">Nenhum selecionado.</div>';
  if(ss.length)h+='<ul>'+ss.map(function(s){var hs=sintHist(p,s.n),v=hs.slice(-5).map(function(x){return x.int}),u=hs[hs.length-1];
    return'<li><b>'+esc(s.n)+'</b>'+(s.estado==='investigar'?' (em investigação)':s.estado==='monitorar'?' (a observar; não registrado como presente)':'')+
      (hs.length?': intensidade '+v.join(' → ')+'/10 (último em '+esc(u.d)+')'+(u.freq?', '+esc(u.freq.toLowerCase()):'')+(u.dur?', duração '+esc(u.dur):'')+(u.onde?', local: '+esc(u.onde):''):': sem intensidade registrada')+
      (s.primeiro?'. Primeiro relato: '+esc(s.primeiro):hs.length?'. Primeiro registro: '+esc(hs[0].d):'')+(s.obs?'. '+esc(s.obs):'')+(u&&u.obs?'. Obs.: '+esc(u.obs):'')+'</li>'}).join('')+'</ul>';
  if(on('diario')){var last=p.diario.slice(-3).reverse();h+='<div><b>Diário do dia</b></div><ul>'+last.map(function(x){return'<li>'+esc(x.d)+': dor '+(x.dor||0)+'/10, rigidez '+(x.rig||0)+'/10, fadiga '+(x.fad||0)+'/10'+(x.obs?' ('+esc(x.obs)+')':'')+'</li>'}).join('')+'</ul>'}
  var qs=getPerg(p).filter(function(x){return x.trim()});
  h+='<h4>5. Perguntas para o especialista</h4>'+(qs.length?'<ol>'+qs.map(function(q){return'<li>'+esc(q)+'</li>'}).join('')+'</ol>':'<div class="mut">Nenhuma pergunta escrita.</div>');
  var ob=(p.obs&&p.obs[esp])||'';
  h+='<h4>6. Observações adicionais</h4>'+(ob.trim()?'<div>'+esc(ob).replace(/\n/g,'<br>')+'</div>':'<div class="mut">Nenhuma.</div>');
  if(selGet(p,esp,'x:avaliacao',false)){
    var ev=p.pend.filter(function(x){return x.s!=='descartado'&&x.s!=='removido'});
    if(ev.length)h+='<h4>Exames em avaliação</h4><ul>'+ev.map(function(x){return'<li>'+esc(x.n)+' — '+esc(estNome(x.s||'a pedir'))+(x.s==='a pedir'||!x.s?' (ideia para discutir, não é pedido médico)':'')+(x.cond?' · condicionado à avaliação médica':'')+'</li>'}).join('')+'</ul>';
  }
  if(selGet(p,esp,'x:result',false)&&p.exames.length)h+='<h4>Resultados de exames lançados</h4><ul>'+ultExames(p).map(function(e){return'<li>'+esc(e.d)+' — '+esc(e.n)+': '+esc(vtxt(e))+' '+esc(e.u||'')+(refTxt(e)?' (ref. '+esc(refTxt(e))+')':'')+'</li>'}).join('')+'</ul><div class="mut">Resultados antigos são históricos, não necessariamente atuais.</div>';
  return h+'<div class="mut" style="margin-top:10px">Resumo de apoio, sem interpretação diagnóstica. Não é documento médico nem prescrição.</div>';
}
function vPreparar(p){
  var pe=proxEsp(p);if(pe&&espAuto!==pe.id){espAuto=pe.id;espSel=pe.k}
  var h='<div class="card noprint"><h2>Preparar consulta</h2><label>Especialidade</label><select id="es" onchange="espSel=this.value;render(true)">'+espList().map(function(k){return'<option'+(k===espSel?' selected':'')+'>'+esc(k)+'</option>'}).join('')+'</select>'+
    '<div class="row" style="margin-top:8px"><button class="btn" onclick="window.print()">🖨️ Salvar em PDF</button><button class="btn sec" onclick="compartilhaResumo()">'+IC.share+' Compartilhar</button></div>'+
    '<p class="mut" style="margin:6px 0 0">Compartilhar abre o menu do celular (WhatsApp, Gmail…). Para PDF, escolha “Salvar como PDF” na janela de impressão.</p>'+
    (window.G&&G.connected()?'<button class="btn sec" style="width:100%;margin-top:6px" onclick="resumoDrive()">☁ Salvar no Drive</button><p id="gmsg" class="mut"></p>':'')+'</div>';
  h+=selHtml(p,espSel)+editConsulta(p);
  h+='<div class="card"><div class="sheet" id="sheetres">'+resumoHtml(p,espSel)+'</div></div>';
  return h;
}
function textoPront(p){
  var d=document.createElement('div');d.innerHTML=resumoHtml(p,'Geral');
  var t=d.innerText||d.textContent||'';return'PRONTUÁRIO — '+p.nome+'\n'+t.replace(/\n{3,}/g,'\n\n');
}

/* Saúde: botões simples e título da área */
function vSaude(){
  var p=P();
  if(saudeSec)return saudeSub(p);
  return'<div class="pg">'+IC.heart+'<div><h2 style="font-size:28px;font-family:Georgia,serif">Saúde</h2><p class="mut">Acompanhamento clínico de '+esc(nome1(p))+'</p></div></div>'+
    '<div class="srch">'+IC.search+'<input id="busca" type="search" placeholder="Pesquisar no prontuário" value="'+esc(qBusca)+'" oninput="doBusca(this.value)" autocomplete="off"></div>'+
    '<div id="bres">'+(qBusca.trim()?buscaHtml(p,qBusca):'')+'</div><div id="sechome" class="'+(qBusca.trim()?'hide':'')+'">'+
    '<div class="row wrap" style="margin-bottom:8px"><button class="btn" onclick="goAdd(\'med\')">'+IC.pill+' Adicionar medicamento</button><button class="btn" onclick="goAdd(\'sint\')">'+IC.wave+' Registrar sintoma</button></div>'+
    '<div class="row wrap" style="margin-bottom:10px"><button class="btn sec" onclick="goCons(\'preparar\')">Preparar consulta</button><button class="btn sec" onclick="document.getElementById(\'busca\').focus()">Atualizar informação</button></div>'+secCards(p)+'</div>';
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
      tab='arquivos';render();toast('Recebido pelo Compartilhar. Confirme o paciente e salve.');readFiles(fs);
    });
  },300);
}
pintaIcones();
render();
recebeCompartilhado();
