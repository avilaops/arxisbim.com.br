# SPRINT-XX-RESULT · <Título>

> Artefato de memória pós-execução. Preenchido ao **fechar** o sprint, com evidência verificável.
> Não é planejamento — é o registro do que de fato foi entregue. Cada afirmação aqui deve ser checável (diff, build, teste, query no banco).

**Sprint:** SXX · <nome>
**Status:** Concluído | Parcial | Bloqueado
**Data de fechamento:** YYYY-MM-DD
**Commit(s):** `<sha>` … `<sha>`

---

## Objetivo (entregue?)

Uma linha: o que o sprint se propôs e se foi atingido. Se parcial, dizer o que ficou de fora e por quê.

## Arquivos alterados

- `path/arquivo.ts` — o que mudou
- `migrations/0NN_*.sql` — listar separadamente abaixo também

## Migrations adicionadas

- `0NN_nome.sql` — aplicada? (`sim/não`), reversível? (`sim/não`)

## Critérios de aceite — passou?

| Critério (do doc de sprint) | Resultado | Evidência |
|---|---|---|
| <critério mensurável> | ✅ / ❌ | <output, número, link> |

## Testes executados

Comando + resultado real (cole o sumário, não parafraseie):

```
<saída: N passed / M failed>
```

## Limitações conhecidas

O que funciona mas é incompleto/frágil. Sem isto, o próximo agente assume cobertura total.

## Decisões arquiteturais alteradas

Mudou algo do que o doc de sprint previa? Registrar aqui — propaga para sprints dependentes.

## Riscos para o próximo sprint

O que o sprint seguinte herda e precisa saber antes de começar.

## Passos de rollback

Como desfazer (reverter migration, feature flag, revert de commit).

## Notas de demo

Como mostrar isto funcionando em 30s.
