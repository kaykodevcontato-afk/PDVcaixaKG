# Papelaria Manager 1.4 — Dev Kayko

Sistema de gestão de papelaria e gráfica rápida, hospedável **100% no GitHub Pages**, sem servidor ou banco online. Feito em HTML, CSS e JavaScript, com arquivos separados para facilitar a edição.

## Novidades 1.4 — Margens para impressão + Senha do caixa

### 1. Mais espaço nas quatro bordas da impressão

**Relatórios A4 e PDF (Imprimir / Salvar PDF):**

- Topo: **20 mm**
- Embaixo: **22 mm**
- Esquerda e direita: **19 mm** cada

**Comprovantes térmicos para rolo de 58 mm**, tanto a **via do cliente** como a **via da loja**:

- Topo: **7 mm**
- Embaixo: **9 mm**
- Esquerda e direita: **6 mm** cada
- Área útil do texto: **46 mm** em um papel de **58 mm**.
- Entre as vias há um espaço extra para destacar o papel.

As margens são aplicadas **dentro do comprovante**. No driver da impressora, escolha rolo de **58 mm** e desative margens automáticas adicionais, se possível, para não somar margens duas vezes. A área imprimível varia de impressora para impressora. Faça um teste em papel antes de usar na loja. O mesmo layout pode ser enviado para **Salvar como PDF** na janela do navegador.

### 2. Senha para abrir e fechar o caixa

**No primeiro uso:**

1. Abra **Frente de caixa → Abrir caixa**.
2. O sistema pede para **criar uma senha de 6 a 64 caracteres** (ela pode conter números, letras e símbolos) e confirmá-la.
3. Informe o **saldo inicial** e confirme.
4. O caixa será aberto e o PDV ficará **expandido para ocupar a tela**. O sistema tenta também ativar a tela cheia do navegador; se não houver permissão, mantém a versão expandida dentro da página.

**Durante o expediente:**

- O botão **Sair da tela (senha)** solicita a senha antes de voltar ao painel normal. Sair do modo expandido **não fecha** o caixa.
- **Fechar caixa e backup** solicita senha e valor contado; após confirmar, registra o fechamento, exporta o **backup JSON** e abre o relatório do dia.
- Caso a página seja recarregada enquanto o caixa estiver aberto, aparece **Desbloquear caixa** solicitando novamente a senha.
- Caso o navegador saia da sua própria tela cheia (por exemplo **Esc**), o sistema apresenta a tela de desbloqueio para retornar ao atendimento. Por motivos de segurança e controle do navegador, **um site não pode impedir Esc, F11, fechamento da aba ou saída da tela cheia do sistema operacional**.

**Trocar senha:** acesse **Configurações → Senha do caixa → Alterar senha do caixa**. Quando já houver uma senha configurada, o sistema solicitará a atual antes de aceitar a nova.

**Como a senha é guardada:** é gerado um verificador com **PBKDF2-SHA-256, salt aleatório e 210.000 iterações**, armazenado apenas no navegador. O texto da senha não é armazenado. A função criptográfica depende de Web Crypto (disponível normalmente no **HTTPS do GitHub Pages**). Existe atraso temporário na interface após cinco erros de senha; não é bloqueio de segurança de servidor.

**Limitação essencial:** como é um aplicativo estático e sem servidor, a senha protege **o fluxo da interface**, mas **não substitui autenticação de usuários nem impede alguém com acesso aos arquivos, ao navegador ou às ferramentas de desenvolvedor de modificar os dados ou contornar o bloqueio**. A senha não protege os cadastros de funcionários como um sistema com permissões faria.

**Se esquecer a senha:** não existe recuperação automática. Faça backups frequentes e guarde a senha em local seguro. O arquivo de backup JSON contém o **verificador da senha**, mas **não contém a senha legível**. Restaurar um backup também restaura a senha que estava configurada naquele backup.

## Funcionalidades mantidas da 1.3

