# S26 • prova em produção

**Data:** 14/11/2026 • resultado final às 19h20 UTC.
**Ambiente:** `https://app.arxisbim.com.br` • API em `apps-noclient` • banco no
PostgreSQL do `applications`, pela rede privada.
**Resultado:** marco funcional S26 atingido. S12 e S18 revalidados na mesma execução.

## Identidade e dados da prova

O navegador entrou pelo Auth oficial, concluiu OIDC e chegou ao dashboard com
uma conta sintética CLIENT no Auth, mapeada para `role=user` no app. Não houve
injeção de JWT no navegador. A conta não tem privilégios administrativos.

Foi criado pela interface o projeto `Aceite S26 • 2026-11-14`, seguido de upload
da fixture `backend/tests/fixtures/ifc/ac20-fzk-haus_ifc4.ifc`. O projeto da prova
é `7f8ff7f8-b16f-4e6c-94ea-b4adbe687daf`; os dados sintéticos foram preservados
para reprodução. Credenciais e estado autenticado ficam fora do repositório.

## O que passou

| Prova | Evidência |
|---|---|
| S12 • dois cenários com câmera e visibilidade diferentes | Alternativas A e B criadas e salvas na tela; B oculta Janelas. |
| S12 • persistência e reaplicação após reload | Câmeras e metadados relidos iguais ao que foi salvo; troca A/B altera 50,60% dos pixels do canvas. |
| S18 • comparação visual | Split com dois canvas, legenda de diferença por categoria e bloqueio de A contra A. |
| S18 • sincronização real | Arrastar A altera B quando sincronizado; B permanece estável com o vínculo solto. |
| S18 • exportação | PNG da comparação baixado pelo botão da tela. |
| S26 • entrada de dados | Dois cronogramas criados na interface, cada um com Paredes e Pisos vinculados às respectivas categorias IFC. |
| S26 • propagação | Pisos depende de Paredes. Alterar o fim das paredes de B para 20/12 empurra sua atividade sucessora pelo CPM. |
| S26 • diferença de prazo | A conclui em 14/12/2026; B em 24/12/2026; tela e API mostram dez dias a mais em B. |
| S26 • efeito visual por data | Em 15/12, A já concluiu suas atividades e B mantém as paredes em obra. Avançar de 01/12 a 15/12 altera 27,43% dos pixels de A e 0% de B. |
| S26 • reload | Par A/B, modo 4D, data, diferença de prazo e imagens dos dois canvas se mantêm. |
| S26 • reprodução | Reprodução avança até o fim e para sem reiniciar. |
| S26 • celular | Comparação reaberta em 390 × 844, sem rolagem horizontal, com os dois modelos, comandos, prazo e régua visíveis. |

O resultado final registrou zero erros JavaScript e zero respostas HTTP de erro
observadas no fluxo temporal. Medição por pixels comprova mudança visual; não é
benchmark de desempenho nem validação de grandes modelos.

## Defeito encontrado e corrigido

O seletor de velocidade herdava `width: 100%` da regra global dos formulários,
consumia a largura da barra e comprimia a régua até ela ficar inutilizável.
No celular, o painel de prazo também cobria os comandos superiores.

A correção em `frontend/src/styles/viewer.css` limita a largura do seletor,
mantém contraste nos painéis sobre o canvas e distribui comandos, prazo, canvas
e régua em linhas próprias no celular. A prévia reproduziu a falha antes da
correção e passou depois: régua com aproximadamente 372 px no desktop e 344 px
no celular. A prova final foi repetida no frontend efetivamente publicado.

**CSS publicado:** `viewer-BkxohiIW.css`.
**SHA-256 local e remoto:**
`510e8c614968143334df1fc49d55895b76a3158a3c1c707145df0ceda17cd246`.
O release anterior foi preservado no servidor, assim como os assets com hash
que abas antigas ainda podem solicitar. A API permaneceu no ar.

## Artefatos e reprodução

• [Resultado final em JSON](provas/s26/resultado-20261114.json).
• [Mesma data, prazos diferentes](provas/s26/19-mesma-data-prazos-diferentes.png).
• [Celular](provas/s26/24-mobile-390.png).
• [Imagem exportada da comparação](provas/s26/12-exportacao-comparacao.png).

Scripts reproduzíveis: `deploy/bench/prove-s26.cjs` para criação e regressão
S12/S18; `deploy/bench/prove-s26-temporal.cjs` para o aceite temporal. Exigem
Playwright e Python com Pillow; esta execução usou Pillow 12.2.0.

`ARXIS_ACCEPTANCE_PRIVATE_DIR` aponta para um diretório fora do Git, contendo
`access.json` da conta sintética (`id`, `email`, `name`, `password`). O e-mail
deve seguir `arxis.s26.<oito caracteres hexadecimais>@example.test`, e o papel
local deve ser `user`. Os scripts conferem identidade e papel antes de seguir.
Se Playwright estiver instalado fora do projeto, informar o módulo em
`ARXIS_PLAYWRIGHT_MODULE`. O primeiro script registra recursos e estado privado
para a segunda etapa. `S26_RESUME=1` permite retomar apenas os cronogramas.

```powershell
node deploy/bench/prove-s26.cjs
node deploy/bench/prove-s26-temporal.cjs
```

Validação de desenvolvimento: `npm run typecheck`, os 16 testes de
`estado4d.test.ts` e `npm run build` passaram. O build mantém avisos existentes
sobre um seletor CSS da landing e tamanho de chunks; esta execução não os corrigiu.

## Limites do aceite

Esta prova fecha o marco de comparação temporal. Não comprova os critérios de
escala do S32, precisão de quantitativos, propriedades no painel, custos/SINAPI,
S30, WebGPU ou Unreal. O vínculo 4D continua por categoria IFC; seleção de
elementos individuais e recursos avançados permanecem pendentes.
