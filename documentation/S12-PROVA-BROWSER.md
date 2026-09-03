# S12 ★ — prova em browser real

**Data:** 03/09/2026
**Onde:** `https://arxisvr.avilaops.com/app` (aplicação **publicada**, não local)
**Como:** Playwright 1.62.1, Chromium, 1440x900
**Resultado: 9/9 passos.** O marco caiu.

---

## O que foi provado

O critério do marco é o fluxo inteiro, não a API:

```
/app → criar cenário → salvar câmera → trocar A/B → recarregar → estado volta
```

| # | Passo | Resultado |
|---|---|---|
| 1 | Modelo IFC renderiza (canvas na tela) | OK |
| 2 | Botão "Cenários" na toolbar | OK |
| 3 | Painel abre | OK |
| 4 | Cria cenário A | OK |
| 5 | A persistiu **com a câmera** | OK — `{x:16.673989, y:16.401837, z:23.023989}` |
| 6 | Cria cenário B (após orbitar a câmera) | OK |
| 7 | B guardou câmera **diferente** de A | OK — `{x:-1.649977, y:31.99154, z:4.699982}` |
| 8 | Cenários **sobrevivem ao reload** | OK |
| 9 | Trocar para A **reaplica** o cenário | OK — "Cenário "Cenario A" aplicado." |

O passo 7 é o que impede a prova de se enganar: se a câmera não fosse capturada
de verdade, A e B guardariam o mesmo valor e o teste passaria sem provar nada.

## As capturas

Em `documentation/provas/s12/`, na ordem em que o teste as tirou:

| Arquivo | O que mostra |
|---|---|
| `01-viewer.png` | O IFC aberto no `/app`, com o modelo já renderizado. |
| `02-painel.png` | O painel "Cenários" aberto pela toolbar, ainda vazio. |
| `03-cenario-a.png` | Cenário A criado, em perspectiva. |
| `04-cenario-b.png` | Cenário B criado **depois de orbitar**: a vista é de cima, e os dois cenários aparecem na lista. É a evidência visual de que A e B guardaram câmeras diferentes. |
| `05-apos-reload.png` | Depois do F5: os dois cenários continuam listados. |
| `06-troca-A.png` | Clicando em A: a tarja diz `Cenário "Cenario A" aplicado.` e a vista volta à perspectiva do 03. |

Comparar `04` com `06` é a prova em uma imagem: mesma tela, mesmo modelo, e a
câmera volta ao que estava salvo.

Modelo usado: `ac20-fzk-haus_ifc4.ifc` (2,5 MB, referência buildingSMART).

## O que a prova pegou, e o bundle não

Antes desta prova, as strings do S12 estavam **todas** no bundle publicado, e a
`/app` **não abria**: caía no error boundary com "Algo deu errado". Causa:
`carregarCenarios` era chamado nas linhas 133 e 148 e declarado na 152 —
`const` não sofre hoisting, então dava `ReferenceError` no primeiro render.
TypeScript não reclama (o uso está dentro de função async) e o build passa.

É a demonstração do critério do ROADMAP: **entrar no bundle é necessário, não
suficiente.** Corrigido em `d065313`+1 e reprovado.

## Duas coisas que o teste ensinou sobre a tela

1. **O modelo não vem selecionado.** Ele aparece listado em "Modelos IFC", mas o
   `ViewerCanvas` só monta a cena depois do clique. A primeira versão do teste
   esperava 20s por um canvas que nunca viria.
2. **Deploy de site precisa de `--force-recreate`.** Trocar o `dist` embaixo de
   um container que já está de pé dá 404: ele mantém a referência antiga do bind
   mount. Aconteceu duas vezes.

## Dados de teste

Criados e **apagados** ao fim: tenant `u-s12-prova-389f8ade`, usuário
`s12-prova@arxisvr.test`, 1 projeto, 1 modelo, 2 cenários. Conferido depois da
limpeza: 1 usuário, 3 tenants, 0 projetos, 0 cenários — o mesmo estado de antes.

## Reproduzir

O roteiro está em `scratchpad/s12/prova.mjs` (não versionado, por conter
credencial de teste). Para refazer: criar conta pela API, marcar
`email_verified = true` no banco (a API exige verificação e não há caixa de
e-mail para `@arxisvr.test`), criar projeto, subir um IFC com o campo
`discipline`, e rodar o script.
