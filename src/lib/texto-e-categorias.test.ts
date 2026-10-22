import { describe, expect, it } from "vitest";
import { OUTROS, categoriasDoProduto } from "./categorias";
import { formatarReais, normalizar, separarNome } from "./texto";

describe("normalizar", () => {
  it("ignora acento, maiúscula e espaços extras", () => {
    expect(normalizar("  Pré-treino   maçã ")).toBe("PRE-TREINO MACA");
  });
});

describe("formatarReais", () => {
  it("formata em reais", () => {
    expect(formatarReais(1234.5).replace(/\s/g, " ")).toBe("R$ 1.234,50");
  });
});

describe("separarNome", () => {
  it('separa o produto da marca e sabor no primeiro " - "', () => {
    expect(separarNome("BEST WHEY - MAX TITANIUM - CHOCOLATE")).toEqual({
      base: "BEST WHEY",
      resto: "MAX TITANIUM - CHOCOLATE",
    });
  });

  it("nome sem marca fica inteiro", () => {
    expect(separarNome("COQUETELEIRA 700ML")).toEqual({ base: "COQUETELEIRA 700ML", resto: "" });
  });
});

describe("categoriasDoProduto", () => {
  it.each([
    ["BEST WHEY - ATLHETICA COOKIES", "Whey e proteína"],
    ["CREATINA MONOHIDRATADA 300G - GROWTH", "Creatina"],
    ["PRÉ-TREINO HORUS - MAX", "Pré-treino"],
    ["BARRA PROTEICA CRISP - DUX", "Barras e snacks"],
    ["COQUETELEIRA 700ML", "Acessórios"],
  ])("%s → %s", (nome, categoria) => {
    expect(categoriasDoProduto(nome)).toContain(categoria);
  });

  it('não olha o sabor: "WHEY - ... COOKIES" não vira barra', () => {
    expect(categoriasDoProduto("BEST WHEY - ATLHETICA COOKIES")).not.toContain("Barras e snacks");
  });

  it("produto com nome de marca cai em Outros", () => {
    expect(categoriasDoProduto("VIKING VALHALLA - BLACK SKULL")).toEqual([OUTROS]);
  });
});
