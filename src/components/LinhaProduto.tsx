"use client";

import { memo } from "react";
import CampoQuantidade from "./CampoQuantidade";
import { formatarReais } from "@/lib/texto";
import type { Produto } from "@/lib/tipos";

interface Props {
  produto: Produto;
  quantidade: number;
  aoMudar: (chave: string, qtd: number) => void;
}

function LinhaProduto({ produto, quantidade, aoMudar }: Props) {
  const selecionado = quantidade > 0;
  const semEstoque = produto.estoque !== null && produto.estoque <= 0;

  return (
    <tr className={`border-b border-stone-100 ${selecionado ? "bg-amber-50/70" : "hover:bg-stone-50"}`}>
      <td className="px-3 py-2 text-xs tabular-nums text-stone-400">{produto.id}</td>
      <td className="px-3 py-2">
        <div className="text-sm font-medium text-stone-800">{produto.nome}</div>
      </td>
      <td className="px-3 py-2 text-xs font-medium uppercase tracking-wide text-stone-500">{produto.fabricante}</td>
      <td className="px-3 py-2 text-right text-sm tabular-nums">
        {produto.estoque === null ? (
          <span className="text-stone-300">—</span>
        ) : (
          <span className={semEstoque ? "font-semibold text-red-600" : "text-stone-700"}>{produto.estoque}</span>
        )}
      </td>
      <td className="px-3 py-2 text-right text-sm tabular-nums text-stone-700">
        {produto.preco === null ? <span className="text-stone-300">—</span> : formatarReais(produto.preco)}
      </td>
      <td className="px-3 py-2 text-right">
        <CampoQuantidade
          valor={quantidade}
          rotulo={`quantidade de ${produto.nome}`}
          aoMudar={(n) => aoMudar(produto.chave, n)}
        />
      </td>
    </tr>
  );
}

export default memo(LinhaProduto);