- **PDV rápido:** catálogo com pesquisa por nome, código ou categoria, produtos e serviços rápidos, carrinho, teclado numérico, desconto, pagamento e troco.
- **Vendas e estoque:** histórico por data e hora, baixa automática e cancelamentos rastreáveis.
- **Comprovante 58 mm:** imprimir a via do cliente, via da loja ou ambas depois da venda e pelo histórico. **Comprovante não fiscal.**
- **Excel `.xlsx`:** exportação por dia, mês, histórico completo ou venda individual. Abas Resumo, Vendas, Itens vendidos, Movimentações, Entradas, Saídas, Fechamentos e Estoque atual.
- **Relatórios A4/PDF**, entradas, saídas, metas, resultados positivos/negativos, salários, backup/restauração JSON e modo claro/escuro.
- Os arquivos Excel são **cópias exportadas no momento**: o site não escreve automaticamente em uma planilha Excel já existente no computador.

## Estrutura organizada

```text
papelaria-manager/
├── index.html         # interface, botões e formulários
├── css/
│   └── style.css      # temas, PDV e margens para impressão
├── js/
│   ├── data.js        # dados locais, compatibilidade e backups
│   ├── security.js    # geração e verificação da senha do caixa
│   ├── excel.js       # exportação XLSX sem servidor
│   └── app.js         # caixa, vendas, relatórios e controles
└── README.md
```

### Onde editar

- **Cores / tamanho / layout:** `css/style.css`, especialmente as variáveis `:root`.
- **Margens do PDF A4:** `@page { size: A4; ... }` em `css/style.css`.
- **Margens dos comprovantes:** `.receipt-ticket` em `css/style.css`.
- **Conteúdo do comprovante:** função `receiptMarkup` em `js/app.js`.
- **Senha / hash / validação:** `js/security.js`; interface e operações com senha em `js/app.js`.
- **Serviços predefinidos:** `INITIAL_SERVICES` em `js/data.js`.
- **Planilhas Excel:** `js/excel.js`.
- **Evite mudar** `DB_KEY = 'devkayko_papelaria_v1'` de `js/data.js`, pois ele garante compatibilidade com registros locais das versões 1.1, 1.2 e 1.3.

## Atualizar no GitHub Pages

1. Antes de atualizar, entre no sistema anterior e **baixe o Backup JSON**; salve também uma cópia do Excel atual se desejar.
2. Descompacte este ZIP no computador.
3. No repositório do GitHub, **substitua** os arquivos anteriores, preservando `css/` e `js/`, e **adicione o novo `js/security.js`**.
4. Confira **Settings → Pages → Deploy from a branch → main → /(root)**.
5. Abra o endereço publicado do site e recarregue com **Ctrl + F5** no Windows.
6. Faça **uma venda de teste**, imprima as duas vias, verifique o relatório e exporte o Excel.

**ATENÇÃO:** o `localStorage` guarda vendas e configurações somente no navegador e endereço atual. GitHub Pages hospeda os arquivos, mas **não salva as vendas na conta GitHub**. Não limpe os dados do navegador e faça backup JSON todos os dias. Use um único computador principal para operar o caixa: vários computadores não sincronizam.

### Impressora Bluetooth 58 mm

A impressão usa a **janela padrão do navegador**, e não uma conexão direta por protocolo ESC/POS. A impressora deverá ser reconhecida pelo Windows/Android com driver ou aplicativo compatível. Se não aparecer na lista de impressoras, use **Salvar como PDF** e compartilhe o PDF com o aplicativo da impressora quando ele oferecer essa função. A compatibilidade depende do modelo e não foi testada fisicamente.

### Validações

- Verificação de sintaxe JavaScript.
- Teste automatizado de navegador para criação e verificação de senha, abertura, fechamento, tentativa incorreta, reentrada após recarregamento, emissão das duas vias e backup com vendas.
- Teste independente com **Web Crypto PBKDF2 real** em Node.js.
- As margens foram conferidas pelas regras CSS e no layout do comprovante. Impressoras físicas precisam de teste no equipamento.

© 2026 Papelaria Manager — Desenvolvido por **Dev Kayko**.
