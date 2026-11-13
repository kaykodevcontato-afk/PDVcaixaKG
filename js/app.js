/*
 * Papelaria Manager 1.6 — Dev Kayko
 * Navegação, PDV, financeiro, metas, relatórios e interface.
 * Dados e backups: veja js/data.js
 * Layout e cores: veja css/style.css
 */
'use strict';

// ────────────────────────────────────────────────────────────
// 1. AJUDANTES E ESTADO DA INTERFACE
// ────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const money = number => Number(number||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const esc = value => String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const sum = (items,field) => items.reduce((total,item)=>total+(Number(item[field])||0),0);
const toCents = value => Math.round((Number(value)||0)*100);
const fromCents = value => Math.round(value)/100;
const validNonNeg = value => String(value).trim()!=='' && Number.isFinite(Number(value)) && Number(value)>=0;
const positive = value => validNonNeg(value) && Number(value)>0;
const pad = value => String(value).padStart(2,'0');
const localDate = (date=new Date()) => `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`;

// IMPORTANTE: ISO completo usa UTC e pode ter data diferente no Brasil à noite.
// Convertemos o timestamp para o DIA LOCAL ANTES de filtrar vendas e fechamentos.
function recordDay(value) {
  if(!value)return '';
  if(/^\d{4}-\d{2}-\d{2}$/.test(value))return value;
  const date=new Date(value);
  return Number.isNaN(date.getTime())?'':localDate(date);
}
const formatDateTime = iso => iso ? new Date(iso).toLocaleString('pt-BR') : '—';
const formatDate = date => /^\d{4}-\d{2}-\d{2}$/.test(date||'') ? `${date.slice(8,10)}/${date.slice(5,7)}/${date.slice(0,4)}` : '—';
const activeSession = () => db.sessions.find(session=>!session.closedAt);
const liveSales = () => db.sales.filter(sale=>!sale.voided);
const liveMovements = () => db.movements.filter(move=>!move.voided);
const saleTotal = sales => fromCents(sales.reduce((result,sale)=>result+toCents(sale.total),0));
const movTotal = (moves,type) => fromCents(moves.filter(m=>m.type===type).reduce((result,m)=>result+toCents(m.amount),0));
const periodMatch = (date,period) => period.type==='day' ? recordDay(date)===period.value : recordDay(date).startsWith(period.value);

let currentPage='inicio';
let cart=[];
let modalHandler=null;
let numpadFocus='posQty';
let lastReceiptSaleId=null; // ID para imprimir depois de registrar uma venda
let operatorUnlocked=!activeSession(); // novamente bloqueado depois de recarregar a página
let authRequest=null;
let authBusy=false;
let wrongAttempts=0;
let lockUntil=0;
let expectedFullscreenExit=false;
// Impressão nativa pode retirar o navegador do fullscreen automaticamente.
// Enquanto o comprovante estiver aberto, essa interrupção NÃO é uma saída do PDV.
// Não há liberação nova de senha: a sessão precisa já estar autenticada.
let receiptPrintSession=false;

function toast(text) {
  const element=$('toast');
  element.textContent=text;
  element.classList.add('show');
  clearTimeout(toast.timeout);
  toast.timeout=setTimeout(()=>element.classList.remove('show'),3700);
}
function emptyRow(cols,message='Nenhum registro encontrado.') {
  return `<tr><td colspan="${cols}" class="empty">${esc(message)}</td></tr>`;
}
function actionButtons(type,id) {
  return `<button class="table-action" data-action="edit" data-kind="${type}" data-id="${esc(id)}">Editar</button> <button class="table-action danger" data-action="delete" data-kind="${type}" data-id="${esc(id)}">Excluir</button>`;
}
function setBalance(element,value) {
  element.textContent=money(value);
  element.classList.toggle('balance-negative',value<0);
  element.classList.toggle('balance-positive',value>0);
}
function periodTotals(period) {
  const sales=liveSales().filter(s=>periodMatch(s.date,period));
  const moves=liveMovements().filter(m=>periodMatch(m.date,period));
  const salesAmount=saleTotal(sales);
  const extraIncome=movTotal(moves,'in');
  const expenses=movTotal(moves,'out');
  return {sales,moves,salesAmount,extraIncome,expenses,balance:fromCents(toCents(salesAmount)+toCents(extraIncome)-toCents(expenses))};
}
function selectedPeriod() {
  const type=$('reportPeriod').value;
  return {type,value:type==='day' ? $('reportDay').value : $('reportMonth').value};
}

// ────────────────────────────────────────────────────────────
// 2. NAVEGAÇÃO E VISÃO GERAL
// ────────────────────────────────────────────────────────────
const pageNames={inicio:'Visão geral',caixa:'Frente de caixa',produtos:'Produtos e estoque',servicos:'Serviços',financeiro:'Financeiro',funcionarios:'Funcionários',metas:'Metas',relatorios:'Relatórios e histórico',configuracoes:'Configurações'};
function go(page, bypassLock=false) {
  if(!pageNames[page]||!Access.isLoggedIn())return;
  // O parâmetro de desbloqueio NUNCA ignora o perfil do funcionário.
  if(Access.isOperator()&&page!=='caixa'){
    toast('Esta área é exclusiva do dono. Use Trocar usuário para entrar como proprietário.');
    return;
  }
  if(!bypassLock && activeSession() && !operatorUnlocked){requestCashPassword('resume');return;}
  if(!bypassLock && page!=='caixa' && activeSession() && document.body.classList.contains('pdv-focus')){
    requestCashPassword('exit',{nextPage:page});return;
  }
  currentPage=page;
  document.querySelectorAll('.page').forEach(section=>section.classList.toggle('active',section.id==='page-'+page));
  document.querySelectorAll('.nav-item').forEach(button=>button.classList.toggle('active',button.dataset.page===page));
  $('pageTitle').textContent=pageNames[page];
  $('sidebar').classList.remove('visible');
  document.body.classList.toggle('pdv-mode',page==='caixa');
  if(page==='caixa' && activeSession() && operatorUnlocked)document.body.classList.add('pdv-focus');
  if(page!=='caixa')document.body.classList.remove('pdv-focus');
  syncPdvFocusButton();
  render();
  window.scrollTo({top:0,behavior:'instant'});
}
function applyTheme() {
  const dark=db.ui.theme==='dark';
  document.documentElement.dataset.theme=dark?'dark':'light';
  $('themeLabel').textContent=dark?'Claro':'Escuro';
  $('themeToggle').title=dark?'Ativar modo claro':'Ativar modo escuro';
}
function toggleTheme() {
  const theme=db.ui.theme==='dark'?'light':'dark';
  if(commit(()=>{db.ui.theme=theme;})){applyTheme();toast(`Modo ${theme==='dark'?'escuro':'claro'} ativado.`);}
}
function render() {
  const today=localDate();
  const todayStats=periodTotals({type:'day',value:today});
  const monthStats=periodTotals({type:'month',value:today.slice(0,7)});
  const open=activeSession();

  $('brandName').textContent=db.settings.name||'Papelaria Manager';
  $('todayText').textContent=new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  $('footerYear').textContent=new Date().getFullYear();
  $('cashStatus').textContent=open?'● Caixa aberto':'● Caixa fechado';
  $('cashStatus').classList.toggle('open',Boolean(open));
  $('openCashBtn').disabled=Boolean(open);
  $('closeCashBtn').disabled=!open;
  $('closeCashBtn').textContent=Access.isOperator()?'🔐 Fechar caixa':'🔐 Fechar caixa e backup';
  $('roleBadge').textContent=Access.roleName();
  $('pdvProfile').textContent=Access.isOperator()?'👤 Funcionário':'👑 Dono';
  Access.refresh();
  if(!Access.isOwner()){
    // Funcionário só recebe os dados do catálogo e do carrinho no DOM.
    renderPosTiles();renderCart();applyTheme();return;
  }
  $('securityStatus').textContent=db.security?'Senha do dono configurada':'Senha não configurada';
  $('changeCashPassword').textContent=db.security?'Alterar senha do dono':'Criar senha do dono';
  syncPdvFocusButton();
  $('statSales').textContent=money(todayStats.salesAmount);
  $('statCount').textContent=`${todayStats.sales.length} venda(s) registrada(s)`;
  $('statIncome').textContent=money(todayStats.extraIncome);
  $('statExpenses').textContent=money(todayStats.expenses);
  setBalance($('statBalance'),todayStats.balance);
  $('statBalanceLabel').textContent=todayStats.balance<0?'Negativo — saídas superam entradas':'Vendas + entradas − saídas';

  const recent=[...db.sales].sort((a,b)=>(b.date||'').localeCompare(a.date||'')).slice(0,7);
  $('recentSales').innerHTML=recent.map(sale=>`<tr><td>${esc(formatDateTime(sale.date))}</td><td>${esc((sale.items||[]).map(item=>`${item.qty}× ${item.name}`).join(', ').slice(0,100))}${sale.voided?' <span class="tag-danger">CANCELADA</span>':''}</td><td>${esc(sale.payment||'—')}</td><td class="right">${money(sale.total)}</td></tr>`).join('') || emptyRow(4,'Nenhuma venda registrada.');
  const low=db.products.filter(product=>Number(product.stock)<=Number(product.minStock));
  $('statLow').textContent=low.length;
  $('lowStockList').innerHTML=low.slice(0,8).map(p=>`<div class="notice">⚠ ${esc(p.name)} — ${Number(p.stock)} unidade(s)</div>`).join('') || '<p class="muted">Sem alertas de estoque.</p>';
  $('homeGoal').innerHTML=goalMarkup('Meta do dia',todayStats.salesAmount,db.goals.daily);
  renderProducts();renderServices();renderEmployees();renderMovements(monthStats);
  renderPosTiles();renderCart();renderGoals();renderReports();
  $('settingName').value=db.settings.name||'';
  $('settingPhone').value=db.settings.phone||'';
  $('settingAddress').value=db.settings.address||'';
  $('lastBackupText').textContent=db.lastBackup?`Último backup gerado: ${formatDateTime(db.lastBackup)}`:'Nenhum backup gerado ainda.';
  applyTheme();
}

