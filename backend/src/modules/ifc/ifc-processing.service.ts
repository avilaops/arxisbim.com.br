import { createHash } from 'node:crypto';
import type { IfcModel } from './ifc.schemas.js';

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

export class IfcProcessingService {
  /**
   * Extract basic metadata from IFC file header
   * Reads only the first few KB to get header info
   */
  async extractMetadata(fileBuffer: Buffer): Promise<IfcMetadataExtracted> {
    const metadata: IfcMetadataExtracted = {
      fileSize: fileBuffer.length,
    };

    try {
      // Read first 10KB of file (header section)
      const headerSize = Math.min(fileBuffer.length, 10240);
      const headerText = fileBuffer.subarray(0, headerSize).toString('utf-8');

      // Extract IFC schema version (e.g., IFC2X3, IFC4)
      const schemaMatch = headerText.match(/FILE_SCHEMA\s*\(\s*\('([^']+)'/);
      if (schemaMatch) {
        metadata.schema = schemaMatch[1];
      }

      // Extract application name
      const appMatch = headerText.match(/ORIGINATING_SYSTEM\s*=\s*'([^']+)'/i) ||
                       headerText.match(/PREPROCESSOR_VERSION\s*=\s*'([^']+)'/i);
      if (appMatch) {
        metadata.application = appMatch[1];
      }

      // Extract author
      const authorMatch = headerText.match(/AUTHOR\s*=\s*\('([^']+)'/i);
      if (authorMatch) {
        metadata.author = authorMatch[1];
      }

      // Extract timestamp
      const timeMatch = headerText.match(/TIME_STAMP\s*=\s*'([^']+)'/i);
      if (timeMatch) {
        metadata.timestamp = timeMatch[1];
      }

