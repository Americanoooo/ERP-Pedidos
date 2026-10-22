import { describe, expect, it } from "vitest";
import { importarPlanilha } from "./importar";
import { TABELA_PADRAO, planilha, texto } from "./planilhas-de-teste";

const papeis = (t: ReturnType<typeof importarPlanilha>) => t.colunas.map((c) => `${c.titulo}:${c.papel}`);

describe("importarPlanilha: tabela certa", () => {
  it("lê a tabela padrão com todos os campos", () => {
    const t = importarPlanilha(planilha(TABELA_PADRAO), "tabela.xlsx");

    expect(t.nomeArquivo).toBe("tabela.xlsx");
    expect(t.nomeAba).toBe("REPOSICAO");
    expect(papeis(t)).toEqual([
      "ID:id",
      "PRODUTO:produto",
      "ESTOQUE:estoque",
      "FABRICANTE:fabricante",
      "PEDIR:pedir",
      "R$ VAREJO:preco",
    ]);
    expect(t.produtos).toHaveLength(3);
    expect(t.produtos[0]).toMatchObject({
      chave: "1001",
      id: "1001",
      nome: "BEST WHEY - MAX TITANIUM CHOCOLATE",
      fabricante: "MAX TITANIUM",
      estoque: 3,
      preco: 159.9,
    });
  });

  it.each(["xlsx", "xls", "csv"] as const)("aceita .%s", (formato) => {
    const t = importarPlanilha(planilha(TABELA_PADRAO, formato), `tabela.${formato}`);
    expect(t.produtos.map((p) => p.nome)).toEqual(TABELA_PADRAO.slice(1).map((l) => l[1]));
  });

  it("reconhece nomes parecidos de coluna (CÓDIGO, DESCRIÇÃO, MARCA, QTD, PREÇO)", () => {
    const t = importarPlanilha(
      planilha([
        ["Código", "Descrição", "Saldo", "Marca", "Qtd", "Preço"],
        ["A1", "WHEY", 5, "DUX", null, "10,00"],
      ]),
      "x.xlsx",
    );
    expect(t.colunas.map((c) => c.papel)).toEqual(["id", "produto", "estoque", "fabricante", "pedir", "preco"]);
  });

  it('"QTD ESTOQUE" é estoque, não a quantidade a pedir', () => {
    const t = importarPlanilha(
      planilha([
        ["PRODUTO", "QTD ESTOQUE", "QTD"],
        ["WHEY", 4, null],
      ]),
      "x.xlsx",
    );
    expect(papeis(t)).toEqual(["PRODUTO:produto", "QTD ESTOQUE:estoque", "QTD:pedir"]);
  });

  it("acha o cabeçalho mesmo com título e linhas vazias em cima", () => {
    const t = importarPlanilha(
      planilha([
        ["TABELA DE REPOSIÇÃO - OUTUBRO"],
        [],
        ["Distribuidora X", null, "Data: 01/10"],
        ...TABELA_PADRAO,
      ]),
      "x.xlsx",
    );
    expect(t.colunas[1].papel).toBe("produto");
    expect(t.produtos).toHaveLength(3);
  });

  it("cria a coluna PEDIR (amarela) quando a planilha não tem quantidade", () => {
    const t = importarPlanilha(
      planilha([
        ["ID", "PRODUTO"],
        [1, "WHEY"],
      ]),
      "x.xlsx",
    );
    const pedir = t.colunas.at(-1)!;
    expect(pedir).toMatchObject({ titulo: "PEDIR", papel: "pedir", estiloDados: { fundo: "FFFF00" } });
    expect(t.produtos[0].valores).toHaveLength(3);
  });

  it("mantém colunas desconhecidas e trata coluna repetida como desconhecida", () => {
    const t = importarPlanilha(
      planilha([
        ["PRODUTO", "OBS", "MARCA", "FORNECEDOR"],
        ["WHEY", "promoção", "DUX", "DIST X"],
      ]),
      "x.xlsx",
    );
    expect(t.colunas.map((c) => c.papel)).toEqual(["produto", "outro", "fabricante", "outro", "pedir"]);
    expect(t.produtos[0].valores.slice(0, 4)).toEqual(["WHEY", "promoção", "DUX", "DIST X"]);
  });

  it("pula linhas vazias no meio e no fim", () => {
    const t = importarPlanilha(
      planilha([TABELA_PADRAO[0], TABELA_PADRAO[1], [], [null, null], TABELA_PADRAO[2], [], []]),
      "x.xlsx",
    );
    expect(t.produtos.map((p) => p.id)).toEqual(["1001", "1002"]);
  });

  it("dá chave única para ID repetido e para linha sem ID", () => {
    const t = importarPlanilha(
      planilha([
        ["ID", "PRODUTO"],
        [7, "WHEY"],
        [7, "WHEY DE NOVO"],
        [null, "SEM ID"],
      ]),
      "x.xlsx",
    );
    const chaves = t.produtos.map((p) => p.chave);
    expect(new Set(chaves).size).toBe(3);
    expect(chaves[2]).toBe("linha-4");
  });

  it("converte preço e estoque escritos como texto", () => {
    const t = importarPlanilha(
      planilha([
        ["PRODUTO", "ESTOQUE", "PREÇO"],
        ["A", "12", "R$ 1.234,56"],
        ["B", "—", ""],
        ["C", "-3", "R$ 0,99"],
      ]),
      "x.xlsx",
    );
    expect(t.produtos.map((p) => [p.estoque, p.preco])).toEqual([
      [12, 1234.56],
      [null, null],
      [-3, 0.99],
    ]);
  });

  it("lê CSV separado por ponto e vírgula (padrão do Excel em português)", () => {
    const csv = "ID;PRODUTO;ESTOQUE;R$ VAREJO\n1;WHEY;3;159,90\n2;CREATINA;0;89,90\n";
    const t = importarPlanilha(texto(csv), "tabela.csv");
    expect(t.produtos.map((p) => [p.nome, p.preco])).toEqual([
      ["WHEY", 159.9],
      ["CREATINA", 89.9],
    ]);
  });

  it("CSV com ponto e vírgula: milhar com ponto e centavos com vírgula", () => {
    const t = importarPlanilha(texto("PRODUTO;R$\nA;1.234,56\nB;0,99\nC;R$ 12,00\n"), "tabela.csv");
    expect(t.produtos.map((p) => p.preco)).toEqual([1234.56, 0.99, 12]);
    // O valor que vai para a exportação também é o número certo, não só o preço exibido
    expect(t.produtos[0].valores[1]).toBe(1234.56);
  });

  it("CSV com ponto e vírgula mantém código com zero à esquerda", () => {
    const t = importarPlanilha(texto("ID;PRODUTO\n00123;WHEY\n"), "tabela.csv");
    expect(t.produtos[0].id).toBe("00123");
    expect(t.produtos[0].valores[0]).toBe("00123");
  });

  it("CSV separado por vírgula (formato americano) continua com ponto decimal", () => {
    const t = importarPlanilha(texto("PRODUTO,R$\nA,159.9\nB,1234.5\n"), "tabela.csv");
    expect(t.produtos.map((p) => p.preco)).toEqual([159.9, 1234.5]);
  });

  it("número guardado como texto no .xlsx: ponto decimal ou de milhar", () => {
    const t = importarPlanilha(
      planilha([
        ["PRODUTO", "PREÇO"],
        ["A", "159.9"],
        ["B", "12.50"],
        ["C", "1.500"],
        ["D", "12 un"],
      ]),
      "x.xlsx",
    );
    expect(t.produtos.map((p) => p.preco)).toEqual([159.9, 12.5, 1500, null]);
  });

  it("lê só a primeira aba", () => {
    const t = importarPlanilha(planilha(TABELA_PADRAO, "xlsx", "ABA 1"), "x.xlsx");
    expect(t.nomeAba).toBe("ABA 1");
  });
});

