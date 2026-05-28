/**
 * IFC Structural Service
 * Análise estrutural detalhada (vigas, pilares, lajes, fundações)
 */
export class IfcStructuralService {
    /**
     * Extrai elementos estruturais (colunas, vigas, lajes, fundações)
     */
    extractStructuralElements(ifcContent) {
        const elements = [];
        // Padrões para elementos estruturais
        const patterns = [
            { type: 'IFCCOLUMN', loadBearing: true },
            { type: 'IFCBEAM', loadBearing: true },
            { type: 'IFCSLAB', loadBearing: true },
            { type: 'IFCWALL', loadBearing: false }, // Pode ser load-bearing
            { type: 'IFCFOOTING', loadBearing: true },
            { type: 'IFCPILE', loadBearing: true },
        ];
        for (const { type, loadBearing } of patterns) {
            const pattern = new RegExp(`#(\\d+)=${type}\\('([^']*)'`, 'g');
            let match;
            while ((match = pattern.exec(ifcContent)) !== null) {
                const elementId = `#${match[1]}`;
                elements.push({
                    elementId,
                    elementType: type,
                    loadBearing: this.checkLoadBearing(ifcContent, elementId) || loadBearing,
                    material: this.extractMaterial(ifcContent, elementId),
                    dimensions: this.extractDimensions(ifcContent, elementId, type),
                });
            }
        }
        return elements;
    }
    /**
     * Analisa grid estrutural (malha de pilares e vigas)
     */
    analyzeStructuralGrid(elements) {
        const columns = elements.filter((e) => e.elementType === 'IFCCOLUMN');
        const beams = elements.filter((e) => e.elementType === 'IFCBEAM');
        const xPositions = columns
            .map((c) => c.position?.x)
            .filter((x) => x !== undefined)
            .sort((a, b) => a - b);
        const yPositions = columns
            .map((c) => c.position?.y)
            .filter((y) => y !== undefined)
            .sort((a, b) => a - b);
        const xSpacing = this.calculateSpacing(xPositions);
        const ySpacing = this.calculateSpacing(yPositions);
        const recommendations = [];
        if (columns.length === 0) {
            recommendations.push('No structural columns found - verify structural elements');
        }
        if (xSpacing.length > 0 && Math.max(...xSpacing) > 12) {
            recommendations.push('Large column spacing detected (>12m) - verify structural design');
        }
        return {
            columns,
            beams,
            gridSpacing: { xSpacing, ySpacing },
            recommendations,
        };
    }
    /**
     * Analisa fundações
     */
    analyzeFoundations(ifcContent) {
        const foundations = [];
        const byType = {};
        // IFCFOOTING (sapatas, blocos)
        const footingPattern = /#(\d+)=IFCFOOTING\(/g;
        let match;
        while ((match = footingPattern.exec(ifcContent)) !== null) {
            const foundationId = `#${match[1]}`;
            foundations.push({
                foundationId,
                foundationType: 'Footing',
            });
            byType['Footing'] = (byType['Footing'] || 0) + 1;
        }
        // IFCPILE (estacas)
        const pilePattern = /#(\d+)=IFCPILE\(/g;
        while ((match = pilePattern.exec(ifcContent)) !== null) {
            const foundationId = `#${match[1]}`;
            foundations.push({
                foundationId,
                foundationType: 'Pile',
            });
            byType['Pile'] = (byType['Pile'] || 0) + 1;
        }
        return {
            foundations,
            totalFoundations: foundations.length,
            byType,
        };
    }
    /**
     * Analisa elementos estruturais
     */
    analyzeStructural(elements) {
        const byType = {};
        const materials = {};
        let loadBearingElements = 0;
        for (const element of elements) {
            byType[element.elementType] = (byType[element.elementType] || 0) + 1;
            if (element.loadBearing) {
                loadBearingElements++;
            }
            if (element.material) {
                materials[element.material] = (materials[element.material] || 0) + 1;
            }
        }
        return {
            totalElements: elements.length,
            byType,
            loadBearingElements,
            materials,
        };
    }
    /**
     * Detecta problemas estruturais
     */
    detectStructuralIssues(elements) {
        const issues = [];
        // Verificar colunas sem dimensões
        const columnsNoDims = elements.filter((e) => e.elementType === 'IFCCOLUMN' && !e.dimensions);
        if (columnsNoDims.length > 0) {
            issues.push({
                severity: 'warning',
                element: 'Columns',
                message: `${columnsNoDims.length} columns without dimensions`,
            });
        }
        // Verificar vigas sem comprimento
        const beamsNoLength = elements.filter((e) => e.elementType === 'IFCBEAM' && !e.dimensions?.length);
        if (beamsNoLength.length > 0) {
            issues.push({
                severity: 'warning',
                element: 'Beams',
                message: `${beamsNoLength.length} beams without length information`,
            });
        }
        // Verificar elementos sem material
        const noMaterial = elements.filter((e) => !e.material && e.loadBearing);
        if (noMaterial.length > 0) {
            issues.push({
                severity: 'info',
                element: 'Materials',
                message: `${noMaterial.length} load-bearing elements without material assignment`,
            });
        }
        return {
            hasIssues: issues.length > 0,
            issues,
        };
    }
    /**
     * Valida modelo estrutural
     */
    validateStructuralModel(elements) {
        const recommendations = [];
        const columns = elements.filter((e) => e.elementType === 'IFCCOLUMN');
        const beams = elements.filter((e) => e.elementType === 'IFCBEAM');
        const slabs = elements.filter((e) => e.elementType === 'IFCSLAB');
        if (columns.length === 0) {
            recommendations.push('Add structural columns to the model');
        }
        if (beams.length === 0) {
            recommendations.push('Add structural beams to the model');
        }
        if (slabs.length === 0) {
            recommendations.push('Add structural slabs to the model');
        }
        const withMaterial = elements.filter((e) => e.material).length;
        const completeness = elements.length > 0 ? (withMaterial / elements.length) * 100 : 0;
        if (completeness < 50) {
            recommendations.push('Assign materials to structural elements (currently < 50%)');
        }
        return {
            isValid: recommendations.length === 0,
            completeness,
            recommendations,
        };
    }
    /**
     * Verifica se elemento é load-bearing
     */
    checkLoadBearing(ifcContent, elementId) {
        const pattern = new RegExp(`${elementId}[^#]*IFCPROPERTYSINGLEVALUE\\('LoadBearing'[^,]*,\\.T\\.`, 'i');
        return pattern.test(ifcContent);
    }
    /**
     * Extrai material do elemento
     */
    extractMaterial(ifcContent, elementId) {
        const pattern = new RegExp(`${elementId}[^#]*IFCMATERIAL\\('([^']+)'`, 'i');
        const match = ifcContent.match(pattern);
        return match ? match[1] : undefined;
    }
    /**
     * Extrai dimensões do elemento
     */
    extractDimensions(ifcContent, elementId, type) {
        // Simplificado - extrair de Qto_ColumnBaseQuantities, etc.
        const lengthMatch = ifcContent.match(new RegExp(`${elementId}[^#]*IFCQUANTITYLENGTH\\('Length'[^,]*,([0-9.]+)`, 'i'));
        const widthMatch = ifcContent.match(new RegExp(`${elementId}[^#]*IFCQUANTITYLENGTH\\('Width'[^,]*,([0-9.]+)`, 'i'));
        const heightMatch = ifcContent.match(new RegExp(`${elementId}[^#]*IFCQUANTITYLENGTH\\('Height'[^,]*,([0-9.]+)`, 'i'));
        if (!lengthMatch && !widthMatch && !heightMatch)
            return undefined;
        return {
            length: lengthMatch ? parseFloat(lengthMatch[1]) : undefined,
            width: widthMatch ? parseFloat(widthMatch[1]) : undefined,
            height: heightMatch ? parseFloat(heightMatch[1]) : undefined,
        };
    }
    /**
     * Calcula espaçamentos entre elementos
     */
    calculateSpacing(positions) {
        const spacing = [];
        for (let i = 1; i < positions.length; i++) {
            spacing.push(positions[i] - positions[i - 1]);
        }
        return spacing;
    }
}
//# sourceMappingURL=ifc-structural.service.js.map