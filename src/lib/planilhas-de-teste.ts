import * as XLSX from "xlsx";
import type { ValorCelula } from "./tipos";

/** Monta uma planilha em memória a partir das linhas, no formato pedido, como se fosse o arquivo do distribuidor. */
export function planilha(
  linhas: ValorCelula[][],
  formato: "xlsx" | "xls" | "csv" = "xlsx",
  nomeAba = "REPOSICAO",
): ArrayBuffer {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(linhas), nomeAba);
  if (formato === "csv") return texto(XLSX.utils.sheet_to_csv(wb.Sheets[nomeAba]));
  const bytes: ArrayBuffer = XLSX.write(wb, { type: "array", bookType: formato === "xls" ? "biff8" : "xlsx" });
  return bytes;
}

/** Bytes de um texto qualquer (CSV escrito à mão, arquivo que não é planilha…). */
export function texto(conteudo: string): ArrayBuffer {
  const bytes = new TextEncoder().encode(conteudo);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

/** A tabela de reposição "padrão": cabeçalho na linha 1, como a TABELA REPOSIÇÃO. */
export const TABELA_PADRAO: ValorCelula[][] = [
  ["ID", "PRODUTO", "ESTOQUE", "FABRICANTE", "PEDIR", "R$ VAREJO"],
  [1001, "BEST WHEY - MAX TITANIUM CHOCOLATE", 3, "MAX TITANIUM", null, 159.9],
  [1002, "CREATINA 300G - GROWTH", 0, "GROWTH", null, 89.9],
  [1003, "BARRA CRISP - DUX COOKIES", 12, "DUX", null, 9.5],
];
