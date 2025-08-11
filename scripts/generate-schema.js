#!/usr/bin/env node

import { readFileSync, writeFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class SchemaGenerator {
  constructor(specsDir, schemaPath) {
    this.specsDir = specsDir;
    this.schemaPath = schemaPath;
  }

  /**
   * Parse a .concept file and extract state definitions
   */
  parseConceptFile(filePath) {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').map(line => line.trim());
    
    let currentSection = '';
    let currentEntity = '';
    const concept = {
      name: '',
      purpose: '',
      state: [],
      actions: [],
      queries: []
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (line.startsWith('concept ')) {
        concept.name = line.replace('concept ', '');
        continue;
      }

      if (line === 'purpose') {
        currentSection = 'purpose';
        continue;
      }

      if (line === 'state') {
        currentSection = 'state';
        continue;
      }

      if (line === 'actions') {
        currentSection = 'actions';
        continue;
      }

      if (line === 'queries') {
        currentSection = 'queries';
        continue;
      }

      if (currentSection === 'purpose' && line && !line.startsWith(' ')) {
        concept.purpose = line;
      }

      if (currentSection === 'state' && line && !line.startsWith(' ') && !line.includes(':') && !line.startsWith('#') && !line.startsWith('//') && /^[A-Za-z_][A-Za-z0-9_]*$/.test(line)) {
        // This is an entity definition (valid identifier, doesn't contain a colon, and isn't a comment)
        currentEntity = line;
        concept.state.push({
          name: currentEntity,
          fields: []
        });
      }

      // Use original line for field detection (before trimming)
      const originalLine = content.split('\n')[i];
      if (currentSection === 'state' && originalLine.startsWith('    ') && currentEntity && originalLine.includes(':')) {
        // This is a field definition (contains a colon and is indented)
        const field = this.parseFieldDefinition(originalLine.trim());
        if (field) {
          const entityIndex = concept.state.findIndex(s => s.name === currentEntity);
          if (entityIndex >= 0) {
            concept.state[entityIndex].fields.push(field);
          }
        }
      }
    }

    return concept;
  }

  /**
   * Parse field definition from SSF format
   */
  parseFieldDefinition(line) {
    // Handle comment lines
    if (line.startsWith('//') || line.startsWith('#')) {
      return null;
    }

    // Parse field: fieldName: Type | Type? | [Type] | ObjectId | etc.
    const match = line.match(/^(\w+):\s*(.+?)(?:\s*\/\/.*)?$/);
    if (!match) return null;

    const [, fieldName, typeDefinition] = match;
    
    let type = typeDefinition.trim();
    let optional = false;
    let array = false;
    let enumValues;

    // Handle optional fields (ending with ?)
    if (type.endsWith('?')) {
      optional = true;
      type = type.slice(0, -1).trim();
    }

    // Handle array fields [Type]
    if (type.startsWith('[') && type.endsWith(']')) {
      array = true;
      type = type.slice(1, -1).trim();
    }
    
    // Handle complex array types like [Object] with comments - convert to Json[]
    if (type.includes('#') && array) {
      type = type.split('#')[0].trim();
    }
    
    // Handle complex object types with comments - convert to Json
    if (type.includes('#') && !array) {
      type = type.split('#')[0].trim();
      if (type.endsWith('?')) {
        optional = true;
        type = type.slice(0, -1).trim();
      }
    }
    
    // Handle nested object syntax like { field: Type, ... } - convert to Json
    if (type.includes('{') || type.includes('}')) {
      type = 'Object';
    }

    // Handle enum definitions "value1" | "value2" | "value3"
    if (type.includes('|') && type.includes('"')) {
      enumValues = type.split('|').map(v => v.trim().replace(/"/g, ''));
      type = `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}Enum`;
    }

    // Handle union types with null
    if (type.includes(' | null')) {
      optional = true;
      type = type.replace(' | null', '');
    }

    return {
      name: fieldName,
      type: this.mapSSFTypeToPrisma(type),
      optional,
      array,
      enumValues
    };
  }

  /**
   * Map SSF types to Prisma types
   */
  mapSSFTypeToPrisma(ssfType) {
    const typeMap = {
      'String': 'String',
      'Number': 'Int',
      'Float': 'Float', 
      'Boolean': 'Boolean',
      'Flag': 'Boolean',
      'Date': 'DateTime',
      'ObjectId': 'String',
      'Object': 'Json',
      '[String]': 'String[]',
      '[Number]': 'Int[]',
      '[Object]': 'Json[]'
    };

    // Handle complex types that weren't in the simple map
    if (ssfType.includes('Number') && !typeMap[ssfType]) {
      return ssfType.replace('Number', 'Int');
    }

    return typeMap[ssfType] || ssfType;
  }

  /**
   * Generate Prisma model from concept state
   */
  generatePrismaModel(concept) {
    const models = [];
    const enums = [];

    for (const entity of concept.state) {
      const modelName = entity.name;
      let modelDef = `model ${modelName} {\n`;

      // Add standard fields
      modelDef += `  id        String    @id @default(cuid())\n`;

      // Add concept fields
      for (const field of entity.fields) {
        if (field.name === 'id') continue; // Skip if already defined

        let fieldType = field.type;
        
        // Handle enums
        if (field.enumValues) {
          const enumName = `${modelName}${field.name.charAt(0).toUpperCase() + field.name.slice(1)}`;
          enums.push(this.generateEnum(enumName, field.enumValues));
          fieldType = enumName;
        }

        if (field.array) {
          fieldType += '[]';
          // Arrays cannot be optional in Prisma, so convert optional arrays to non-optional
          // This is a limitation we need to handle
        }

        // Arrays cannot be optional in Prisma
        const optionalMarker = (field.optional && !field.array) ? '?' : '';
        const padding = ' '.repeat(Math.max(1, 12 - field.name.length));
        modelDef += `  ${field.name}${padding}${fieldType}${optionalMarker}\n`;
      }

      // Add standard timestamps if not already present
      const hasCreatedAt = entity.fields.some(f => f.name === 'createdAt');
      const hasUpdatedAt = entity.fields.some(f => f.name === 'updatedAt');
      
      if (!hasCreatedAt) {
        modelDef += `  createdAt DateTime  @default(now())\n`;
      }
      if (!hasUpdatedAt) {
        modelDef += `  updatedAt DateTime  @updatedAt\n`;
      }

      // Add table mapping
      modelDef += `\n  @@map("${this.toSnakeCase(modelName)}")\n`;
      modelDef += `}\n`;

      models.push(modelDef);
    }

    return [...enums, ...models].join('\n');
  }

  /**
   * Generate Prisma enum
   */
  generateEnum(enumName, values) {
    let enumDef = `enum ${enumName} {\n`;
    for (const value of values) {
      enumDef += `  ${value}\n`;
    }
    enumDef += `}\n`;
    return enumDef;
  }

  /**
   * Convert camelCase to snake_case
   */
  toSnakeCase(str) {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`).replace(/^_/, '');
  }

  /**
   * Generate complete Prisma schema
   */
  generateSchema() {
    const header = `// Generated Prisma schema from concept specifications
// DO NOT EDIT MANUALLY - This file is auto-generated

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

`;

    const conceptFiles = readdirSync(this.specsDir)
      .filter(file => file.endsWith('.concept'))
      .map(file => join(this.specsDir, file));

    const models = [];

    for (const filePath of conceptFiles) {
      try {
        const concept = this.parseConceptFile(filePath);
        const modelCode = this.generatePrismaModel(concept);
        models.push(modelCode);
      } catch (error) {
        console.warn(`Failed to parse concept file ${filePath}:`, error);
      }
    }

    return header + models.join('\n') + '\n';
  }

  /**
   * Write generated schema to file
   */
  writeSchema() {
    const schema = this.generateSchema();
    writeFileSync(this.schemaPath, schema, 'utf-8');
    console.log(`✅ Generated Prisma schema at ${this.schemaPath}`);
  }
}

// CLI usage
const generator = new SchemaGenerator(
  join(__dirname, '../specs'),
  join(__dirname, '../prisma/schema.prisma')
);

const command = process.argv[2];

if (command === 'generate' || !command) {
  generator.writeSchema();
} else {
  console.log('Usage: node generate-schema.js [generate]');
}
