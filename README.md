<div align="center">
	<img src="https://upload.wikimedia.org/wikipedia/commons/8/8d/Steve_Jobs_Headshot_2010-CROP2.jpg" alt="Steve Jobs" width="120"/>
  
	# One more thing...
  
	# Apresentando o **ArxisVR**
  
	<img src="https://img.icons8.com/ios-filled/100/virtual-reality.png" alt="ArxisVR Logo" width="100"/>
  
	## "A inovação distingue um líder de um seguidor." – Steve Jobs
</div>

Imagine um mundo onde a realidade não é um limite, mas um ponto de partida.

Hoje, temos o orgulho de apresentar o **ArxisVR**: uma experiência de Realidade Virtual criada para transformar a maneira como você vê, sente e interage com o impossível.

---

## Por que ArxisVR?

- **Imersão Total:** Sinta-se dentro do universo digital, com gráficos de tirar o fôlego e interação natural.
- **Performance Inigualável:** Desenvolvido com tecnologia de ponta para máxima fluidez e resposta.
- **Fácil de Usar:** Interface intuitiva, pronta para todos – do iniciante ao expert.
- **Expansível:** Projetado para crescer junto com suas ideias e necessidades.

---

## O que você pode fazer com o ArxisVR?

- Explorar ambientes virtuais hiper-realistas
- Treinar equipes em simulações seguras e controladas
- Criar experiências educativas inovadoras
- Desenvolver jogos e aplicações interativas

---

## Funcionalidades do ArxisVR

### 🏗️ BIM e Modelos IFC
- **Upload de Modelos IFC:** Carregue seus arquivos BIM (IFC) diretamente na plataforma
- **Visualização 3D Interativa:** Navegue pelos modelos com controles de FPS (WASD)
- **Modelos Federados:** Combine múltiplos IFCs (arquitetura, estrutura, MEP) em um único modelo
- **Quantitativos Automáticos:** Extraia quantitativos dos elementos (paredes, vigas, lajes, etc)
- **Análise de Custos 5D:** Orçamento integrado com os quantitativos do modelo

### 📅 Cronograma 4D
- **Planejamento de Obra:** Crie tarefas e vincule aos elementos do modelo IFC
- **Simulação 4D:** Visualize o progresso da obra ao longo do tempo
- **Gantt Integrado:** Gerencie dependências e milestones
- **Progresso em Tempo Real:** Acompanhe o status das tarefas

### 👥 Reuniões XR Multiplayer
- **Salas de Reunião:** Crie salas virtuais para colaboração em tempo real
- **Avatares 3D:** Navegue com avatares representando cada participante
- **Chat em Tempo Real:** Comunique-se via chat durante as reuniões
- **Áudio e Vídeo:** Ative microfone e câmera para comunicação completa
- **Laser Pointer:** Aponte elementos do modelo para destacar discussões
- **Colaboração CRDT:** Seleções e annotations sincronizadas entre participantes
- **Histórico de Colaboração:** Recupere estados anteriores em caso de desconexão

### 🎮 Cenários 3D
- **Salvar Estados:** Salve posições de câmera e configurações do viewer
- **Presets Profissionais:** Cenários prontos para apresentação, coordenação BIM, etc
- **Navegação Guiada:** Tours arquitetônicos com pontos de interesse

### 🔧 Ferramentas de Análise
- **Cortes de Seção:** Crie cortes transversais e longitudinais
- **Medições:** Meça distâncias e áreas no modelo
- **Query de Elementos:** Busque elementos por tipo, propriedades ou expressID
- **Análise Estrutural:** Identifique colunas, vigas, lajes e fundações
- **Análise MEP:** Visualize sistemas elétricos, hidráulicos e HVAC

---

## Como Funciona o Multiplayer

O sistema de reuniões XR usa **Socket.IO** para comunicação em tempo real:

1. **Autenticação:** Login via JWT token
2. **Criação de Sala:** Crie uma sala de reunião para seu projeto
3. **Convite:** Compartilhe o código da sala com outros participantes
4. **Join:** Participantes entram na sala com seus avatares
5. **Colaboração:** Movimentos, chat e ações são sincronizados em tempo real
6. **Histórico:** Todas as colaborações são salvas para recuperação

**Requisitos:**
- Conexão estável com internet
- Navegador moderno com suporte a WebGL
- Permissão de microfone e câmera (para áudio/vídeo em reuniões)

---

## Como Começar

### Para Desenvolvedores
```bash
# Clone o repositório
git clone https://github.com/avilaops/arxisvr.git

# Backend
cd backend
npm install
npm run dev

# Frontend
cd frontend
npm install
npm run dev
```

### Para Usuários
1. Acesse a plataforma
2. Faça login ou crie sua conta
3. Crie ou selecione um projeto
4. Faça upload de seus modelos IFC
5. Convide sua equipe para reuniões XR
6. Comece a colaborar!

---

## "As pessoas que são loucas o suficiente para achar que podem mudar o mundo são as que mudam." – Steve Jobs

Junte-se a nós nessa jornada. Reinvente o impossível. Experimente o **ArxisVR**.

---

<div align="center">
	<sub>Feito com paixão, inovação e um toque de genialidade.</sub>
</div>
