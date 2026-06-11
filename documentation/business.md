# Negócio — ArxisVR

**Última atualização:** 11/06/2026

---

## Contexto de Mercado

### BIM Global 2026
- Mercado: **US$ 11,3 bilhões** (cresceu de US$ 9,9 bi em 2025)
- CAGR: 12,9% rumo a US$ 27 bi até 2034
- 4D BIM: US$ 1,22 bilhão · 26% do total
- 5D BIM: US$ 0,84 bilhão · 23% do total
- AR/VR integrado ao BIM: **+40% year-over-year** em 2026
- Cloud BIM: 54% dos novos deployments são cloud-first

### Digital Twins e XR
- Digital Twins global: **US$ 36 bilhões** em 2026
- AR global até 2028: **US$ 97 bilhões**
- Construção civil Brasil: **R$ 400+ bilhões/ano**

### Brasil — Vantagem Específica
- **Decreto 10.306/2020**: entrega conjunta de BIM 4D + 5D obrigatória em obras públicas federais
- **SINAPI**: sistema de referência de preços da CEF, usado em toda licitação pública — nenhum software estrangeiro integra nativamente
- LATAM em estágio "single study" de adoção: mercado sem ferramenta local dominante

---

## Modelo Comercial

### Pricing

| Plano | Público-alvo | Preço | Limites |
|---|---|---|---|
| **Starter** | Arquiteto freelancer | R$ 87/mês | 3 projetos, 1 usuário, modelos até 100 MB |
| **Pro** | Escritório 5–20 pessoas | R$ 237/mês | 20 projetos, 10 usuários, modelos até 500 MB |
| **Business** | Construtora / gerenciadora | R$ 597/mês | Projetos ilimitados, 50 usuários, modelos até 2 GB |
| **Enterprise** | Grandes construtoras | R$ 2.000+/mês | Custom, SLA, white-label, API dedicada |

### Receitas adicionais
- Export PDF / relatório de cenários: pay-per-use no plano Starter
- Integração SINAPI atualizada mensalmente: incluída no Pro+
- White-label para construtoras: Enterprise
- API pública para integrações ERP/FileMaker: Business+

---

## Segmentos e Abordagem

### 1. Construtoras mid-market (50–500 obras/ano)
**Dor:** apresentar projeto para o cliente sem contratar render farm caro  
**Entrada:** Presentation Studio + viewer 3D  
**Expansão:** 4D → 5D → cenários → Enterprise

### 2. Escritórios de arquitetura
**Dor:** competir com grandes escritórios que têm equipes de visualização  
**Entrada:** 4D gratuito no plano Starter  
**Expansão:** colaboração → compartilhamento com cliente → Pro

### 3. Gerenciadoras de obra
**Dor:** cronograma e custo vivem em ferramentas separadas  
**Entrada:** 4D + 5D + importação MS Project / Primavera  
**Expansão:** dashboard executivo → Business

### 4. Obras públicas (prefeituras, concessionárias)
**Dor:** Decreto 10.306 exige 4D + 5D, sem ferramenta acessível em BRL  
**Entrada:** bundle compliance-ready com SINAPI  
**Expansão:** integração com portais de licitação → Enterprise

### 5. Investidores e incorporadoras
**Dor:** due diligence de portfólio de obras sem visão integrada  
**Entrada:** dashboard de comparação de cenários  
**Expansão:** relatórios automatizados → Enterprise

---

## Competidores

### 4D Scheduling
| Produto | Empresa | Fraqueza principal |
|---|---|---|
| Synchro Pro | Bentley | Desktop, caro, sem XR nativo |
| Navisworks | Autodesk | Exporta vídeo estático, sem cenários |
| ALICE Technologies | ALICE | IA generativa, sem 5D integrado |
| cmBuilder | Startup | Cloud, sem SINAPI, sem LATAM |

### XR + Visualização
| Produto | Fraqueza principal |
|---|---|
| Twinmotion / Unreal | Arch-viz, sem dados BIM reais |
| Enscape | Plugin de render, sem 4D/5D |
| Fuzor | 4D + VR, sem comparação de cenários |

### 5D Cost
| Produto | Fraqueza principal |
|---|---|
| Procore | All-in-one ERP, sem viewer IFC nativo |
| CostX | Takeoff especializado, sem visualização |
| ConWize | SaaS 5D, sem 4D nem XR |

### Gap que nenhum cobre
Nenhum produto no mercado conecta: **IFC nativo + cenários + 4D + 5D com SINAPI + viewer XR** em plataforma única SaaS em BRL com suporte local.

---

## Vantagens Competitivas

1. **SINAPI nativo** — diferencial regulatório indefensável por players estrangeiros
2. **Motor de cenários** — posicionamento de categoria, não de feature
3. **SaaS em BRL** — sem conversão, sem cartão internacional, com NF-e
4. **IFC open standard** — sem lock-in de plataforma (Autodesk cobra por ecosistema)
5. **Cadeia completa** — único fluxo IFC → cenário → 4D → 5D → decisão

---

## Riscos

| Risco | Probabilidade | Mitigação |
|---|---|---|
| Autodesk lança competitor cloud com SINAPI | Baixa (18–36 meses) | Mover rápido, construir moat de dados |
| Adoção lenta no segmento público | Média | Focar mid-market primeiro, público como expansão |
| Performance com modelos grandes | Alta (técnico) | Sprint S23 dedicado a cache e performance |
| Complexidade do parser IFC | Média | Usar web-ifc como base, não parser próprio do zero |

---

## Fontes

- Business Research Company — BIM Market Report 2026
- Mordor Intelligence — BIM Market 2031
- Fortune Business Insights — BIM Software Market 2034
- CRAYDL — Digital Twin Construction 2026
- Decreto 10.306/2020 — Governo Federal Brasileiro
- buildingSMART International — IFC Standards 2026
