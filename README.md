# Papelaria Manager 1.6.2 — Dev Kayko

Sistema de gestão de papelaria e gráfica rápida, desenvolvido para rodar em **GitHub Pages** com HTML, CSS e JavaScript, sem servidor. Mantém o PDV completo, estoque, produtos e serviços, vendas, fechamento, Excel, comprovantes 58 mm, metas, despesas, funcionários, backup e modo claro/escuro.

## Novidade da versão 1.6.2 — Link do desenvolvedor

Ao clicar no nome **Dev Kayko** no rodapé, no menu lateral ou na tela inicial de escolha de perfil, o site abre **`dev-kayko/index.html`** em outra aba. Esta página é a apresentação profissional fornecida pelo desenvolvedor (websites, sistemas e gráfica rápida). O PDV permanece aberto.

A pasta **`dev-kayko/` é indispensável**: envie-a junto com os demais arquivos para o repositório. Para atualizar uma instalação existente, mantenha o mesmo endereço publicado e faça um backup JSON antes de substituir arquivos.

## Acesso simplificado — introduzido na versão 1.6

| Ação | Funcionário | Dono |
| --- | --- | --- |
| Entrar no sistema | **Sem senha**, pelo botão **Funcionário** | **Com senha do dono** |
| Acessar o PDV, registrar vendas, imprimir comprovantes | Sim | Sim |
| Abrir, fechar e desbloquear caixa | **Senha operacional do caixa** | **Senha operacional do caixa** |
| Sair da tela expandida do PDV e entrar nas áreas administrativas | Não, salvo se informar a **senha do dono** | Senha do dono, quando solicitada |
| Produtos, estoque, preços, financeiro, salários, metas e relatórios | Não | Sim |
| Exportar Excel, fazer backup JSON e configurar senhas | Não | Sim |

**Não existe mais senha de login do funcionário.** A senha operacional é usada exclusivamente para abrir/fechar/desbloquear o caixa, e não permite entrar no painel administrativo. A senha do dono é usada para acessar todos os menus. Mantenha as duas **diferentes** e não informe a senha do dono aos funcionários.

### Configurar no primeiro uso

1. Abra o site. Se ainda não existir senha do dono, escolha **Dono** e crie uma senha com 6 a 64 caracteres.
2. Entre em **Configurações → Funcionário e senha do caixa → Criar senha do caixa**.
3. Confirme a senha do dono e crie outra senha (de 6 a 64 caracteres) para abrir/fechar o caixa.
4. Clique em **Trocar usuário → Funcionário → Entrar no PDV sem senha**.
5. O funcionário poderá usar o PDV e imprimir comprovantes. Para abrir e fechar a gaveta virtual, informará apenas a senha operacional do caixa.

O funcionário não acessa o histórico, Excel nem o backup. Ao fechar o caixa pelo perfil funcionário, o fechamento fica gravado para o dono consultar depois. **O backup JSON deve ser baixado pelo dono diariamente**; ele não é baixado automaticamente no perfil funcionário.

### Migração dos dados antigos

- A mesma chave local (`devkayko_papelaria_v1`) foi preservada. Não é necessário apagar dados.
- **Versão 1.5:** se havia uma senha de login de funcionário, ela passa a ser a **senha operacional do caixa**. A senha do dono permanece igual. O funcionário agora entra sem senha.
- **Versão 1.4.1 ou anteriores:** a senha antiga do caixa já era a senha do dono; ela permanece como senha do dono. O proprietário precisa cadastrar **uma nova senha operacional do caixa** nas Configurações antes de abrir/fechar o caixa. Não compartilhe a senha do dono com funcionários.
- Os cadastros, vendas, sessões, relatórios e configurações permanecem no mesmo navegador e no mesmo endereço do site, desde que você não limpe os dados.
- **Antes de substituir os arquivos:** entre como dono na versão atual, faça backup JSON e guarde uma cópia fora do computador; faça também exportação Excel se desejar.

## Instalar no GitHub Pages

1. Baixe e extraia o ZIP da versão 1.6.2.
2. Envie para o repositório `index.html` e as pastas `css`, `js` e **`dev-kayko`**, substituindo os arquivos antigos.
3. Em **Settings → Pages** selecione `Deploy from a branch`, branch `main`, pasta `/ (root)`.
4. Atualize o navegador com `Ctrl + F5` e configure a senha operacional do caixa se necessário.
5. Faça uma venda de teste e confira o fechamento no perfil do dono.

### Arquivos editáveis

```text
papelaria-manager/
├── index.html       # Páginas, botões, login, formulários e links para o portfólio
├── dev-kayko/
│   └── index.html   # Página de apresentação profissional do desenvolvedor
├── css/style.css    # Cores, telas, PDV compacto e impressão
├── js/data.js       # Cadastro, chave de armazenamento e backup
├── js/security.js   # Verificação local das senhas (PBKDF2)
├── js/access.js     # Perfis: funcionário sem senha e dono com senha
├── js/excel.js      # Exportação Excel (.xlsx)
├── js/app.js        # Fluxo do caixa, vendas, relatórios e integração
└── README.md
```

**Impressão térmica:** vias de cliente/loja em 58 mm pela janela de impressão do navegador, sem conexão Bluetooth nativa garantida. Comprovante não fiscal.

## Segurança e dados — importante

GitHub Pages é hospedagem estática. O controle de perfis acima **esconde menus e bloqueia ações na interface**, mas **não oferece proteção real** a salários, valores ou senhas contra alguém com acesso técnico ao navegador, ao código ou aos backups. As informações são armazenadas localmente, no próprio dispositivo. Para confidencialidade efetiva e acesso individual de vários funcionários, é necessário um backend com autenticação, banco de dados e regras de autorização no servidor. Use o projeto somente em equipamento confiável.

Os arquivos Excel são cópias exportadas, não planilhas sincronizadas. Faça backup JSON frequente (de preferência todos os dias).

Desenvolvido por **Dev Kayko** · 2026.
