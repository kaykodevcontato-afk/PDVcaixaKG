# Papelaria Manager 1.5 — Dev Kayko

Sistema local de papelaria e gráfica rápida para **GitHub Pages**, feito em HTML, CSS e JavaScript sem servidor. Versão 1.5: **dois perfis de acesso (dono e funcionário)**, mantendo caixa, vendas, impressora térmica 58 mm, Excel, relatórios, backup, estoque, salários, metas, tema claro/escuro e fechamento.

## O que mudou na versão 1.5

### 1. Login por perfil

Ao abrir o sistema, surge uma tela de entrada com dois perfis:

- **Dono:** senha própria, acesso completo a todos os menus e operações administrativas.
- **Funcionário:** senha separada e acesso **somente à Frente de Caixa (PDV)**: pesquisar produtos/serviços, registrar vendas, receber pagamentos, imprimir as vias de cliente e loja, abrir e fechar o caixa (com senha). **Não pode abrir** produtos, estoque, preços, financeiro, folha, metas, relatórios, Excel, backup ou configurações.

O acesso de funcionário **começa desativado**, até o dono criar a senha em Configurações. Por enquanto existe **uma senha de funcionário compartilhada para o perfil Operador**, não um login individual por funcionário. As vendas não identificam individualmente o atendente.

**Migração da versão 1.4.1:** a senha anteriormente usada para abrir/fechar o caixa **passa a ser a senha do dono**, sem redefinição. O histórico e a chave local `devkayko_papelaria_v1` permanecem. Se for o primeiro uso absoluto, será necessário **criar a senha do dono** na tela inicial.

### 2. Como habilitar os funcionários

1. Faça login **Dono** com a senha antiga do caixa.
2. Abra **Configurações → Acesso dos funcionários — somente PDV**.
3. Clique em **Criar senha do funcionário**.
4. Informe sua senha de dono e crie uma senha **diferente**, de 6 a 64 caracteres, para o caixa.
5. Clique em **Trocar usuário** no topo ou no PDV. Selecione **Funcionário** e use a nova senha.

No mesmo painel o dono pode alterar ou desativar a senha de funcionário. Alterar ou desativar exige **confirmar a senha do dono**.

### 3. Sair do atendimento e trocar de usuário

- Clique em **Trocar usuário** para voltar à tela de login, sem perder vendas e **sem fechar automaticamente o caixa**. Este botão funciona no PDV mesmo no modo expandido.
- Ao entrar como funcionário, o menu lateral administrativo fica oculto. O funcionário continua no PDV mesmo que tente navegar diretamente para outra seção.
- **Sair da tela expandida** com o caixa aberto exige **senha do dono**; isso pode promover a sessão de funcionário para o painel do dono, sem fechar o caixa.
- **Abrir e fechar o caixa** pedem a senha do perfil que está usando o caixa. Se o **funcionário** fechar, o fechamento é registrado mas **não gera um download de backup nem abre relatórios** para ele. O **dono** pode entrar depois e imprimir o fechamento/exportar o backup.
- **Recarregar a página** exige entrar novamente com a senha do dono ou do funcionário, mesmo que já exista um caixa aberto. Isso também evita que um funcionário seja confundido com o dono após uma atualização.
- Durante impressão das vias térmicas, o sistema não deve pedir novamente a senha quando o navegador sair da tela cheia para mostrar a janela da impressora.

### 4. Estrutura de segurança

As senhas são verificadas com **PBKDF2-SHA-256** (Web Crypto, salt aleatório e 210 mil iterações) e guardadas como verificadores, **não em texto legível**. A proteção de acesso nesta versão é de **interface**, adequada apenas para separar o uso cotidiano de um mesmo computador confiável.

**IMPORTANTE: não é controle de acesso seguro a dados confidenciais.** O sistema estático do GitHub Pages carrega os registros do `localStorage` no navegador, inclusive salários e finanças. Uma pessoa com acesso físico às ferramentas de desenvolvedor, aos arquivos, backups ou armazenamento local pode ler/modificar esses dados e contornar a interface. Não é possível garantir proteção real dos salários e dados do proprietário **apenas com GitHub Pages + JavaScript/localStorage**. Para permissões reais por usuário, registros de auditoria e proteção dos dados é necessário adicionar autenticação e regras de acesso no servidor/banco de dados.

