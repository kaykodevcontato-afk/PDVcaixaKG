/*
 * Papelaria Manager 1.5 — Perfis locais de interface.
 * Dono: acesso a todas as páginas. Funcionário: somente frente de caixa.
 * ATENÇÃO: JavaScript e localStorage não formam uma barreira de segurança
 * contra usuários com acesso ao DevTools. Para segurança real use servidor,
 * permissões por usuário e banco de dados com regras de acesso.
 */
'use strict';
const Access=(()=>{
  let role=null;
  let selected='owner';
  let handlers={};
  let busy=false;
  let failed=0;
  let pauseUntil=0;
  let operatorMode='set';
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
    if(isOperator())alert('Acesso exclusivo do dono. Troque de usuário e informe a senha do proprietário.');
    return false;
  }
  function ownerOnly(callback){return (...args)=>{if(requireOwner())return callback(...args);};}
  function clearLoginError(){byId('loginError').hidden=true;byId('loginError').textContent='';}
  function loginError(text){byId('loginError').textContent=text;byId('loginError').hidden=false;}
  function choose(value){
    selected=value;
    byId('loginOwner').classList.toggle('selected',selected==='owner');
    byId('loginOperator').classList.toggle('selected',selected==='operator');
    byId('loginOwner').setAttribute('aria-pressed',String(selected==='owner'));
    byId('loginOperator').setAttribute('aria-pressed',String(selected==='operator'));
    const firstUse=!db.security;
    byId('loginOperator').disabled=firstUse||!db.operatorSecurity;
    byId('loginPasswordConfirmWrap').hidden=!(selected==='owner'&&firstUse);
    byId('loginPasswordConfirm').required=selected==='owner'&&firstUse;
    byId('loginHelp').textContent=selected==='operator'
      ?'Acesse somente o PDV usando a senha definida pelo dono.'
      :firstUse?'Primeiro acesso: crie a senha do dono, com no mínimo 6 caracteres. Guarde-a em local seguro.'
      :'Acesse o painel completo com a senha do dono.';
    byId('loginSubmit').textContent=selected==='owner'&&firstUse?'Criar senha e entrar':'Entrar como '+(selected==='owner'?'dono':'funcionário');
    byId('loginPassword').value='';byId('loginPasswordConfirm').value='';
    clearLoginError();
  }
  function showLogin(){
    setRole(null);
    choose(db.security?'owner':'owner');
    byId('loginForm').reset();
    byId('loginOverlay').hidden=false;
    byId('loginPassword').focus();
  }
  async function submitLogin(event){
    event.preventDefault();
    if(busy)return;
    if(Date.now()<pauseUntil)return loginError('Muitas tentativas. Aguarde 15 segundos e tente novamente.');
    busy=true;byId('loginSubmit').disabled=true;
    try{
      const pwd=byId('loginPassword').value;
      if(!db.security){
        if(selected!=='owner')throw Error('O primeiro acesso deve ser feito pelo dono.');
        if(pwd!==byId('loginPasswordConfirm').value)throw Error('As senhas não conferem.');
        const newSecurity=await CashSecurity.create(pwd);
        if(!commit(()=>{db.security=newSecurity;}))throw Error('Não foi possível salvar a senha do dono.');
      }else{
        const credential=selected==='owner'?db.security:db.operatorSecurity;
        if(!credential)throw Error('Acesso do funcionário ainda não configurado pelo dono.');
        if(!(await CashSecurity.verify(pwd,credential)))throw Error('Senha incorreta.');
      }
      failed=0;
      setRole(selected);
      byId('loginForm').reset();
      handlers.onLogin?.(role);
    }catch(error){
      if(/incorreta/i.test(error.message)){failed++;if(failed>=5){pauseUntil=Date.now()+15000;failed=0;}}
      loginError(error.message||'Não foi possível entrar.');
    }finally{busy=false;byId('loginSubmit').disabled=false;}
  }
  async function logout(){
    if(!isLoggedIn())return;
    handlers.onLogout?.();
    showLogin();
  }
  function showOperatorPassword(mode){
    if(!requireOwner())return;
    if(mode==='disable'&&!db.operatorSecurity)return;
    operatorMode=mode;
    byId('operatorModalTitle').textContent=mode==='disable'?'Desativar senha dos funcionários':'Criar / alterar senha do funcionário';
    for(const input of byId('operatorPasswordForm').querySelectorAll('input'))input.value='';
    byId('operatorPasswordError').hidden=true;
    byId('operatorPasswordError').textContent='';
    for(const item of byId('operatorPasswordForm').querySelectorAll('.operator-new-field')){
      item.hidden=mode==='disable';
      item.querySelector('input').required=mode!=='disable';
    }
    byId('saveOperatorPassword').textContent=mode==='disable'?'Desativar acesso':'Salvar senha';
    byId('operatorSecurityOverlay').hidden=false;
    byId('operatorPasswordForm').querySelector('input').focus();
  }
  function hideOperatorPassword(){byId('operatorSecurityOverlay').hidden=true;byId('operatorPasswordForm').reset();}
  async function submitOperatorPassword(event){
    event.preventDefault();
    if(busy||!requireOwner())return;
    busy=true;byId('saveOperatorPassword').disabled=true;
    try{
      const form=new FormData(byId('operatorPasswordForm'));
      const owner=String(form.get('ownerPassword')||'');
      if(!(await CashSecurity.verify(owner,db.security)))throw Error('Senha do dono incorreta.');
      if(operatorMode==='disable'){
        if(!confirm('Desativar a entrada dos funcionários? O acesso do dono continuará normal.'))return;
        if(!commit(()=>{db.operatorSecurity=null;}))throw Error('Não foi possível salvar.');
      }else{
        const password=String(form.get('newPassword')||'');
        if(password!==String(form.get('confirmPassword')||''))throw Error('A confirmação da senha do funcionário não confere.');
        if(await CashSecurity.verify(password,db.security))throw Error('Use uma senha diferente da senha do dono.');
        const record=await CashSecurity.create(password);
        if(!commit(()=>{db.operatorSecurity=record;}))throw Error('Não foi possível salvar.');
      }
      hideOperatorPassword();
      refresh();
      handlers.onSecurityChange?.();
    }catch(error){
      byId('operatorPasswordError').textContent=error.message||'Não foi possível atualizar a senha.';
      byId('operatorPasswordError').hidden=false;
    }finally{busy=false;byId('saveOperatorPassword').disabled=false;}
  }
  function refresh(){
    byId('operatorSecurityStatus').textContent=db.operatorSecurity?'Funcionários habilitados':'Funcionários desativados';
    byId('disableOperatorPassword').disabled=!db.operatorSecurity;
    byId('changeOperatorPassword').textContent=db.operatorSecurity?'Alterar senha do funcionário':'Criar senha do funcionário';
    byId('roleBadge').textContent=roleName();
  }
  function promoteToOwner(){
    if(!isLoggedIn())return;
    setRole('owner');
    refresh();
  }
  function init(callbacks){
    handlers=callbacks||{};
    byId('loginOwner').addEventListener('click',()=>choose('owner'));
    byId('loginOperator').addEventListener('click',()=>{if(db.operatorSecurity)choose('operator');});
    byId('loginForm').addEventListener('submit',submitLogin);
    byId('switchUser').addEventListener('click',logout);
    byId('pdvSwitchUser').addEventListener('click',logout);
    byId('changeOperatorPassword').addEventListener('click',()=>showOperatorPassword('set'));
    byId('disableOperatorPassword').addEventListener('click',()=>showOperatorPassword('disable'));
    byId('operatorPasswordForm').addEventListener('submit',submitOperatorPassword);
    byId('cancelOperatorPassword').addEventListener('click',hideOperatorPassword);
    refresh();
    showLogin();
  }
  function cashCredential(action){return action==='exit'||action==='change'?db.security:isOwner()?db.security:db.operatorSecurity;}
  return Object.freeze({init,isOwner,isOperator,isLoggedIn,requireOwner,ownerOnly,cashCredential,roleName,refresh,promoteToOwner,logout});
})();
