"use client";

import { useEffect, useRef } from "react";

interface Props {
  aberto: boolean;
  titulo: string;
  children: React.ReactNode;
  /** Texto do botão que confirma, ex: "Zerar pedido" */
  rotuloConfirmar: string;
  aoConfirmar: () => void;
  aoCancelar: () => void;
}

/**
 * Card de confirmação no centro da tela, no lugar do confirm() do navegador.
 * Usa o <dialog> nativo: Esc fecha, o foco fica preso dentro e o fundo escurece.
 */
export default function ConfirmarDialogo({ aberto, titulo, children, rotuloConfirmar, aoConfirmar, aoCancelar }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const cancelar = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (aberto && !d.open) {
      d.showModal();
      // Começa no botão seguro: Enter sem querer não apaga nada
      cancelar.current?.focus();
    } else if (!aberto && d.open) {
      d.close();
    }
  }, [aberto]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="dialogo-titulo"
      aria-describedby="dialogo-texto"
      onCancel={(e) => {
        e.preventDefault();
        aoCancelar();
      }}
      onClick={(e) => {
        // Clique no fundo escuro (fora do card) também cancela
        if (e.target === e.currentTarget) aoCancelar();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl border border-stone-200 bg-white p-0 text-stone-900 shadow-[0_12px_32px_-8px_rgba(28,31,26,0.28)] transition-[opacity,translate,scale] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] backdrop:bg-stone-900/45 backdrop:transition-opacity backdrop:duration-200 starting:open:translate-y-1.5 starting:open:scale-[0.98] starting:open:opacity-0 starting:open:backdrop:opacity-0 motion-reduce:transition-none motion-reduce:backdrop:transition-none"
    >
      <div className="p-6">
        <h2 id="dialogo-titulo" className="text-lg font-semibold tracking-tight">
          {titulo}
        </h2>
        <div id="dialogo-texto" className="mt-2 text-sm leading-relaxed text-stone-600">
          {children}
        </div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            ref={cancelar}
            type="button"
            onClick={aoCancelar}
            className="rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-stone-700 outline-none hover:bg-stone-50 focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={aoConfirmar}
            className="rounded-xl bg-red-700 px-4 py-2.5 text-sm font-semibold text-white outline-none hover:bg-red-800 focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2"
          >
            {rotuloConfirmar}
          </button>
        </div>
      </div>
    </dialog>
  );
}
