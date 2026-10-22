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
        ativo ? "border-amber-400 bg-amber-50" : "border-stone-300 bg-white"
      }`}
    >
      <button
        type="button"
        onClick={() => aoMudar(Math.max(0, valor - 1))}
        disabled={!ativo}
        aria-label={`Diminuir ${rotulo}`}
        className="h-8 w-8 rounded-l-lg text-lg leading-none text-stone-500 hover:bg-stone-100 disabled:opacity-30 disabled:hover:bg-transparent"
      >
        −
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
        className={`h-8 w-12 bg-transparent text-center text-sm tabular-nums outline-none placeholder:text-stone-300 ${
          ativo ? "font-semibold text-stone-900" : "text-stone-600"
        }`}
      />
      <button
        type="button"
        onClick={() => aoMudar(valor + 1)}
        aria-label={`Aumentar ${rotulo}`}
        className="h-8 w-8 rounded-r-lg text-lg leading-none text-stone-500 hover:bg-stone-100"
      >
        +
      </button>
    </div>
  );
}