O arquivo de backup JSON também inclui verificadores das senhas; cuide da privacidade do arquivo. Não reutilize essas senhas em outros serviços.

## O que foi mantido das versões anteriores

- Frente de caixa com pesquisa, filtros de categoria, botões rápidos de serviços/produtos, teclado numérico, desconto, Pix, dinheiro, cartão e troco.
- Baixa automática do estoque e histórico de vendas, cancelamentos rastreáveis, entradas e saídas, salários e metas.
- Fechamentos e comparação de dinheiro esperado vs. contado, saldo operacional diário/mensal, relatório A4 e PDF.
- Comprovantes **não fiscais** de 58 mm, via de cliente e loja, margens internas, reimpressão pelo dono e impressão sem pedir senha extra após a janela nativa.
- Exportação `.xlsx` por dia/mês e venda individual; ela **não sincroniza automaticamente** com um arquivo Excel já existente.
- Backup/restauração JSON, modo claro e escuro.

## Estrutura de pastas / edição

```text
papelaria-manager/
├── index.html       # menus, cadastro, PDV, login e modais
├── css/
│   └── style.css    # cores, PDV responsivo, login, recibo, impressão A4
├── js/
│   ├── data.js      # chave de armazenamento, persistência e backups
│   ├── security.js  # hash de senhas
│   ├── access.js    # NOVO: perfis, login e senha de funcionário
│   ├── excel.js     # exportação XLSX
│   └── app.js       # vendas, permissões de interface e eventos
└── README.md
```

**Dicas de edição:** altere cores em `:root` e `html[data-theme="dark"]` no `css/style.css`; serviços iniciais em `INITIAL_SERVICES` no `js/data.js`; botões, textos e formulários no `index.html`; regras de login em `js/access.js`; comportamento e fechamento do PDV em `js/app.js`. **Não altere a constante `DB_KEY` em `js/data.js`** se deseja continuar lendo dados antigos no mesmo navegador/endereço.

## Publicar no GitHub Pages

1. **ANTES DE ATUALIZAR**: entre como dono na versão anterior, faça um **backup JSON** e guarde uma cópia offline. É recomendável também exportar o Excel.
2. Extraia o ZIP desta versão; substitua os arquivos do projeto anterior no repositório mantendo as pastas `css` e `js`.
3. **Adicione o arquivo novo `js/access.js`**, além de atualizar `index.html`, `css/style.css`, `js/app.js`, `js/data.js` e `README.md`. Mantenha `js/security.js` e `js/excel.js`.
4. Em **Settings → Pages**, selecione `Deploy from a branch`, `main` e `/(root)`.
5. Recarregue o site publicado com **Ctrl + F5**, entre com a senha do dono e configure a senha dos funcionários.
6. Faça uma venda de teste e confirme o histórico, a impressão, o fechamento e o backup como dono.

**Armazenamento:** os registros são salvos **somente naquele navegador/dispositivo e origem do site**. A versão não sincroniza diversos computadores. GitHub Pages hospeda o sistema, mas não mantém seu banco de vendas. Não apague os dados do site; salve backup JSON todos os dias. No HTTPS do GitHub Pages, Web Crypto permite verificar as senhas.

**Impressora de 58 mm:** usa a janela padrão de impressão do navegador, não um protocolo Bluetooth direto. A compatibilidade depende do driver/app da mini impressora. Configure papel térmico de 58 mm e confira margens no aparelho. Comprovantes são não fiscais.

## Testes realizados para 1.5

- Criar a senha do dono no primeiro acesso; configurar senha diferente para o funcionário.
- Entrada como dono e operador, menu restrito, impedir navegação do operador até mesmo via chamada interna de navegação.
- Abertura de caixa e registro de venda; impressão das duas vias sem interromper a autenticação do caixa.
- Tentativa de saída do PDV com senha de funcionário **negada**; saída com a senha do dono **autorizada**.
- Fechamento por funcionário sem exposição de relatórios e backups; reabertura de login após atualização/recarregamento.
- Leitura dos dados de uma versão antiga que não possuía `operatorSecurity`.
- Verificação de sintaxe JavaScript e teste automatizado em Chromium com armazenamento/crypto simulados (não substitui teste manual do GitHub Pages e da impressora física).

Desenvolvido por **Dev Kayko** · 2026.
