"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import LinhaProduto from "./LinhaProduto";
import ConfirmarDialogo from "./ConfirmarDialogo";
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
  const [confirmandoZerar, setConfirmandoZerar] = useState(false);
  // Planilha escolhida que espera confirmação, porque importar apaga o pedido atual
  const [arquivoPendente, setArquivoPendente] = useState<File | null>(null);

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

  function abrirArquivo(arquivo: File) {
    setErro(null);
    if (resumo.itens > 0) setArquivoPendente(arquivo);
    else importar(arquivo);
  }

  async function importar(arquivo: File) {
    setArquivoPendente(null);
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
    setQtds({});
    setSoSelecionados(false);
    setConfirmandoZerar(false);
  }

  function alternarOrdem(campo: CampoOrdem) {
    setOrdem((o) => (o.campo === campo ? { campo, asc: !o.asc } : { campo, asc: campo !== "estoque" }));
  }

  const filtrosAtivos = busca || marca || tipos.length || soSelecionados;

  function limparFiltros() {
    setBusca("");
    setMarca("");
    setTipos([]);
    setSoSelecionados(false);
  }
  const semEstoque = useMemo(
    () => tabela?.produtos.filter((p) => p.estoque !== null && p.estoque <= 0).length ?? 0,
    [tabela],
  );
  const importadaEm = tabela
    ? new Date(tabela.importadaEm).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
    : "";

  const abrirSeletor = () => inputArquivo.current?.click();

  const botaoExportar = (classe: string) => (
    <button
      type="button"
      onClick={exportar}
      disabled={resumo.itens === 0 || exportando}
      className={`${foco} inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-x3 px-4 py-2.5 text-sm font-semibold text-tinta shadow-[0_1px_2px_rgba(17,17,17,0.18)] hover:bg-x3-escuro disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-500 disabled:shadow-none ${classe}`}
    >
      <IconeBaixar />
      {exportando ? (
        "Gerando…"
      ) : (
        <span>
          Exportar<span className="hidden sm:inline lg:inline"> pedido</span>
          {resumo.itens ? ` (${resumo.itens})` : ""}
        </span>
      )}
    </button>
  );

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[minmax(0,1fr)_15.5rem]">
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

      <ConfirmarDialogo
        aberto={confirmandoZerar}
        titulo="Zerar o pedido?"
        rotuloConfirmar="Zerar pedido"
        aoConfirmar={limparPedido}
        aoCancelar={() => setConfirmandoZerar(false)}
      >
        As quantidades de{" "}
        <strong className="font-semibold text-neutral-900">
          {resumo.itens} {resumo.itens === 1 ? "produto" : "produtos"} ({resumo.unidades}{" "}
          {resumo.unidades === 1 ? "unidade" : "unidades"})
        </strong>{" "}
        voltam para zero. A tabela importada continua aqui.
      </ConfirmarDialogo>

      <ConfirmarDialogo
        aberto={arquivoPendente !== null}
        titulo="Importar outra tabela?"
        rotuloConfirmar="Importar e apagar"
        aoConfirmar={() => arquivoPendente && importar(arquivoPendente)}
        aoCancelar={() => setArquivoPendente(null)}
      >
        Abrir <strong className="break-all font-semibold text-neutral-900">{arquivoPendente?.name}</strong> apaga as
        quantidades de{" "}
        <strong className="font-semibold text-neutral-900">
          {resumo.itens} {resumo.itens === 1 ? "produto" : "produtos"} ({resumo.unidades}{" "}
          {resumo.unidades === 1 ? "unidade" : "unidades"})
        </strong>{" "}
        do pedido atual. Se ainda precisa delas, exporte o pedido antes.
      </ConfirmarDialogo>

      <div className="flex min-w-0 flex-col">
        {/* Topo (celular e tablet) */}
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-neutral-200 bg-white px-4 py-3 sm:px-6 lg:hidden">
          <Marca />
          {tabela && (
            <button
              type="button"
              onClick={abrirSeletor}
              className={`${foco} ml-auto whitespace-nowrap rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50`}
            >
              Importar<span className="hidden sm:inline"> tabela</span>
            </button>
          )}
        </header>

        {erro && (
          <div className="px-4 pt-4 sm:px-6 lg:px-8 lg:pt-6">
            <div
              role="alert"
              className="mx-auto flex max-w-[88rem] items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
            >
              <span>{erro}</span>
              <button
                onClick={() => setErro(null)}
                className={`${foco} -m-1 rounded p-1 text-red-700 hover:bg-red-100`}
                aria-label="Fechar aviso"
              >
                <IconeFechar />
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
                arrastando ? "border-x3 bg-x3-suave" : "border-neutral-300 bg-white"
              }`}
            >
              <div className="mb-5 grid h-14 w-14 place-items-center rounded-xl bg-x3-suave text-x3-texto">
                <IconePlanilha tamanho={28} />
              </div>
              <h1 className="tipo-display text-balance text-2xl text-tinta">Importe a tabela de reposição</h1>
              <p className="mt-2 max-w-sm text-pretty text-sm text-neutral-600">
                Escolha a planilha (.xls ou .xlsx) ou arraste ela aqui. Depois é só preencher as quantidades e exportar o
                pedido no mesmo formato.
              </p>
              <button
                type="button"
                onClick={abrirSeletor}
                className={`${foco} mt-7 rounded-xl bg-x3 px-6 py-3 text-base font-semibold text-tinta shadow-[0_1px_2px_rgba(17,17,17,0.18)] hover:bg-x3-escuro`}
              >
                Importar tabela
              </button>
            </div>
          </main>
        ) : (
          <main className="w-full flex-1 px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-10 lg:pt-8">
            <div className="mx-auto max-w-[88rem]">
              {/* Cabeçalho da página */}
              <div>
                <h1 className="tipo-display truncate text-2xl text-tinta sm:text-[2rem]">
                  {tabela.nomeArquivo}
                </h1>
                <p className="mt-1 text-sm text-neutral-500">
                  Aba {tabela.nomeAba} · importada {importadaEm}
                </p>
              </div>

              {/* Números do pedido */}
              <dl className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-4">
                <Numero
                  rotulo="Na tabela"
                  valor={String(tabela.produtos.length)}
                  detalhe={semEstoque ? `${semEstoque} sem estoque` : "produtos"}
                />
                <Numero
                  rotulo="No pedido"
                  valor={String(resumo.itens)}
                  detalhe={`${resumo.unidades} ${resumo.unidades === 1 ? "unidade" : "unidades"}`}
                  ativo={resumo.itens > 0}
                />
                <Numero
                  rotulo="Total no varejo"
                  valor={formatarReais(resumo.valor)}
                  detalhe="quantidade × R$ varejo"
                  className="hidden sm:block"
                />
              </dl>

              {/* Produtos */}
              <section
                aria-labelledby="titulo-produtos"
                className="mt-6 rounded-2xl border border-neutral-200 bg-white shadow-[0_1px_3px_rgba(17,17,17,0.05)] sm:mt-8"
              >
                <div className="space-y-4 p-4 sm:p-5">
                  <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
                    <div>
                      <h2 id="titulo-produtos" className="text-lg font-bold leading-snug text-tinta">
                        Produtos
                      </h2>
                      <p className="mt-0.5 text-sm text-neutral-500" aria-live="polite">
                        Mostrando {visiveis.length} de {tabela.produtos.length}
                      </p>
                    </div>
                    <div role="group" aria-label="Quais produtos mostrar" className="inline-flex rounded-xl bg-neutral-100 p-1">
                      <Aba ativo={!soSelecionados} aoClicar={() => setSoSelecionados(false)}>
                        Todos
                      </Aba>
                      <Aba ativo={soSelecionados} aoClicar={() => setSoSelecionados(true)}>
                        No pedido <span className="tabular-nums text-neutral-500">{resumo.itens}</span>
                      </Aba>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <div className="relative min-w-[14rem] flex-1">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500">
                        <IconeBusca />
                      </span>
                      <input
                        type="search"
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                        placeholder="Buscar por nome, sabor, ID ou marca…"
                        aria-label="Buscar produto"
                        className="h-10 w-full rounded-xl border border-neutral-300 bg-white pl-9 pr-10 text-sm outline-none placeholder:text-neutral-500 focus:border-x3-texto focus:ring-2 focus:ring-x3/30 [&::-webkit-search-cancel-button]:appearance-none"
                      />
                      {busca && (
                        <button
                          type="button"
                          onClick={() => setBusca("")}
                          aria-label="Limpar busca"
                          className={`${foco} absolute right-1.5 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800`}
                        >
                          <IconeFechar />
                        </button>
                      )}
                    </div>
                    <select
                      value={marca}
                      onChange={(e) => setMarca(e.target.value)}
                      aria-label="Filtrar por marca"
                      className="h-10 min-w-[11rem] rounded-xl border border-neutral-300 bg-white px-3 text-sm outline-none focus:border-x3-texto focus:ring-2 focus:ring-x3/30"
                    >
                      <option value="">Todas as marcas ({marcas.length})</option>
                      {marcas.map(([m, n]) => (
                        <option key={m} value={m}>
                          {m} ({n})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="mr-1 text-xs font-medium text-neutral-500">Tipo</span>
                    {TIPOS.filter((t) => contagemTipos[t]).map((t) => {
                      const ativo = tipos.includes(t);
                      return (
                        <button
                          key={t}
                          type="button"
                          aria-pressed={ativo}
                          onClick={() => setTipos((a) => (ativo ? a.filter((x) => x !== t) : [...a, t]))}
                          className={`${foco} rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                            ativo
                              ? "border-tinta bg-tinta text-white"
                              : "border-neutral-300 bg-white text-neutral-700 hover:border-neutral-400"
                          }`}
                        >
                          {t} <span className={ativo ? "text-x3" : "text-neutral-500"}>{contagemTipos[t]}</span>
                        </button>
                      );
                    })}
                    {filtrosAtivos ? (
                      <button
                        type="button"
                        onClick={limparFiltros}
                        className={`${foco} ml-auto rounded text-xs font-medium text-x3-texto underline-offset-4 hover:underline`}
                      >
                        Limpar filtros
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="overflow-x-auto border-t border-neutral-200 lg:overflow-visible">
                  {visiveis.length > 0 && (
                    <table className="w-full min-w-[600px] border-collapse xl:min-w-[760px]">
                      <thead className="text-left text-xs font-medium text-neutral-500 [&_th]:bg-neutral-50 lg:[&_th]:sticky lg:[&_th]:top-0 lg:[&_th]:z-10 lg:[&_th]:shadow-[inset_0_-1px_0_var(--color-neutral-200)]">
                        <tr className="border-b border-neutral-200">
                          <Cabecalho titulo="ID" campo="original" ordem={ordem} aoClicar={alternarOrdem} primeira />
                          <Cabecalho titulo="Produto" campo="nome" ordem={ordem} aoClicar={alternarOrdem} />
                          <Cabecalho titulo="Marca" campo="fabricante" ordem={ordem} aoClicar={alternarOrdem} className="hidden xl:table-cell" />
                          <Cabecalho titulo="Estoque" campo="estoque" ordem={ordem} aoClicar={alternarOrdem} direita />
                          <Cabecalho titulo="R$ Varejo" campo="preco" ordem={ordem} aoClicar={alternarOrdem} direita />
                          <th className="px-3 py-2.5 pr-4 text-right sm:pr-5">Pedir</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visiveis.map((p) => (
                          <LinhaProduto key={p.chave} produto={p} quantidade={qtds[p.chave] ?? 0} aoMudar={mudarQuantidade} />
                        ))}
                      </tbody>
                    </table>
                  )}
                  {visiveis.length === 0 && (
                    <div className="flex flex-col items-center gap-3 px-4 py-14 text-center text-sm text-neutral-600">
                      {soSelecionados && resumo.itens === 0 ? (
                        <>
                          <p>Nenhum produto com quantidade ainda.</p>
                          <button
                            type="button"
                            onClick={() => setSoSelecionados(false)}
                            className={`${foco} rounded-lg border border-neutral-300 bg-white px-3 py-2 font-medium text-neutral-800 hover:bg-neutral-50`}
                          >
                            Ver todos os produtos
                          </button>
                        </>
                      ) : (
                        <>
                          <p>Nenhum produto encontrado com esses filtros.</p>
                          <button
                            type="button"
                            onClick={limparFiltros}
                            className={`${foco} rounded-lg border border-neutral-300 bg-white px-3 py-2 font-medium text-neutral-800 hover:bg-neutral-50`}
                          >
                            Limpar filtros
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </section>
            </div>
          </main>
        )}

        {/* Barra do pedido (celular e tablet): exportar sempre à mão */}
        {tabela && (
          <footer className="fixed inset-x-0 bottom-0 z-20 border-t border-neutral-200 bg-white lg:hidden">
            <div className="flex items-center gap-2 px-4 py-3 sm:px-6">
              <div className="mr-auto min-w-0">
                <div className="text-xs text-neutral-500">Total no varejo</div>
                <div className="whitespace-nowrap text-base font-semibold tabular-nums text-neutral-900">
                  {formatarReais(resumo.valor)}
                </div>
              </div>
              {resumo.itens > 0 && (
                <button
                  type="button"
                  onClick={() => setConfirmandoZerar(true)}

                  className={`${foco} rounded-xl px-3 py-2.5 text-sm font-medium text-red-700 hover:bg-red-50`}
                >
                  Zerar
                </button>
              )}
              {botaoExportar("")}
            </div>
          </footer>
        )}
      </div>

      {/* Lateral direita (desktop): vem depois do conteúdo no HTML, então o Tab passa pelos produtos antes do Exportar */}
      <aside className="sticky top-0 hidden h-screen flex-col border-l border-neutral-200 bg-white px-4 py-5 lg:flex">
        <Marca />

        {tabela && (
          <>
            <div className="mt-8 space-y-2">
              {botaoExportar("w-full")}
              <p className="px-1 text-center text-xs tabular-nums text-neutral-500">
                {resumo.itens
                  ? `${resumo.unidades} ${resumo.unidades === 1 ? "unidade" : "unidades"} · ${formatarReais(resumo.valor)}`
                  : "Preencha a coluna Pedir para exportar"}
              </p>
              {resumo.itens > 0 && (
                <button
                  type="button"
                  onClick={() => setConfirmandoZerar(true)}
                  className={`${foco} w-full rounded-xl px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50`}
                >
                  Zerar pedido
                </button>
              )}
            </div>

            <div className="mt-auto rounded-xl bg-neutral-50 p-3">
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 text-x3-texto">
                  <IconePlanilha tamanho={18} />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-neutral-800" title={tabela.nomeArquivo}>
                    {tabela.nomeArquivo}
                  </p>
                  <p className="mt-0.5 text-xs text-neutral-500">Importada {importadaEm}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={abrirSeletor}
                className={`${foco} mt-3 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100`}
              >
                Importar outra tabela
              </button>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}

/** Anel de foco do teclado, igual em todos os botões */
const foco = "outline-none focus-visible:ring-2 focus-visible:ring-x3-texto focus-visible:ring-offset-2";

function Marca() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-tinta text-x3">
        <IconePlanilha tamanho={18} />
      </span>
      <span className="leading-tight">
        <span className="tipo-display block whitespace-nowrap text-[1.0625rem] uppercase text-tinta">Pedido de Reposição</span>
        <span className="block text-xs font-medium text-neutral-500">X3 Suplementos</span>
      </span>
    </div>
  );
}

function Aba({ ativo, aoClicar, children }: { ativo: boolean; aoClicar: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={ativo}
      onClick={aoClicar}
      className={`${foco} rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
        ativo ? "bg-white text-neutral-900 shadow-[0_1px_2px_rgba(17,17,17,0.12)]" : "text-neutral-600 hover:text-neutral-900"
      }`}
    >
      {children}
    </button>
  );
}

function Cabecalho({
  titulo,
  campo,
  ordem,
  aoClicar,
  direita,
  primeira,
  className = "",
}: {
  titulo: string;
  campo: CampoOrdem;
  ordem: { campo: CampoOrdem; asc: boolean };
  aoClicar: (c: CampoOrdem) => void;
  direita?: boolean;
  primeira?: boolean;
  className?: string;
}) {
  const ativo = ordem.campo === campo;
  return (
    <th
      aria-sort={ativo ? (ordem.asc ? "ascending" : "descending") : undefined}
      className={`px-3 py-2.5 ${primeira ? "pl-4 sm:pl-5" : ""} ${direita ? "text-right" : ""} ${className}`}
    >
      <button
        type="button"
        onClick={() => aoClicar(campo)}
        className={`${foco} inline-flex items-center gap-1 whitespace-nowrap rounded hover:text-neutral-900 ${ativo ? "text-neutral-900" : ""}`}
      >
        {titulo}
        <span className={ativo ? "opacity-100" : "opacity-0"}>
          <IconeSeta paraCima={ordem.asc} />
        </span>
      </button>
    </th>
  );
}

function Numero({
  rotulo,
  valor,
  detalhe,
  ativo,
  className = "",
}: {
  rotulo: string;
  valor: string;
  detalhe: string;
  ativo?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`${className} min-w-0 rounded-2xl border p-3 sm:p-5 ${
        ativo ? "border-x3-borda bg-x3-suave" : "border-neutral-200 bg-white shadow-[0_1px_3px_rgba(17,17,17,0.05)]"
      }`}
    >
      <dt className="truncate text-xs font-medium text-neutral-500 sm:text-sm">{rotulo}</dt>
      <dd className="tipo-display mt-1 truncate text-2xl tabular-nums text-tinta sm:mt-2 sm:text-[1.75rem]">
        {valor}
      </dd>
      <dd className={`mt-0.5 hidden truncate text-xs sm:block ${ativo ? "text-x3-texto" : "text-neutral-500"}`}>{detalhe}</dd>
    </div>
  );
}

/* Ícones (traço 1.8, mesmo desenho em todo o app) */

function Icone({ tamanho = 16, children }: { tamanho?: number; children: React.ReactNode }) {
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

function IconePlanilha({ tamanho }: { tamanho?: number }) {
  return (
    <Icone tamanho={tamanho}>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </Icone>
  );
}

function IconeBusca() {
  return (
    <Icone>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </Icone>
  );
}

function IconeBaixar() {
  return (
    <Icone>
      <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
    </Icone>
  );
}

function IconeFechar() {
  return (
    <Icone>
      <path d="M6 6l12 12M18 6 6 18" />
    </Icone>
  );
}

function IconeSeta({ paraCima }: { paraCima: boolean }) {
  return (
    <Icone tamanho={12}>
      <path d={paraCima ? "M12 19V5M6 11l6-6 6 6" : "M12 5v14M6 13l6 6 6-6"} />
    </Icone>
  );
}
