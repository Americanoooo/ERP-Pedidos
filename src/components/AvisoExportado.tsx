"use client";

import { useEffect, useState } from "react";

export interface Exportado {
  /** Muda a cada exportação, pra animação recomeçar mesmo exportando duas vezes seguidas */
  id: number;
  arquivo: string;
  itens: number;
  unidades: number;
}

interface Props {
  aviso: Exportado | null;
  aoFechar: () => void;
}

const DURACAO = 5000;
const SAIDA = 200;

/** Aviso de "pedido exportado" que sobe do rodapé, desenha o check e some sozinho. */
export default function AvisoExportado({ aviso, aoFechar }: Props) {
  // Guarda qual aviso está saindo: um aviso novo (outro id) já começa visível
  const [saindoId, setSaindoId] = useState<number | null>(null);
  const saindo = aviso !== null && saindoId === aviso.id;

  useEffect(() => {
    if (!aviso) return;
    const t1 = setTimeout(() => setSaindoId(aviso.id), DURACAO);
    const t2 = setTimeout(aoFechar, DURACAO + SAIDA);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [aviso, aoFechar]);

  function fechar() {
    if (aviso) setSaindoId(aviso.id);
    setTimeout(aoFechar, SAIDA);
  }

  return (
    // Fica sempre no HTML para o leitor de tela anunciar quando o texto aparece
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-24 z-30 flex justify-center px-4 lg:bottom-8 lg:right-[15.5rem]"
    >
      {aviso && (
        <div
          key={aviso.id}
          className={`aviso pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl bg-tinta py-3 pl-3 pr-2 text-white shadow-[0_16px_40px_-12px_rgba(17,17,17,0.45)] ${
            saindo ? "aviso-sai" : "aviso-entra"
          }`}
        >
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden className="shrink-0">
            <circle className="aviso-circulo" cx="18" cy="18" r="16" fill="var(--color-x3)" />
            <path
              className="aviso-check"
              d="M11 18.5l4.5 4.5L25 13.5"
              stroke="var(--color-tinta)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              pathLength={1}
            />
          </svg>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">
              Pedido exportado{" "}
              <span className="font-normal text-neutral-300">
                · {aviso.itens} {aviso.itens === 1 ? "produto" : "produtos"}, {aviso.unidades}{" "}
                {aviso.unidades === 1 ? "unidade" : "unidades"}
              </span>
            </p>
            <p className="truncate text-xs text-neutral-300" title={aviso.arquivo}>
              Salvo em Downloads: {aviso.arquivo}
            </p>
          </div>
          <button
            type="button"
            onClick={fechar}
            aria-label="Fechar aviso"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-neutral-300 outline-none hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-x3"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
