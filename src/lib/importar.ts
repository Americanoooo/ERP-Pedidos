import * as XLSX from "xlsx";
import { normalizar } from "./texto";
import type {
  Coluna,
  EstiloCelula,
  PapelColuna,
  Produto,
  Tabela,
  ValorCelula,
} from "./tipos";

/**
 * Descobre o papel de uma coluna pelo título.
 * Ordem importa: "QTD ESTOQUE" tem que virar estoque, não pedir.
 */
function detectarPapel(titulo: string): PapelColuna {
  const t = normalizar(titulo);
  if (!t) return "outro";

  if (["ID", "COD", "COD.", "CODIGO", "SKU", "REF", "REFERENCIA"].includes(t) || t.startsWith("CODIGO"))
    return "id";
  if (t.includes("ESTOQUE") || t.includes("SALDO")) return "estoque";
  if (t.includes("PEDIR") || t.includes("PEDIDO") || t.includes("QUANT") || t.startsWith("QTD") || t.startsWith("QTDE"))
    return "pedir";
  if (t.includes("R$") || t.includes("PRECO") || t.includes("VALOR") || t.includes("VAREJO")) return "preco";
  if (t.includes("FABRICANTE") || t.includes("MARCA") || t.includes("FORNECEDOR")) return "fabricante";
  if (t.includes("PRODUTO") || t.includes("DESCRICAO") || t === "NOME" || t === "ITEM") return "produto";
  return "outro";
}

function estiloDe(cell: XLSX.CellObject | undefined): EstiloCelula {
  if (!cell) return {};
  const estilo: EstiloCelula = {};
  const z = cell.z as string | undefined;
  if (z && z !== "General") estilo.numFmt = z;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s = (cell as any).s;
  const rgb: string | undefined = s?.fgColor?.rgb;
  if (s?.patternType === "solid" && rgb && rgb !== "FFFFFF") estilo.fundo = rgb.slice(-6);
  return estilo;
}

function paraNumero(v: ValorCelula): number | null {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const limpo = v.replace(/[R$\s.]/g, "").replace(",", ".");
    const n = Number(limpo);
    return limpo !== "" && Number.isFinite(n) ? n : null;
  }
  return null;
}

function paraTexto(v: ValorCelula): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

/** Lê .xls, .xlsx ou .csv e devolve a tabela de produtos. */
export function importarPlanilha(dados: ArrayBuffer, nomeArquivo: string): Tabela {
  const wb = XLSX.read(dados, { type: "array", cellNF: true, cellStyles: true });
  const nomeAba = wb.SheetNames[0];
  const ws = wb.Sheets[nomeAba];
  if (!ws || !ws["!ref"]) throw new Error("A planilha está vazia.");

  const linhas = XLSX.utils.sheet_to_json<ValorCelula[]>(ws, {
    header: 1,
    raw: true,
    defval: null,
    blankrows: true,
  });

  // Acha a linha de cabeçalho: a primeira (das 20 primeiras) que tem uma coluna de produto
  let linhaCab = linhas.slice(0, 20).findIndex((linha) => {
    const papeis = linha.map((v) => detectarPapel(paraTexto(v)));
    return papeis.includes("produto") && papeis.filter((p) => p !== "outro").length >= 2;
  });
  if (linhaCab === -1) linhaCab = 0;

  const cabecalho = linhas[linhaCab] ?? [];
  // Ignora colunas vazias no fim do cabeçalho
  let totalColunas = cabecalho.length;
  while (totalColunas > 0 && !paraTexto(cabecalho[totalColunas - 1])) totalColunas--;

  const usados = new Set<PapelColuna>();
  const colunas: Coluna[] = [];
  const cols = ws["!cols"] ?? [];
  const primeiraDados = linhaCab + 1;

  for (let c = 0; c < totalColunas; c++) {
    const titulo = paraTexto(cabecalho[c]);
    let papel = detectarPapel(titulo);
    if (papel !== "outro" && usados.has(papel)) papel = "outro";
    usados.add(papel);

    // Estilo dos dados: pega da primeira célula com formato definido nas primeiras linhas
    let estiloDados: EstiloCelula = {};
    for (let r = primeiraDados; r < Math.min(primeiraDados + 10, linhas.length); r++) {
      const e = estiloDe(ws[XLSX.utils.encode_cell({ r, c })]);
      if (e.numFmt || e.fundo) {
        estiloDados = e;
        break;
      }
    }

    colunas.push({
      titulo,
      papel,
      largura: cols[c]?.width ?? cols[c]?.wch,
      estiloCabecalho: estiloDe(ws[XLSX.utils.encode_cell({ r: linhaCab, c })]),
      estiloDados,
    });
  }

  if (!usados.has("produto")) {
    throw new Error("Não encontrei a coluna de produto. O cabeçalho precisa ter algo como PRODUTO, NOME ou DESCRIÇÃO.");
  }

  // Sem coluna de quantidade? Cria a PEDIR no fim, amarela como na planilha modelo
  if (!usados.has("pedir")) {
    colunas.push({
      titulo: "PEDIR",
      papel: "pedir",
      largura: 12,
      estiloCabecalho: { fundo: "FFFF00" },
      estiloDados: { fundo: "FFFF00" },
    });
  }

  const idx = (p: PapelColuna) => colunas.findIndex((c) => c.papel === p);
  const iId = idx("id");
  const iNome = idx("produto");
  const iFab = idx("fabricante");
  const iEst = idx("estoque");
  const iPreco = idx("preco");

  const produtos: Produto[] = [];
  const chavesUsadas = new Set<string>();

  for (let r = primeiraDados; r < linhas.length; r++) {
    const linha = linhas[r] ?? [];
    const valores: ValorCelula[] = colunas.map((_, c) => (linha[c] === undefined ? null : linha[c]));
    const nome = paraTexto(valores[iNome]);
    const id = iId >= 0 ? paraTexto(valores[iId]) : "";
    if (!nome && !id) continue; // linha vazia

    let chave = id || `linha-${r + 1}`;
    while (chavesUsadas.has(chave)) chave += "*";
    chavesUsadas.add(chave);

    produtos.push({
      chave,
      id,
      nome,
      fabricante: iFab >= 0 ? paraTexto(valores[iFab]) : "",
      estoque: iEst >= 0 ? paraNumero(valores[iEst]) : null,
      preco: iPreco >= 0 ? paraNumero(valores[iPreco]) : null,
      valores,
    });
  }

  if (produtos.length === 0) throw new Error("Não achei nenhum produto abaixo do cabeçalho.");

  const rows = ws["!rows"] ?? [];
  return {
    nomeArquivo,
    nomeAba,
    colunas,
    produtos,
    alturaCabecalho: rows[linhaCab]?.hpt,
    alturaLinha: rows[primeiraDados]?.hpt,
    importadaEm: new Date().toISOString(),
  };
}
