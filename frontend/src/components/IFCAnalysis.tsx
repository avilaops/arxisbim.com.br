/**
 * Frontend TypeScript Client - Advanced IFC Analysis
 * Use this to integrate IFC element analysis with your frontend
 */

import { resolveApiBaseUrl } from '../config/apiBaseUrl';

const API_URL = resolveApiBaseUrl();

// Types for IFC Elements
export interface IfcElement {
  elementType: string;
  count: number;
  ids: string[];
}

export interface IfcElementsResponse {
  ifcModelId: string;
  version: string;
  elements: IfcElement[];
  summary: {
    totalElements: number;
    uniqueTypes: number;
    mostCommon: { type: string; count: number } | null;
  };
}

export interface IfcHierarchyResponse {
  ifcModelId: string;
  hierarchy: {
    site: string | null;
    buildings: string[];
    storeys: string[];
    spaces: string[];
  };
  stats: {
    buildingCount: number;
    storeyCount: number;
    spaceCount: number;
  };
}

export interface IfcComplexityResponse {
  ifcModelId: string;
  complexity: {
    level: 'simple' | 'moderate' | 'complex' | 'very_complex';
    score: number;
    factors: {
      entityCount: number;
      elementCount: number;
      relationshipCount: number;
      propertyCount: number;
    };
  };
  recommendations: string[];
}

export interface IfcCategoriesResponse {
  ifcModelId: string;
  categories: {
    structural: { types: string[]; count: number };
    architectural: { types: string[]; count: number };
    mep: { types: string[]; count: number };
    spatial: { types: string[]; count: number };
    other: { types: string[]; count: number };
  };
}

/**
 * IFC Advanced Analysis API Client
 */
export class IfcAnalysisAPI {
  constructor(private token: string) {}

