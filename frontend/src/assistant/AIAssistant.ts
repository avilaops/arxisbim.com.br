import { ViewerActionRouter } from './ViewerActionRouter';
import { ViewerSnapshot } from './ViewerStateSnapshot';
import { ViewerAction } from './ActionDSL';

/**
 * AIAssistant - Assistente AI para Arxis
 * 
 * Integra com ChatGPT para comandos em linguagem natural.
 * Interpreta intenção do usuário e executa ações no viewer.
 * 
 * Features:
 * - Natural language understanding
 * - Context-aware responses
 * - Action execution
 * - Learning from feedback
 */
export class AIAssistant {
  private actionRouter: ViewerActionRouter;
  private conversationHistory: { role: string; content: string }[] = [];
  private apiKey: string | null = null;
  private apiEndpoint: string = 'https://api.openai.com/v1/chat/completions';
  private model: string = 'gpt-4';
  
  constructor(actionRouter: ViewerActionRouter) {
    this.actionRouter = actionRouter;
    console.log('AI Assistant initialized');
  }
  
  /**
   * Configura API key
   */
  public setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
    console.log('OpenAI API key configured');
  }
  
  /**
   * Configura modelo
   */
  public setModel(model: string): void {
    this.model = model;
    console.log(`AI model configured: ${model}`);
  }
  
  /**
   * Processa comando do usuário
   */
  public async processCommand(
    userMessage: string,
    stateSnapshot: ViewerSnapshot
  ): Promise<{
    response: string;
    actions?: ViewerAction[];
    success: boolean;
    error?: string;
  }> {
    if (!this.apiKey) {
      return {
        response: 'A chave da API de IA ainda não foi configurada.',
        success: false,
        error: 'API_KEY_MISSING'
      };
    }
    
    try {
      // Adiciona mensagem do usuário ao histórico
      this.conversationHistory.push({
        role: 'user',
        content: userMessage
      });
      
      // Cria prompt com contexto do viewer
      const systemPrompt = this.buildSystemPrompt(stateSnapshot);
      
      // Chama OpenAI API
      const response = await this.callOpenAI(systemPrompt);
      
      // Adiciona resposta ao histórico
      this.conversationHistory.push({
        role: 'assistant',
        content: response
      });
      
      // Interpreta resposta e extrai ações
      const actions = this.parseActions(response);
      
      // Executa ações se houver
      if (actions && actions.length > 0) {
        await this.actionRouter.executeAll(actions);
        
        return {
          response,
          actions,
          success: true
        };
      }
      
      return {
        response,
        success: true
      };
      
    } catch (error) {
      console.error('Error processing assistant command:', error);
      return {
        response: 'Não foi possível processar a solicitação. Tente novamente ou revise a configuração da IA.',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Constrói prompt do sistema com contexto
   */
  private buildSystemPrompt(state: ViewerSnapshot): string {
    return `You are Arxis's BIM assistant for enterprise architecture, engineering and construction coordination.

  Current workspace state:
- Camera: Position (${state.camera.position.join(', ')}), Target (${state.camera.target.join(', ')})
- Active Tool: ${state.app.currentTool || 'navigation'}
- Selected Objects: ${state.selection.count} objects
- Visible Objects: ${state.scene.visibleObjects} objects
- Total Objects: ${state.scene.totalObjects}
- IFC Classes: ${state.scene.ifcClasses.join(', ')}
  - Project Name: ${state.app.projectName || 'Projeto sem nome'}

You can help users with:
1. Navigation: "show me the top view", "focus on selected objects"
2. Object manipulation: "hide all walls", "isolate beams"
3. Analysis: "show me all structural elements"
4. Screenshots: "take a screenshot"
5. General questions about the model

When you want to perform an action, respond with:
ACTION: [action_type] [parameters]

Available actions:
- FOCUS: Focus camera on selected objects
- ISOLATE: Hide everything except specified elements
- HIDE_CLASS: Hide objects by IFC class (e.g., IfcWall, IfcBeam)
- SHOW_ALL: Show all hidden objects
- SCREENSHOT: Take a screenshot (quality: low/medium/high)
- CAMERA: Set camera view (preset: top/front/side/isometric)
- TOOL: Activate tool (selection/measurement/navigation/layer)

Respond naturally, professionally and concisely. Prioritize BIM coordination, model review and decision support.`;
  }
  
  /**
   * Chama OpenAI API
   */
  private async callOpenAI(systemPrompt: string): Promise<string> {
    const messages = [
      { role: 'system', content: systemPrompt },
      ...this.conversationHistory.slice(-10) // Últimas 10 mensagens
    ];
    
    const response = await fetch(this.apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: 0.7,
        max_tokens: 500
      })
    });
    
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.choices[0].message.content;
  }
  
  /**
   * Interpreta resposta e extrai ações
   */
  private parseActions(response: string): ViewerAction[] | null {
    const actions: ViewerAction[] = [];
    const lines = response.split('\n');
    
    for (const line of lines) {
      if (line.startsWith('ACTION:')) {
        const actionStr = line.substring('ACTION:'.length).trim();
        const action = this.parseActionString(actionStr);
        if (action) {
          actions.push(action);
        }
      }
    }
    
    return actions.length > 0 ? actions : null;
  }
  
  /**
   * Parseia string de ação para objeto
   */
  private parseActionString(str: string): ViewerAction | null {
    const parts = str.split(' ');
    const actionType = parts[0].toLowerCase();
    
    switch (actionType) {
      case 'focus':
        return {
          type: 'focus_selection' as any,
          elementIds: [] // Usará seleção atual
        };
      
      case 'isolate':
        return {
          type: 'isolate_elements' as any,
          elementIds: [] // Usará seleção atual
        };
      
      case 'hide_class':
        if (parts[1]) {
          return {
            type: 'hide_by_class' as any,
            ifcClass: parts[1]
          };
        }
        break;
      
      case 'show_all':
        return { type: 'show_all' as any };
      
      case 'screenshot':
        const quality = parts[1] || 'medium';
        return {
          type: 'take_screenshot' as any,
          quality: quality as any
        };
      
      case 'camera':
        if (parts[1]) {
          return {
            type: 'set_camera' as any,
            preset: parts[1] as any
          };
        }
        break;
      
      case 'tool':
        if (parts[1]) {
          const tool = parts[1].toLowerCase();
          const validTools: Array<'selection' | 'measurement' | 'navigation' | 'layer'> = 
            ['selection', 'measurement', 'navigation', 'layer'];
          if (validTools.includes(tool as any)) {
            return {
              type: 'toggle_tool' as any,
              toolName: tool as typeof validTools[number]
            };
          }
        }
        break;
    }
    
    return null;
  }
  
  /**
   * Limpa histórico de conversação
   */
  public clearHistory(): void {
    this.conversationHistory = [];
    console.log('🧹 Conversation history cleared');
  }
  
  /**
   * Retorna histórico
   */
  public getHistory(): { role: string; content: string }[] {
    return [...this.conversationHistory];
  }
  
  /**
   * Exporta histórico para arquivo
   */
  public exportHistory(): string {
    return JSON.stringify(this.conversationHistory, null, 2);
  }
  
  /**
   * Retorna estatísticas
   */
  public getStats(): {
    messageCount: number;
    apiKey: boolean;
    model: string;
  } {
    return {
      messageCount: this.conversationHistory.length,
      apiKey: !!this.apiKey,
      model: this.model
    };
  }
}
