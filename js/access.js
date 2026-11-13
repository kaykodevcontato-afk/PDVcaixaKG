/*
 * Papelaria Manager 1.6 — Acesso local simplificado
 * Funcionário: entrada sem senha, exclusivamente PDV.
 * Dono: entrada com senha, acesso administrativo completo.
 * Abertura e fechamento do caixa: senha operacional separada do dono.
 * IMPORTANTE: este bloqueio é apenas de interface, não segurança de servidor.
 */
'use strict';
const Access=(()=>{
  let role=null;
  let selected='operator';
  let handlers={};
  let busy=false;
  let failed=0;
  let pauseUntil=0;
  const byId=id=>document.getElementById(id);
  const isOwner=()=>role==='owner';
  const isOperator=()=>role==='operator';
  const isLoggedIn=()=>role!==null;
  const roleName=()=>isOwner()?'Dono · acesso completo':isOperator()?'Funcionário · somente PDV':'Acesso restrito';

  function setRole(newRole){
    role=newRole;
    document.body.classList.toggle('role-owner',isOwner());
    document.body.classList.toggle('role-operator',isOperator());
    document.body.classList.toggle('login-locked',!isLoggedIn());
    byId('loginOverlay').hidden=isLoggedIn();
    byId('roleBadge').textContent=roleName();
  }
  function requireOwner(){
    if(isOwner())return true;
    if(isOperator())alert('Área exclusiva do dono. Use Trocar usuário e informe a senha do proprietário.');
    return false;
  }
  function ownerOnly(callback){return (...args)=>{if(requireOwner())return callback(...args);};}
  function clearLoginError(){byId('loginError').hidden=true;byId('loginError').textContent='';}
  function loginError(message){byId('loginError').textContent=message;byId('loginError').hidden=false;}
  function choose(value){
    selected=value;
    byId('loginOwner').classList.toggle('selected',selected==='owner');
    byId('loginOperator').classList.toggle('selected',selected==='operator');
    byId('loginOwner').setAttribute('aria-pressed',String(selected==='owner'));
    byId('loginOperator').setAttribute('aria-pressed',String(selected==='operator'));
    const firstUse=!db.security;
    byId('loginOperator').disabled=firstUse;
    const owner=selected==='owner';
    byId('loginPasswordWrap').hidden=!owner;
    byId('loginPassword').required=owner;
    byId('loginPasswordConfirmWrap').hidden=!(owner&&firstUse);
    byId('loginPasswordConfirm').required=owner&&firstUse;
    byId('loginHelp').textContent=owner
      ?firstUse?'Primeiro acesso: crie a senha do dono (mínimo 6 caracteres). Em seguida configure a senha do caixa nas Configurações.'
        :'Informe a senha do dono para abrir o painel completo.'
      :'Acesse diretamente o PDV, sem senha de login. Abrir e fechar o caixa exige uma senha operacional.';
    byId('loginSubmit').textContent=owner?(firstUse?'Criar senha e entrar':'Entrar como dono'):'Entrar no PDV sem senha';
    byId('loginPassword').value='';byId('loginPasswordConfirm').value='';
    clearLoginError();
  }
  function showLogin(){
    setRole(null);
    byId('loginForm').reset();
    choose(db.security?'operator':'owner');
    byId('loginOverlay').hidden=false;
    (db.security?byId('loginOperator'):byId('loginPassword')).focus();
  }
  async function submitLogin(event){
    event.preventDefault();
    if(busy)return;
    if(selected==='operator'){
      if(!db.security)return loginError('O dono deve configurar o primeiro acesso.');
      setRole('operator');
      byId('loginForm').reset();
      handlers.onLogin?.('operator');
      return;
    }
    if(Date.now()<pauseUntil)return loginError('Muitas tentativas. Aguarde 15 segundos e tente novamente.');
    busy=true;byId('loginSubmit').disabled=true;
    try{
      const pwd=byId('loginPassword').value;
      if(!db.security){
        if(pwd!==byId('loginPasswordConfirm').value)throw Error('As senhas não conferem.');
        const record=await CashSecurity.create(pwd);
        if(!commit(()=>{db.security=record;}))throw Error('Não foi possível salvar a senha do dono.');
      }else if(!(await CashSecurity.verify(pwd,db.security)))throw Error('Senha do dono incorreta.');
      failed=0;
      setRole('owner');
      byId('loginForm').reset();
      handlers.onLogin?.('owner');
    }catch(error){
      if(/incorreta/i.test(error.message)){failed++;if(failed>=5){pauseUntil=Date.now()+15000;failed=0;}}
      loginError(error.message||'Não foi possível entrar.');
    }finally{busy=false;byId('loginSubmit').disabled=false;}
  }
  function logout(){
    if(!isLoggedIn())return;
    handlers.onLogout?.();
    showLogin();
  }
  function showCashPassword(){
    if(!requireOwner())return;
    byId('cashAccessForm').reset();
    byId('cashAccessError').hidden=true;
    byId('cashAccessError').textContent='';
    byId('cashAccessTitle').textContent=db.cashSecurity?'Alterar senha do caixa':'Criar senha do caixa';
    byId('cashAccessOverlay').hidden=false;
    byId('cashAccessForm').querySelector('input').focus();
  }
  function hideCashPassword(){byId('cashAccessOverlay').hidden=true;byId('cashAccessForm').reset();}
  async function submitCashPasswordSetup(event){
    event.preventDefault();
    if(busy||!requireOwner())return;
    busy=true;byId('saveCashAccess').disabled=true;
    try{
      const form=new FormData(byId('cashAccessForm'));
      const ownerPassword=String(form.get('ownerPassword')||'');
      if(!(await CashSecurity.verify(ownerPassword,db.security)))throw Error('Senha do dono incorreta.');
      const newPassword=String(form.get('newPassword')||'');
      if(newPassword!==String(form.get('confirmPassword')||''))throw Error('A confirmação da senha do caixa não confere.');
      if(await CashSecurity.verify(newPassword,db.security))throw Error('Use uma senha diferente da senha do dono.');
      const record=await CashSecurity.create(newPassword);
      if(!commit(()=>{db.cashSecurity=record;db.operatorSecurity=null;}))throw Error('Não foi possível salvar a senha do caixa.');
      hideCashPassword();
      refresh();
      handlers.onSecurityChange?.();
    }catch(error){
      byId('cashAccessError').textContent=error.message||'Não foi possível salvar a senha do caixa.';
      byId('cashAccessError').hidden=false;
    }finally{busy=false;byId('saveCashAccess').disabled=false;}
  }
  function refresh(){
    byId('cashAccessStatus').textContent=db.cashSecurity?'Senha do caixa configurada':'Configure a senha do caixa';
    byId('configureCashPassword').textContent=db.cashSecurity?'Alterar senha do caixa':'Criar senha do caixa';
    byId('roleBadge').textContent=roleName();
  }
  function promoteToOwner(){
    if(!isLoggedIn())return;
    setRole('owner');
    refresh();
  }
  function cashCredential(action){
    return action==='exit'||action==='change'?db.security:db.cashSecurity;
  }
  function init(callbacks){
    handlers=callbacks||{};
    byId('loginOwner').addEventListener('click',()=>choose('owner'));
    byId('loginOperator').addEventListener('click',()=>{if(db.security)choose('operator');});
    byId('loginForm').addEventListener('submit',submitLogin);
    byId('switchUser').addEventListener('click',logout);
    byId('pdvSwitchUser').addEventListener('click',logout);
    byId('configureCashPassword').addEventListener('click',showCashPassword);
    byId('cashAccessForm').addEventListener('submit',submitCashPasswordSetup);
    byId('cancelCashAccess').addEventListener('click',hideCashPassword);
    refresh();
    showLogin();
  }
  return Object.freeze({init,isOwner,isOperator,isLoggedIn,requireOwner,ownerOnly,cashCredential,roleName,refresh,promoteToOwner,logout});
})();
