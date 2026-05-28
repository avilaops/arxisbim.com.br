/**
 * BehaviorNode - Nó base para Behavior Tree
 * Foundation para NPCs adaptativos
 * 
 * Behavior Tree Pattern:
 * - Selector (OR): executa até um filho retornar sucesso
 * - Sequence (AND): executa até um filho retornar falha
 * - Action: executa ação específica
 * - Condition: verifica condição
 */
export enum BehaviorStatus {
  SUCCESS = 'SUCCESS',
  FAILURE = 'FAILURE',
  RUNNING = 'RUNNING'
}

export abstract class BehaviorNode {
  protected children: BehaviorNode[] = [];
  protected status: BehaviorStatus = BehaviorStatus.RUNNING;
  
  /**
   * Executa o nó
   */
  public abstract execute(context: any): BehaviorStatus;
  
  /**
   * Adiciona filho
   */
  public addChild(child: BehaviorNode): void {
    this.children.push(child);
  }
  
  /**
   * Retorna status atual
   */
  public getStatus(): BehaviorStatus {
    return this.status;
  }
  
  /**
   * Reseta nó
   */
  public reset(): void {
    this.status = BehaviorStatus.RUNNING;
    this.children.forEach((child) => child.reset());
  }
}

/**
 * Selector Node (OR)
 * Executa filhos até um retornar sucesso
 */
export class SelectorNode extends BehaviorNode {
  public execute(context: any): BehaviorStatus {
    for (const child of this.children) {
      const status = child.execute(context);
      
      if (status === BehaviorStatus.SUCCESS) {
        this.status = BehaviorStatus.SUCCESS;
        return this.status;
      }
      
      if (status === BehaviorStatus.RUNNING) {
        this.status = BehaviorStatus.RUNNING;
        return this.status;
      }
    }
    
    this.status = BehaviorStatus.FAILURE;
    return this.status;
  }
}

/**
 * Sequence Node (AND)
 * Executa filhos até um retornar falha
 */
export class SequenceNode extends BehaviorNode {
  public execute(context: any): BehaviorStatus {
    for (const child of this.children) {
      const status = child.execute(context);
      
      if (status === BehaviorStatus.FAILURE) {
        this.status = BehaviorStatus.FAILURE;
        return this.status;
      }
      
      if (status === BehaviorStatus.RUNNING) {
        this.status = BehaviorStatus.RUNNING;
        return this.status;
      }
    }
    
    this.status = BehaviorStatus.SUCCESS;
    return this.status;
  }
}

/**
 * Action Node
 * Executa ação específica
 */
export class ActionNode extends BehaviorNode {
  private action: (context: any) => BehaviorStatus;
  
  constructor(action: (context: any) => BehaviorStatus) {
    super();
    this.action = action;
  }
  
  public execute(context: any): BehaviorStatus {
    this.status = this.action(context);
    return this.status;
  }
}

/**
 * Condition Node
 * Verifica condição
 */
export class ConditionNode extends BehaviorNode {
  private condition: (context: any) => boolean;
  
  constructor(condition: (context: any) => boolean) {
    super();
    this.condition = condition;
  }
  
  public execute(context: any): BehaviorStatus {
    this.status = this.condition(context) ? BehaviorStatus.SUCCESS : BehaviorStatus.FAILURE;
    return this.status;
  }
}

/**
 * Inverter Node (Decorator)
 * Inverte resultado do filho
 */
export class InverterNode extends BehaviorNode {
  public execute(context: any): BehaviorStatus {
    if (this.children.length !== 1) {
      console.error('InverterNode must have exactly 1 child');
      this.status = BehaviorStatus.FAILURE;
      return this.status;
    }
    
    const childStatus = this.children[0].execute(context);
    
    if (childStatus === BehaviorStatus.SUCCESS) {
      this.status = BehaviorStatus.FAILURE;
    } else if (childStatus === BehaviorStatus.FAILURE) {
      this.status = BehaviorStatus.SUCCESS;
    } else {
      this.status = BehaviorStatus.RUNNING;
    }
    
    return this.status;
  }
}

/**
 * Repeater Node (Decorator)
 * Repete filho N vezes ou infinitamente
 */
export class RepeaterNode extends BehaviorNode {
  private maxRepeats: number;
  private currentRepeats: number = 0;
  
  constructor(maxRepeats: number = -1) { // -1 = infinite
    super();
    this.maxRepeats = maxRepeats;
  }
  
  public execute(context: any): BehaviorStatus {
    if (this.children.length !== 1) {
      console.error('RepeaterNode must have exactly 1 child');
      this.status = BehaviorStatus.FAILURE;
      return this.status;
    }
    
    const childStatus = this.children[0].execute(context);
    
    if (childStatus === BehaviorStatus.RUNNING) {
      this.status = BehaviorStatus.RUNNING;
      return this.status;
    }
    
    this.currentRepeats++;
    
    if (this.maxRepeats > 0 && this.currentRepeats >= this.maxRepeats) {
      this.status = BehaviorStatus.SUCCESS;
      this.currentRepeats = 0;
      return this.status;
    }
    
    // Reset child and continue
    this.children[0].reset();
    this.status = BehaviorStatus.RUNNING;
    return this.status;
  }
  
