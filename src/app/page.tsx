"use client";

import dynamic from "next/dynamic";

// Roda só no navegador: a planilha é lida e gerada aqui mesmo, sem servidor.
const PedidoApp = dynamic(() => import("@/components/PedidoApp"), { ssr: false });

export default function Home() {
  return <PedidoApp />;
}
