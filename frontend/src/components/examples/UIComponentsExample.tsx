import React, { useState } from 'react';
import { 
  Button, 
  Panel, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions,
  Input,
  Toolbar,
  ToolbarSeparator,
  ToolbarGroup,
  Menu,
  MenuItem,
  Tabs,
  TabsList,
  TabTrigger,
  TabContent,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  List,
  ListItem,
  ListHeader,
  ListEmpty,
  Tooltip
} from '../index';

/**
 * Exemplo de uso dos componentes UI com integração com controllers
 * Este arquivo demonstra como os componentes devem ser usados em conjunto
 * com controllers e state management
 */

// Simulação de um controller
interface PropertyPanelController {
  selectedObject: any;
  properties: Record<string, any>;
  isSaving: boolean;
  canDelete: boolean;
  onSave: () => void;
  onDelete: () => void;
  onClose: () => void;
}

export const PropertyPanelExample: React.FC<{ controller: PropertyPanelController }> = ({ 
  controller 
}) => {
  return (
    <Panel 
      title="Propriedades" 
      onClose={controller.onClose} 
      size="lg" 
      variant="glass"
    >
      <div className="space-y-4">
        <div>
          <h3 className="font-medium text-gray-900 mb-2">Objeto Selecionado</h3>
          <p className="text-sm text-gray-600">{controller.selectedObject?.name || 'Nenhum'}</p>
        </div>
        
        <div>
          <h3 className="font-medium text-gray-900 mb-2">Propriedades</h3>
          <List>
            {Object.entries(controller.properties).map(([key, value]) => (
              <ListItem key={key}>
                <div className="flex justify-between w-full">
                  <span className="text-gray-600">{key}</span>
                  <span className="font-medium">{String(value)}</span>
                </div>
              </ListItem>
            ))}
          </List>
        </div>
        
        <div className="flex gap-2 pt-4 border-t border-gray-200">
          <Button 
            variant="primary" 
            onClick={controller.onSave} 
            loading={controller.isSaving}
          >
            Salvar
          </Button>
          <Button 
            variant="danger" 
            onClick={controller.onDelete}
            disabled={!controller.canDelete}
          >
            Remover
          </Button>
        </div>
      </div>
    </Panel>
  );
};

// Simulação de um controller para toolbar
interface ToolbarController {
  isUploading: boolean;
  canSnapshot: boolean;
  onUploadIFC: () => void;
  onSnapshot: () => void;
  onExportGLB: () => void;
  onExportPNG: () => void;
}

export const ToolbarExample: React.FC<{ controller: ToolbarController }> = ({ 
  controller 
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <Toolbar variant="elevated">
      <ToolbarGroup label="Ações do modelo">
        <Button 
          icon="📤" 
          onClick={controller.onUploadIFC} 
          loading={controller.isUploading}
          size="sm"
        >
          Upload IFC
        </Button>
        <Button 
          icon="📷" 
          onClick={controller.onSnapshot} 
          disabled={!controller.canSnapshot}
          size="sm"
        >
          Snapshot
        </Button>
      </ToolbarGroup>
      
      <ToolbarSeparator />
      
      <ToolbarGroup label="Exportação">
        <Menu trigger={<Button icon="⬇️" size="sm">Exportar</Button>}>
          <MenuItem onClick={controller.onExportGLB}>Exportar GLB</MenuItem>
          <MenuItem onClick={controller.onExportPNG}>Exportar PNG</MenuItem>
        </Menu>
      </ToolbarGroup>
    </Toolbar>
  );
};