      // Extract project name (if available in header)
      const projectMatch = headerText.match(/PROJECT\s*=\s*'([^']+)'/i) ||
                          headerText.match(/IFCPROJECT\([^,]*,\s*#\d+,\s*'([^']+)'/i);
      if (projectMatch) {
        metadata.projectName = projectMatch[1];
      }

      // Count approximate number of entities (rough estimation)
      const entityMatches = headerText.match(/#\d+=/g);
      if (entityMatches) {
        metadata.elementCount = entityMatches.length;
      }

    } catch (error) {
      console.error('Error extracting IFC metadata:', error);
    }

    return metadata;
  }

  /**
   * Validate IFC file structure
   * Basic validation without full parsing
   */
  validateIfcStructure(fileBuffer: Buffer): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const result = {
      valid: true,
      errors: [] as string[],
      warnings: [] as string[],
    };

    try {
      // Read first 64KB of file for structural validation
      const validationSize = Math.min(fileBuffer.length, 65536);
      const headerText = fileBuffer.subarray(0, validationSize).toString('utf-8');

      // Check for IFC header
      if (!headerText.startsWith('ISO-10303-21;')) {
        result.valid = false;
        result.errors.push('Missing IFC header (ISO-10303-21)');
      }

      // Check for HEADER section
      if (!headerText.includes('HEADER;')) {
        result.valid = false;
        result.errors.push('Missing HEADER section');
      }

      // Check for DATA section
      if (!headerText.includes('DATA;')) {
        result.valid = false;
        result.errors.push('Missing DATA section');
      }

      // Check file size
      if (fileBuffer.length < 100) { // Reduced from 1024 as small valid IFCs can exist
        result.valid = false;
        result.errors.push('File too small to be valid IFC');
      }

      // Check for END-ISO marker
      const endText = fileBuffer.subarray(-100).toString('utf-8');
      if (!endText.includes('END-ISO-10303-21;')) {
        result.warnings.push('Missing END-ISO marker (file might be truncated)');
      }

    } catch (error: any) {
      result.valid = false;
      result.errors.push(`Validation error: ${error.message}`);
    }

    return result;
  }

  /**
   * Get IFC schema version from file
   */
  getIfcVersion(fileBuffer: Buffer): string | null {
    try {
      const headerText = fileBuffer.subarray(0, 10240).toString('utf-8');
      const schemaMatch = headerText.match(/FILE_SCHEMA\s*\(\s*\('([^']+)'/);
      return schemaMatch ? schemaMatch[1] : null;
    } catch {
      return null;
    }
  }

  /**
   * Estimate processing time based on file size
   * Returns estimated seconds
   */
  estimateProcessingTime(fileSizeBytes: number): number {
    // Rough estimate: ~10MB per second on average hardware
    const mbPerSecond = 10;
    const fileSizeMB = fileSizeBytes / (1024 * 1024);
    return Math.ceil(fileSizeMB / mbPerSecond);
  }

  /**
   * Generate file hash for caching
   * Simple hash for identifying duplicate files
   */
  generateFileHash(fileBuffer: Buffer): string {
    return createHash('sha256').update(fileBuffer).digest('hex');
  }

  /**
   * Check if file is compressed IFC (IFCZIP or IFCXML)
   */
  detectIfcFormat(fileBuffer: Buffer): 'ifc' | 'ifczip' | 'ifcxml' | 'unknown' {
    try {
      const headerText = fileBuffer.subarray(0, 1024).toString('utf-8');

      // Check for standard IFC (STEP format)
      if (headerText.startsWith('ISO-10303-21;')) {
        return 'ifc';
      }

      // Check for XML format
      if (headerText.includes('<?xml') && headerText.includes('ifcXML')) {
        return 'ifcxml';
      }

      // Check for ZIP format (magic bytes: 50 4B 03 04)
      if (fileBuffer[0] === 0x50 && fileBuffer[1] === 0x4B) {
        return 'ifczip';
      }

      return 'unknown';
    } catch {
      return 'unknown';
    }
  }

  /**
   * Sanitize IFC filename
   * Remove special characters, spaces, etc.
   */
  sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  /**
   * Generate thumbnail placeholder based on discipline
   * Returns a data URL or placeholder URL
   */
  generatePlaceholderThumbnail(discipline: string | null): string {
    const colors: Record<string, string> = {
      architecture: '#3B82F6',
      structure: '#EF4444',
      mep_electrical: '#F59E0B',
      mep_plumbing: '#06B6D4',
      mep_hvac: '#8B5CF6',
      mep_fire: '#DC2626',
      landscape: '#10B981',
      civil: '#6B7280',
      other: '#9CA3AF',
    };

    const color = discipline ? colors[discipline] || '#6B7280' : '#6B7280';
    
    // Generate SVG placeholder
    const svg = `
      <svg width="200" height="150" xmlns="http://www.w3.org/2000/svg">
        <rect width="200" height="150" fill="${color}"/>
        <text x="50%" y="50%" font-family="Arial" font-size="16" fill="white" text-anchor="middle" dominant-baseline="middle">
          ${discipline?.toUpperCase() || 'IFC'}
        </text>
      </svg>
    `;

    return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
  }

  /**
   * Split large IFC into chunks for streaming
   * Useful for progressive loading in the frontend
   */
  async *streamIfcChunks(
    fileBuffer: Buffer,
    chunkSize: number = 1024 * 1024 // 1MB chunks
  ): AsyncGenerator<Buffer> {
    let offset = 0;
    while (offset < fileBuffer.length) {
      const chunk = fileBuffer.subarray(offset, offset + chunkSize);
      yield chunk;
      offset += chunkSize;
    }
  }

  /**
   * Check if IFC file is too large for processing
   * Based on environment variable or default limit
   */
  isFileTooLarge(fileSizeBytes: number): boolean {
    const maxSizeMB = Number(process.env.MAX_FILE_SIZE_MB || 100);
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    return fileSizeBytes > maxSizeBytes;
  }

  /**
   * Get file size in human-readable format
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Merge metadata from extraction with user-provided metadata
   */
  mergeMetadata(
    extracted: IfcMetadataExtracted,
    userProvided: any
  ): Record<string, any> {
    return {
      // From file extraction
      schema: extracted.schema,
      application: extracted.application,
      author: extracted.author,
      timestamp: extracted.timestamp,
      projectName: extracted.projectName,
      elements: extracted.elementCount,
      
      // From user input
      description: userProvided.description,
      
      // Additional computed fields
      fileSizeBytes: extracted.fileSize,
      fileSizeMB: (extracted.fileSize / (1024 * 1024)).toFixed(2),
    };
  }
}
