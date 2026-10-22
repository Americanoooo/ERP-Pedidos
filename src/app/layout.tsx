import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pedido de Reposição",
  description: "Importa a tabela de reposição, seleciona produtos e exporta o pedido preenchido.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
