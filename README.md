# Pedido de Reposição

Site que importa a tabela de reposição (.xls/.xlsx), deixa filtrar, pesquisar e preencher a quantidade de cada produto, e exporta uma planilha **no mesmo formato da original**, só com os produtos selecionados e a coluna PEDIR preenchida.

Next.js 16 + TypeScript + Tailwind. Sem banco de dados e sem backend: a planilha é lida e gerada no próprio navegador.

## Rodar

```bash
npm install
npm run dev
```

Abre em http://localhost:3000.

Pra colocar no ar, sobe o repositório na Vercel: é um site estático, não precisa configurar nada.

## Como funciona

1. **Importar tabela**: lê a primeira aba da planilha, acha a linha de cabeçalho e descobre sozinho qual coluna é ID, PRODUTO, ESTOQUE, FABRICANTE, PEDIR e R$ (aceita nomes parecidos, como MARCA, QTD, DESCRIÇÃO). Se não houver coluna de quantidade, cria uma PEDIR.
2. **Filtrar**: busca por nome, sabor, ID ou marca (ignora acento e maiúscula), filtro por marca, por tipo de produto e "só selecionados". Clicar no título da coluna ordena.
3. **Exportar**: gera um `.xlsx` com a mesma aba, colunas, larguras, cores (cabeçalho verde, PEDIR amarelo), fonte Verdana 8 e formato R$ da original.

A tabela e as quantidades ficam salvas no navegador (localStorage), então dar F5 não perde o pedido.

## Onde mexer

| Arquivo | O que faz |
|---|---|
| `src/lib/importar.ts` | Lê a planilha e detecta as colunas |
| `src/lib/exportar.ts` | Monta a planilha do pedido (fonte e bordas ficam fixas aqui) |
| `src/lib/categorias.ts` | Palavras-chave do filtro por tipo (Whey, Creatina, Pré-treino…) |
| `src/lib/salvar.ts` | Salva no navegador; é aqui que entra o banco depois |
| `src/components/PedidoApp.tsx` | Tela principal |

## Observações

- A exportação sai em `.xlsx` (formato atual do Excel). Gerar `.xls` antigo com cor e formatação não é viável no navegador.
- O filtro por tipo é por palavra-chave no nome. Produtos com nome de marca (ex.: "VIKING VALHALLA") caem em **Outros** até alguém adicionar a palavra em `categorias.ts`.

## Próximos passos (se o projeto for aprovado)

- Banco de dados pra guardar o histórico de pedidos e permitir que mais de uma pessoa monte o mesmo pedido
- Login por loja/funcionário
- Sugestão de quantidade com base no estoque mínimo
