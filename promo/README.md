# Imagens de divulgação

`images/` tem as imagens prontas, cada uma em duas versões:

- vertical: 1080×1920
- horizontal: 1800×1200

| # | Imagem | Mostra |
|---|---|---|
| 1 | `explorer` | O explorador com um ícone automático por tipo, colorido por tipo |
| 2 | `icons` | O menu do botão direito e a janela "Change icon" |
| 3 | `uploads` | Imagens próprias virando ícones (aba "Your icons") |
| 4 | `style` | A janela "Edit style" e o estilo passando da pasta para o que tem dentro |

O explorador, o menu e as janelas não são desenhos: as páginas usam o `styles.css` e o código do próprio plugin (`src/explorer.ts`, `src/css.ts`, `src/icon-picker.ts`, `src/style-modal.ts` e os itens do menu em `src/main.ts`). Por isso, depois de mudar o plugin, basta gerar de novo.

## Gerar de novo

Precisa das fontes Inter, Inter Display e JetBrains Mono instaladas e do Playwright com o Chromium:

```sh
npm install
npm install --no-save playwright
npx playwright install chromium
node promo/build.mjs          # todas as imagens
node promo/build.mjs icons    # só uma
```

## Arquivos

- `slides.js`: o conteúdo e o layout de cada imagem (árvore de pastas, estilos de cada item, textos). É aqui que se mudam textos e exemplos.
- `slides.css`: o visual das imagens (fundo, títulos, card roxo).
- `obsidian.css`: as cores e o CSS base do tema escuro do Obsidian (explorador, janelas, botões, menu).
- `harness.ts`: monta o explorador, o menu e as janelas reais do plugin dentro da página e cria os ícones enviados fictícios da imagem 3.
- `obsidian-stub.ts`: substitutos mínimos da API do Obsidian (ícones, `Modal`, `Setting`, `Menu`).
- `build.mjs`: junta os ícones do Lucide (pacote `lucide-static`, o mesmo conjunto do Obsidian), compila o `harness.ts` e tira as fotos com o Playwright.
