import type ExcelJSType from "exceljs";
import type { Produto, Quantidades, Tabela } from "./tipos";

type ExcelJSModule = typeof ExcelJSType;

/**
 * Fonte e bordas não dá pra ler do .xls, então ficam fixas aqui,
 * iguais às da TABELA REPOSIÇÃO (Verdana 8, borda grossa no cabeçalho).
 * Cores, larguras e formatos de número vêm da planilha importada.
 */
const FONTE = { name: "Verdana", size: 8 };
const BORDA_CABECALHO = "medium" as const;
const BORDA_DADOS = "thin" as const;

function borda(estilo: "thin" | "medium") {
  const lado = { style: estilo, color: { argb: "FF000000" } };
  return { top: lado, left: lado, bottom: lado, right: lado };
}

function preencher(rgb?: string): ExcelJSType.Fill | undefined {
  if (!rgb) return undefined;
  return { type: "pattern", pattern: "solid", fgColor: { argb: `FF${rgb}` } };
}

/** Produtos com quantidade > 0, na mesma ordem da planilha original. */
export function produtosSelecionados(tabela: Tabela, qtds: Quantidades): Produto[] {
  return tabela.produtos.filter((p) => (qtds[p.chave] ?? 0) > 0);
}

/** Monta o workbook do pedido. Recebe o ExcelJS por parâmetro pra funcionar no navegador e nos testes. */
export function montarPedido(ExcelJS: ExcelJSModule, tabela: Tabela, qtds: Quantidades) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Pedido de Reposição";
  const ws = wb.addWorksheet(tabela.nomeAba || "PEDIDO");

  const iPedir = tabela.colunas.findIndex((c) => c.papel === "pedir");

  ws.columns = tabela.colunas.map((c) => ({ width: c.largura ?? 14 }));

  // Cabeçalho
  const cab = ws.addRow(tabela.colunas.map((c) => c.titulo));
  if (tabela.alturaCabecalho) cab.height = tabela.alturaCabecalho;
  tabela.colunas.forEach((col, i) => {
    const cell = cab.getCell(i + 1);
    cell.font = { ...FONTE, bold: true };
    cell.border = borda(BORDA_CABECALHO);
    cell.alignment = { horizontal: "center", vertical: "middle" };
    const fill = preencher(col.estiloCabecalho.fundo);
    if (fill) cell.fill = fill;
  });

  // Produtos selecionados
  for (const produto of produtosSelecionados(tabela, qtds)) {
    const valores = [...produto.valores];
    if (iPedir >= 0) valores[iPedir] = qtds[produto.chave];
    const linha = ws.addRow(valores);
    if (tabela.alturaLinha) linha.height = tabela.alturaLinha;
    tabela.colunas.forEach((col, i) => {
      const cell = linha.getCell(i + 1);
      cell.font = { ...FONTE };
      cell.border = borda(BORDA_DADOS);
      cell.alignment = { horizontal: "center", vertical: "middle" };
      if (col.estiloDados.numFmt) cell.numFmt = col.estiloDados.numFmt;
      const fill = preencher(col.estiloDados.fundo);
      if (fill) cell.fill = fill;
    });
  }

  return wb;
}

export function nomeDoArquivo(tabela: Tabela, data = new Date()): string {
  const base = tabela.nomeArquivo.replace(/\.(xlsx?|csv)$/i, "").replace(/\s+/g, "_");
  const dia = data.toLocaleDateString("pt-BR").replace(/\//g, "-");
  return `${base}_PEDIDO_${dia}.xlsx`;
}

/** Gera o .xlsx no navegador e dispara o download. Devolve o nome do arquivo baixado. */
export async function baixarPedido(tabela: Tabela, qtds: Quantidades): Promise<string> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = montarPedido(ExcelJS, tabela, qtds);
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const nome = nomeDoArquivo(tabela);
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return nome;
}
