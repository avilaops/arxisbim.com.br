export interface ArticleSource {
  id: string
  title: string
  url: string
}

export interface ArticleSection {
  id: string
  title: string
  paragraphs?: string[]
  list?: string[]
  ordered?: boolean
  sourceIds?: string[]
}

export interface Article {
  slug: string
  title: string
  description: string
  category: string
  date: string
  author: string
  readMinutes: number
  image: string
  imageAlt: string
  intro: string[]
  sections: ArticleSection[]
  takeaway: string
  sources: ArticleSource[]
}

export const articles: Article[] = [
  {
    slug: 'bim-alem-do-3d',
    title: 'BIM além do 3D: o que a informação muda no seu projeto',
    description: 'Entenda a diferença entre ver um modelo e usar suas informações. Um guia prático para começar com BIM, definir entregas e tomar decisões com contexto.',
    category: 'Fundamentos',
    date: '2026-09-12',
    author: 'Equipe Arxis',
    readMinutes: 5,
    image: '/images/editorial/modelo-bim.webp',
    imageAlt: 'Modelo arquitetônico em corte, com pavimentos, ambientes e componentes de uma edificação visíveis.',
    intro: [
      'Você recebe um modelo, gira a câmera e entende a forma do edifício. A fachada parece resolvida, os pavimentos se encaixam e a apresentação funciona. Mas, quando alguém pergunta qual é o material de uma parede ou a revisão de uma porta, a resposta exige procurar outro arquivo. É nessa distância entre visualizar e decidir que vale olhar para o BIM.',
      'BIM significa Building Information Modeling, ou Modelagem da Informação da Construção. A ideia reúne a produção e a gestão de informações sobre um empreendimento. O modelo tridimensional participa desse trabalho, junto com dados e processos de colaboração. A definição da Autodesk destaca justamente a informação estruturada ao longo do ciclo de vida do ativo.'
    ],
    sections: [
      {
        id: 'forma-e-informacao',
        title: 'A forma mostra. A informação permite perguntar.',
        paragraphs: [
          'Considere uma porta como exemplo ilustrativo. A geometria ajuda a reconhecer sua posição e sua abertura. Para uma revisão específica, a equipe também pode precisar de identificação, dimensões, material e ambiente atendido. Esses dados precisam existir, estar compreensíveis e corresponder ao que foi combinado para aquela entrega.',
          'Ter muitas propriedades preenchidas não resolve, por si só, a revisão. Um campo chamado “material” com valor “a definir” pode ser adequado no estudo inicial e insuficiente em uma entrega posterior. O significado do dado depende da fase, da finalidade e de quem vai utilizá-lo. A primeira pergunta útil é: qual decisão este modelo precisa apoiar agora?'
        ],
        sourceIds: ['autodesk-bim']
      },
      {
        id: 'objetivo-antes-do-software',
        title: 'Comece por uma dificuldade real da equipe',
        paragraphs: [
          'Em um escritório pequeno, uma adoção inicial pode começar pela conferência de portas antes de emitir uma revisão. Em outra equipe, o problema recorrente pode ser reunir arquitetura e estrutura para discutir um ponto de conflito. Escolha uma situação observável, com um responsável e uma entrega que caiba na rotina.',
          'Nossa sugestão é escrever o objetivo em uma frase concreta: “Na próxima revisão, conseguiremos localizar cada porta e conferir as informações acordadas”. Isso torna a primeira experiência avaliável. “Implantar BIM no escritório” continua sendo uma intenção ampla; a conferência de uma entrega cria um começo administrável.'
        ]
      },
      {
        id: 'combinados-minimos',
        title: 'Combine o que será entregue e como será conferido',
        paragraphs: [
          'Antes de modelar mais detalhes, registre o acordo de trabalho. A lista abaixo é um ponto de partida editorial para uma entrega simples. Ela deve ser adaptada ao projeto e às responsabilidades das pessoas envolvidas.'
        ],
        list: [
          'Finalidade: qual pergunta a entrega deve ajudar a responder?',
          'Escopo: quais disciplinas, pavimentos e elementos fazem parte desta revisão?',
          'Informações: quais campos são necessários e quais valores são esperados?',
          'Responsabilidade: quem produz, quem confere e quem aceita a entrega?',
          'Troca: quais arquivos serão enviados, em qual versão e por qual canal?',
          'Registro: onde ficam a revisão vigente, as pendências e as decisões?'
        ]
      },
      {
        id: 'modelo-compartilhado',
        title: 'Trocar um modelo também exige um acordo',
        paragraphs: [
          'Quando as equipes trabalham com aplicações diferentes, a troca precisa ser planejada. O IFC, Industry Foundation Classes, é um padrão aberto da buildingSMART para representar e compartilhar informações do ambiente construído. Ele organiza elementos, características e relações. Seu papel é apoiar a interoperabilidade entre ferramentas.',
          'Para a equipe, a consequência prática é simples: exportar o arquivo faz parte da entrega, mas a conferência deve acontecer também no ambiente de quem o recebe. Escolha alguns elementos representativos, abra a versão exportada e verifique se a informação necessária está disponível. Registre a configuração utilizada para repetir o processo na revisão seguinte.'
        ],
        sourceIds: ['ifc-intro']
      },
      {
        id: 'o-que-medir',
        title: 'Meça a clareza do processo antes de prometer ganhos',
        paragraphs: [
          'Uma imagem bem apresentada demonstra uma parte do trabalho. Para avaliar sua primeira experiência com BIM, observe também o caminho da informação. A equipe identificou a versão correta sem pedir confirmação? Conseguiu localizar o elemento discutido? Entendeu quais pendências impediam a entrega?',
          'Anote o tempo gasto na tarefa escolhida e as dúvidas que apareceram, mantendo o mesmo critério entre revisões. Esses registros ajudam a ajustar o processo com evidências próprias. Uma porcentagem de economia divulgada por outra empresa não é uma previsão automática para o seu projeto.'
        ]
      },
      {
        id: 'primeiro-passo',
        title: 'Um primeiro exercício para a próxima revisão',
        paragraphs: [
          'Separe um pequeno conjunto de elementos e peça que duas pessoas façam a mesma conferência. Entregue a ambas o mesmo arquivo, o mesmo objetivo e a mesma lista de critérios. Depois, compare o que cada uma conseguiu responder e em quais pontos precisou buscar ajuda.',
          'Se as respostas divergirem, investigue o motivo: identificação pouco clara, propriedade ausente, revisão diferente ou critério ambíguo. Ajuste o combinado e repita a conferência. Esse exercício transforma uma discussão abstrata sobre tecnologia em uma melhoria que a equipe consegue enxergar e reproduzir.'
        ]
      }
    ],
    takeaway: 'Escolha uma decisão, defina a informação necessária e confira a entrega com quem vai utilizá-la. Esse é um começo concreto para trabalhar com BIM.',
    sources: [
      { id: 'autodesk-bim', title: 'Autodesk · What is BIM?', url: 'https://www.autodesk.com/eu/solutions/bim' },
      { id: 'ifc-intro', title: 'buildingSMART · Introdução ao IFC', url: 'https://technical.buildingsmart.org/standards/ifc/' }
    ]
  },
  {
    slug: 'o-que-e-ifc',
    title: 'O que é IFC e o que conferir ao receber um arquivo',
    description: 'Saiba para que serve o padrão IFC, como combinar uma troca entre ferramentas e por que abrir o arquivo é apenas uma etapa da conferência.',
    category: 'Interoperabilidade',
    date: '2026-09-12',
    author: 'Equipe Arxis',
    readMinutes: 5,
    image: '/images/editorial/ifc.webp',
    imageAlt: 'Representação de componentes de uma edificação organizados em um modelo digital aberto para troca de informações.',
    intro: [
      'O projetista envia um IFC e a equipe consegue abrir o edifício em outra ferramenta. Esse é um bom começo. A próxima pergunta é se o arquivo também permite realizar a revisão que motivou a troca: encontrar os elementos certos, consultar propriedades e compreender sua organização.',
      'IFC é a sigla de Industry Foundation Classes. A buildingSMART o mantém como um padrão aberto e independente de fornecedor para descrever informações do ambiente construído. Na rotina, a palavra costuma designar o arquivo recebido. Por trás desse arquivo existe uma estrutura de dados que dá significado aos elementos e às suas relações.'
    ],
    sections: [
      {
        id: 'o-que-viaja',
        title: 'O que pode viajar dentro de um IFC',
        paragraphs: [
          'O padrão contempla a identidade dos objetos, suas características e relações, além da representação geométrica. Uma parede pode ser reconhecida como parede e estar associada a propriedades e materiais. A presença de cada informação em uma entrega concreta depende do conteúdo produzido e das opções de exportação.',
          'Isso explica por que dois arquivos visualmente parecidos podem oferecer condições diferentes de consulta. Um pode trazer elementos identificados e propriedades úteis; outro pode exigir esclarecimentos antes de qualquer análise. A aparência do modelo não basta para saber o conteúdo que foi entregue.'
        ],
        sourceIds: ['ifc-intro']
      },
      {
        id: 'versao-e-finalidade',
        title: 'Combine versão, finalidade e ferramentas',
        paragraphs: [
          'A documentação da buildingSMART apresenta diferentes versões do IFC e recortes de implementação para usos específicos, conhecidos como Model View Definitions, ou MVDs. Na prática, as aplicações não necessariamente oferecem o mesmo suporte a todas as possibilidades do padrão.',
          'Antes de fechar uma entrega, confirme a versão aceita pela ferramenta de destino, o objetivo da troca e a configuração de exportação. Peça um arquivo pequeno para testar o caminho completo. Esse teste é mais útil do que descobrir uma incompatibilidade quando todas as disciplinas já enviaram seus modelos.'
        ],
        sourceIds: ['ifc-standard']
      },
      {
        id: 'recebimento',
        title: 'Faça uma conferência de recebimento',
        paragraphs: [
          'Para uma primeira leitura, sugerimos conferir as questões abaixo e registrar qualquer divergência junto da revisão recebida. Os critérios são um roteiro de trabalho; a aceitação deve seguir os requisitos específicos do seu projeto.'
        ],
        list: [
          'Origem e revisão: identifique quem enviou, quando exportou e qual revisão o arquivo representa.',
          'Escopo: confira se as disciplinas, os pavimentos e as áreas esperadas estão presentes.',
          'Posição: compare referências conhecidas para verificar orientação, alinhamento e unidades.',
          'Elementos: selecione exemplos de categorias importantes e confira se são identificáveis.',
          'Propriedades: consulte os campos necessários à tarefa e observe valores ausentes ou ambíguos.',
          'Pendências: registre o elemento, a divergência, a pergunta e a pessoa responsável pela resposta.'
        ]
      },
      {
        id: 'abrir-validar-revisar',
        title: 'Abrir, validar e revisar são verificações diferentes',
        paragraphs: [
          'Abrir o arquivo demonstra que uma ferramenta conseguiu interpretar ao menos parte do seu conteúdo. A validação técnica verifica sua conformidade com o padrão. O serviço de validação IFC da buildingSMART, por exemplo, confere sintaxe, esquema e regras normativas. Ele não substitui a revisão das necessidades específicas do seu empreendimento.',
          'Imagine uma entrega tecnicamente válida em que falta a classificação exigida pela equipe. O arquivo pode atender à estrutura do padrão e, ainda assim, estar incompleto para aquela finalidade. Separe o resultado da validação técnica do parecer sobre a entrega: cada verificação responde a uma pergunta diferente.'
        ],
        sourceIds: ['ifc-validation']
      },
      {
        id: 'informacao-ausente',
        title: 'Quando uma informação não aparece',
        paragraphs: [
          'Evite concluir imediatamente que o dado se perdeu. Primeiro, procure-o no elemento e em seu tipo, quando a ferramenta permitir. Depois, compare a expectativa da equipe com o que foi efetivamente solicitado. Por fim, peça ao autor que confira o arquivo exportado, e não apenas o modelo aberto no programa de origem.',
          'Envie um exemplo preciso: nome do arquivo, identificação do elemento, campo esperado e captura que mostre o problema. “Faltam dados” abre espaço para muitas interpretações. “Nesta revisão, não localizei o material desta parede na consulta de propriedades” dá à outra pessoa um ponto claro para investigar.'
        ]
      },
      {
        id: 'piloto-de-troca',
        title: 'Estabeleça um pequeno piloto de troca',
        paragraphs: [
          'Escolha uma área simples que reúna os principais tipos de elementos da entrega. O autor exporta, o destinatário abre, a equipe confere o roteiro e ambos registram o que funcionou. Corrigidas as divergências, documentem versão, configurações e critérios de aceitação para as próximas rodadas.',
          'Mantenha também a relação entre arquivo, revisão e observações. Se um IFC for substituído, deixe claro quais comentários pertenciam à entrega anterior. O objetivo é permitir que qualquer participante compreenda o contexto sem depender da memória de quem participou da última reunião.'
        ]
      },
      {
        id: 'papel-na-rotina',
        title: 'Use o IFC como parte de um processo de informação',
        paragraphs: [
          'O IFC oferece uma base comum para a troca; a equipe continua responsável por dizer o que precisa receber e por conferir o resultado. Guarde a versão entregue, preserve o contexto dos comentários e documente a decisão de aceitar ou solicitar ajustes.',
          'Uma troca bem organizada termina com um acordo verificável: o destinatário consegue executar a tarefa prevista, sabe quais limitações permanecem e identifica quem deve resolver cada pendência. Esse é um critério mais útil do que avaliar a entrega apenas pelo tamanho do arquivo ou pela qualidade de sua imagem.'
        ]
      }
    ],
    takeaway: 'Antes de usar um IFC em uma decisão, confira sua revisão, seu escopo e as informações necessárias à tarefa. Combine o teste com quem produz e com quem recebe.',
    sources: [
      { id: 'ifc-intro', title: 'buildingSMART · Introdução ao IFC', url: 'https://technical.buildingsmart.org/standards/ifc/' },
      { id: 'ifc-standard', title: 'buildingSMART · Padrão IFC e implementações', url: 'https://www.buildingsmart.org/standards/bsi-standards/industry-foundation-classes/?lang=en' },
      { id: 'ifc-validation', title: 'buildingSMART · Escopo do serviço de validação IFC', url: 'https://technical.buildingsmart.org/services/validation-service/' }
    ]
  },
  {
    slug: 'checklist-revisao-modelo-bim',
    title: 'Checklist para revisar um modelo BIM com mais clareza',
    description: 'Um roteiro para conferir revisão, escopo, geometria e propriedades de um modelo BIM, registrar pendências e preparar uma devolutiva que ajude a equipe.',
    category: 'Boas práticas',
    date: '2026-09-12',
    author: 'Equipe Arxis',
    readMinutes: 5,
    image: '/images/editorial/revisao.webp',
    imageAlt: 'Avatar Arxis revisando um modelo de edificação e seus elementos em um tablet.',
    intro: [
      'Uma revisão começa antes de girar a câmera. É preciso saber qual entrega está sendo analisada, para qual finalidade e segundo quais critérios. Sem esse contexto, a equipe pode discutir um detalhe que ainda não pertence à fase atual ou aprovar uma versão que já foi substituída.',
      'Este roteiro propõe uma sequência prática para a conferência inicial. Adapte a profundidade à disciplina, à etapa e às responsabilidades do projeto. Os exemplos são ilustrativos e a lista serve para organizar o trabalho; os critérios de aceitação devem vir dos requisitos acordados para a entrega.'
    ],
    sections: [
      {
        id: 'identifique-a-entrega',
        title: '1. Identifique a entrega que está na tela',
        paragraphs: [
          'Registre nome do arquivo, revisão, data de recebimento e responsável pela emissão. Confirme se esta é a versão que deve ser usada na reunião ou na conferência. Se houver modelos de várias disciplinas, identifique cada um separadamente e registre quais revisões foram reunidas.',
          'Uma observação perde utilidade quando ninguém sabe a qual entrega ela se refere. Deixe essa identificação junto do registro da revisão. Evite depender apenas da data de modificação do arquivo, que pode mudar durante uma cópia sem representar uma nova emissão do projeto.'
        ]
      },
      {
        id: 'escopo-e-criterios',
        title: '2. Confirme escopo e critérios antes de apontar falhas',
        paragraphs: [
          'Confira os pavimentos, as áreas, as disciplinas e os tipos de elementos previstos. Depois, escreva quais informações serão verificadas nesta rodada. Um detalhe ausente só pode ser classificado corretamente quando a equipe sabe se ele era exigido naquela entrega.',
          'Para requisitos de informação que possam ser formalizados, o padrão IDS, Information Delivery Specification, da buildingSMART permite descrever exigências de modo interpretável por computador, incluindo objetos, propriedades e valores. A aplicação desse recurso depende das ferramentas e do processo adotados pela equipe.'
        ],
        sourceIds: ['ids']
      },
      {
        id: 'contexto-geometrico',
        title: '3. Leia a geometria com referências conhecidas',
        paragraphs: [
          'Comece pela visão geral: orientação, posição relativa dos modelos e organização por pavimentos. Use um ponto conhecido do projeto para conferir alinhamento. Em seguida, examine áreas representativas com cortes e aproximações, conforme os recursos disponíveis na ferramenta.',
          'Ao encontrar uma situação suspeita, diferencie o que observou da conclusão técnica. “O duto atravessa a região ocupada por esta viga na revisão recebida” descreve uma evidência. A definição da solução exige os responsáveis pelo projeto e o contexto da disciplina. A revisão deve tornar a decisão possível, com uma localização clara.'
        ]
      },
      {
        id: 'propriedades',
        title: '4. Consulte as propriedades que a tarefa exige',
        paragraphs: [
          'Selecione elementos de categorias relevantes e confira identificação, tipo, material e outros campos previstos. Compare o que aparece com os critérios registrados no início. Um campo preenchido pode continuar inadequado se o valor for genérico, ambíguo ou diferente do padrão combinado.',
          'Em uma amostragem inicial, anote quais elementos foram consultados. Ela pode revelar padrões de problema, mas não comprova a qualidade de todos os objetos. Se um erro se repetir, amplie a verificação daquela categoria e combine como será feita a conferência completa.'
        ],
        list: [
          'O campo existe no local esperado?',
          'O valor é compreensível para quem recebe?',
          'A unidade ou a convenção de preenchimento está clara?',
          'A informação corresponde à finalidade desta revisão?'
        ]
      },
      {
        id: 'validacao-e-aceitacao',
        title: '5. Separe conformidade técnica e aceitação do projeto',
        paragraphs: [
          'Quando a entrega for em IFC, considere a validação de sua estrutura. O serviço oficial da buildingSMART verifica conformidade com o padrão, incluindo sintaxe e esquema. A própria documentação delimita esse escopo: requisitos particulares de um projeto ou de uma organização não são automaticamente verificados por essa validação.',
          'Registre os resultados em campos diferentes. Um arquivo pode passar pela validação técnica e continuar com pendências de informação para a sua equipe. Da mesma forma, uma boa leitura visual não é evidência suficiente de conformidade estrutural do arquivo.'
        ],
        sourceIds: ['validation']
      },
      {
        id: 'devolutiva',
        title: '6. Transforme cada observação em uma devolutiva útil',
        paragraphs: [
          'Uma pendência deve permitir que outra pessoa encontre o problema e saiba qual resposta é necessária. Registre a revisão, a localização, o elemento, a evidência e a solicitação. Acrescente responsável e prazo conforme o acordo da equipe; evite espalhar versões da mesma observação em vários canais.',
          'O BCF, BIM Collaboration Format, é um padrão da buildingSMART para compartilhar assuntos associados ao modelo, com contexto de visualização e referências a elementos. Quando as ferramentas envolvidas oferecem suporte, ele pode ajudar a manter a discussão vinculada ao local analisado.'
        ],
        sourceIds: ['bcf'],
        list: [
          'Arquivo e revisão: identifique exatamente a entrega analisada.',
          'Localização e elemento: forneça referência que outra pessoa consiga encontrar.',
          'Observação: descreva o que foi visto, com captura quando útil.',
          'Solicitação: indique o esclarecimento ou ajuste esperado.',
          'Retorno: registre responsável, situação e revisão de conferência.'
        ]
      },
      {
        id: 'fechamento',
        title: '7. Confira o retorno e feche a revisão',
        paragraphs: [
          'Quando receber uma nova entrega, confira os itens devolvidos na versão correta. Uma resposta dizendo “resolvido” precisa ser relacionada à evidência da nova revisão. Se a pendência permanecer, registre o que ainda falta e devolva o contexto à pessoa responsável.',
          'Ao encerrar, deixe três coisas acessíveis: o conjunto de arquivos analisado, o resultado das conferências e a lista de pendências restantes. Essa organização ajuda a próxima pessoa a continuar o trabalho sem reconstruir toda a conversa. Salve este roteiro e adapte-o ao seu próximo ciclo de revisão.'
        ]
      }
    ],
    takeaway: 'Uma revisão útil liga cada observação a uma entrega, a um elemento e a uma ação clara. O resultado deve ser compreensível para quem vai continuar o trabalho.',
    sources: [
      { id: 'ids', title: 'buildingSMART · Information Delivery Specification', url: 'https://www.buildingsmart.org/standards/bsi-standards/information-delivery-specification-ids/' },
      { id: 'validation', title: 'buildingSMART · Escopo do serviço de validação IFC', url: 'https://technical.buildingsmart.org/services/validation-service/' },
      { id: 'bcf', title: 'buildingSMART · BIM Collaboration Format', url: 'https://technical.buildingsmart.org/standards/bcf/' }
    ]
  }
]

export function getArticle(slug: string | undefined): Article | undefined {
  return articles.find((article) => article.slug === slug)
}

export function formatArticleDate(date: string, compact = false): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric', month: compact ? 'short' : 'long', year: 'numeric', timeZone: 'UTC'
  }).format(new Date(`${date}T12:00:00Z`))
}
