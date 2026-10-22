import type { Quantidades, Tabela } from "./tipos";

/**
 * Guarda a tabela e as quantidades no navegador (localStorage),
 * pra não perder o pedido se der F5. Quando tiver banco, é aqui que troca.
 */
const CHAVE_TABELA = "pedido:tabela:v1";
const CHAVE_QTDS = "pedido:quantidades:v1";

function ler<T>(chave: string): T | null {
  try {
    const bruto = localStorage.getItem(chave);
    return bruto ? (JSON.parse(bruto) as T) : null;
  } catch {
    return null;
  }
}

function gravar(chave: string, valor: unknown) {
  try {
    if (valor === null) localStorage.removeItem(chave);
    else localStorage.setItem(chave, JSON.stringify(valor));
  } catch {
    // Navegador sem espaço ou em modo privado: segue sem salvar
  }
}

export const lerTabela = () => ler<Tabela>(CHAVE_TABELA);
export const lerQuantidades = () => ler<Quantidades>(CHAVE_QTDS) ?? {};
export const salvarTabela = (t: Tabela | null) => gravar(CHAVE_TABELA, t);
export const salvarQuantidades = (q: Quantidades) => gravar(CHAVE_QTDS, q);
