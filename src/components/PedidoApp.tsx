"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import LinhaProduto from "./LinhaProduto";
import { importarPlanilha } from "@/lib/importar";
import { baixarPedido, produtosSelecionados } from "@/lib/exportar";
import { CATEGORIAS, OUTROS, categoriasDoProduto } from "@/lib/categorias";
import { lerQuantidades, lerTabela, salvarQuantidades, salvarTabela } from "@/lib/salvar";
import { formatarReais, normalizar } from "@/lib/texto";
import type { Produto, Quantidades, Tabela } from "@/lib/tipos";

type CampoOrdem = "original" | "nome" | "fabricante" | "estoque" | "preco";

const TIPOS = [...CATEGORIAS.map((c) => c.nome), OUTROS];
const EXTENSOES = ".xls,.xlsx,.csv";

export default function PedidoApp() {
  // Começa com o que estava salvo no navegador (o componente só roda no client)
  const [tabela, setTabela] = useState<Tabela | null>(() => lerTabela());
  const [qtds, setQtds] = useState<Quantidades>(() => lerQuantidades());

  const [busca, setBusca] = useState("");
  const [marca, setMarca] = useState("");
  const [tipos, setTipos] = useState<string[]>([]);
  const [soSelecionados, setSoSelecionados] = useState(false);
  const [ordem, setOrdem] = useState<{ campo: CampoOrdem; asc: boolean }>({ campo: "original", asc: true });
  const [erro, setErro] = useState<string | null>(null);
  const [exportando, setExportando] = useState(false);
  const [arrastando, setArrastando] = useState(false);

  const inputArquivo = useRef<HTMLInputElement>(null);
  const buscaAdiada = useDeferredValue(busca);

  useEffect(() => salvarTabela(tabela), [tabela]);
  useEffect(() => salvarQuantidades(qtds), [qtds]);

  // Índice de busca e tipo de cada produto, calculado uma vez por tabela
  const indice = useMemo(() => {
    const mapa = new Map<string, { texto: string; tipos: string[] }>();
    for (const p of tabela?.produtos ?? []) {
      mapa.set(p.chave, {
        texto: normalizar(`${p.id} ${p.nome} ${p.fabricante}`),
        tipos: categoriasDoProduto(p.nome),
      });
    }
    return mapa;
  }, [tabela]);

  const marcas = useMemo(() => {
    const cont = new Map<string, number>();
    for (const p of tabela?.produtos ?? []) if (p.fabricante) cont.set(p.fabricante, (cont.get(p.fabricante) ?? 0) + 1);
    return [...cont.entries()].sort((a, b) => a[0].localeCompare(b[0], "pt-BR"));
  }, [tabela]);

  const contagemTipos = useMemo(() => {
    const cont: Record<string, number> = {};
    for (const p of tabela?.produtos ?? []) {
      if (marca && p.fabricante !== marca) continue;
      for (const t of indice.get(p.chave)?.tipos ?? []) cont[t] = (cont[t] ?? 0) + 1;
    }
    return cont;
  }, [tabela, indice, marca]);

  const visiveis = useMemo(() => {
    if (!tabela) return [];
    const termos = normalizar(buscaAdiada).split(" ").filter(Boolean);
    const lista = tabela.produtos.filter((p) => {
      if (soSelecionados && !(qtds[p.chave] > 0)) return false;
      if (marca && p.fabricante !== marca) return false;
      const info = indice.get(p.chave)!;
      if (tipos.length && !info.tipos.some((t) => tipos.includes(t))) return false;
      return termos.every((t) => info.texto.includes(t));
    });
    if (ordem.campo === "original") return ordem.asc ? lista : [...lista].reverse();

    const campo = ordem.campo;
    const valor = (p: Produto): string | number => {
      if (campo === "nome") return p.nome;
      if (campo === "fabricante") return p.fabricante;
      if (campo === "estoque") return p.estoque ?? -Infinity;
      return p.preco ?? -Infinity;
    };
    return [...lista].sort((a, b) => {
      const va = valor(a);
      const vb = valor(b);
      const r = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb), "pt-BR");
      return ordem.asc ? r : -r;
    });
  }, [tabela, buscaAdiada, marca, tipos, soSelecionados, qtds, indice, ordem]);

  const resumo = useMemo(() => {
    if (!tabela) return { itens: 0, unidades: 0, valor: 0 };
    const sel = produtosSelecionados(tabela, qtds);
    return {
      itens: sel.length,
      unidades: sel.reduce((s, p) => s + qtds[p.chave], 0),
      valor: sel.reduce((s, p) => s + qtds[p.chave] * (p.preco ?? 0), 0),
    };
  }, [tabela, qtds]);

  const mudarQuantidade = useCallback((chave: string, qtd: number) => {
    setQtds((atual) => {
      const novo = { ...atual };
      if (qtd > 0) novo[chave] = qtd;
      else delete novo[chave];
      return novo;
    });
  }, []);

  async function abrirArquivo(arquivo: File) {
    setErro(null);
    if (resumo.itens > 0 && !confirm("Importar outra tabela apaga as quantidades que você já preencheu. Continuar?")) return;
    try {
      const nova = importarPlanilha(await arquivo.arrayBuffer(), arquivo.name);
      setTabela(nova);
      setQtds({});
      setBusca("");
      setMarca("");
      setTipos([]);
      setSoSelecionados(false);
      setOrdem({ campo: "original", asc: true });
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não consegui ler essa planilha.");
    }
  }

  async function exportar() {
    if (!tabela || resumo.itens === 0) return;
    setExportando(true);
    try {
      await baixarPedido(tabela, qtds);
    } catch {
      setErro("Deu erro ao gerar a planilha. Tenta de novo.");
    } finally {
      setExportando(false);
    }
  }

  function limparPedido() {
    if (confirm(`Zerar as quantidades de ${resumo.itens} produto(s)?`)) {
      setQtds({});
      setSoSelecionados(false);
    }
  }

  function alternarOrdem(campo: CampoOrdem) {
    setOrdem((o) => (o.campo === campo ? { campo, asc: !o.asc } : { campo, asc: campo !== "estoque" }));
  }

  const filtrosAtivos = busca || marca || tipos.length || soSelecionados;

  const botaoImportar = (destaque: boolean) => (
    <button
      type="button"
      onClick={() => inputArquivo.current?.click()}
      className={
        destaque
          ? "rounded-xl bg-emerald-700 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-emerald-800"
          : "rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
      }
    >
      Importar tabela
    </button>
  );

  return (
    <div className="flex min-h-screen flex-col">
      <input
        ref={inputArquivo}
        type="file"
        accept={EXTENSOES}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) abrirArquivo(f);
          e.target.value = "";
        }}
      />

      {/* Topo */}
      <header className="sticky top-0 z-20 border-b border-stone-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
          <div className="mr-auto min-w-0">
            <h1 className="text-lg font-bold tracking-tight text-stone-900">Pedido de Reposição</h1>
            {tabela && (
              <p className="truncate text-xs text-stone-500">
                {tabela.nomeArquivo} · {tabela.produtos.length} produtos · importada{" "}
                {new Date(tabela.importadaEm).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
              </p>
            )}
          </div>
          {tabela && botaoImportar(false)}
          {tabela && (
            <button
              type="button"
              onClick={exportar}
              disabled={resumo.itens === 0 || exportando}
              className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-stone-300"
            >
              {exportando ? "Gerando…" : `Exportar pedido${resumo.itens ? ` (${resumo.itens})` : ""}`}
            </button>
          )}
        </div>
      </header>

      {erro && (
        <div className="mx-auto mt-4 w-full max-w-7xl px-4 sm:px-6">
          <div className="flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <span>{erro}</span>
            <button onClick={() => setErro(null)} className="font-semibold" aria-label="Fechar aviso">
              ×
            </button>
          </div>
        </div>
      )}

      {!tabela ? (
        /* Tela inicial: importar */
        <main className="flex flex-1 items-center justify-center px-4 py-12">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setArrastando(true);
            }}
            onDragLeave={() => setArrastando(false)}
            onDrop={(e) => {
              e.preventDefault();
              setArrastando(false);
              const f = e.dataTransfer.files?.[0];
              if (f) abrirArquivo(f);
            }}
            className={`flex w-full max-w-xl flex-col items-center rounded-2xl border-2 border-dashed px-8 py-14 text-center transition-colors ${
              arrastando ? "border-emerald-500 bg-emerald-50" : "border-stone-300 bg-white"
            }`}
          >
            <div className="mb-5 grid h-14 w-14 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                <rect x="4" y="3" width="16" height="18" rx="2" />
                <path d="M8 8h8M8 12h8M8 16h5" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-stone-900">Importe a tabela de reposição</h2>
            <p className="mt-2 max-w-sm text-sm text-stone-500">
              Escolha a planilha (.xls ou .xlsx) ou arraste ela aqui. Depois é só preencher as quantidades e exportar o
              pedido no mesmo formato.
            </p>
            <div className="mt-7">{botaoImportar(true)}</div>
          </div>
        </main>
      ) : (
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-28 pt-4 sm:px-6">
          {/* Filtros */}
          <section className="space-y-3 rounded-xl border border-stone-200 bg-white p-3 sm:p-4">
            <div className="flex flex-wrap gap-2">
              <div className="relative min-w-[220px] flex-1">
                <svg
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" />
                </svg>
                <input
                  type="search"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar por nome, sabor, ID ou marca…"
                  className="h-10 w-full rounded-lg border border-stone-300 bg-white pl-9 pr-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15"
                />
              </div>
              <select
                value={marca}
                onChange={(e) => setMarca(e.target.value)}
                aria-label="Filtrar por marca"
                className="h-10 min-w-[180px] rounded-lg border border-stone-300 bg-white px-3 text-sm outline-none focus:border-emerald-600"
              >
                <option value="">Todas as marcas ({marcas.length})</option>
                {marcas.map(([m, n]) => (
                  <option key={m} value={m}>
                    {m} ({n})
                  </option>
                ))}
              </select>
              <label
                className={`flex h-10 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm ${
                  soSelecionados ? "border-amber-400 bg-amber-50 text-amber-900" : "border-stone-300 text-stone-700"
                }`}
              >
                <input
                  type="checkbox"
                  checked={soSelecionados}
                  onChange={(e) => setSoSelecionados(e.target.checked)}
                  className="accent-amber-500"
                />
                Só selecionados
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-xs font-medium uppercase tracking-wide text-stone-400">Tipo</span>
              {TIPOS.filter((t) => contagemTipos[t]).map((t) => {
                const ativo = tipos.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTipos((a) => (ativo ? a.filter((x) => x !== t) : [...a, t]))}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      ativo
                        ? "border-emerald-700 bg-emerald-700 text-white"
                        : "border-stone-300 bg-white text-stone-600 hover:border-stone-400"
                    }`}
                  >
                    {t} <span className={ativo ? "text-emerald-100" : "text-stone-400"}>{contagemTipos[t]}</span>
                  </button>
                );
              })}
              {filtrosAtivos ? (
                <button
                  type="button"
                  onClick={() => {
                    setBusca("");
                    setMarca("");
                    setTipos([]);
                    setSoSelecionados(false);
                  }}
                  className="ml-auto text-xs font-medium text-emerald-700 hover:underline"
                >
                  Limpar filtros
                </button>
              ) : null}
            </div>
          </section>

          <p className="mb-2 mt-4 text-xs text-stone-500">
            Mostrando {visiveis.length} de {tabela.produtos.length} produtos
          </p>

          {/* Tabela */}
          <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
            <table className="w-full min-w-[760px] border-collapse">
              <thead className="sticky top-0 bg-stone-50 text-left text-[11px] font-semibold uppercase tracking-wide text-stone-500">
                <tr className="border-b border-stone-200">
                  <Cabecalho titulo="ID" campo="original" ordem={ordem} aoClicar={alternarOrdem} />
                  <Cabecalho titulo="Produto" campo="nome" ordem={ordem} aoClicar={alternarOrdem} />
                  <Cabecalho titulo="Marca" campo="fabricante" ordem={ordem} aoClicar={alternarOrdem} />
                  <Cabecalho titulo="Estoque" campo="estoque" ordem={ordem} aoClicar={alternarOrdem} direita />
                  <Cabecalho titulo="R$ Varejo" campo="preco" ordem={ordem} aoClicar={alternarOrdem} direita />
                  <th className="px-3 py-2.5 text-right">Pedir</th>
                </tr>
              </thead>
              <tbody>
                {visiveis.map((p) => (
                  <LinhaProduto key={p.chave} produto={p} quantidade={qtds[p.chave] ?? 0} aoMudar={mudarQuantidade} />
                ))}
              </tbody>
            </table>
            {visiveis.length === 0 && (
              <div className="px-4 py-14 text-center text-sm text-stone-500">
                {soSelecionados && resumo.itens === 0
                  ? "Nenhum produto com quantidade ainda."
                  : "Nenhum produto encontrado com esses filtros."}
              </div>
            )}
          </div>
        </main>
      )}

      {/* Resumo do pedido */}
      {tabela && (
        <footer className="fixed inset-x-0 bottom-0 z-20 border-t border-stone-200 bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
            <Numero rotulo="Produtos" valor={String(resumo.itens)} />
            <Numero rotulo="Unidades" valor={String(resumo.unidades)} />
            <Numero rotulo="Total no varejo" valor={formatarReais(resumo.valor)} />
            <div className="ml-auto flex items-center gap-2">
              {resumo.itens > 0 && (
                <>
                  <button
                    type="button"
                    onClick={() => setSoSelecionados((s) => !s)}
                    className="rounded-lg px-3 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100"
                  >
                    {soSelecionados ? "Ver todos" : "Revisar pedido"}
                  </button>
                  <button
                    type="button"
                    onClick={limparPedido}
                    className="rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                  >
                    Zerar
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={exportar}
                disabled={resumo.itens === 0 || exportando}
                className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-stone-300"
              >
                {exportando ? "Gerando…" : "Exportar planilha"}
              </button>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}

function Cabecalho({
  titulo,
  campo,
  ordem,
  aoClicar,
  direita,
}: {
  titulo: string;
  campo: CampoOrdem;
  ordem: { campo: CampoOrdem; asc: boolean };
  aoClicar: (c: CampoOrdem) => void;
  direita?: boolean;
}) {
  const ativo = ordem.campo === campo;
  return (
    <th className={`px-3 py-2.5 ${direita ? "text-right" : ""}`}>
      <button
        type="button"
        onClick={() => aoClicar(campo)}
        className={`inline-flex items-center gap-1 uppercase hover:text-stone-800 ${ativo ? "text-stone-800" : ""}`}
      >
        {titulo}
        <span className={ativo ? "opacity-100" : "opacity-0"}>{ordem.asc ? "↑" : "↓"}</span>
      </button>
    </th>
  );
}

function Numero({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div>
      <div className="text-[11px] font-medium uppercase tracking-wide text-stone-400">{rotulo}</div>
      <div className="text-base font-bold tabular-nums text-stone-900">{valor}</div>
    </div>
  );
}
