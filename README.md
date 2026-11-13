# Papelaria Manager 1.0 — Dev Kayko

Sistema de gestão local de papelaria e gráfica rápida, desenvolvido em **HTML, CSS e JavaScript puro**. Pode ser publicado gratuitamente no **GitHub Pages**.

## Como publicar

1. Crie um repositório no GitHub, por exemplo `papelaria-manager`.
2. Envie `index.html`, as pastas `css` e `js`, e este `README.md` mantendo exatamente a estrutura.
3. Em **Settings → Pages → Build and deployment → Deploy from a branch**, selecione `main` e `/ (root)` e salve.
4. Acesse o endereço gerado pelo GitHub, normalmente `https://SEU-USUARIO.github.io/papelaria-manager/`.

O sistema também abre localmente clicando em `index.html` em navegadores que permitem armazenamento local na origem `file://`, mas recomenda-se sempre abrir pelo GitHub Pages para comportamento mais consistente.

## Organização

- `index.html`: seções, formulários, tabelas e estrutura da página.
- `css/style.css`: visual, cores, estilos responsivos e impressão.
- `js/data.js`: dados iniciais dos serviços, salvamento local, exportação e importação JSON.
- `js/app.js`: lógica do caixa, estoque, cadastros, financeiro e relatórios.

### Alterar preços padrão dos serviços

Abra `js/data.js` e edite a lista `INITIAL_SERVICES` **antes de usar pela primeira vez**. Depois do primeiro acesso, os preços passam a ser alterados na aba **Serviços**. A lista inicial não substitui os dados existentes.

## Recursos

- Caixa com abertura, saldo inicial, vendas, descontos, troco e fechamento.
- Produtos: custo, preço, código, quantidade e alerta de estoque mínimo.
- Serviços e preços personalizados.
- Entradas e saídas com indicação de impacto no dinheiro do caixa.
- Funcionários e lançamento de pagamentos como despesas.
- Relatórios por dia ou mês com impressão/salvar PDF pelo navegador.
- Cancelamento de venda com devolução de estoque e trilha no histórico.
- Backup JSON e restauração manual.

## Atenção: limites da versão GitHub Pages

**Os dados são armazenados no `localStorage` de cada navegador e dispositivo, NÃO no GitHub.** Não há login, sincronização, controle multiusuário ou autenticação. Não use vários dispositivos para registrar vendas simultaneamente. Ao limpar dados do navegador ou usar navegação privada, pode haver perda permanente dos registros. **Baixe o backup todos os dias** (idealmente depois de fechar o caixa), mantenha cópias externas e teste a restauração em um navegador separado. Não armazene dados sensíveis de funcionários ou clientes em computadores compartilhados.

Relatórios demonstram movimentações registradas, **não cálculo fiscal ou contábil do lucro**. A impressão gera um relatório comum, não uma nota fiscal. Operações Pix/cartão são apenas registros manuais, sem integração bancária. Os lançamentos de entradas/saídas impactam o fechamento de caixa somente quando marcados como movimentação em espécie durante um caixa aberto. Valores de salários são dados cadastrais, e pagamentos só viram despesas ao clicar em **Pagar** e salvar o lançamento. Compras de estoque devem ser registradas manualmente em Financeiro; entrada de mercadorias deve ser ajustada em Produtos. Cancelamentos após fechar o caixa não reabrem um fechamento histórico: registre e confira os ajustes manuais no caixa seguinte.

## Recomendações

A operação mais segura é usar **um computador principal**, com navegador fixo e backups diários. Se precisar de vários caixas, controle de permissões, banco online ou emissão fiscal, será necessário um serviço de backend.

**Desenvolvido por Dev Kayko.**


## Atualização 1.1 — PDV rápido

O caixa agora possui catálogo de **serviços e produtos em botões**, pesquisa por nome/código/categoria, filtros, carrinho e teclado numérico. Toque em um botão para adicioná-lo à venda, usando a quantidade indicada.

- Clique no campo **Quantidade**, **Desconto** ou **Valor recebido** para escolher onde o teclado numérico digita.
- Os botões refletem os preços registrados nos cadastros.
- Edite as categorias nos formulários de **Produtos e estoque** e **Serviços**. Registros antigos sem categoria aparecem em **Geral**.
- Personalize o visual do PDV no final de `css/style.css` e os filtros em `renderPosTiles()` dentro de `js/app.js`.
- Os dados locais antigos continuam sendo usados: **não altere `DB_KEY`** em `js/data.js`.
- Ao publicar, substitua todos os arquivos do projeto mantendo seus caminhos. Faça um backup do sistema antigo antes da atualização.
