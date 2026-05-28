/**
 * IFC Processing Service
 *
 * Funções utilitárias para processar arquivos IFC
 * Extrai metadados, valida estrutura, etc.
 *
 * IMPORTANTE: Para produção, considere usar web-ifc no backend
 * ou processar em worker threads para não bloquear o event loop
 */
export interface IfcMetadataExtracted {
    schema?: string;
    application?: string;
    author?: string;
    timestamp?: string;
    projectName?: string;
    elementCount?: number;
    fileSize: number;
}
export declare class IfcProcessingService {
    /**
     * Extract basic metadata from IFC file header
     * Reads only the first few KB to get header info
     */
    extractMetadata(fileBuffer: Buffer): Promise<IfcMetadataExtracted>;
    /**
     * Validate IFC file structure
     * Basic validation without full parsing
     */
    validateIfcStructure(fileBuffer: Buffer): {
        valid: boolean;
        errors: string[];
        warnings: string[];
    };
    /**
     * Get IFC schema version from file
     */
    getIfcVersion(fileBuffer: Buffer): string | null;
    /**
     * Estimate processing time based on file size
     * Returns estimated seconds
     */
    estimateProcessingTime(fileSizeBytes: number): number;
    /**
     * Generate file hash for caching
     * Simple hash for identifying duplicate files
     */
    generateFileHash(fileBuffer: Buffer): string;
    /**
     * Check if file is compressed IFC (IFCZIP or IFCXML)
     */
    detectIfcFormat(fileBuffer: Buffer): 'ifc' | 'ifczip' | 'ifcxml' | 'unknown';
    /**
     * Sanitize IFC filename
     * Remove special characters, spaces, etc.
     */
    sanitizeFilename(filename: string): string;
    /**
     * Generate thumbnail placeholder based on discipline
     * Returns a data URL or placeholder URL
     */
    generatePlaceholderThumbnail(discipline: string | null): string;
    /**
     * Split large IFC into chunks for streaming
     * Useful for progressive loading in the frontend
     */
    streamIfcChunks(fileBuffer: Buffer, chunkSize?: number): AsyncGenerator<Buffer>;
    /**
     * Check if IFC file is too large for processing
     * Based on environment variable or default limit
     */
    isFileTooLarge(fileSizeBytes: number): boolean;
    /**
     * Get file size in human-readable format
     */
    formatFileSize(bytes: number): string;
    /**
     * Merge metadata from extraction with user-provided metadata
     */
    mergeMetadata(extracted: IfcMetadataExtracted, userProvided: any): Record<string, any>;
}
//# sourceMappingURL=ifc-processing.service.d.ts.map