// Exemplo de diálogo de confirmação
interface ConfirmDialogController {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialogExample: React.FC<{ controller: ConfirmDialogController }> = ({ 
  controller 
}) => {
  return (
    <Dialog open={controller.isOpen} onClose={controller.onCancel} size="md">
      <DialogTitle>{controller.title}</DialogTitle>
      <DialogContent>{controller.message}</DialogContent>
      <DialogActions>
        <Button onClick={controller.onCancel}>Cancelar</Button>
        <Button variant="danger" onClick={controller.onConfirm}>
          Confirmar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Exemplo de formulário com validação
interface FormController {
  data: { name: string; email: string };
  errors: Record<string, string>;
  onChange: (field: string, value: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

export const FormExample: React.FC<{ controller: FormController }> = ({ 
  controller 
}) => {
  return (
    <Card variant="elevated" padding="lg">
      <CardHeader>
        <CardTitle>Formulário de Exemplo</CardTitle>
        <CardDescription>Preencha os campos abaixo</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Input
            label="Nome"
            value={controller.data.name}
            onChange={(e) => controller.onChange('name', e.target.value)}
            placeholder="Digite seu nome"
            error={controller.errors.name}
          />
          <Input
            label="Email"
            value={controller.data.email}
            onChange={(e) => controller.onChange('email', e.target.value)}
            placeholder="seu@email.com"
            error={controller.errors.email}
            helperText="Usaremos este email para contato"
          />
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={controller.onSubmit} 
          loading={controller.isSubmitting}
          className="w-full"
        >
          Enviar
        </Button>
      </CardFooter>
    </Card>
  );
};

// Exemplo de tabs com conteúdo dinâmico
interface TabsController {
  activeTab: string;
  onTabChange: (tab: string) => void;
  tabs: { id: string; label: string; content: React.ReactNode }[];
}

export const TabsExample: React.FC<{ controller: TabsController }> = ({ 
  controller 
}) => {
  return (
    <Card>
      <Tabs defaultValue={controller.activeTab}>
        <TabsList>
          {controller.tabs.map((tab) => (
            <TabTrigger 
              key={tab.id} 
              value={tab.id}
              onClick={() => controller.onTabChange(tab.id)}
            >
              {tab.label}
            </TabTrigger>
          ))}
        </TabsList>
        {controller.tabs.map((tab) => (
          <TabContent key={tab.id} value={tab.id}>
            <CardContent>
              {tab.content}
            </CardContent>
          </TabContent>
        ))}
      </Tabs>
    </Card>
  );
};

// Exemplo de lista com seleção
interface ListController {
  items: { id: string; name: string; description: string }[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onFilterChange: (filter: string) => void;
  filter: string;
}

export const ListExample: React.FC<{ controller: ListController }> = ({ 
  controller 
}) => {
  const filteredItems = controller.items.filter(item =>
    item.name.toLowerCase().includes(controller.filter.toLowerCase())
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lista de Itens</CardTitle>
        <Input
          value={controller.filter}
          onChange={(e) => controller.onFilterChange(e.target.value)}
          placeholder="Buscar..."
        />
      </CardHeader>
      <CardContent>
        {filteredItems.length === 0 ? (
          <ListEmpty>Nenhum item encontrado</ListEmpty>
        ) : (
          <List>
            {filteredItems.map((item) => (
              <ListItem
                key={item.id}
                selected={controller.selectedId === item.id}
                onClick={() => controller.onSelect(item.id)}
              >
                <div>
                  <div className="font-medium">{item.name}</div>
                  <div className="text-sm text-gray-600">{item.description}</div>
                </div>
              </ListItem>
            ))}
          </List>
        )}
      </CardContent>
    </Card>
  );
};

// Exemplo completo combinando múltiplos componentes
export const CompleteUIExample: React.FC = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('properties');
  const [search, setSearch] = useState('');

  const toolbarController: ToolbarController = {
    isUploading: false,
    canSnapshot: true,
    onUploadIFC: () => console.log('Upload IFC'),
    onSnapshot: () => console.log('Snapshot'),
    onExportGLB: () => console.log('Export GLB'),
    onExportPNG: () => console.log('Export PNG'),
  };

  const propertyController: PropertyPanelController = {
    selectedObject: { name: 'Parede Externa' },
    properties: {
      'Altura': '3.0m',
      'Largura': '5.0m',
      'Material': 'Concreto',
    },
    isSaving: false,
    canDelete: true,
    onSave: () => console.log('Save'),
    onDelete: () => setDialogOpen(true),
    onClose: () => console.log('Close'),
  };

  const confirmController: ConfirmDialogController = {
    isOpen: dialogOpen,
    title: 'Confirmar exclusão',
    message: 'Tem certeza que deseja remover este objeto?',
    onConfirm: () => {
      console.log('Confirmed');
      setDialogOpen(false);
    },
    onCancel: () => setDialogOpen(false),
  };

  return (
    <div className="p-6 space-y-6">
      <ToolbarExample controller={toolbarController} />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PropertyPanelExample controller={propertyController} />
        
        <Card>
          <Tabs defaultValue={activeTab}>
            <TabsList>
              <TabTrigger value="properties" onClick={() => setActiveTab('properties')}>
                Propriedades
              </TabTrigger>
              <TabTrigger value="layers" onClick={() => setActiveTab('layers')}>
                Camadas
              </TabTrigger>
              <TabTrigger value="history" onClick={() => setActiveTab('history')}>
                Histórico
              </TabTrigger>
            </TabsList>
            <TabContent value="properties">
              <CardContent>
                <p className="text-gray-600">Conteúdo das propriedades</p>
              </CardContent>
            </TabContent>
            <TabContent value="layers">
              <CardContent>
                <p className="text-gray-600">Conteúdo das camadas</p>
              </CardContent>
            </TabContent>
            <TabContent value="history">
              <CardContent>
                <p className="text-gray-600">Conteúdo do histórico</p>
              </CardContent>
            </TabContent>
          </Tabs>
        </Card>
      </div>

      <ConfirmDialogExample controller={confirmController} />
    </div>
  );
};

export default CompleteUIExample;
