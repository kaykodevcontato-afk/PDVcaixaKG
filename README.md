# Papelaria Manager 1.2 — Dev Kayko

Sistema local para papelarias e gráficas rápidas. Funciona no GitHub Pages com **HTML, CSS e JavaScript puros**, sem servidor, sem banco de dados externo e sem mensalidade de hospedagem.

## Novidades da versão 1.2

- Vendas efetivamente registradas no histórico, visíveis no painel e nos relatórios, mesmo após recarregar o navegador.
- Data e hora locais nos relatórios: corrigido problema em que vendas feitas à noite no Brasil podiam aparecer no dia seguinte por conta de horários UTC.
- Registro dos produtos e serviços vendidos, com quantidade e valor bruto no relatório.
- Entradas e saídas financeiras, saldos positivos ou negativos do **dia** e do **mês**.
- Metas de faturamento diário e mensal, com barra de progresso, porcentagem e valor restante.
- Modo claro e escuro, com preferência guardada no navegador.
- PDV otimizado para a altura da tela no computador; listas do catálogo e carrinho usam rolagem própria. Botão **Tela expandida** esconde menus para oferecer ainda mais espaço.
- Fechamento de caixa com dinheiro esperado, dinheiro contado, diferença e **backup JSON automático ao confirmar**.
- Cancelamento de vendas e lançamentos mantendo o histórico, sem contar nos totais.
- Impressão do resumo, itens, vendas, movimentações e fechamentos; o navegador oferece **Salvar como PDF**.

## Arquivos e onde editar

```text
papelaria-manager/
├── index.html           ← Menus, formulários e estrutura das telas
├── css/
│   └── style.css        ← Layout, modo escuro, cores e impressão
├── js/
│   ├── data.js          ← Armazenamento local, backup e dados iniciais
│   └── app.js           ← Operação do caixa, metas, relatórios e interface
└── README.md            ← Este manual
```

### Editar com facilidade

- **Nome, telefone, endereço:** Configurações, dentro do próprio sistema.
- **Serviços, categorias e preços:** Serviços → Novo serviço / Editar.
- **Produtos, códigos e estoque:** Produtos e estoque → Novo produto / Editar.
- **Metas:** Metas → meta diária / meta mensal.
- **Cor e estilo:** variáveis CSS no topo de `css/style.css` (`--primary`, `--bg`, `--surface` etc.).
- **Serviços iniciais exibidos no primeiro acesso:** constante `INITIAL_SERVICES` em `js/data.js`.
- **Regras de negócios e funções:** `js/app.js` dividido em 10 seções comentadas.

> Atenção: editar `INITIAL_SERVICES` não muda automaticamente os serviços já armazenados. Depois do primeiro acesso, use o cadastro da tela Serviços para alterar preços.

## Como publicar no GitHub Pages

1. Crie ou abra um repositório no GitHub.
2. Envie `index.html`, `README.md` e as pastas `css/` e `js/`.
3. Abra **Settings → Pages**.
4. Em **Build and deployment**, selecione **Deploy from a branch**.
5. Escolha a branch **main**, pasta **/ (root)** e clique em **Save**.
6. Abra `https://SEU-USUARIO.github.io/NOME-DO-REPOSITORIO/` (ou o endereço do Pages indicado pelo GitHub).

Se já tinha a versão 1.0/1.1 no mesmo endereço, envie os novos arquivos **substituindo os antigos**, não renomeie `js/data.js` e `js/app.js` ao subir. Se o navegador mostrar a versão anterior, recarregue com `Ctrl + F5`.

## Como operar

### Registrar uma venda

1. Clique em **Frente de caixa → Abrir caixa**, informando o dinheiro inicial.
2. Pesquise o serviço/produto, escolha quantidade e clique no botão do catálogo.
3. Confira os itens no carrinho e aplique desconto, se houver.
4. Selecione forma de pagamento; em dinheiro, informe o recebido para calcular o troco.
5. Clique em **Concluir e registrar venda**.
6. Uma confirmação aparece e a venda é salva **junto com** a baixa do estoque do produto.
7. Consulte **Relatórios e histórico → Dia / Mês** para visualizar o que foi vendido.

**Dica:** uma venda só entra nos totais depois de clicar em **Concluir e registrar venda**, com um caixa aberto. Apenas adicionar ao carrinho não registra uma venda.

### Fechar o expediente

1. Clique em **Fechar caixa e backup** na frente de caixa.
2. Confira o resumo de dinheiro, pagamentos digitais e movimentações em espécie.
3. Digite quanto dinheiro existe fisicamente na gaveta.
4. Confirme. O sistema grava o fechamento, **baixa o arquivo de backup JSON** e abre o relatório do dia.
5. Clique em **Imprimir / Salvar PDF**. Na janela da impressora, escolha sua impressora ou **Salvar como PDF**.
6. Guarde o arquivo JSON fora do computador principal (pendrive ou nuvem privada).

### Resultado positivo ou negativo

**Saldo operacional = total de vendas não canceladas + outras entradas não canceladas − saídas registradas.**

- Positivo: as entradas registradas foram maiores que as saídas registradas.
- Negativo: as saídas registradas foram maiores que as entradas registradas.

**Isso não é lucro contábil.** Taxas de cartão, impostos, custo de mercadorias, investimentos e despesas ainda não registradas podem alterar o resultado real. Registre seus custos e despesas corretamente.

### Metas

Na tela **Metas**, configure valores de faturamento do dia e do mês. A meta usa somente o valor das vendas concluídas e não canceladas. Não inclui entradas extras do financeiro. Preencha `0` para desativar.

## Backup, atualização e segurança

- Os dados ficam em `localStorage` no navegador, usando a **mesma chave da versão anterior**: `devkayko_papelaria_v1`.
- **Antes de atualizar**, faça um backup da versão atual pelo botão Backup. Assim você tem uma cópia dos dados caso ocorra qualquer erro.
- Depois da atualização, as vendas antigas devem continuar disponíveis no **mesmo navegador e mesmo endereço de site**.
- A versão 1.2 carrega arquivos de backup compatíveis com a versão 1.0/1.1. Os novos campos de metas/tema são preenchidos automaticamente quando não existirem.
- **Restaurar backup substitui o armazenamento atual**. Confirme apenas se quiser substituir os dados existentes.
- O GitHub Pages **não armazena** vendas, caixa ou salários. Mudança de dispositivo, domínio ou endereço do site não sincroniza dados. Para transferir, faça backup e restaure no novo endereço.
- Não use navegação anônima; não limpe cookies/dados do site; mantenha cópias do backup em local seguro.
- O aplicativo não possui login, controle de acesso, operação simultânea entre computadores ou integração fiscal; **não substitui uma solução contábil/fiscal oficial**.
- `localStorage` possui limite de espaço no navegador. Se o volume de vendas for muito grande, será preciso migrar para um banco de dados com autenticação, backups e permissões.

## Verificação

A versão foi verificada em navegador Chromium para: cadastro de produto, venda de produto e serviço, persistência, data local brasileira, atualização do estoque, relatório diário, metas, mudança de tema, despesas, resultado negativo, backup, fechamento, impressão e cancelamento.

---

© 2026 Papelaria Manager · **Desenvolvido por Dev Kayko**
