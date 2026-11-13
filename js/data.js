/*
 * Papelaria Manager 1.4 — Persistência local
 * A CHAVE ABAIXO É A MESMA DA VERSÃO 1.1.
 * Não mude DB_KEY se quiser preservar os dados já guardados no navegador.
 */
'use strict';
const DB_KEY = 'devkayko_papelaria_v1';

const INITIAL_SERVICES = [
  {name:'Impressão P&B',category:'Impressão',unit:'página',price:1},
  {name:'Impressão colorida',category:'Impressão',unit:'página',price:2.50},
  {name:'Xerox P&B',category:'Xerox',unit:'página',price:0.50},
  {name:'Currículo',category:'Documentos',unit:'unidade',price:15},
  {name:'Digitalização',category:'Digitalização',unit:'página',price:2},
  {name:'Plastificação',category:'Acabamento',unit:'unidade',price:6},
  {name:'Encadernação',category:'Acabamento',unit:'unidade',price:8}
];

const uid = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;

function freshData() {
  return {
    version:1,
    settings:{name:'Minha Papelaria',phone:'',address:''},
    products:[],
    services:INITIAL_SERVICES.map(item=>({id:uid(),...item})),
    employees:[],movements:[],sales:[],sessions:[],
    goals:{daily:0,monthly:0},
    ui:{theme:'light'},
    security:null, // senha do caixa: salt + hash derivado via PBKDF2

    lastBackup:null
  };
}

// Dados antigos da 1.0 e 1.1 não possuíam goals e ui.
function normalizeData(data) {
  data.goals = data.goals && typeof data.goals === 'object'
    ? {daily:Number(data.goals.daily)||0,monthly:Number(data.goals.monthly)||0}
    : {daily:0,monthly:0};
  data.ui = data.ui && typeof data.ui === 'object'
    ? {theme:data.ui.theme==='dark'?'dark':'light'}
    : {theme:'light'};
  data.security = data.security && typeof data.security==='object'
    && typeof data.security.salt==='string' && typeof data.security.hash==='string'
    && Number.isSafeInteger(data.security.iterations) && data.security.iterations>=100000
    ? data.security : null;
  data.movements.forEach(m=>{if(typeof m.voided!=='boolean')m.voided=false;});
  return data;
}

function validData(data) {
  if (!data || data.version!==1 || !data.settings || typeof data.settings.name!=='string')return false;
  const collections=['products','services','employees','movements','sales','sessions'];
  if (!collections.every(key=>Array.isArray(data[key]) && data[key].length<=200000))return false;
  return collections.every(key=>data[key].every(item=>item&&typeof item==='object'&&typeof item.id==='string'));
}

let storageError=false;
function loadData() {
  try {
    const raw=localStorage.getItem(DB_KEY);
    if (!raw)return freshData();
    const data=JSON.parse(raw);
    if (!validData(data))throw Error('Registros locais incompatíveis');
    return normalizeData(data);
  } catch (error) {
    storageError=true;
    alert('Não foi possível ler os registros antigos. Nenhum dado foi sobrescrito. Restaure um backup ou examine o armazenamento antes de salvar novos registros.');
    return freshData();
  }
}
let db=loadData();

function saveData() {
  if(storageError){alert('O armazenamento anterior está com erro. Para proteger os dados existentes, o salvamento foi bloqueado nesta aba.');return false;}
  try {
    localStorage.setItem(DB_KEY,JSON.stringify(db));
    return true;
  } catch (error) {
    alert('Não foi possível salvar. O armazenamento pode estar cheio ou bloqueado. Faça backup antes de continuar.');
    return false;
  }
}

// Modifica e salva como uma operação; desfaz a memória se a gravação falhar.
function commit(modifier) {
  const original=structuredClone(db);
  try {
    modifier();
    if(!saveData()){db=original;return false;}
    return true;
  }catch(error){db=original;alert(error.message||'Erro ao salvar');return false;}
}

function exportData() {
  const snapshot=structuredClone(db);
  const when=new Date().toISOString();
  snapshot.lastBackup=when;
  const blob=new Blob([JSON.stringify(snapshot,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const link=document.createElement('a');
  link.href=url;
  link.download=`papelaria-manager-backup-${new Date().toLocaleDateString('sv-SE')}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),2500);
  commit(()=>{db.lastBackup=when;});
}

async function importData(file) {
  if(!file||file.size>30*1024*1024)throw Error('Escolha um backup JSON de até 30 MB.');
  let data;
  try{data=JSON.parse(await file.text());}catch{throw Error('O arquivo JSON não pôde ser lido.');}
  if(!validData(data))throw Error('O arquivo não é um backup compatível do Papelaria Manager.');
  if(!confirm('ATENÇÃO: restaurar substitui todos os dados locais, inclusive vendas e estoque. Deseja continuar?'))return false;
  const original=db;
  db=normalizeData(data);
  if(!saveData()){db=original;return false;}
  return true;
}