  /**
   * Get all elements from IFC file
   */
  async getElements(ifcModelId: string): Promise<IfcElementsResponse> {
    const response = await fetch(`${API_URL}/api/v1/ifc/${ifcModelId}/elements`, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get elements: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get elements of specific type (e.g., IFCWALL, IFCBEAM)
   */
  async getElementsByType(ifcModelId: string, type: string): Promise<{
    elementType: string;
    count: number;
    elements: { id: string; properties: Record<string, any> }[];
  }> {
    const response = await fetch(`${API_URL}/api/v1/ifc/${ifcModelId}/elements/${type}`, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get elements by type: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get building hierarchy (Site > Building > Storey > Spaces)
   */
  async getHierarchy(ifcModelId: string): Promise<IfcHierarchyResponse> {
    const response = await fetch(`${API_URL}/api/v1/ifc/${ifcModelId}/hierarchy`, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get hierarchy: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Analyze IFC complexity
   */
  async analyzeComplexity(ifcModelId: string): Promise<IfcComplexityResponse> {
    const response = await fetch(`${API_URL}/api/v1/ifc/${ifcModelId}/complexity`, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to analyze complexity: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get statistics grouped by category
   */
  async getStatsByCategory(ifcModelId: string): Promise<IfcCategoriesResponse> {
    const response = await fetch(`${API_URL}/api/v1/ifc/${ifcModelId}/categories`, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get category stats: ${response.statusText}`);
    }

    return response.json();
  }
}

// ========================================
// Example Usage in React Component
// ========================================

/**
 * Example: Display IFC Elements
 */
export function IfcElementsView({ ifcModelId, token }: { ifcModelId: string; token: string }) {
  const [elements, setElements] = React.useState<IfcElementsResponse | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const api = new IfcAnalysisAPI(token);
    
    api.getElements(ifcModelId)
      .then(data => {
        setElements(data);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error loading elements:', error);
        setLoading(false);
      });
  }, [ifcModelId, token]);

  if (loading) return <div>Loading elements...</div>;
  if (!elements) return <div>No elements found</div>;

  return (
    <div>
      <h2>IFC Elements Analysis</h2>
      <p><strong>Version:</strong> {elements.version}</p>
      <p><strong>Total Elements:</strong> {elements.summary.totalElements}</p>
      <p><strong>Unique Types:</strong> {elements.summary.uniqueTypes}</p>
      
      {elements.summary.mostCommon && (
        <p>
          <strong>Most Common:</strong> {elements.summary.mostCommon.type} 
          ({elements.summary.mostCommon.count} instances)
        </p>
      )}

      <h3>Element Breakdown</h3>
      <table>
        <thead>
          <tr>
            <th>Type</th>
            <th>Count</th>
          </tr>
        </thead>
        <tbody>
          {elements.elements.map(el => (
            <tr key={el.elementType}>
              <td>{el.elementType}</td>
              <td>{el.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Example: Display Complexity Analysis
 */
export function IfcComplexityView({ ifcModelId, token }: { ifcModelId: string; token: string }) {
  const [complexity, setComplexity] = React.useState<IfcComplexityResponse | null>(null);

  React.useEffect(() => {
    const api = new IfcAnalysisAPI(token);
    
    api.analyzeComplexity(ifcModelId)
      .then(data => setComplexity(data))
      .catch(error => console.error('Error loading complexity:', error));
  }, [ifcModelId, token]);

  if (!complexity) return <div>Loading...</div>;

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'simple': return 'green';
      case 'moderate': return 'blue';
      case 'complex': return 'orange';
      case 'very_complex': return 'red';
      default: return 'gray';
    }
  };

  return (
    <div>
      <h2>Complexity Analysis</h2>
      
      <div style={{ 
        padding: '20px', 
        backgroundColor: getLevelColor(complexity.complexity.level),
        color: 'white',
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <h3>{complexity.complexity.level.replace('_', ' ').toUpperCase()}</h3>
        <p>Score: {complexity.complexity.score}</p>
      </div>

      <h4>Factors:</h4>
      <ul>
        <li>Entities: {complexity.complexity.factors.entityCount}</li>
        <li>Elements: {complexity.complexity.factors.elementCount}</li>
        <li>Relationships: {complexity.complexity.factors.relationshipCount}</li>
        <li>Properties: {complexity.complexity.factors.propertyCount}</li>
      </ul>

      {complexity.recommendations.length > 0 && (
        <>
          <h4>Recommendations:</h4>
          <ul>
            {complexity.recommendations.map((rec, i) => (
              <li key={i}>{rec}</li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

/**
 * Example: Display Building Hierarchy
 */
export function IfcHierarchyView({ ifcModelId, token }: { ifcModelId: string; token: string }) {
  const [hierarchy, setHierarchy] = React.useState<IfcHierarchyResponse | null>(null);

  React.useEffect(() => {
    const api = new IfcAnalysisAPI(token);
    
    api.getHierarchy(ifcModelId)
      .then(data => setHierarchy(data))
      .catch(error => console.error('Error loading hierarchy:', error));
  }, [ifcModelId, token]);

  if (!hierarchy) return <div>Loading...</div>;

  return (
    <div>
      <h2>Building Hierarchy</h2>
      
      <div style={{ marginLeft: '20px' }}>
        {hierarchy.hierarchy.site && (
          <div>
            <strong>🌍 Site:</strong> {hierarchy.hierarchy.site}
          </div>
        )}

        {hierarchy.hierarchy.buildings.length > 0 && (
          <div style={{ marginLeft: '20px', marginTop: '10px' }}>
            <strong>🏢 Buildings ({hierarchy.stats.buildingCount}):</strong>
            <ul>
              {hierarchy.hierarchy.buildings.map(building => (
                <li key={building}>{building}</li>
              ))}
            </ul>
          </div>
        )}

        {hierarchy.hierarchy.storeys.length > 0 && (
          <div style={{ marginLeft: '40px' }}>
            <strong>📊 Storeys ({hierarchy.stats.storeyCount}):</strong>
            <ul>
              {hierarchy.hierarchy.storeys.slice(0, 10).map(storey => (
                <li key={storey}>{storey}</li>
              ))}
              {hierarchy.hierarchy.storeys.length > 10 && (
                <li>... and {hierarchy.hierarchy.storeys.length - 10} more</li>
              )}
            </ul>
          </div>
        )}

        {hierarchy.hierarchy.spaces.length > 0 && (
          <div style={{ marginLeft: '60px' }}>
            <strong>🔲 Spaces ({hierarchy.stats.spaceCount}):</strong>
            <span> {hierarchy.stats.spaceCount} total spaces</span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Example: Display Category Statistics
 */
export function IfcCategoriesView({ ifcModelId, token }: { ifcModelId: string; token: string }) {
  const [categories, setCategories] = React.useState<IfcCategoriesResponse | null>(null);

  React.useEffect(() => {
    const api = new IfcAnalysisAPI(token);
    
    api.getStatsByCategory(ifcModelId)
      .then(data => setCategories(data))
      .catch(error => console.error('Error loading categories:', error));
  }, [ifcModelId, token]);

  if (!categories) return <div>Loading...</div>;

  const categoryIcons: Record<string, string> = {
    structural: '🏗️',
    architectural: '🏛️',
    mep: '⚡',
    spatial: '📐',
    other: '📦',
  };

  return (
    <div>
      <h2>Category Statistics</h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {Object.entries(categories.categories).map(([category, data]) => (
          <div key={category} style={{ 
            border: '1px solid #ccc', 
            padding: '15px', 
            borderRadius: '8px' 
          }}>
            <h3>
              {categoryIcons[category]} {category.charAt(0).toUpperCase() + category.slice(1)}
            </h3>
            <p><strong>Count:</strong> {data.count}</p>
            <p><strong>Types:</strong> {data.types.length}</p>
            {data.types.length > 0 && (
              <details>
                <summary>View types</summary>
                <ul>
                  {data.types.map(type => (
                    <li key={type}>{type}</li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
