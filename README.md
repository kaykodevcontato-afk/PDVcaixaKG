# Papelaria Manager 1.3 — Dev Kayko

Sistema para papelarias e gráficas rápidas, que funciona em **GitHub Pages**, usando HTML, CSS e JavaScript locais. Não exige servidor, conta, biblioteca online ou assinatura.

## Novidade 1.3 — comprovante térmico 58 mm + Excel de verdade

### Comprovante para cliente e loja

1. Abra a **Frente de caixa**, abra o caixa, registre uma venda.
2. Ao finalizar, surge **Venda registrada** com três opções: **Via do cliente (58 mm)**, **Via da loja (58 mm)** ou **Imprimir as duas vias**.
3. Selecione sua impressora térmica na janela de impressão do navegador e ajuste para **papel de 58 mm** (sem margens, preferencialmente).
4. Reimprima quando quiser em **Relatórios e histórico → Vendas registradas → Via cliente / Via loja**. As vendas canceladas continuam identificadas como canceladas no papel.

O comprovante contém: nome e contato do estabelecimento, número da venda, data e horário, tipo de via, itens, quantidade, valores, desconto, total, forma de pagamento e troco quando for dinheiro, além da indicação **COMPROVANTE NÃO FISCAL**. A largura do documento é 58 mm, com conteúdo útil de 54 mm.

**IMPORTANTE SOBRE A IMPRESSORA BLUETOOTH:** o site **não** envia comandos ESC/POS diretamente ao Bluetooth, pois isso depende do protocolo e driver do modelo. O botão chama a janela de impressão do navegador (`window.print()`). Na maioria das situações você precisa **emparelhar e instalar a impressora no Windows/Android** com driver ou aplicativo compatível; ela deverá aparecer na lista de impressoras. Se o seu modelo só imprime pelo próprio aplicativo e não aparece como impressora do sistema, poderá ser necessário usar **Salvar como PDF → compartilhar com o app da impressora**. Teste uma venda de baixo valor antes de atender clientes. A impressão não substitui cupom fiscal, NFC-e ou nota fiscal.

### Registro em Excel `.xlsx` (sem internet extra)

- **Relatórios e histórico** → escolha **Dia** ou **Mês**, informe data e clique em **Exportar Excel (.xlsx)**.
- **Configurações** → **Histórico completo para Excel (.xlsx)** baixa todos os períodos.
- Após cada venda → **Registrar esta venda no Excel** baixa a planilha individual da venda.
- O Excel do período traz abas: **Resumo, Vendas, Itens vendidos, Movimentações, Entradas, Saídas, Fechamentos e Estoque atual**. Os valores monetários são números de verdade, formatados em reais, para permitir somar, filtrar e criar gráficos.
- Vendas canceladas e lançamentos cancelados ficam identificados como **CANCELADA/CANCELADO**, e não integram o saldo operacional do resumo.
- Salários pagos via Financeiro aparecem nas movimentações e saídas. Os cadastros salariais dos funcionários não são incluídos na planilha.

**O Excel não é editado automaticamente no computador:** por segurança, um website estático não tem permissão para atualizar um `.xlsx` existente na pasta Downloads. Você baixa **uma cópia atualizada** sempre que exportar. Continue registrando as vendas no site e exporte **ao fechar o dia** (ou mês). **Arquivo XLSX não é backup:** mantenha também o JSON com todos os dados, para restaurar o sistema.

### O que já existia na versão 1.2

- PDV compacto para desktop, com catálogo por nome/código/categoria, teclado numérico e carrinho; venda atualiza o estoque.
- Registro de vendas, serviços, itens, descontos, formas de pagamento e troco.
- Entradas, saídas, salários, metas, saldo operacional diário e mensal.
- Fechamento com contagem de caixa, diferença entre o valor contado e o esperado, impressão A4/PDF.
- Tema claro/escuro, backup/restauração JSON, histórico de cancelamentos.

## Organização dos códigos

```text
papelaria-manager/
├── index.html          # estrutura de telas, botões, janelas de comprovante
├── css/
│   └── style.css       # layout do PDV, cores, @media print 58 mm e A4
├── js/
│   ├── data.js         # banco local e backup; DB_KEY compatível com 1.2
│   ├── excel.js        # GERADOR XLSX local, relatórios Excel por período
│   └── app.js          # vendas, recibos, cálculos, relatórios e interações
└── README.md
```

Para editar o nome do estabelecimento, use **Configurações**. Para ajustar os textos, procure no `index.html`. Para mudar impressão térmica/recibo, edite `receiptMarkup` e `printReceipt` em `js/app.js` e as classes `.receipt-*` em `css/style.css`. Para configurar as abas do Excel, edite `excelSheetData` em `js/excel.js`. Não mude `DB_KEY` em `js/data.js`: isso mantém os dados da v1.2 no mesmo navegador e endereço.

## Publicar / atualizar GitHub Pages

1. **Antes da atualização:** faça um **Backup JSON** da versão atual e guarde-o fora do navegador.
2. Baixe o ZIP desta versão 1.3, descompacte e substitua `index.html`, `README.md`, `css/style.css`, `js/app.js` e `js/data.js`. **Adicione** também o novo `js/excel.js`.
3. Envie tudo ao repositório GitHub, mantendo as pastas.
4. Confirme que GitHub → **Settings → Pages** está com `Deploy from a branch` / `main` / `/(root)`.
5. Abra a URL do projeto e faça `Ctrl + F5` caso seu navegador mostre a versão antiga.
6. Registre uma **venda de teste**, confira a impressão e exporte o Excel para confirmar o ambiente de sua impressora.

## Limites de uso do GitHub Pages

Os dados de vendas ficam apenas no `localStorage` **do navegador e endereço atuais**. Não são gravados no GitHub nem sincronizados entre computadores. Faça backup JSON diariamente. O Excel gera um relatório manual, não sincronização simultânea, nem substitui a emissão de documentos fiscais. Não armazene dados pessoais sensíveis de clientes ou funcionários em um computador compartilhado sem proteção.

### Verificações feitas

Validações em Chromium: venda de produto e serviço, atualização de estoque, modal de impressão, duas vias, impressão posterior pelo histórico, tema escuro, geração das planilhas `.xlsx` por período e por venda, estrutura ZIP/XML do Excel, importação do `.xlsx` com `artifact_tool` e backup JSON. **Não foi possível testar fisicamente sua impressora Bluetooth sem o modelo e o dispositivo.**

© 2026 Papelaria Manager — **Desenvolvido por Dev Kayko**
