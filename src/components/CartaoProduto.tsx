"use client";

import { memo } from "react";
import CampoQuantidade from "./CampoQuantidade";
import { formatarReais, separarNome } from "@/lib/texto";
import type { Produto } from "@/lib/tipos";

interface Props {
  produto: Produto;
  quantidade: number;
  aoMudar: (chave: string, qtd: number) => void;
}

/** O produto no celular: no lugar da linha da tabela, que não cabe numa tela estreita. */
function CartaoProduto({ produto, quantidade, aoMudar }: Props) {
  const selecionado = quantidade > 0;
  const semEstoque = produto.estoque !== null && produto.estoque <= 0;
  const { base, resto } = separarNome(produto.nome);

  return (
    // Nome na largura toda; embaixo, preço e estoque à esquerda e o − / + à direita, ao alcance do polegar
    <li className={`border-b border-neutral-100 px-4 py-3 ${selecionado ? "bg-x3-suave" : ""}`}>
      <p className="text-[0.9375rem] leading-snug">
        <span className="font-semibold text-tinta">{base}</span>
        {resto && <span className="text-neutral-600"> - {resto}</span>}
      </p>
      <div className="mt-2 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[0.9375rem] font-semibold tabular-nums text-tinta">
            {produto.preco === null ? "R$ —" : formatarReais(produto.preco)}
          </p>
          <p className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-neutral-600">
            <span className="whitespace-nowrap">ID {produto.id}</span>
            {produto.estoque === null ? (
              <span className="whitespace-nowrap">Estoque —</span>
            ) : semEstoque ? (
              <span className="whitespace-nowrap font-semibold text-red-700">Sem estoque ({produto.estoque})</span>
            ) : (
              <span className="whitespace-nowrap">Estoque {produto.estoque}</span>
            )}
          </p>
        </div>
        <CampoQuantidade
          valor={quantidade}
          rotulo={`quantidade de ${produto.nome}`}
          aoMudar={(n) => aoMudar(produto.chave, n)}
        />
      </div>
    </li>
  );
}

export default memo(CartaoProduto);
