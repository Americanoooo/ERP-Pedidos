import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import "./globals.css";

// Archivo variável com eixo de largura: normal para texto e tabela, condensada nos títulos e números
const archivo = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-archivo", display: "swap" });

export const metadata: Metadata = {
  title: "Pedido de Reposição",
  description: "Importa a tabela de reposição, seleciona produtos e exporta o pedido preenchido.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${archivo.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
