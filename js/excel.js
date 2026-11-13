/*
 * PAPELARIA MANAGER 1.3 — EXPORTAÇÃO REAL PARA MICROSOFT EXCEL (.xlsx)
 * 100% local. Não depende de CDN, APIs externas, npm nem de servidor.
 * OOXML com planilhas e compactação ZIP método STORE (sem compressão).
 * Os registros originais continuam no navegador; Excel é fotografia do período.
 */
'use strict';

// ─── Utilidades de XLSX / OOXML ───
const xlsxEsc=value=>String(value??'').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[ch]));
const xlsxMoney=value=>({v:Math.round((Number(value)||0)*100)/100,format:'money'});
const xlsxNumber=value=>({v:Number(value)||0,format:'number'});
const xlsxCell=cell=>{
  let v=cell,format='';
  if(v&&typeof v==='object'&&!Array.isArray(v)&&Object.hasOwn(v,'v')){format=v.format||'';v=v.v;}
  if(v===null||v===undefined||v==='')return '<c/>';
  if(typeof v==='number'&&Number.isFinite(v))return `<c${format==='money'?' s="2"':format==='number'?' s="3"':''} t="n"><v>${v}</v></c>`;
  if(typeof v==='boolean')return `<c t="b"><v>${v?1:0}</v></c>`;
  return `<c t="inlineStr"><is><t xml:space="preserve">${xlsxEsc(v)}</t></is></c>`;
};
const excelCol=index=>{let out='';for(let n=index;n>0;n=Math.floor((n-1)/26))out=String.fromCharCode(65+(n-1)%26)+out;return out;};
function xlsxSheetXml(sheet){
  const rows=sheet.rows;
  const columns=Math.max(1,...rows.map(r=>r.length));
  const lastCol=excelCol(columns);
  const header=rows.length>0?`<autoFilter ref="A1:${lastCol}${Math.max(rows.length,1)}"/>`:'';
  const widths=Array.from({length:columns},(_,i)=>{
    const sample=rows.slice(0,80).map(row=>String(row[i]?.v??row[i]??'').length);
    const width=Math.max(12,Math.min(43,Math.max(...sample,11)+3));
    return `<col min="${i+1}" max="${i+1}" width="${width}" customWidth="1"/>`;
  }).join('');
  const rowXml=rows.map((row,r)=>`<row r="${r+1}"${r===0?' ht="25" customHeight="1"':''}>${row.map((value,c)=>{
    const xml=xlsxCell(value);
    // a linha 1 recebe cor de cabeçalho; manter valores numéricos tipados.
    return xml.replace(/^<c(?=[\s/>])/,`<c r="${excelCol(c+1)}${r+1}"${r===0?' s="1"':''}`);
  }).join('')}</row>`).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:${lastCol}${Math.max(rows.length,1)}"/><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="17"/><cols>${widths}</cols><sheetData>${rowXml}</sheetData>${sheet.filter===false?'':header}<pageMargins left="0.3" right="0.3" top="0.5" bottom="0.5" header="0.2" footer="0.2"/></worksheet>`;
}

