# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Funcionário de uma unidade de uma rede de lojas de suplementos (7 unidades da mesma rede), responsável por montar e mandar o pedido de reposição da sua loja ao distribuidor. Não é um especialista em planilhas nem em sistemas: a tarefa é recorrente e operacional, e o objetivo é terminar o pedido rápido e sem erro.

## Product Purpose

"Pedido de Reposição": importa a tabela de reposição que o distribuidor manda (.xls/.xlsx), deixa o funcionário encontrar os produtos e preencher a quantidade a pedir, e exporta a mesma planilha, no mesmo formato da original, só com os produtos selecionados e a coluna PEDIR preenchida, pronta pra devolver ao distribuidor.

Sucesso: o pedido sai completo, com as quantidades certas, num arquivo que o distribuidor reconhece e aceita sem retrabalho, em menos tempo do que editar a planilha à mão.

## Positioning

Não substitui a planilha do distribuidor: trabalha em cima dela. Lê qualquer variação de cabeçalho (ID, PRODUTO, ESTOQUE, FABRICANTE/MARCA, PEDIR/QTD, R$) e devolve o arquivo com a mesma aba, colunas, larguras, cores e formatação. O formato de troca com o distribuidor continua o mesmo; o que muda é a experiência de preencher.

## Operating Context

- Ciclo: distribuidor envia a tabela → funcionário importa no site → filtra, pesquisa e preenche quantidades → exporta o .xlsx → devolve ao distribuidor.
- Tabelas longas de suplementos (whey, creatina, pré-treino, aminoácidos, barras, vitaminas, termogênicos, bebidas, acessórios), com nomes no padrão "PRODUTO - MARCA SABOR".
- O pedido fica salvo no navegador (localStorage); recarregar a página não perde o trabalho.
- Dispositivo de uso ainda não confirmado (computador da loja é o cenário provável).

## Capabilities and Constraints

- Next.js 16 + TypeScript + Tailwind; sem backend e sem banco: leitura e geração da planilha acontecem no navegador. Deploy estático na Vercel.
- Importação: primeira aba, detecção automática da linha de cabeçalho e do papel de cada coluna; cria coluna PEDIR se não existir; colunas desconhecidas são mantidas.
- Filtros: busca por nome, sabor, ID ou marca (sem acento/maiúscula), filtro por marca, por tipo de produto (palavra-chave em `src/lib/categorias.ts`) e "só selecionados"; ordenação por coluna.
- Exportação sempre em `.xlsx` (gerar `.xls` formatado no navegador não é viável), preservando cabeçalho verde, PEDIR amarelo, Verdana 8 e formato R$ da original.
- Produtos sem palavra-chave reconhecida caem em "Outros".
- Interface em pt-BR.
- Em aberto (próximos passos, ainda não decididos): banco de dados com histórico de pedidos e pedido compartilhado entre pessoas, login por loja/funcionário (relevante pelas 7 unidades), sugestão de quantidade pelo estoque mínimo.

## Brand Commitments

- A rede é a **X3 Suplementos**. Nome do produto: "Pedido de Reposição".
- Logo de referência em `reference/logo.png` (preto, branco e verde-limão ~#8CC63F). **Não colocar a logo no site**; usá-la só como referência para o site ser reconhecido como da X3.
- Preferência confirmada: interface verde e branca, com cor só no essencial (ação, seleção, alerta).

## Evidence on Hand

Logo da X3 em `reference/logo.png` (só referência, não vai no site) e o print de referência de layout `reference/erp1.png`. Sem planilhas de exemplo nem depoimentos. Não inventar nomes de lojas, distribuidores, números de uso ou dados de clientes.

## Product Principles

1. O arquivo do distribuidor é sagrado: a exportação precisa sair idêntica em formato à original.
2. Velocidade e certeza na tarefa: achar o produto, digitar a quantidade e conferir o que foi pedido, sem ambiguidade.
3. Nunca perder trabalho: o pedido em andamento sobrevive a recarregar, fechar ou errar a importação.
4. Tolerante com planilhas reais: cabeçalhos variados, colunas extras e nomes inconsistentes são o caso normal, não exceção.
5. Feito pra quem não é técnico: linguagem simples em português, sem jargão de sistema.
