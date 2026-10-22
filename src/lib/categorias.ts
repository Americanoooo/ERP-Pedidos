import { normalizar } from "./texto";

/**
 * Filtro por tipo de produto, feito por palavra-chave no nome.
 * Só olha a parte do nome ANTES do " - " (o resto costuma ser marca e sabor),
 * assim "BEST WHEY - ATLHETICA COOKIES" não vira barra por causa de "COOKIES".
 *
 * Pra ajustar, é só mexer nas listas abaixo.
 */
export const CATEGORIAS: { nome: string; palavras: RegExp }[] = [
  { nome: "Whey e proteína", palavras: /\b(WHEY|ISOLATE|ISOLADO|ISO|PROTEIN|PROTEINA|ALBUMINA|BEEF|CASEIN\w*|VEGAN|MASS|HIPERCALORICO)\b/ },
  { nome: "Creatina", palavras: /\bCREATIN\w*/ },
  { nome: "Pré-treino", palavras: /\b(PRE|PRE-TREINO|PRE-WORKOUT|PREWORKOUT|PUMP|WORKOUT|PANIC|N\.?O|NITRIC)\b/ },
  { nome: "Aminoácidos", palavras: /\b(AMINO\w*|BCAA|GLUTAMIN[AE]?|ARGININ[AE]?|TIROSINA|BETA\w*|TAURINA|LEUCINA|HMB|EAA)\b/ },
  { nome: "Barras e snacks", palavras: /\b(BAR|BARRA|BARRAS|CRISP|CHIPS|PASTA|WAFER|COOKIE|BISCOITO|BISCUIT|PROTOBAR|FITZEI|MOLHO|DISPLAY|SNACK|PACOCA|CRACKERS|BOLD|TUBE|PAO|BANANA)\b/ },
  { nome: "Vitaminas e saúde", palavras: /\b(VITAMINA|VIT|MULTI\w*|OMEGA\w*|MAGNESIO|ZINCO|COLAGEN\w*|COLAGENO|COLLAGEN|BIOTINA|D3|K2|ACETILCISTEINA|NAC|INOSITOL|PROBIOTICO|COENZIMA|Q10|COMPLEXO|MELATONINA|CABELO|OSTEO|CAPS|CAPSULAS)\b/ },
  { nome: "Termogênicos", palavras: /\b(THERMO\w*|TERMO\w*|CAFEINA|CAFFEIN\w*|CARNITIN\w*|L-CARNITIN\w*|INIBI\w*)\b/ },
  { nome: "Bebidas e géis", palavras: /\b(DRINK|ENERGY|ISOTONIC\w*|ISOTONICO|GEL|ENERGEL|SHOT|COFFEE|SUPERCOFFEE|MALTO\w*|CARBO|CARB|STICK|AGUA|ENERGETICO|POWERADE|SPRITE|REFRIGERANTE|PALATINOSE)\b/ },
  { nome: "Acessórios", palavras: /\b(COQUETELEIRA|GALAO|GARRAFA|SQUEEZE|PORTA|LUVA|CINTO)\b/ },
];

/** Tipo usado pros produtos que não caíram em nenhuma categoria. */
export const OUTROS = "Outros";

export function categoriasDoProduto(nome: string): string[] {
  const base = normalizar(nome.split(" - ")[0]);
  const achadas = CATEGORIAS.filter((c) => c.palavras.test(base)).map((c) => c.nome);
  return achadas.length ? achadas : [OUTROS];
}