// ────────────────────────────────────────────────────────────
// 3. PRODUTOS, SERVIÇOS, FUNCIONÁRIOS
// ────────────────────────────────────────────────────────────
function renderProducts() {
  const q=$('productSearch').value.toLocaleLowerCase('pt-BR').trim();
  const lowOnly=$('stockFilter').value==='low';
  const products=db.products.filter(p=>[p.name,p.code||'',p.category||''].some(v=>v.toLocaleLowerCase('pt-BR').includes(q)) && (!lowOnly||p.stock<=p.minStock));
  $('productRows').innerHTML=products.map(p=>`<tr><td><b>${esc(p.name)}</b><small class="sub-info">${esc(p.category||'Geral')}</small></td><td>${esc(p.code||'—')}</td><td>${p.stock<=p.minStock?'⚠ ':''}${Number(p.stock)}</td><td>${money(p.cost)}</td><td>${money(p.price)}</td><td>${actionButtons('products',p.id)}</td></tr>`).join('')||emptyRow(6);
}
function renderServices() {
  $('serviceRows').innerHTML=db.services.map(s=>`<tr><td><b>${esc(s.name)}</b></td><td>${esc(s.category||'Geral')}</td><td>${esc(s.unit||'unidade')}</td><td>${money(s.price)}</td><td>${actionButtons('services',s.id)}</td></tr>`).join('')||emptyRow(5);
}
function renderEmployees() {
  $('employeeRows').innerHTML=db.employees.map(e=>`<tr><td><b>${esc(e.name)}</b></td><td>${esc(e.role)}</td><td>${money(e.salary)}</td><td>${actionButtons('employees',e.id)} <button class="table-action" data-action="pay" data-id="${esc(e.id)}">Registrar pagamento</button></td></tr>`).join('')||emptyRow(4);
}
function renderMovements(monthStats) {
  $('finIncome').textContent=money(monthStats.extraIncome);
  $('finExpense').textContent=money(monthStats.expenses);
  setBalance($('finBalance'),monthStats.balance);
  $('movementRows').innerHTML=[...db.movements].sort((a,b)=>(b.date||'').localeCompare(a.date||'')).slice(0,250).map(m=>`<tr class="${m.voided?'voided-row':''}"><td>${esc(formatDate(m.date))}</td><td>${m.type==='in'?'<span class="tag-in">Entrada</span>':'<span class="tag-out">Saída</span>'}</td><td>${esc(m.description)}${m.voided?' <span class="tag-danger">CANCELADO</span>':''}</td><td>${esc(m.category||'Geral')}</td><td>${money(m.amount)}</td><td>${m.voided?'—':`<button class="table-action danger" data-action="void-movement" data-id="${esc(m.id)}">Cancelar</button>`}</td></tr>`).join('')||emptyRow(6);
}

