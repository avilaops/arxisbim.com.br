# ArxisVR Plugin para Revit — Guia do Usuário

Exporte seu modelo Revit para o ArxisVR em menos de 2 minutos.

---

## 1. Instalação

### Pré-requisitos
- Revit 2027
- Conta no ArxisVR ([arxisvr.avilaops.com](https://arxisvr.avilaops.com))

### Passos
1. Baixe o plugin (Autodesk App Store ou GitHub Releases)
2. Execute o instalador — ou, em dev, rode `install-local.ps1`
3. Reinicie o Revit
4. A aba **ArxisVR** aparece no ribbon

---

## 2. Configuração inicial (uma vez só)

1. No ArxisVR web: **Conta → API Tokens → Criar token**
   - Escopos necessários: `models:read` + `models:write`
   - Copie o token (`arx_live_...`) — ele só aparece uma vez
2. No Revit: **ArxisVR → Settings**
   - Cole o token no campo *API Key*
   - Clique **Salvar**

> A key é criptografada com DPAPI e fica vinculada ao seu usuário Windows —
> nunca é gravada em texto puro.

---

## 3. Exportando um modelo

1. Abra o modelo no Revit
2. Clique **ArxisVR → Export to ArxisVR**
3. Configure:

| Campo | O que faz |
|---|---|
| **Nome do projeto** | Nome no ArxisVR. Re-exportar com o mesmo nome cria uma **nova versão** do mesmo modelo (histórico preservado) |
| **Disciplinas** | Estrutura / Arquitetura / MEP — o que entra no IFC |
| **Nível de detalhe** | LOD 200 (leve) → LOD 400 (máximo). Padrão: LOD 300 |
| **Validar antes do upload** | Roda checagens rápidas antes de enviar (recomendado) |

4. Clique **Exportar**
5. Ao concluir: **Copiar link** ou **Abrir no navegador**

O processamento (geometria, metadados, quantitativos) continua no servidor.
Acompanhe o status no dashboard do ArxisVR.

---

## 4. Validando antes de exportar

**ArxisVR → Validate IFC** roda checagens no modelo aberto:

| Checagem | Por quê importa |
|---|---|
| Documento salvo | Evita export de estado inconsistente |
| Warnings do Revit | Warnings acumulados degradam o IFC |
| Elementos de modelo | Modelo vazio gera IFC vazio |
| Níveis definidos | Sem níveis, a hierarquia IFC fica sem pavimentos |

A validação não bloqueia o export — ela orienta.

---

## 5. Versões de modelo

Cada export com o **mesmo nome de projeto** cria uma nova versão:

```
Torre Alpha
├── v1  (16/07 09:00)  ready
├── v2  (16/07 14:30)  ready
└── v3  (17/07 10:15)  processing  ← export mais recente
```

No ArxisVR você compara versões lado a lado (S18 — comparação visual).

---

## 6. Solução de problemas

| Sintoma | Causa provável | Solução |
|---|---|---|
| Aba ArxisVR não aparece | Manifest não instalado | Rode `install-local.ps1` de novo e reinicie o Revit |
| "API key não configurada" | Settings vazio | ArxisVR → Settings → colar token |
| 401 no upload | Token revogado/expirado | Gere novo token no ArxisVR web |
| 403 no upload | Token sem escopo `models:write` | Crie token com os escopos corretos |
| 413 no upload | IFC maior que o limite do servidor | Reduza disciplinas/LOD |
| Export lento | Modelo muito grande | Use LOD 200/300; exporte disciplinas separadas |

**Logs:** `%APPDATA%\ArxisVR\logs\plugin-YYYYMMDD.log`

---

## 7. Suporte

- 📧 support@avilaops.com
- 🐛 github.com/AvilaOps/arxisvr/issues
