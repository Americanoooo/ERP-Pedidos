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
  const [base, ...partes] = produto.nome.split(" - ");
  const resto = partes.join(" - ");

  return (
    <tr className={`border-b border-neutral-100 ${selecionado ? "bg-x3-suave" : "hover:bg-neutral-50"}`}>
      <td className="px-3 py-2 pl-4 text-xs tabular-nums text-neutral-500 sm:pl-5">{produto.id}</td>
      <td className="px-3 py-2">
        {/* O produto em si em destaque; marca e sabor (depois do " - ") ficam em segundo plano */}
        <div className="text-sm">
          <span className="font-semibold text-tinta">{base}</span>
          {resto && <span className="text-neutral-600"> - {resto}</span>}
        </div>
      </td>
      <td className="hidden px-3 py-2 text-xs font-medium uppercase tracking-wide text-neutral-500 xl:table-cell">{produto.fabricante}</td>
      <td className="px-3 py-2 text-right text-sm tabular-nums">
        {produto.estoque === null ? (
          <span className="text-neutral-400">—</span>
        ) : (
          <span className={semEstoque ? "font-semibold text-red-600" : "text-neutral-700"}>{produto.estoque}</span>
        )}
      </td>
      <td className="px-3 py-2 text-right text-sm tabular-nums text-neutral-700">
        {produto.preco === null ? <span className="text-neutral-400">—</span> : formatarReais(produto.preco)}
      </td>
      <td className="px-3 py-2 pr-4 text-right sm:pr-5">
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
