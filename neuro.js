/* v31 — Saúde Neurológica e Mental (apenas perfil de Rodrigo). Os dados ficam em p.neuro (importados por ficha JSON; nada de saúde vai para o código). */
var neuAb={},neuEd='',neuEdC='';
function neuIsR(p){return !!(S.profiles&&p===S.profiles.rodrigo)}
function neuD(p){var n=p.neuro=p.neuro||{};n.inicio=n.inicio||'';n.hist=n.hist||[];n.sint=n.sint||{};['epig','cogn','emoc'].forEach(function(k){n.sint[k]=n.sint[k]||[]});n.exames=n.exames||[];n.aval=n.aval||{sit:'a considerar',dominios:[]};n.aval.dominios=n.aval.dominios||[];n.hip=n.hip||[];n.consultas=n.consultas||[];n.evol=n.evol||[];return n}
function neuL(p,k){var n=neuD(p);if(k.indexOf('s.')===0)return n.sint[k.slice(2)];if(k==='dom')return n.aval.dominios;return n[k]}
function neuId(){return Date.now().toString(36)+Math.floor(Math.random()*1e4).toString(36)}
function mergeNeuro(p,f,cnt){
  var n=neuD(p),add=0;function tx(a,b){var l=a;(b||[]).forEach(function(x){if(!l.some(function(y){return norm(y)===norm(x)})){l.push(x);add++}})}
  if(f.inicio&&!n.inicio)n.inicio=f.inicio;tx(n.hist,f.hist);Object.keys(f.sint||{}).forEach(function(k){n.sint[k]=n.sint[k]||[];tx(n.sint[k],f.sint[k])});
  (f.exames||[]).forEach(function(x){if(n.exames.some(function(y){return norm(y.n)===norm(x.n)&&y.ano===x.ano}))return;x.id=x.id||neuId();n.exames.push(x);add++});
  if(f.aval){if(f.aval.sit&&!n.aval.sitEd)n.aval.sit=f.aval.sit;if(f.aval.nota&&!n.aval.nota)n.aval.nota=f.aval.nota;tx(n.aval.dominios,f.aval.dominios)}
  tx(n.hip,f.hip);(f.consultas||[]).forEach(function(c){c.id=c.id||neuId();n.consultas.push(c);add++});(f.evol||[]).forEach(function(c){n.evol.push(c);add++});
  cnt.neuro=add;
}
var _mfBase=mergeFicha;mergeFicha=function(p,f){var n=_mfBase(p,f);if(f.neuro)mergeNeuro(p,f.neuro,n);return n};
/* cartão + tela */
var _scBase=secCards;secCards=function(p){var h=_scBase(p);if(!neuIsR(p))return h;var n=neuD(p),tot=n.hist.length+n.exames.length+n.consultas.length;
  return secRow(IC.steth,'Saúde Neurológica e Mental',tot?'Histórico desde '+esc(n.inicio||'—')+' · '+n.consultas.length+' consulta(s) · avaliação: '+esc(n.aval.sit):'Histórico, avaliação e acompanhamento',"","goSaude('neuro')")+h};