const ZIP_CRC_TABLE=(()=>{const table=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let j=0;j<8;j++)c=(c&1)?0xEDB88320^(c>>>1):c>>>1;table[n]=c>>>0;}return table;})();
function crc32(bytes){let crc=0xFFFFFFFF;for(const b of bytes)crc=ZIP_CRC_TABLE[(crc^b)&255]^(crc>>>8);return(crc^0xFFFFFFFF)>>>0;}
function zipSetU16(buf,off,value){buf[off]=value&255;buf[off+1]=(value>>>8)&255;}
function zipSetU32(buf,off,value){buf[off]=value&255;buf[off+1]=(value>>>8)&255;buf[off+2]=(value>>>16)&255;buf[off+3]=(value>>>24)&255;}
function packZip(entries){
  const enc=new TextEncoder(),parts=[],directory=[];
  let offset=0;
  for(const [name,data] of entries){
    const filename=enc.encode(name),body=enc.encode(data),checksum=crc32(body);
    const local=new Uint8Array(30+filename.length);
    zipSetU32(local,0,0x04034b50);zipSetU16(local,4,20);zipSetU16(local,6,0x0800);
    zipSetU16(local,8,0);zipSetU32(local,14,checksum);zipSetU32(local,18,body.length);
    zipSetU32(local,22,body.length);zipSetU16(local,26,filename.length);local.set(filename,30);
    const central=new Uint8Array(46+filename.length);
    zipSetU32(central,0,0x02014b50);zipSetU16(central,4,20);zipSetU16(central,6,20);
    zipSetU16(central,8,0x0800);zipSetU16(central,10,0);zipSetU32(central,16,checksum);
    zipSetU32(central,20,body.length);zipSetU32(central,24,body.length);zipSetU16(central,28,filename.length);
    zipSetU32(central,42,offset);central.set(filename,46);
    parts.push(local,body);directory.push(central);offset+=local.length+body.length;
  }
  const directorySize=directory.reduce((n,item)=>n+item.length,0);
  const end=new Uint8Array(22);zipSetU32(end,0,0x06054b50);
  zipSetU16(end,8,entries.length);zipSetU16(end,10,entries.length);
  zipSetU32(end,12,directorySize);zipSetU32(end,16,offset);
  return new Blob([...parts,...directory,end],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
}
function makeXlsx(sheets){
  const names=sheets.map((sheet,index)=>({name:sheet.name.slice(0,31),id:index+1}));
  const types=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${names.map(n=>`<Override PartName="/xl/worksheets/sheet${n.id}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`;
  const rels=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
  const wb=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView/></bookViews><sheets>${names.map(n=>`<sheet name="${xlsxEsc(n.name)}" sheetId="${n.id}" r:id="rId${n.id}"/>`).join('')}</sheets></workbook>`;
  const wbRels=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${names.map(n=>`<Relationship Id="rId${n.id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${n.id}.xml"/>`).join('')}<Relationship Id="rId${names.length+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
  const styles=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="165" formatCode="&quot;R$ &quot;#,##0.00;[Red](&quot;R$ &quot;#,##0.00)"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Aptos"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Aptos"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF1B4C87"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="4"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFill="1" applyFont="1"/><xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
  return packZip([
    ['[Content_Types].xml',types],['_rels/.rels',rels],['xl/workbook.xml',wb],['xl/_rels/workbook.xml.rels',wbRels],['xl/styles.xml',styles],
    ...sheets.map((sheet,i)=>[`xl/worksheets/sheet${i+1}.xml`,xlsxSheetXml(sheet)])
  ]);
}
function downloadXlsx(sheets,filename){
  if(sheets.some(sheet=>sheet.rows.length>50000)){alert('Muitos registros para exportação de uma só vez. Exporte por mês ou dia.');return;}
  const blob=makeXlsx(sheets),url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),6000);
  toast(`Excel gerado: ${filename}. Salve esse arquivo junto ao seu backup JSON.`);
}

// ─── Montagem de relatórios: períodos atualizados e aba de cada movimento ───
function excelTimestamp(iso){return iso?formatDateTime(iso):'—';}
function excelSheetData(period){
  const match=date=>period.type==='all'||periodMatch(date,period);
  const sales=db.sales.filter(s=>match(s.date)).sort((a,b)=>a.date.localeCompare(b.date));
  const moves=db.movements.filter(m=>match(m.date)).sort((a,b)=>String(a.date).localeCompare(String(b.date)));
  const sessions=db.sessions.filter(s=>match(s.closedAt||s.openedAt)).sort((a,b)=>a.openedAt.localeCompare(b.openedAt));
  const live=sales.filter(s=>!s.voided),movLive=moves.filter(m=>!m.voided);
  const salesAmount=saleTotal(live),income=movTotal(movLive,'in'),out=movTotal(movLive,'out');
  const balance=fromCents(toCents(salesAmount)+toCents(income)-toCents(out));
  const title=period.type==='day' ? `Dia ${formatDate(period.value)}`:period.type==='month'?`Mês ${period.value.slice(5)}/${period.value.slice(0,4)}`:'Todos os registros';
  const date=localDate();
  const summary=[
    ['PAINEL / INDICADOR','VALOR'],['Papelaria',db.settings.name||'Minha Papelaria'],['Período',title],
    ['Arquivo gerado em',new Date().toLocaleString('pt-BR')],['Vendas concluídas',xlsxNumber(live.length)],
    ['Vendas canceladas',xlsxNumber(sales.length-live.length)],['Faturamento de vendas',xlsxMoney(salesAmount)],
    ['Entradas extras',xlsxMoney(income)],['Saídas',xlsxMoney(out)],
    ['SALDO OPERACIONAL',xlsxMoney(balance)],['Situação',balance>0?'POSITIVO':balance<0?'NEGATIVO':'ZERADO'],
    ['Descontos de vendas',xlsxMoney(live.reduce((acc,s)=>acc+Number(s.discount||0),0))],
    ['Meta diária cadastrada',xlsxMoney(db.goals?.daily||0)],['Meta mensal cadastrada',xlsxMoney(db.goals?.monthly||0)],
    ['Nota','Vendas são entradas de faturamento. Entradas extras estão separadas para não somar duas vezes.'],
    ['Nota','Saldo operacional não equivale necessariamente a lucro contábil.'],
    ['Nota','Excel é um relatório exportado. Novas vendas ficam no navegador até a próxima exportação.']
  ];
  const salesRows=[['ID curto','Data/hora','Identificador completo','Status','Pagamento','Qtd. itens','Subtotal (R$)','Desconto (R$)','Total (R$)','Recebido (R$)','Troco (R$)','Observação']];
  const itemsRows=[['Data/hora','Venda','Status','Tipo','Item / serviço','Qtd.','Preço unit. (R$)','Total bruto (R$)','Custo unit. (R$)']];
  for(const s of sales){
    const count=(s.items||[]).reduce((n,item)=>n+(Number(item.qty)||0),0);
    const change=s.payment==='Dinheiro'?Math.max(0,fromCents(toCents(s.received)-toCents(s.total))):0;
    salesRows.push([s.id.slice(0,8).toUpperCase(),excelTimestamp(s.date),s.id,s.voided?'CANCELADA':'CONCLUÍDA',s.payment||'',xlsxNumber(count),xlsxMoney(s.subtotal),xlsxMoney(s.discount),xlsxMoney(s.total),xlsxMoney(s.received),xlsxMoney(change),s.note||'']);
    for(const item of (s.items||[])){
      itemsRows.push([excelTimestamp(s.date),s.id.slice(0,8).toUpperCase(),s.voided?'CANCELADA':'CONCLUÍDA',item.kind==='p'?'Produto':'Serviço',item.name,xlsxNumber(item.qty),xlsxMoney(item.price),xlsxMoney(Number(item.qty)*Number(item.price)),xlsxMoney(item.cost||0)]);
    }
  }
  const movRows=[['Data','Tipo','Categoria','Descrição','Valor (R$)','Status','Sessão / caixa']];
  const incomeRows=[['Data','Categoria','Descrição','Valor (R$)','Status']];
  const outRows=[['Data','Categoria','Descrição','Valor (R$)','Status']];
  for(const m of moves){
    const row=[m.date,m.type==='in'?'Entrada':'Saída',m.category||'Geral',m.description,xlsxMoney(m.amount),m.voided?'CANCELADA':'ATIVA',m.sessionId||''];
    movRows.push(row);
    const single=[m.date,m.category||'Geral',m.description,xlsxMoney(m.amount),m.voided?'CANCELADA':'ATIVA'];
    (m.type==='in'?incomeRows:outRows).push(single);
  }
  const closedRows=[['Abertura','Fechamento','ID caixa','Fundo inicial (R$)','Esperado gaveta (R$)','Dinheiro contado (R$)','Diferença (R$)','Status']];
  for(const s of sessions)closedRows.push([excelTimestamp(s.openedAt),s.closedAt?excelTimestamp(s.closedAt):'',s.id,xlsxMoney(s.opening),s.closedAt?xlsxMoney(s.expected):'',s.closedAt?xlsxMoney(s.counted):'',s.closedAt?xlsxMoney(s.difference):'',s.closedAt?'FECHADO':'ABERTO']);
  const productsRows=[['Produto','Código','Categoria','Estoque atual','Estoque mínimo','Preço custo (R$)','Preço venda (R$)']];
  for(const p of db.products)productsRows.push([p.name,p.code||'',p.category||'',xlsxNumber(p.stock),xlsxNumber(p.minStock),xlsxMoney(p.cost),xlsxMoney(p.price)]);
  return [
    {name:'Resumo',rows:summary,filter:false},
    {name:'Vendas',rows:salesRows},
    {name:'Itens vendidos',rows:itemsRows},
    {name:'Movimentações',rows:movRows},
    {name:'Entradas',rows:incomeRows},
    {name:'Saídas',rows:outRows},
    {name:'Fechamentos',rows:closedRows},
    {name:'Estoque atual',rows:productsRows}
  ];
}
function exportExcelPeriod(period){
  if(!period||period.type!=='all'&&!/^\d{4}-\d{2}(-\d{2})?$/.test(period.value||''))return toast('Selecione uma data válida antes de exportar.');
  const suffix=period.type==='all'?'historico-completo':`${period.type==='day'?'dia':'mes'}-${period.value}`;
  downloadXlsx(excelSheetData(period),`papelaria-manager-${suffix}.xlsx`);
}
function exportExcelSale(saleId){
  const sale=db.sales.find(s=>s.id===saleId);
  if(!sale)return toast('Venda não encontrada.');
  // Usa as mesmas planilhas do relatório, mas com esta venda apenas.
  const sheets=excelSheetData({type:'day',value:recordDay(sale.date)});
  const thisId=sale.id.slice(0,8).toUpperCase();
  sheets[1].rows=sheets[1].rows.filter((row,i)=>i===0||row[0]===thisId);
  sheets[2].rows=sheets[2].rows.filter((row,i)=>i===0||row[1]===thisId);
  sheets.splice(3); // A venda individual não traz movimentos, fechamento ou estoque.
  sheets[0].rows=[['DETALHE DA VENDA','VALOR'],['Papelaria',db.settings.name],['Identificador',sale.id],['Registrada em',excelTimestamp(sale.date)],['Status',sale.voided?'CANCELADA':'CONCLUÍDA'],['Pagamento',sale.payment],['Subtotal',xlsxMoney(sale.subtotal)],['Desconto',xlsxMoney(sale.discount)],['Total',xlsxMoney(sale.total)],['Obs.',sale.note||'']];
  downloadXlsx(sheets,`papelaria-venda-${thisId}-${recordDay(sale.date)}.xlsx`);
}
