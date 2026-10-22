/** Tira acento e deixa maiúsculo, pra comparar "maçã" com "MACA". */
export function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function formatarReais(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Separa "BEST WHEY - MAX TITANIUM CHOCOLATE" em produto ("BEST WHEY") e o resto (marca e sabor). */
export function separarNome(nome: string): { base: string; resto: string } {
  const [base, ...partes] = nome.split(" - ");
  return { base, resto: partes.join(" - ") };
}