var _ssBase=saudeSub;saudeSub=function(p){if(saudeSec==='neuro'&&neuIsR(p))return voltaBtn("saudeSec=null;render()",'Saúde Neurológica e Mental')+'<p class="mut" style="margin:-4px 0 10px 4px">Prontuário de '+esc(nome1(p))+'</p>'+vNeuro(p);return _ssBase(p)};
function neuTag(t,c){return'<span class="sp '+(c||'')+'" style="margin:0 4px 6px 0;display:inline-block">'+t+'</span>'}
function neuSec(k,tit,tags,corpo){return'<details class="card mais" '+(neuAb[k]?'open':'')+' ontoggle="neuAb[\''+k+'\']=this.open"><summary style="font-weight:700;font-size:17px">'+tit+'</summary><div style="margin-top:8px">'+tags+corpo+'</div></details>'}
function neuLista(p,k,ph){
  var L=neuL(p,k);
  return (L.map(function(x,i){var key=k+':'+i;
    if(neuEd===key)return'<div class="li"><textarea id="neui" rows="3" style="width:100%">'+esc(typeof x==='string'?x:x.t)+'</textarea><div class="row"><button class="btn sm" onclick="neuSalvaItem(\''+k+'\','+i+')">Salvar</button><button class="btn sm sec" onclick="neuEd=\'\';render(true)">Cancelar</button></div></div>';
    return'<div class="li" style="display:flex;gap:8px;align-items:flex-start"><div style="flex:1">'+(x&&x.d?'<b>'+esc(x.d)+'</b> — ':'')+esc(typeof x==='string'?x:x.t)+'</div><button class="btn sm sec" onclick="neuEd=\''+key+'\';render(true)">Editar</button><button class="btn sm sec" onclick="neuRem(\''+k+'\','+i+')" aria-label="Remover">✕</button></div>'}).join('')||'<div class="mut">Nada registrado.</div>')
  +'<div class="row" style="margin-top:6px"><input id="neua_'+k+'" placeholder="'+(ph||'Acrescentar')+'" style="flex:1">'+(k==='evol'?'':'')+'<button class="btn sm" onclick="neuAdd(\''+k+'\')">Adicionar</button></div>';
}
function neuAdd(k){var t=val('neua_'+k);if(!t)return;var p=P();neuD(p);neuL(p,k).push(k==='evol'?{d:dataBR(isoHoje()),t:t}:t);save();render(true)}
function neuRem(k,i){if(!confirm('Remover este registro?'))return;var p=P();neuL(p,k).splice(i,1);save();render(true)}
function neuSalvaItem(k,i){var t=val('neui');if(!t)return;var p=P(),L=neuL(p,k);if(typeof L[i]==='string')L[i]=t;else L[i].t=t;neuEd='';save();render(true)}
function neuDocs(p,vinc){return p.docs.map(function(d,i){return d.vinc===vinc?'<div class="li"><a href="#" onclick="abreDoc('+i+');return false">'+esc(d.nome)+'</a> <span class="mut">'+esc(d.d||'')+'</span></div>':''}).join('')}
function neuAnexa(vinc,nome,inp){var p=P(),n0=p.docs.filter(function(d){return d.vinc===vinc}).length;pedSalvaArquivos(inp.files,nome,'Resultado',dataBR(isoHoje()),vinc,'',n0);inp.value='';render(true)}
function neuBtnAnexo(vinc,nome){return'<label class="btn sm sec" style="display:inline-block;margin-top:4px">Anexar documento<input type="file" accept="application/pdf,image/*" multiple hidden onchange="neuAnexa(\''+vinc+'\',\''+nome.replace(/'/g,"")+'\',this)"></label>'}
function vNeuro(p){
  var n=neuD(p);
  var h='<div class="psnote" style="margin-top:0">Aqui ficam separados: <b>relato do paciente</b>, <b>exames documentados</b>, <b>hipóteses em investigação</b> e <b>diagnósticos confirmados</b>. Hipóteses não são diagnósticos.</div>';
  h+='<div class="row wrap" style="margin-bottom:8px"><button class="btn" onclick="neuPdf()">Gerar relatório em PDF</button></div>';
  h+=neuSec('h','Histórico desde '+esc(n.inicio||'—'),neuTag('Relato do paciente'),neuLista(p,'hist','Acrescentar ao histórico'));
  h+=neuSec('s','Sintomas atuais',neuTag('Relato do paciente'),
    '<h3 style="margin:6px 0">Sensação epigástrica</h3>'+neuLista(p,'s.epig')+'<h3 style="margin:10px 0 6px">Alterações cognitivas</h3>'+neuLista(p,'s.cogn')+'<h3 style="margin:10px 0 6px">Alterações emocionais e comportamentais</h3>'+neuLista(p,'s.emoc'));
  h+=neuSec('e','Exames anteriores',neuTag('Exames relatados pelo paciente'),
    (n.exames.map(function(x,i){var dc=neuDocs(p,'neu:e:'+x.id),tem=!!dc;
      return'<div class="li"><b>'+esc(x.n)+'</b> '+esc(x.ano||'')+'<div class="mut">'+esc(x.obs||'')+'</div>'+neuTag(tem?'Documento anexado':'Relatado · laudo original não anexado',tem?'':'')+dc+neuBtnAnexo('neu:e:'+x.id,x.n+' '+(x.ano||''))+' <button class="btn sm sec" onclick="neuRemEx('+i+')">✕</button></div>'}).join('')||'<div class="mut">Nenhum exame registrado.</div>')+
    '<div class="row wrap" style="margin-top:6px"><input id="nx_n" placeholder="Exame" style="flex:1"><input id="nx_a" placeholder="Ano" inputmode="numeric" style="width:80px"><input id="nx_o" placeholder="Resultado relatado" style="flex:1 1 100%"><button class="btn sm" onclick="neuAddEx()">Adicionar exame</button></div>');
  h+=neuSec('a','Avaliação neuropsicológica',neuTag('A considerar','')+neuTag('Hipóteses não são diagnósticos'),
    '<label>Situação</label><select onchange="neuSit(this.value)">'+['a considerar','agendada','realizada'].map(function(s){return'<option'+(n.aval.sit===s?' selected':'')+'>'+s+'</option>'}).join('')+'</select>'+
    '<div class="mut" style="margin:6px 0">A avaliação deve ser discutida com os profissionais responsáveis.</div><h3 style="margin:8px 0 6px">Domínios para investigação</h3>'+neuLista(p,'dom','Novo domínio')+
    '<h3 style="margin:12px 0 6px">Hipóteses em investigação</h3><div class="mut">Possibilidades a avaliar — nunca diagnósticos confirmados.</div>'+neuLista(p,'hip','Nova hipótese')+neuDocs(p,'neu:a')+neuBtnAnexo('neu:a','Avaliação neuropsicológica'));
  h+=neuSec('c','Consultas e acompanhamento',neuTag('Neurologia e Psiquiatria'),neuCons(p));
  h+=neuSec('v','Evolução dos sintomas',neuTag('Relato do paciente'),neuLista(p,'evol','O que mudou (hoje: '+dataBR(isoHoje())+')'));
  return h;
}
function neuSit(v){var p=P();neuD(p).aval.sit=v;neuD(p).aval.sitEd=1;save();render(true)}
function neuAddEx(){var n=val('nx_n');if(!n)return;var p=P();neuD(p).exames.push({id:neuId(),n:n,ano:val('nx_a'),obs:val('nx_o'),status:'relatado'});save();render(true)}
function neuRemEx(i){if(!confirm('Remover este exame da lista? Documentos anexados continuam em Arquivos.'))return;neuD(P()).exames.splice(i,1);save();render(true)}
function neuCons(p){
  var n=neuD(p),C=[['d','Data da consulta (dd/mm/aaaa)'],['esp','Especialidade'],['prof','Profissional'],['q','Queixas apresentadas'],['hip','Hipóteses levantadas pelo profissional'],['ex','Exames solicitados'],['med','Medicamentos prescritos ou modificados'],['or','Orientações'],['ret','Retorno']];
  var ed=n.consultas.filter(function(c){return c.id===neuEdC})[0]||{};
  var lista=n.consultas.slice().reverse().map(function(c){
    return'<div class="li"><b>'+esc(c.d||'Sem data')+' · '+esc(c.esp||'')+'</b> '+esc(c.prof||'')+C.slice(3).map(function(f){return c[f[0]]?'<div><span class="mut">'+f[1]+':</span> '+esc(c[f[0]])+'</div>':''}).join('')+neuDocs(p,'neu:c:'+c.id)+
    '<div class="row wrap" style="margin-top:4px"><button class="btn sm sec" onclick="neuEdC=\''+c.id+'\';render(true)">Editar</button>'+neuBtnAnexo('neu:c:'+c.id,'Consulta '+(c.esp||'')+' '+(c.d||''))+'<button class="btn sm sec" onclick="neuRemC(\''+c.id+'\')">✕</button></div></div>'}).join('')||'<div class="mut">Nenhuma consulta registrada.</div>';
  var f='<details class="mais" '+(neuEdC?'open':'')+'><summary>'+(neuEdC?'Editar consulta':'Registrar consulta')+'</summary>'+C.map(function(x){return'<label>'+x[1]+'</label>'+(x[0]==='q'||x[0]==='or'?'<textarea id="nc_'+x[0]+'" rows="2" style="width:100%">'+esc(ed[x[0]]||'')+'</textarea>':'<input id="nc_'+x[0]+'" value="'+esc(ed[x[0]]||'')+'">')}).join('')+'<div class="row" style="margin-top:8px"><button class="btn" onclick="neuSalvaC()">Salvar consulta</button>'+(neuEdC?'<button class="btn sec" onclick="neuEdC=\'\';render(true)">Cancelar</button>':'')+'</div><div class="mut">Depois de salvar, use "Anexar documento" para laudos e anexos.</div></details>';
  return lista+f;
}
function neuSalvaC(){var p=P(),n=neuD(p),o={};['d','esp','prof','q','hip','ex','med','or','ret'].forEach(function(k){o[k]=val('nc_'+k)});
  if(o.d&&!/^\d{2}\/\d{2}\/\d{4}$/.test(o.d)){alert('Data no formato dd/mm/aaaa.');return}
  if(!o.d&&!o.esp&&!o.q){alert('Informe ao menos data, especialidade ou queixas.');return}
  var ex=n.consultas.filter(function(c){return c.id===neuEdC})[0];if(ex)Object.assign(ex,o);else{o.id=neuId();n.consultas.push(o)}
  neuEdC='';save();render(true)}
function neuRemC(id){if(!confirm('Remover esta consulta?'))return;var n=neuD(P());n.consultas=n.consultas.filter(function(c){return c.id!==id});save();render(true)}
/* relatório PDF */
function neuLinhas(p){
  var n=neuD(p),L=[];function H(t){L.push({t:t.toUpperCase(),b:1,s:12,c:[0.06,0.35,0.24],gap:2})}function T(t,o){L.push(Object.assign({t:t,s:10.5,gap:1},o||{}))}
  L.push({t:'RELATÓRIO CLÍNICO — SAÚDE NEUROLÓGICA E MENTAL',b:1,s:15,c:[0.06,0.35,0.24],gap:4});
  T(p.nome||'',{b:1,s:13});T('Nascimento: '+(p.nasc||'não informado')+' · Gerado em '+dataBR(isoHoje()),{gap:4});
  T('Documento organizado a partir de relato do paciente, para apoiar a conversa com os profissionais. Hipóteses listadas NÃO são diagnósticos. Exames relatados não foram conferidos com laudos originais, salvo quando indicado.',{gap:8,c:[0.7,0.1,0.1]});
  H('Histórico desde '+(n.inicio||'—')+' (relato do paciente)');n.hist.forEach(function(x){T('- '+x)});L.push({t:' ',gap:4});
  H('Sintomas atuais (relato do paciente)');[['Sensação epigástrica','epig'],['Alterações cognitivas','cogn'],['Alterações emocionais e comportamentais','emoc']].forEach(function(g){T(g[0],{b:1});n.sint[g[1]].forEach(function(x){T('- '+x)})});L.push({t:' ',gap:4});
  H('Exames anteriores (relatados pelo paciente)');n.exames.forEach(function(x){T('- '+x.n+' '+(x.ano||'')+': '+(x.obs||'')+(neuDocs(p,'neu:e:'+x.id)?' [documento anexado]':' [laudo original não anexado]'))});L.push({t:' ',gap:4});
  H('Avaliação neuropsicológica — situação: '+n.aval.sit);T('A discutir com os profissionais responsáveis. Domínios a investigar:');n.aval.dominios.forEach(function(x,i){T((i+1)+'. '+x)});
  T('Hipóteses em investigação (não são diagnósticos):',{b:1});n.hip.forEach(function(x){T('- '+x)});L.push({t:' ',gap:4});
  H('Consultas e acompanhamento');n.consultas.forEach(function(c){T((c.d||'s/d')+' · '+(c.esp||'')+' '+(c.prof||''),{b:1});[['q','Queixas'],['hip','Hipóteses do profissional'],['ex','Exames solicitados'],['med','Medicamentos'],['or','Orientações'],['ret','Retorno']].forEach(function(f){if(c[f[0]])T(f[1]+': '+c[f[0]])})});if(!n.consultas.length)T('Nenhuma registrada.');L.push({t:' ',gap:4});
  H('Evolução dos sintomas');n.evol.forEach(function(x){T('- '+(x.d||'')+': '+x.t)});
  return L;
}
function neuPdf(){var p=P(),f=new File([pdfGera(neuLinhas(p))],'Relatório neurológico e mental - '+nome1(p)+'.pdf',{type:'application/pdf'});if(navigator.canShare&&navigator.canShare({files:[f]}))navigator.share({files:[f],title:f.name}).catch(function(){});else{salvaArq(f);toast('PDF baixado.')}}
try{render()}catch(e){}
