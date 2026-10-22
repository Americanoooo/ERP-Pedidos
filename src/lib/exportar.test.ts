import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { montarPedido, nomeDoArquivo, produtosSelecionados } from "./exportar";
import { importarPlanilha } from "./importar";
import { TABELA_PADRAO, planilha } from "./planilhas-de-teste";

const tabela = () => importarPlanilha(planilha(TABELA_PADRAO), "TABELA REPOSIÇÃO.xlsx");

/** Gera o .xlsx do pedido e lê de volta as linhas, como o distribuidor vai ver. */
async function linhasDoPedido(qtds: Record<string, number>, t = tabela()) {
  const wb = montarPedido(ExcelJS, t, qtds);
  const lido = new ExcelJS.Workbook();
  await lido.xlsx.load((await wb.xlsx.writeBuffer()) as ArrayBuffer);
  const ws = lido.worksheets[0];
  const linhas: unknown[][] = [];
  ws.eachRow((row) => linhas.push((row.values as unknown[]).slice(1)));
  return { ws, linhas, buffer: await wb.xlsx.writeBuffer() };
}

describe("produtosSelecionados", () => {
  it("só traz quem tem quantidade > 0, na ordem da planilha", () => {
    const t = tabela();
    const sel = produtosSelecionados(t, { "1003": 2, "1001": 1, "1002": 0 });
    expect(sel.map((p) => p.id)).toEqual(["1001", "1003"]);
  });
});

describe("montarPedido", () => {
  it("mantém aba, cabeçalho e colunas, só com os produtos pedidos e o PEDIR preenchido", async () => {
    const { ws, linhas } = await linhasDoPedido({ "1001": 6, "1003": 12 });

    expect(ws.name).toBe("REPOSICAO");
    expect(linhas[0]).toEqual(TABELA_PADRAO[0]);
    expect(linhas.slice(1)).toEqual([
      [1001, "BEST WHEY - MAX TITANIUM CHOCOLATE", 3, "MAX TITANIUM", 6, 159.9],
      [1003, "BARRA CRISP - DUX COOKIES", 12, "DUX", 12, 9.5],
    ]);
  });

  it("com pedido vazio sai só o cabeçalho", async () => {
    const { linhas } = await linhasDoPedido({});
    expect(linhas).toHaveLength(1);
  });

  it("formata como a planilha modelo: Verdana 8, cabeçalho em negrito e borda", async () => {
    const { ws } = await linhasDoPedido({ "1001": 1 });
    const cab = ws.getCell("B1");
    const dado = ws.getCell("B2");
    expect(cab.font).toMatchObject({ name: "Verdana", size: 8, bold: true });
    expect(cab.border?.top?.style).toBe("medium");
    expect(dado.font).toMatchObject({ name: "Verdana", size: 8 });
    expect(dado.border?.top?.style).toBe("thin");
  });

  it("a coluna PEDIR criada pelo site sai amarela", async () => {
    const t = importarPlanilha(
      planilha([
        ["ID", "PRODUTO"],
        [1, "WHEY"],
      ]),
      "x.xlsx",
    );
    const { ws, linhas } = await linhasDoPedido({ "1": 3 }, t);
    expect(linhas).toEqual([
      ["ID", "PRODUTO", "PEDIR"],
      [1, "WHEY", 3],
    ]);
    expect(ws.getCell("C2").fill).toMatchObject({ type: "pattern", fgColor: { argb: "FFFFFF00" } });
  });

  it("o pedido exportado pode ser importado de novo sem perder nada", async () => {
    const { buffer } = await linhasDoPedido({ "1002": 4 });
    const devolta = importarPlanilha(buffer as ArrayBuffer, "pedido.xlsx");
    expect(devolta.produtos).toHaveLength(1);
    expect(devolta.produtos[0]).toMatchObject({ id: "1002", nome: "CREATINA 300G - GROWTH", estoque: 0, preco: 89.9 });
    const iPedir = devolta.colunas.findIndex((c) => c.papel === "pedir");
    expect(devolta.produtos[0].valores[iPedir]).toBe(4);
  });
});

describe("nomeDoArquivo", () => {
  it("usa o nome da tabela + PEDIDO + data, sempre .xlsx", () => {
    const data = new Date(2026, 9, 22);
    expect(nomeDoArquivo(tabela(), data)).toBe("TABELA_REPOSIÇÃO_PEDIDO_22-10-2026.xlsx");
  });

  it("troca .xls e .csv por .xlsx", () => {
    const data = new Date(2026, 0, 5);
    for (const nome of ["tabela.xls", "tabela.CSV"]) {
      expect(nomeDoArquivo({ ...tabela(), nomeArquivo: nome }, data)).toBe("tabela_PEDIDO_05-01-2026.xlsx");
    }
  });
});
