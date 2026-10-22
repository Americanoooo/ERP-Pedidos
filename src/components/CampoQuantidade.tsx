"use client";

interface Props {
  valor: number;
  aoMudar: (novo: number) => void;
  rotulo: string;
}

/** Botões − e + com campo no meio. Aceita digitar direto. */
export default function CampoQuantidade({ valor, aoMudar, rotulo }: Props) {
  const ativo = valor > 0;
  return (
    <div
      className={`inline-flex items-center rounded-lg border transition-colors ${
        ativo ? "border-x3-texto bg-white" : "border-neutral-300 bg-white"
      }`}
    >
      <button
        type="button"
        onClick={() => aoMudar(Math.max(0, valor - 1))}
        disabled={!ativo}
        aria-label={`Diminuir ${rotulo}`}
        className="grid h-8 w-8 place-items-center rounded-l-lg pointer-coarse:h-11 pointer-coarse:w-11 text-neutral-600 hover:bg-neutral-100 disabled:opacity-30 disabled:hover:bg-transparent"
      >
        <Sinal />
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        value={ativo ? valor : ""}
        placeholder="0"
        aria-label={rotulo}
        onFocus={(e) => e.target.select()}
        onChange={(e) => {
          const n = parseInt(e.target.value, 10);
          aoMudar(Number.isFinite(n) && n > 0 ? n : 0);
        }}
        className={`h-8 w-12 bg-transparent text-center text-sm tabular-nums pointer-coarse:h-11 pointer-coarse:w-14 pointer-coarse:text-base outline-none placeholder:text-neutral-300 ${
          ativo ? "font-semibold text-neutral-900" : "text-neutral-600"
        }`}
      />
      <button
        type="button"
        onClick={() => aoMudar(valor + 1)}
        aria-label={`Aumentar ${rotulo}`}
        className="grid h-8 w-8 place-items-center rounded-r-lg pointer-coarse:h-11 pointer-coarse:w-11 text-neutral-600 hover:bg-neutral-100"
      >
        <Sinal mais />
      </button>
    </div>
  );
}

function Sinal({ mais }: { mais?: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d={mais ? "M5 12h14M12 5v14" : "M5 12h14"} />
    </svg>
  );
}