  public reset(): void {
    super.reset();
    this.currentRepeats = 0;
  }
}

/**
 * Succeeder Node (Decorator)
 * Sempre retorna sucesso
 */
export class SucceederNode extends BehaviorNode {
  public execute(context: any): BehaviorStatus {
    if (this.children.length !== 1) {
      console.error('SucceederNode must have exactly 1 child');
      this.status = BehaviorStatus.FAILURE;
      return this.status;
    }
    
    this.children[0].execute(context);
    this.status = BehaviorStatus.SUCCESS;
    return this.status;
  }
}

/**
 * UntilFail Node (Decorator)
 * Repete até filho falhar
 */
export class UntilFailNode extends BehaviorNode {
  public execute(context: any): BehaviorStatus {
    if (this.children.length !== 1) {
      console.error('UntilFailNode must have exactly 1 child');
      this.status = BehaviorStatus.FAILURE;
      return this.status;
    }
    
    const childStatus = this.children[0].execute(context);
    
    if (childStatus === BehaviorStatus.FAILURE) {
      this.status = BehaviorStatus.SUCCESS;
      return this.status;
    }
    
    // Reset and continue
    this.children[0].reset();
    this.status = BehaviorStatus.RUNNING;
    return this.status;
  }
}

/**
 * BehaviorTree - Árvore de comportamento completa
 */
export class BehaviorTree {
  private root: BehaviorNode;
  private name: string;
  
  constructor(name: string, root: BehaviorNode) {
    this.name = name;
    this.root = root;
  }
  
  /**
   * Executa a árvore
   */
  public tick(context: any): BehaviorStatus {
    return this.root.execute(context);
  }
  
  /**
   * Reseta a árvore
   */
  public reset(): void {
    this.root.reset();
  }
  
  /**
   * Retorna nome
   */
  public getName(): string {
    return this.name;
  }
  
  /**
   * Retorna status atual
   */
  public getStatus(): BehaviorStatus {
    return this.root.getStatus();
  }
}

/**
 * BehaviorTreeBuilder - Construtor fluent para árvores
 */
export class BehaviorTreeBuilder {
  private name: string = 'Unnamed';
  private stack: BehaviorNode[] = [];
  private current: BehaviorNode | null = null;
  
  /**
   * Define nome
   */
  public setName(name: string): this {
    this.name = name;
    return this;
  }
  
  /**
   * Inicia Selector
   */
  public selector(): this {
    const node = new SelectorNode();
    this.addNode(node);
    return this;
  }
  
  /**
   * Inicia Sequence
   */
  public sequence(): this {
    const node = new SequenceNode();
    this.addNode(node);
    return this;
  }
  
  /**
   * Adiciona Action
   */
  public action(action: (context: any) => BehaviorStatus): this {
    const node = new ActionNode(action);
    this.addLeaf(node);
    return this;
  }
  
  /**
   * Adiciona Condition
   */
  public condition(condition: (context: any) => boolean): this {
    const node = new ConditionNode(condition);
    this.addLeaf(node);
    return this;
  }
  
  /**
   * Adiciona Inverter
   */
  public inverter(): this {
    const node = new InverterNode();
    this.addNode(node);
    return this;
  }
  
  /**
   * Adiciona Repeater
   */
  public repeater(maxRepeats: number = -1): this {
    const node = new RepeaterNode(maxRepeats);
    this.addNode(node);
    return this;
  }
  
  /**
   * Adiciona Succeeder
   */
  public succeeder(): this {
    const node = new SucceederNode();
    this.addNode(node);
    return this;
  }
  
  /**
   * Adiciona UntilFail
   */
  public untilFail(): this {
    const node = new UntilFailNode();
    this.addNode(node);
    return this;
  }
  
  /**
   * Finaliza nó atual
   */
  public end(): this {
    if (this.stack.length > 0) {
      this.current = this.stack.pop()!;
    }
    return this;
  }
  
  /**
   * Constrói a árvore
   */
  public build(): BehaviorTree {
    if (!this.current) {
      throw new Error('BehaviorTree is empty. Add at least one node.');
    }
    
    if (this.stack.length > 0) {
      console.warn('BehaviorTree has unclosed nodes. Did you forget to call end()?');
    }
    
    return new BehaviorTree(this.name, this.current);
  }
  
  // Helper methods
  
  private addNode(node: BehaviorNode): void {
    if (this.current) {
      this.current.addChild(node);
      this.stack.push(this.current);
    }
    this.current = node;
  }
  
  private addLeaf(node: BehaviorNode): void {
    if (this.current) {
      this.current.addChild(node);
    } else {
      this.current = node;
    }
  }
}