describe("importarPlanilha: tabela errada", () => {
  it("recusa planilha sem coluna de produto, explicando o que falta", () => {
    expect(() =>
      importarPlanilha(
        planilha([
          ["CLIENTE", "CIDADE", "TELEFONE"],
          ["João", "SP", "1199999"],
        ]),
        "clientes.xlsx",
      ),
    ).toThrow(/coluna de produto/);
  });

  it("recusa planilha totalmente vazia", () => {
    expect(() => importarPlanilha(planilha([]), "vazia.xlsx")).toThrow(/vazia/);
  });

  it("recusa planilha só com cabeçalho", () => {
    expect(() => importarPlanilha(planilha([TABELA_PADRAO[0]]), "so-cabecalho.xlsx")).toThrow(/nenhum produto/);
  });

  it("recusa arquivo de 0 bytes dizendo que está vazio", () => {
    expect(() => importarPlanilha(new ArrayBuffer(0), "tabela.xlsx")).toThrow("O arquivo está vazio.");
  });

  it("recusa PDF renomeado para .xlsx dizendo que não é planilha", () => {
    const pdf = texto("%PDF-1.7\n%âãÏÓ\n1 0 obj\n<< /Type /Catalog >>\nendobj\n");
    expect(() => importarPlanilha(pdf, "pedido.pdf.xlsx")).toThrow(/não é uma planilha do Excel/);
  });

  it("recusa texto qualquer com extensão de planilha", () => {
    expect(() => importarPlanilha(texto("Olá, segue o pedido em anexo.\nAtt."), "email.xlsx")).toThrow(
      /não é uma planilha do Excel/,
    );
  });

  it("aceita o .xls em HTML que alguns sistemas exportam", () => {
    const html =
      "<html><body><table><tr><td>ID</td><td>PRODUTO</td><td>R$</td></tr>" +
      "<tr><td>00123</td><td>WHEY</td><td>159,90</td></tr>" +
      "<tr><td>2</td><td>CREATINA</td><td>1.089,90</td></tr></table></body></html>";
    const t = importarPlanilha(texto(html), "relatorio.xls");
    expect(t.produtos.map((p) => [p.id, p.nome, p.preco])).toEqual([
      ["00123", "WHEY", 159.9],
      ["2", "CREATINA", 1089.9],
    ]);
  });
});