// ────────────────────────────────────────────────────────────
// 4. FRENTE DE CAIXA: CATÁLOGO E TECLADO
// ────────────────────────────────────────────────────────────
function catalog() {
  return [
    ...db.services.map(s=>({key:'s:'+s.id,kind:'s',name:s.name,code:'',unit:s.unit||'un.',category:s.category||'Geral',price:Number(s.price),stock:null})),
    ...db.products.map(p=>({key:'p:'+p.id,kind:'p',name:p.name,code:p.code||'',unit:'un.',category:p.category||'Geral',price:Number(p.price),stock:Number(p.stock)}))
  ];
}
function renderPosTiles() {
  const items=catalog();
  const kind=$('posKind').value;
  const categorySelect=$('posCategory');
  const previous=categorySelect.value;
  const categories=[...new Set(items.filter(i=>kind==='all'||i.kind===kind).map(i=>i.category))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
  categorySelect.innerHTML='<option value="all">Todas</option>'+categories.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('');
  categorySelect.value=categories.includes(previous)?previous:'all';
  const q=$('posSearch').value.toLocaleLowerCase('pt-BR').trim();
  const filtered=items.filter(i=>(kind==='all'||i.kind===kind)&&(categorySelect.value==='all'||i.category===categorySelect.value)&&(!q||[i.name,i.category,i.code].some(v=>v.toLocaleLowerCase('pt-BR').includes(q))));
  $('posQuickItems').innerHTML=filtered.map(i=>`<button type="button" class="pdv-tile ${i.kind==='s'?'tile-service':'tile-product'}" data-quick-item="${esc(i.key)}" ${i.kind==='p'&&i.stock<=0?'disabled':''} title="${esc(i.name)}"><span class="tile-type">${i.kind==='s'?'✂ SERVIÇO':'▣ PRODUTO'} · ${esc(i.category)}</span><strong>${esc(i.name)}</strong><span class="tile-price">${money(i.price)} <small>/ ${esc(i.unit)}</small></span>${i.kind==='p'?`<span class="tile-stock">Estoque: ${i.stock}</span>`:''}</button>`).join('')||'<div class="pdv-no-results">Nenhum item encontrado. Tente outra busca ou categoria.</div>';
}
function addToCart(key) {
  const [kind,id]=(key||'').split(':');
  const item=(kind==='p'?db.products:kind==='s'?db.services:[]).find(p=>p.id===id);
  const qty=Number($('posQty').value);
  if(!item||!Number.isInteger(qty)||qty<=0){toast('Informe uma quantidade inteira maior que zero.');return;}
  const existing=cart.find(i=>i.kind===kind&&i.id===id);
  if(kind==='p' && qty+(existing?.qty||0)>Number(item.stock)){toast('Não há estoque suficiente para essa quantidade.');return;}
  if(existing)existing.qty+=qty;
  else cart.push({kind,id,name:item.name,price:Number(item.price),cost:kind==='p'?Number(item.cost)||0:0,qty});
  $('posQty').value='1';
  renderCart();
  toast('Item adicionado ao carrinho.');
}
function focusNumericField(id) {
  numpadFocus=id;
  const labels={posQty:'quantidade',discountValue:'desconto',receivedAmount:'valor recebido'};
  $('numpadTarget').textContent='Editando: '+(labels[id]||'valor');
  document.querySelectorAll('[data-numpad]').forEach(el=>el.classList.toggle('numpad-selected',el.id===id));
}
function keypadPress(key) {
  const input=$(numpadFocus);
  if(!input||input.disabled||input.closest('[hidden]'))return;
  if(key==='enter'){input.blur();return;}
  let content=String(input.value||'');
  if(key==='C')content='';
  else if(key==='back')content=content.slice(0,-1);
  else if(key==='.') {if(!content.includes('.'))content=(content||'0')+'.';}
  else if(key==='00')content=content?content+'00':'0';
  else content=content==='0'?key:content+key;
  if(input.id==='posQty'&&content.includes('.'))return;
  input.value=content;
  input.dispatchEvent(new Event('input',{bubbles:true}));
}

// ────────────────────────────────────────────────────────────
// 5. CARRINHO E REGISTRO DE VENDAS
// ────────────────────────────────────────────────────────────
function cartMath() {
  const subtotalCents=cart.reduce((acc,item)=>acc+toCents(item.price)*item.qty,0);
  const discountInput=Number($('discountValue').value)||0;
  const discountCents=$('discountType').value==='percent'
    ? Math.round(subtotalCents*Math.max(0,Math.min(discountInput,100))/100)
    : Math.min(subtotalCents,Math.max(0,toCents(discountInput)));
  return {subtotal:fromCents(subtotalCents),discount:fromCents(discountCents),total:fromCents(subtotalCents-discountCents)};
}
function renderCart() {
  $('cartRows').innerHTML=cart.map((item,index)=>`<tr><td><b>${esc(item.name)}</b><small class="sub-info">${money(item.price)} / un.</small></td><td>${item.qty}</td><td class="right">${money(item.qty*item.price)}</td><td><button type="button" class="table-action danger" title="Remover item" data-remove-cart="${index}">✕</button></td></tr>`).join('')||emptyRow(4,'Selecione um produto ou serviço ao lado.');
  $('cartCount').textContent=cart.reduce((acc,item)=>acc+item.qty,0);
  const values=cartMath();
  $('posSubtotal').textContent=money(values.subtotal);
  $('posTotal').textContent=money(values.total);
  const cash=$('paymentMethod').value==='Dinheiro';
  $('receivedWrap').hidden=!cash;
  $('changeRow').hidden=!cash;
  if(numpadFocus==='receivedAmount'&&!cash)focusNumericField('posQty');
  const received=Number($('receivedAmount').value)||0;
  $('changeLabel').textContent=received>=values.total?'Troco':'Falta receber';
  $('posChange').textContent=money(Math.abs(fromCents(toCents(received)-toCents(values.total))));
}
function finishSale() {
  const session=activeSession();
  if(!session)return toast('Abra o caixa antes de registrar uma venda.');
  if(!operatorUnlocked)return requestCashPassword('resume');
  if(!cart.length)return toast('Adicione algum produto ou serviço.');
  const discountRaw=$('discountValue').value;
  if(!validNonNeg(discountRaw)||($('discountType').value==='percent'&&Number(discountRaw)>100))return toast('Desconto inválido.');
  const values=cartMath();
  const payment=$('paymentMethod').value;
  const cash=payment==='Dinheiro';
  if(cash&&(!validNonNeg($('receivedAmount').value)||toCents($('receivedAmount').value)<toCents(values.total)))return toast('Valor recebido é menor que o total.');
  for(const item of cart){
    if(item.kind==='p'){
      const product=db.products.find(p=>p.id===item.id);
      if(!product||Number(product.stock)<item.qty)return toast(`Estoque insuficiente: ${item.name}`);
    }
  }
  const sale={
    id:uid(),date:new Date().toISOString(),sessionId:session.id,
    items:structuredClone(cart),subtotal:values.subtotal,discount:values.discount,total:values.total,
    payment,received:cash?Number($('receivedAmount').value):values.total,
    note:$('saleNote').value.trim(),voided:false
  };
  // A baixa de estoque e o registro da venda são SALVOS JUNTOS.
  if(!commit(()=>{
    for(const item of sale.items){if(item.kind==='p')db.products.find(p=>p.id===item.id).stock-=item.qty;}
    db.sales.push(sale);
  }))return;
  cart=[];
  $('discountValue').value='0';
  $('receivedAmount').value='';
  $('saleNote').value='';
  $('posLastSale').textContent=`✓ Venda registrada em ${formatDateTime(sale.date)} — ${money(sale.total)}. Veja em Relatórios e histórico.`;
  render();
  toast(`Venda registrada no histórico: ${money(sale.total)}`);
  showReceiptModal(sale.id);
}
function cancelSale(id) {
  if(!Access.requireOwner())return;
  const sale=db.sales.find(s=>s.id===id);
  if(!sale||sale.voided)return;
  if(!confirm('Cancelar esta venda? Ela deixará de contar no saldo e na meta, mas permanecerá visível no histórico. Produtos serão devolvidos ao estoque.'))return;
  if(commit(()=>{
    sale.voided=true;
    sale.voidedAt=new Date().toISOString();
    (sale.items||[]).forEach(item=>{
      if(item.kind==='p'){
        const product=db.products.find(p=>p.id===item.id);
        if(product)product.stock+=Number(item.qty);
      }
    });
  })){render();toast('Venda cancelada e preservada no histórico.');}
}

// ────────────────────────────────────────────────────────────
// 6. ABERTURA E FECHAMENTO DE CAIXA
// ────────────────────────────────────────────────────────────
function sessionTotals(session) {
  const sales=liveSales().filter(s=>s.sessionId===session.id);
  const cashSales=saleTotal(sales.filter(s=>s.payment==='Dinheiro'));
  const electronicSales=saleTotal(sales.filter(s=>s.payment!=='Dinheiro'));
  const cashMoves=liveMovements().filter(m=>m.sessionId===session.id);
  const cashIn=movTotal(cashMoves,'in');
  const cashOut=movTotal(cashMoves,'out');
  const expected=fromCents(toCents(session.opening)+toCents(cashSales)+toCents(cashIn)-toCents(cashOut));
  return {cashSales,electronicSales,cashIn,cashOut,expected,numberSales:sales.length};
}
// A senha do caixa funciona localmente, sem servidor. O sistema controla
// a interface, mas não impede que alguém com acesso ao DevTools modifique dados.
function syncPdvFocusButton(){
  const focusing=document.body.classList.contains('pdv-focus');
  $('focusPdv').textContent=focusing?(activeSession()?'🔐 Sair da tela (senha)':'✕ Sair da tela expandida'):'⛶ Tela expandida';
}
function requestCashPassword(action,details={}){
  if(!Access.isLoggedIn())return;
  if(action==='change'&&!Access.requireOwner())return;
  if(!$('securityOverlay').hidden)return;
  const setup=!db.security;
  const change=action==='change';
  if(action!=='change' && !db.cashSecurity && action!=='exit'){
    toast('A senha do caixa ainda não foi configurada. Peça ao dono para criá-la em Configurações.');
    return;
  }
  authRequest={action,...details};
  const titles={open:'Abrir caixa',close:'Fechar caixa',exit:'Sair da tela expandida',resume:'Desbloquear caixa',change:setup?'Criar senha do dono':'Alterar senha do dono'};
  const descriptions={
    open:'Informe o saldo inicial e confirme a senha antes de começar o atendimento.',
    close:'O fechamento exige senha e conferência do valor contado na gaveta.',
    exit:'Somente o dono pode sair do PDV do funcionário e abrir os demais menus. Informe a senha do dono. O caixa continuará aberto.',
    resume:'Caixa em andamento. Informe a senha operacional do caixa para voltar ao PDV.',
    change:'Esta senha é exclusiva do dono e libera todo o painel administrativo.'
  };
  $('securityModalTitle').textContent=titles[action];
  $('securityModalDescription').textContent=descriptions[action];
  let fields='';
  if(change&&db.security)fields+='<label>Senha atual<input name="oldPass" type="password" minlength="6" maxlength="64" autocomplete="current-password" required></label>';
  if(setup||change){
    fields+='<label>Nova senha<input name="newPass" type="password" minlength="6" maxlength="64" autocomplete="new-password" required placeholder="Mínimo de 6 caracteres"></label>';
    fields+='<label>Confirmar nova senha<input name="confirmPass" type="password" minlength="6" maxlength="64" autocomplete="new-password" required></label>';
  }else fields+=`<label>${action==='exit'?'Senha do dono':'Senha operacional do caixa'}<input name="password" type="password" maxlength="64" autocomplete="off" required placeholder="Digite sua senha"></label>`;
  if(action==='open')fields+='<label>Saldo inicial em dinheiro (R$)<input name="opening" type="number" min="0" step="0.01" value="0" required inputmode="decimal"></label>';
  if(action==='close'){
    const total=sessionTotals(activeSession());
    if(Access.isOwner())fields+=`<div class="auth-summary">Esperado em dinheiro: <strong>${money(total.expected)}</strong></div>`;
    fields+=`<label>Dinheiro contado na gaveta (R$)<input name="counted" type="number" min="0" step="0.01" value="${total.expected.toFixed(2)}" required inputmode="decimal"></label>`;
  }
  $('securityFields').innerHTML=fields;
  $('securityError').hidden=true;
  $('securityError').textContent='';
  $('securityCancel').hidden=action==='resume';
  $('securitySwitchUser').hidden=action!=='resume';
  $('securityConfirm').textContent=action==='open'?'🔓 Abrir caixa':action==='close'?'🔒 Confirmar fechamento':action==='exit'?'Sair com senha':action==='resume'?'Desbloquear':'Salvar senha';
  $('securityOverlay').hidden=false;
  $('securityFields').querySelector('input')?.focus();
}
function closeSecurityDialog(){
  authRequest=null;
  $('securityOverlay').hidden=true;
  $('securityFields').innerHTML='';
  $('securityError').hidden=true;
}
function showSecurityError(text){
  $('securityError').textContent=text;
  $('securityError').hidden=false;
}
function setKioskMode(yes){
  document.body.classList.toggle('pdv-focus',yes);
  syncPdvFocusButton();
}
async function requestBrowserFullscreen(){
  // A chamada pode ser recusada por políticas do navegador, inclusive depois
  // de operações assíncronas. O modo CSS ocupa a área do site como alternativa.
  if(!document.fullscreenElement&&document.documentElement.requestFullscreen){
    try{await document.documentElement.requestFullscreen({navigationUI:'hide'});}
    catch{toast('O navegador não autorizou tela cheia. O PDV continua expandido dentro da página.');}
  }
}
async function releaseBrowserFullscreen(){
  if(!document.fullscreenElement)return;
  expectedFullscreenExit=true;
  try{await document.exitFullscreen();}
  catch{expectedFullscreenExit=false;}
}
function openCash(){
  if(activeSession())return toast('Já existe um caixa aberto.');
  requestCashPassword('open');
}
function closeCash(){
  if(!activeSession())return toast('O caixa já está fechado.');
  requestCashPassword('close');
}
async function submitCashPassword(event){
  event.preventDefault();
  if(authBusy||!authRequest)return;
  if(Date.now()<lockUntil)return showSecurityError('Muitas tentativas. Aguarde alguns segundos antes de tentar novamente.');
  authBusy=true;
  $('securityConfirm').disabled=true;
  const request={...authRequest};
  const form=new FormData($('securityForm'));
  try{
    const creating=false;
    const changing=request.action==='change';
    let securityRecord=null;
    if(creating||changing){
      const password=String(form.get('newPass')||'');
      if(password!==String(form.get('confirmPass')||''))throw Error('As duas senhas não conferem.');
      if(db.cashSecurity && await CashSecurity.verify(password,db.cashSecurity))throw Error('A senha do dono deve ser diferente da senha do caixa.');
      if(changing&&db.security && !(await CashSecurity.verify(String(form.get('oldPass')||''),db.security)))throw Error('Senha atual incorreta.');
      securityRecord=await CashSecurity.create(password);
    }else{
      const credential=Access.cashCredential(request.action);
      if(!credential || !(await CashSecurity.verify(String(form.get('password')||''),credential)))throw Error('Senha incorreta. Confira e tente novamente.');
    }
    let value=null;
    if(request.action==='open'){
      value=String(form.get('opening')||'').replace(',','.');
      if(!validNonNeg(value))throw Error('Saldo inicial inválido.');
    }
    if(request.action==='close'){
      value=String(form.get('counted')||'').replace(',','.');
      if(!validNonNeg(value))throw Error('Dinheiro contado inválido.');
    }
    // Confirmação de operações financeiras após validar senha.
    if(request.action==='close'){
      const values=sessionTotals(activeSession());
      const difference=fromCents(toCents(value)-toCents(values.expected));
      const message=Access.isOwner()
        ?`Fechar caixa agora?\n\nSaldo esperado: ${money(values.expected)}\nContado: ${money(value)}\nDiferença: ${money(difference)}\n\nO sistema baixará um backup JSON.`
        :`Fechar caixa agora?\n\nDinheiro contado: ${money(value)}\n\nO dono poderá consultar o fechamento e gerar os relatórios.`;
      if(!confirm(message))return;
    }
    if(request.action==='change'){
      if(!commit(()=>{db.security=securityRecord;}))return;
      closeSecurityDialog();
      render();toast('Senha do dono atualizada.');
    }else if(request.action==='open'){
      if(activeSession())throw Error('Já existe um caixa aberto.');
      if(!commit(()=>{
        if(securityRecord)db.security=securityRecord;
        db.sessions.push({id:uid(),openedAt:new Date().toISOString(),opening:Number(value),closedAt:null});
      }))return;
      operatorUnlocked=true;
      closeSecurityDialog();
      go('caixa');
      setKioskMode(true);
      await requestBrowserFullscreen();
      render();toast('Caixa aberto com senha. PDV expandido.');
    }else if(request.action==='close'){
      const session=activeSession();
      if(!session)throw Error('Caixa já fechado.');
      const totals=sessionTotals(session);
      if(!commit(()=>{
        if(securityRecord)db.security=securityRecord;
        session.closedAt=new Date().toISOString();
        session.expected=totals.expected;
        session.counted=Number(value);
        session.difference=fromCents(toCents(value)-toCents(totals.expected));
      }))return;
      operatorUnlocked=true;
      closeSecurityDialog();
      setKioskMode(false);
      await releaseBrowserFullscreen();
      if(Access.isOwner()){
        $('reportPeriod').value='day';$('reportDay').value=localDate();
        $('reportDayWrap').hidden=false;$('reportMonthWrap').hidden=true;
        exportData();
        go('relatorios');
        toast('Caixa fechado com senha. Backup baixado; relatório disponível.');
      }else{
        go('caixa',true);
        toast('Caixa fechado e salvo. O dono pode acessar o fechamento e o backup.');
      }
    }else if(request.action==='exit'){
      if(securityRecord && !commit(()=>{db.security=securityRecord;}))return;
      operatorUnlocked=true;
      closeSecurityDialog();
      setKioskMode(false);
      await releaseBrowserFullscreen();
      if(Access.isOperator())Access.promoteToOwner();
      go(request.nextPage||'inicio',true);
      toast('Painel do dono desbloqueado. O caixa permanece aberto.');
    }else if(request.action==='resume'){
      if(securityRecord && !commit(()=>{db.security=securityRecord;}))return;
      operatorUnlocked=true;
      closeSecurityDialog();
      go('caixa');
      setKioskMode(true);
      await requestBrowserFullscreen();
      toast('Caixa desbloqueado.');
    }
    wrongAttempts=0;
  }catch(error){
    if(/senha (incorreta|atual incorreta)/i.test(error.message)){
      wrongAttempts++;
      if(wrongAttempts>=5){lockUntil=Date.now()+15000;wrongAttempts=0;}
    }
    showSecurityError(error.message||'Não foi possível validar a senha.');
  }finally{authBusy=false;$('securityConfirm').disabled=false;}
}

// ────────────────────────────────────────────────────────────
// 7. FORMULÁRIOS DE CADASTRO
// ────────────────────────────────────────────────────────────
const fields={
  products:[['name','Nome do produto','text',true],['category','Categoria (ex.: Escolar)','text',false],['code','Código de barras ou código interno','text',false],['cost','Preço de custo (R$)','number',true],['price','Preço de venda (R$)','number',true],['stock','Quantidade em estoque','integer',true],['minStock','Estoque mínimo de alerta','integer',true]],
  services:[['name','Nome do serviço','text',true],['category','Categoria (ex.: Impressão)','text',false],['unit','Unidade (página, cópia, serviço...)','text',true],['price','Preço de venda (R$)','number',true]],
  employees:[['name','Nome do funcionário','text',true],['role','Cargo','text',true],['salary','Salário mensal (R$)','number',true]]
};
function openModal(title,html,handler) {
  if(!Access.requireOwner())return;
  $('modalTitle').textContent=title;
  $('modalFields').innerHTML=html;
  modalHandler=handler;
  $('modalOverlay').hidden=false;
  $('modalFields').querySelector('input,select')?.focus();
}
function closeModal() {$('modalOverlay').hidden=true;modalHandler=null;}
function entityModal(kind,id) {
  if(!Access.requireOwner())return;
  const entity=id?db[kind].find(item=>item.id===id):null;
  const label={products:'produto',services:'serviço',employees:'funcionário'}[kind];
  const html=fields[kind].map(([key,caption,type,required])=>{
    const number=type==='number'||type==='integer';
    const attributes=number?`type="number" min="0" step="${type==='integer'?'1':'0.01'}"`:'type="text" maxlength="120"';
    const defaultValue=key==='minStock'?'3':'';
    return `<label>${esc(caption)}<input name="${key}" ${attributes} ${required?'required':''} value="${esc(entity?.[key]??defaultValue)}"></label>`;
  }).join('');
  openModal(`${entity?'Editar':'Novo'} ${label}`,html,form=>{
    const record={};
    for(const [key,caption,type,required] of fields[kind]){
      const value=String(form.get(key)||'').trim();
      if(required&&!value)throw Error(`Preencha: ${caption}`);
      if(type==='number'||type==='integer'){
        if(!validNonNeg(value)||(type==='integer'&&!Number.isInteger(Number(value))))throw Error(`Número inválido: ${caption}`);
        record[key]=Number(value);
      }else record[key]=value;
    }
    if(kind==='products'&&record.code&&db.products.some(p=>p.id!==id&&p.code===record.code))throw Error('Código já cadastrado para outro produto.');
    if(commit(()=>{if(entity)Object.assign(entity,record);else db[kind].push({id:uid(),...record});}))return true;
    return false;
  });
}
function movementModal(employee) {
  if(!Access.requireOwner())return;
  const html=`
    <label>Tipo<select name="type"><option value="out">Saída</option><option value="in">Entrada</option></select></label>
    <label>Descrição<input name="description" maxlength="120" required value="${esc(employee?`Salário: ${employee.name}`:'')}"></label>
    <label>Categoria<input name="category" maxlength="80" required value="${esc(employee?'Salário':'Outros')}"></label>
    <label>Valor (R$)<input name="amount" type="number" min="0.01" step="0.01" required value="${employee?Number(employee.salary):''}"></label>
    <label>Data<input name="date" type="date" required value="${localDate()}"></label>
    <label>Afeta dinheiro físico no caixa aberto?<select name="cashImpact"><option value="no">Não (Pix, banco, cartão...)</option><option value="yes">Sim (dinheiro na gaveta)</option></select></label>`;
  openModal(employee?'Registrar salário pago':'Nova entrada ou saída',html,form=>{
    const date=String(form.get('date'));
    const amount=Number(form.get('amount'));
    const description=String(form.get('description')||'').trim();
    const category=String(form.get('category')||'').trim();
    const type=String(form.get('type'));
    const session=activeSession();
    if(!positive(amount)||!/^(\d{4}-\d{2}-\d{2})$/.test(date)||!description||!category||!['in','out'].includes(type))throw Error('Confira todos os campos do lançamento.');
    const record={id:uid(),date,type,description,category,amount,sessionId:form.get('cashImpact')==='yes'&&session?session.id:null,voided:false};
    return commit(()=>db.movements.push(record));
  });
}
function voidMovement(id) {
  if(!Access.requireOwner())return;
  const movement=db.movements.find(m=>m.id===id);
  if(!movement||movement.voided)return;
  if(!confirm('Cancelar este lançamento? O registro continuará visível com status CANCELADO, mas não contará nos totais.'))return;
  if(commit(()=>{movement.voided=true;movement.voidedAt=new Date().toISOString();})){render();toast('Lançamento cancelado e mantido no histórico.');}
}
function deleteEntity(kind,id) {
  if(!Access.requireOwner())return;
  if(cart.some(item=>item.id===id&&item.kind===(kind==='products'?'p':'s')))return toast('Remova primeiro esse item do carrinho.');
  if(!confirm('Excluir cadastro? Vendas antigas não serão apagadas do histórico.'))return;
  if(commit(()=>{db[kind]=db[kind].filter(item=>item.id!==id);})){render();toast('Cadastro excluído.');}
}

// ────────────────────────────────────────────────────────────
// 8. METAS DE VENDAS
// ────────────────────────────────────────────────────────────
function goalMarkup(title,current,target) {
  if(!target||target<=0)return `<p class="muted">${esc(title)} ainda não configurada. Abra Metas para definir um objetivo.</p>`;
  const percentage=current/target*100;
  const remaining=Math.max(0,fromCents(toCents(target)-toCents(current)));
  const color=percentage>=100?'success':'default';
  return `<div class="goal-block"><div class="goal-values"><strong>${money(current)}</strong><span>de ${money(target)}</span></div><div class="progress-track"><div class="progress-fill ${color}" style="width:${Math.max(0,Math.min(percentage,100)).toFixed(1)}%"></div></div><div class="goal-bottom"><strong>${percentage.toFixed(1).replace('.',',')}%</strong><span>${remaining?`Faltam ${money(remaining)}`:'✓ Meta atingida!'}</span></div></div>`;
}
function renderGoals() {
  const today=localDate();
  $('goalDaily').value=db.goals.daily;
  $('goalMonthly').value=db.goals.monthly;
  const day=periodTotals({type:'day',value:today});
  const month=periodTotals({type:'month',value:today.slice(0,7)});
  $('goalsProgress').innerHTML=`<h4>Hoje</h4>${goalMarkup('Meta diária',day.salesAmount,db.goals.daily)}<hr class="soft-divider"><h4>Este mês</h4>${goalMarkup('Meta mensal',month.salesAmount,db.goals.monthly)}`;
}

// ────────────────────────────────────────────────────────────
// 9. RELATÓRIOS: VENDAS, ITENS, FECHAMENTOS E SALDO
// ────────────────────────────────────────────────────────────
function renderReports() {
  const period=selectedPeriod();
  const {sales,moves,salesAmount,extraIncome,expenses,balance}=periodTotals(period);
  const canceledSales=db.sales.filter(s=>s.voided&&periodMatch(s.date,period));
  const canceledMoves=db.movements.filter(m=>m.voided&&periodMatch(m.date,period));
  const sessions=db.sessions.filter(s=>periodMatch(s.closedAt||s.openedAt,period));

  $('reportCompany').textContent=db.settings.name||'Papelaria Manager';
  $('reportCompanyDetail').textContent=[db.settings.address,db.settings.phone].filter(Boolean).join(' • ');
  $('reportTitle').textContent=period.type==='day'?`Fechamento diário — ${formatDate(period.value)}`:`Relatório mensal — ${period.value.slice(5,7)}/${period.value.slice(0,4)}`;
  $('reportSales').textContent=money(salesAmount);
  $('reportIncome').textContent=money(extraIncome);
  $('reportOut').textContent=money(expenses);
  setBalance($('reportBalance'),balance);
  $('reportSign').textContent=balance<0?'NEGATIVO':balance>0?'POSITIVO':'ZERADO';
  $('reportSign').className=`${balance<0?'balance-negative':balance>0?'balance-positive':''}`;

  const payments=new Map();
  for(const sale of sales)payments.set(sale.payment||'Outro',(payments.get(sale.payment||'Outro')||0)+toCents(sale.total));
  const paymentText=[...payments].map(([name,cents])=>`${esc(name)}: <b>${money(fromCents(cents))}</b>`).join(' · ')||'Sem vendas no período.';
  const itemsCount=sales.reduce((acc,s)=>acc+(s.items||[]).reduce((a,item)=>a+Number(item.qty||0),0),0);
  const discounts=fromCents(sales.reduce((acc,s)=>acc+toCents(s.discount||0),0));
  $('reportSummary').innerHTML=`
    <div><span>Vendas concluídas</span><strong>${sales.length}</strong></div>
    <div><span>Vendas canceladas</span><strong>${canceledSales.length}</strong></div>
    <div><span>Itens vendidos</span><strong>${itemsCount}</strong></div>
    <div><span>Descontos concedidos</span><strong>${money(discounts)}</strong></div>
    <div><span>Movimentações ativas</span><strong>${moves.length}</strong></div>
    <div><span>Movimentações canceladas</span><strong>${canceledMoves.length}</strong></div>
    <div class="summary-wide"><span>Formas de pagamento</span><p>${paymentText}</p></div>`;

  // Soma quantidades por item. Valores de venda são registrados na hora da venda,
  // mesmo se o preço do cadastro mudar depois.
  const aggregate=new Map();
  for(const sale of sales){
    for(const item of (sale.items||[])){
      const key=`${item.kind}:${item.id||item.name}:${item.price}`;
      const record=aggregate.get(key)||{kind:item.kind,name:item.name,qty:0,amountCents:0};
      record.qty+=Number(item.qty)||0;
      record.amountCents+=toCents(item.price)*(Number(item.qty)||0);
      aggregate.set(key,record);
    }
  }
  $('reportItemRows').innerHTML=[...aggregate.values()].sort((a,b)=>b.qty-a.qty).map(item=>`<tr><td>${item.kind==='p'?'Produto':'Serviço'}</td><td>${esc(item.name)}</td><td>${item.qty}</td><td class="right">${money(fromCents(item.amountCents))}</td></tr>`).join('')||emptyRow(4);

  $('reportSaleRows').innerHTML=[...sales,...canceledSales].sort((a,b)=>b.date.localeCompare(a.date)).map(sale=>`<tr class="${sale.voided?'voided-row':''}"><td>${esc(formatDateTime(sale.date))}</td><td>${esc((sale.items||[]).map(i=>`${i.qty}× ${i.name}`).join(', '))}${sale.voided?' <span class="tag-danger">CANCELADA</span>':''}</td><td>${esc(sale.payment||'—')}</td><td class="right">${money(sale.total)}</td><td class="screen-only receipt-history-actions"><button type="button" class="table-action" data-action="receipt-client" data-id="${esc(sale.id)}">Via cliente</button><button type="button" class="table-action" data-action="receipt-store" data-id="${esc(sale.id)}">Via loja</button>${sale.voided?'':`<button class="table-action danger" data-action="void-sale" data-id="${esc(sale.id)}">Cancelar</button>`}</td></tr>`).join('')||emptyRow(5);
  $('reportMovRows').innerHTML=[...moves,...canceledMoves].sort((a,b)=>b.date.localeCompare(a.date)).map(m=>`<tr class="${m.voided?'voided-row':''}"><td>${esc(formatDate(m.date))}</td><td>${esc(m.description)}${m.voided?' <span class="tag-danger">CANCELADO</span>':''}</td><td>${esc(m.category||'Geral')}</td><td>${m.type==='in'?'Entrada':'Saída'}</td><td class="right">${money(m.amount)}</td></tr>`).join('')||emptyRow(5);
  $('reportSessionRows').innerHTML=sessions.sort((a,b)=>(b.openedAt||'').localeCompare(a.openedAt||'')).map(s=>`<tr><td>${esc(formatDateTime(s.openedAt))}</td><td>${s.closedAt?esc(formatDateTime(s.closedAt)):'ABERTO'}</td><td>${money(s.opening)}</td><td>${s.closedAt?money(s.expected):'—'}</td><td>${s.closedAt?money(s.counted):'—'}</td><td>${s.closedAt?`<span class="${Number(s.difference)<0?'balance-negative':Number(s.difference)>0?'balance-positive':''}">${money(s.difference)}</span>`:'—'}</td></tr>`).join('')||emptyRow(6);
}
function printReport() {
  if(!Access.requireOwner())return;
  go('relatorios');
  window.print();
}

// ────────────────────────────────────────────────────────────
// 9A. COMPROVANTES TÉRMICOS NÃO FISCAIS — PAPEL 58 MM
// O navegador abre a impressão do Windows / Android; não envia ESC/POS
// diretamente à impressora Bluetooth, pois isso depende do modelo/driver.
// ────────────────────────────────────────────────────────────
function showReceiptModal(saleId) {
  const sale=db.sales.find(s=>s.id===saleId);
  if(!sale)return;
  lastReceiptSaleId=saleId;
  $('receiptSaleText').textContent=`Venda ${sale.id.slice(0,8).toUpperCase()} • ${formatDateTime(sale.date)} • ${money(sale.total)}. Selecione a via que deseja imprimir.`;
  $('receiptOverlay').hidden=false;
}
function hideReceiptModal(){
  $('receiptOverlay').hidden=true;
  lastReceiptSaleId=null;
  // A ação "Continuar atendendo" é um gesto do usuário: tentamos restaurar
  // fullscreen sem pedir senha após a impressão. Caso o navegador negue,
  // o layout do PDV continua expandido normalmente.
  if(receiptPrintSession && activeSession() && operatorUnlocked &&
      document.body.classList.contains('pdv-focus') && !document.fullscreenElement){
    void requestBrowserFullscreen().finally(()=>{receiptPrintSession=false;});
  }else{
    receiptPrintSession=false;
  }
}
function receiptMarkup(sale,via) {
  const lines=(sale.items||[]).map(item=>{
    const qty=Number(item.qty)||0,price=Number(item.price)||0;
    return `<div class="receipt-item"><div class="receipt-item-name">${esc(item.name)}</div><div class="receipt-line"><span>${qty} × ${money(price)}</span><span>${money(qty*price)}</span></div></div>`;
  }).join('');
  const cash=sale.payment==='Dinheiro';
  const change=cash?fromCents(toCents(sale.received)-toCents(sale.total)):0;
  const canceled=sale.voided?'<div class="receipt-center"><strong>*** VENDA CANCELADA ***</strong></div>':'';
  return `<article class="receipt-ticket">
      <header class="receipt-center"><h3>${esc(db.settings.name||'Minha Papelaria')}</h3>
      ${db.settings.address?`<p>${esc(db.settings.address)}</p>`:''}
      ${db.settings.phone?`<p>Contato: ${esc(db.settings.phone)}</p>`:''}
      <p><b>COMPROVANTE NÃO FISCAL</b></p>
      <p><b>${via==='loja'?'VIA DA LOJA':'VIA DO CLIENTE'}</b></p></header>
      <hr class="receipt-divider">
      ${canceled}
      <div class="receipt-muted">Venda: ${esc(sale.id.slice(0,8).toUpperCase())}</div>
      <div class="receipt-muted">Data: ${esc(formatDateTime(sale.date))}</div>
      <hr class="receipt-divider">
      ${lines}
      <hr class="receipt-divider">
      <div class="receipt-line"><span>Subtotal:</span><span>${money(sale.subtotal)}</span></div>
      <div class="receipt-line"><span>Desconto:</span><span>− ${money(sale.discount)}</span></div>
      <div class="receipt-line"><strong>TOTAL:</strong><strong>${money(sale.total)}</strong></div>
      <div class="receipt-line"><span>Pagamento:</span><span>${esc(sale.payment||'Outro')}</span></div>
      ${cash?`<div class="receipt-line"><span>Recebido:</span><span>${money(sale.received)}</span></div><div class="receipt-line"><span>Troco:</span><span>${money(change)}</span></div>`:''}
      ${sale.note?`<hr class="receipt-divider"><div class="receipt-muted">Obs.: ${esc(sale.note)}</div>`:''}
      <hr class="receipt-divider">
      <footer class="receipt-center"><p>Obrigado pela preferência!</p><p>Impresso pelo Papelaria Manager</p></footer>
    </article>`;
}
let receiptPrintTimer=null;
function cleanupReceiptPrint(){
  document.body.classList.remove('printing-receipt');
  $('receiptPageStyle')?.remove();
  clearTimeout(receiptPrintTimer);
}
function printReceipt(saleId,via='cliente'){
  const sale=db.sales.find(s=>s.id===saleId);
  if(!sale)return toast('Venda não encontrada no histórico.');
  // Alguns navegadores encerram fullscreen ao abrir a caixa de impressão.
  // Identificamos somente essa operação para não bloquear uma venda legítima.
  if(activeSession() && operatorUnlocked && document.body.classList.contains('pdv-focus') &&
      !$('receiptOverlay').hidden)receiptPrintSession=true;
  const chosen=via==='ambas'?['cliente','loja']:[via];
  if(!chosen.every(v=>['cliente','loja'].includes(v)))return;
  const paper=$('receiptPaper');
  paper.innerHTML=chosen.map(item=>receiptMarkup(sale,item)).join('');
  // Ajusta o comprimento da folha conforme o texto, evitando desperdício
  // de uma folha A4 na impressora térmica. O driver deve usar papel 58 mm.
  // Rodapé medido com o mesmo CSS usado na impressão: comprimento suficiente
  // inclusive para vendas longas, com folga de 7 mm para destaque do rolo.
  const heightMm=Math.max(65,Math.min(1800,Math.ceil(paper.scrollHeight*25.4/96+7)));
  cleanupReceiptPrint();
  const style=document.createElement('style');
  style.id='receiptPageStyle';
  style.textContent=`@media print{@page{size:58mm ${heightMm}mm;margin:0}}`;
  document.head.append(style);
  document.body.classList.add('printing-receipt');
  window.addEventListener('afterprint',cleanupReceiptPrint,{once:true});
  try {window.print();}catch(error){cleanupReceiptPrint();toast('Não foi possível abrir a impressão: '+error.message);}
  // Fallback caso o navegador não emita afterprint.
  receiptPrintTimer=setTimeout(cleanupReceiptPrint,30000);
}

// ────────────────────────────────────────────────────────────
// 10. EVENTOS, ATALHOS E INICIALIZAÇÃO
// ────────────────────────────────────────────────────────────
function bind() {
  document.querySelectorAll('.nav-item').forEach(btn=>btn.addEventListener('click',()=>go(btn.dataset.page)));
  document.querySelectorAll('[data-go]').forEach(btn=>btn.addEventListener('click',()=>go(btn.dataset.go)));
  $('toggleMenu').addEventListener('click',()=>{if(Access.isOwner())$('sidebar').classList.toggle('visible');});
  $('themeToggle').addEventListener('click',toggleTheme);
  $('focusPdv').addEventListener('click',async()=>{
    if(document.body.classList.contains('pdv-focus')){
      if(activeSession())requestCashPassword('exit');
      else{setKioskMode(false);await releaseBrowserFullscreen();}
    }else{
      if(activeSession()&&!operatorUnlocked)return requestCashPassword('resume');
      setKioskMode(true);
      await requestBrowserFullscreen();
    }
  });
  $('securityForm').addEventListener('submit',submitCashPassword);
  $('securityCancel').addEventListener('click',()=>{
    if(authBusy||authRequest?.action==='resume')return;
    closeSecurityDialog();
  });
  $('securitySwitchUser').addEventListener('click',()=>{if(!authBusy)Access.logout();});
  $('changeCashPassword').addEventListener('click',()=>requestCashPassword('change'));
  // Uma saída manual de fullscreen continua exigindo senha. Já uma saída
  // causada pela janela nativa de impressão não é abandono do caixa.
  document.addEventListener('fullscreenchange',()=>{
    if(document.fullscreenElement){expectedFullscreenExit=false;return;}
    if(expectedFullscreenExit){expectedFullscreenExit=false;return;}
    if(receiptPrintSession)return;
    if(activeSession() && document.body.classList.contains('pdv-focus') &&
      !document.body.classList.contains('printing-receipt') && $('securityOverlay').hidden){
      operatorUnlocked=false;
      requestCashPassword('resume');
    }
  });
  for(const id of ['backupQuick','reportBackup','exportBackup'])$(id).addEventListener('click',()=>{if(!Access.requireOwner())return;exportData();render();toast('Backup JSON gerado. Confira sua pasta de downloads.');});
  $('importBackup').addEventListener('change',async event=>{
    if(!Access.requireOwner()){event.target.value='';return;}
    try{
      if(await importData(event.target.files[0])){cart=[];operatorUnlocked=!activeSession();render();if(activeSession()){go('caixa',true);setKioskMode(true);requestCashPassword('resume');}toast('Backup restaurado. Vendas e metas carregadas.');}
    }catch(error){alert(error.message);}finally{event.target.value='';}
  });
  $('settingsForm').addEventListener('submit',event=>{
    event.preventDefault();
    if(!Access.requireOwner())return;
    const name=$('settingName').value.trim();
    if(!name)return toast('Informe o nome da papelaria.');
    if(commit(()=>{db.settings={name,phone:$('settingPhone').value.trim(),address:$('settingAddress').value.trim()};})){render();toast('Informações atualizadas.');}
  });
  $('goalsForm').addEventListener('submit',event=>{
    event.preventDefault();
    if(!Access.requireOwner())return;
    if(!validNonNeg($('goalDaily').value)||!validNonNeg($('goalMonthly').value))return toast('Metas devem ser valores maiores ou iguais a zero.');
    const daily=Number($('goalDaily').value),monthly=Number($('goalMonthly').value);
    if(commit(()=>{db.goals={daily,monthly};})){render();toast('Metas salvas com sucesso.');}
  });
  $('newProduct').addEventListener('click',()=>entityModal('products'));
  $('newService').addEventListener('click',()=>entityModal('services'));
  $('newEmployee').addEventListener('click',()=>entityModal('employees'));
  $('newMovement').addEventListener('click',()=>movementModal());
  $('productSearch').addEventListener('input',renderProducts);
  $('stockFilter').addEventListener('change',renderProducts);
  $('openCashBtn').addEventListener('click',openCash);
  $('closeCashBtn').addEventListener('click',closeCash);
  $('posSearch').addEventListener('input',renderPosTiles);
  $('posKind').addEventListener('change',renderPosTiles);
  $('posCategory').addEventListener('change',renderPosTiles);
  $('resetPosFilters').addEventListener('click',()=>{$('posSearch').value='';$('posKind').value='all';$('posCategory').value='all';renderPosTiles();});
  $('posQuickItems').addEventListener('click',event=>{
    const tile=event.target.closest('[data-quick-item]');
    if(tile)addToCart(tile.dataset.quickItem);
  });
  document.querySelectorAll('[data-numpad]').forEach(input=>{
    input.addEventListener('focus',()=>focusNumericField(input.id));
    input.addEventListener('click',()=>focusNumericField(input.id));
  });
  $('posNumpad').addEventListener('click',event=>{const key=event.target.closest('[data-key]');if(key)keypadPress(key.dataset.key);});
  $('clearCart').addEventListener('click',()=>{if(cart.length&&confirm('Remover todos os itens desta venda ainda não concluída?')){cart=[];renderCart();}});
  $('finishSale').addEventListener('click',finishSale);
  ['discountType','discountValue','paymentMethod','receivedAmount'].forEach(id=>$(id).addEventListener('input',renderCart));
  $('reportPeriod').addEventListener('change',()=>{
    $('reportDayWrap').hidden=$('reportPeriod').value!=='day';
    $('reportMonthWrap').hidden=$('reportPeriod').value!=='month';
    renderReports();
  });
  ['reportDay','reportMonth'].forEach(id=>$(id).addEventListener('change',renderReports));
  $('printReport').addEventListener('click',printReport);
  $('exportExcelReport').addEventListener('click',()=>{if(Access.requireOwner())exportExcelPeriod(selectedPeriod());});
  $('exportExcelAll').addEventListener('click',()=>{if(Access.requireOwner())exportExcelPeriod({type:'all',value:''});});
  $('printCustomerReceipt').addEventListener('click',()=>printReceipt(lastReceiptSaleId,'cliente'));
  $('printStoreReceipt').addEventListener('click',()=>printReceipt(lastReceiptSaleId,'loja'));
  $('printBothReceipts').addEventListener('click',()=>printReceipt(lastReceiptSaleId,'ambas'));
  $('exportLastSaleExcel').addEventListener('click',()=>{if(Access.requireOwner())exportExcelSale(lastReceiptSaleId);});
  $('closeReceiptModal').addEventListener('click',hideReceiptModal);
  $('doneReceipt').addEventListener('click',hideReceiptModal);
  $('receiptOverlay').addEventListener('click',event=>{if(event.target===$('receiptOverlay'))hideReceiptModal();});
  $('closeModal').addEventListener('click',closeModal);
  $('cancelModal').addEventListener('click',closeModal);
  $('modalOverlay').addEventListener('click',event=>{if(event.target===$('modalOverlay'))closeModal();});
  $('modalForm').addEventListener('submit',event=>{
    event.preventDefault();
    if(!modalHandler||!Access.requireOwner())return;
    try{
      if(modalHandler(new FormData(event.target))){closeModal();render();toast('Registro salvo.');}
    }catch(error){toast(error.message||'Dados inválidos.');}
  });
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'){
      if(!$('receiptOverlay').hidden)hideReceiptModal();
      else if(!$('modalOverlay').hidden)closeModal();
      else if(!$('loginOverlay').hidden){event.preventDefault();}
      else if(!$('securityOverlay').hidden||!$('cashAccessOverlay').hidden){event.preventDefault();}
      else if(document.body.classList.contains('pdv-focus')){event.preventDefault();if(activeSession())requestCashPassword('exit');else $('focusPdv').click();}
    }
  });
  document.addEventListener('click',event=>{
    const cartRemove=event.target.closest('[data-remove-cart]');
    if(cartRemove){cart.splice(Number(cartRemove.dataset.removeCart),1);renderCart();return;}
    const action=event.target.closest('[data-action]');
    if(!action)return;
    if(!Access.requireOwner())return;
    const {action:kind,kind:entityKind,id}=action.dataset;
    if(kind==='edit')entityModal(entityKind,id);
    if(kind==='delete')deleteEntity(entityKind,id);
    if(kind==='pay'){const employee=db.employees.find(e=>e.id===id);if(employee)movementModal(employee);}
    if(kind==='void-sale')cancelSale(id);
    if(kind==='receipt-client')printReceipt(id,'cliente');
    if(kind==='receipt-store')printReceipt(id,'loja');
    if(kind==='void-movement')voidMovement(id);
  });
}

