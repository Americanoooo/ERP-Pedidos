/** Papel de cada coluna da planilha. "outro" = coluna que o site não conhece, mas mantém na exportação. */
export type PapelColuna =
  | "id"
  | "produto"
  | "estoque"
  | "fabricante"
  | "pedir"
  | "preco"
  | "outro";

export type ValorCelula = string | number | boolean | null;

/** Estilo copiado da planilha original pra reaplicar na exportada. */
export interface EstiloCelula {
  /** Formato de número do Excel, ex: `0` ou o formato contábil de R$ */
  numFmt?: string;
  /** Cor de fundo em hex sem #, ex: "FFFF00" */
  fundo?: string;
}

export interface Coluna {
  titulo: string;
  papel: PapelColuna;
  /** Largura em caracteres (padrão do Excel) */
  largura?: number;
  estiloCabecalho: EstiloCelula;
  estiloDados: EstiloCelula;
}

export interface Produto {
  /** Chave única: o ID da planilha (ou o número da linha se não houver ID) */
  chave: string;
  id: string;
  nome: string;
  fabricante: string;
  estoque: number | null;
  preco: number | null;
  /** Todos os valores da linha, na ordem das colunas, pra exportar igualzinho */
  valores: ValorCelula[];
}

export interface Tabela {
  nomeArquivo: string;
  nomeAba: string;
  colunas: Coluna[];
  produtos: Produto[];
  alturaCabecalho?: number;
  alturaLinha?: number;
  importadaEm: string;
}

/** Quantidade a pedir por produto (chave → quantidade) */
export type Quantidades = Record<string, number>;