$('reportDay').value=localDate();
$('reportMonth').value=localDate().slice(0,7);
bind();
applyTheme();
function clearSensitiveScreen(){
  // Evita deixar no DOM os dados do painel vistos anteriormente pelo dono.
  const ids=['recentSales','lowStockList','homeGoal','productRows','serviceRows',
    'employeeRows','movementRows','goalsProgress','reportSummary','reportItemRows',
    'reportSaleRows','reportMovRows','reportSessionRows'];
  for(const id of ids){const node=$(id);if(node)node.replaceChildren();}
  for(const id of ['statSales','statIncome','statExpenses','statBalance','finIncome','finOut',
    'reportSales','reportIncome','reportOut','reportBalance','settingName','settingPhone',
    'settingAddress','goalDaily','goalMonthly']){const node=$(id);if(!node)continue;
    if('value' in node)node.value='';else node.textContent='';}
  closeModal();
}
Access.init({
  onLogin:role=>{
    operatorUnlocked=true; // Funcionário entra no PDV sem senha; abrir/fechar exigem a senha do caixa.
    if(role==='operator')clearSensitiveScreen();
    const cash=activeSession();
    go(cash?'caixa':role==='owner'?'inicio':'caixa',true);
    if(cash){setKioskMode(true);requestBrowserFullscreen();}
    focusNumericField('posQty');
  },
  onLogout:()=>{
    operatorUnlocked=false;
    cart=[];lastReceiptSaleId=null;
    clearSensitiveScreen();
    $('receiptOverlay').hidden=true;
    closeSecurityDialog();
    setKioskMode(false);
    releaseBrowserFullscreen();
  },
  onSecurityChange:()=>{render();toast('Senha operacional do caixa atualizada com sucesso.');}
});
// Atualizar a aba exige entrar novamente, mesmo com o caixa ainda aberto.

