#!/usr/bin/env node

import { readFileSync, writeFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Copy the SchemaGenerator class but with debug output
class DebugSchemaGenerator {
  constructor(specsDir, schemaPath) {
    this.specsDir = specsDir;
    this.schemaPath = schemaPath;
  }

  parseConceptFile(filePath) {
    console.log(`\n=== Parsing ${filePath} ===`);
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

    // Extract concept name from filename
    concept.name = filePath.split('/').pop().replace('.concept', '');
    console.log(`Concept name: ${concept.name}`);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line === 'state') {
        currentSection = 'state';
        console.log(`Found state section at line ${i+1}`);
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
        currentEntity = line;
        console.log(`Found entity: ${currentEntity} at line ${i+1}`);
        concept.state.push({
          name: currentEntity,
          fields: []
        });
      }

      // Use original line for field detection
      const originalLine = content.split('\n')[i];
      if (currentSection === 'state' && originalLine.startsWith('    ') && currentEntity && originalLine.includes(':')) {
        const field = this.parseFieldDefinition(originalLine.trim());
        if (field) {
          console.log(`Found field for ${currentEntity}: ${field.name} (${field.type}${field.optional ? '?' : ''}${field.array ? '[]' : ''})`);
          const entityIndex = concept.state.findIndex(s => s.name === currentEntity);
          if (entityIndex >= 0) {
            concept.state[entityIndex].fields.push(field);
          }
        }
      }
    }

    console.log(`Final state: ${concept.state.length} entities`);
    concept.state.forEach(entity => {
      console.log(`  ${entity.name}: ${entity.fields.length} fields`);
    });

    return concept;
  }

  parseFieldDefinition(line) {
    if (line.startsWith('//') || line.startsWith('#')) {
      return null;
    }

    const match = line.match(/^(\w+):\s*(.+?)(?:\s*\/\/.*)?$/);
    if (!match) return null;

    const [, fieldName, typeDefinition] = match;
    
    let type = typeDefinition.trim();
    let optional = false;
    let array = false;
    let enumValues;

    if (type.endsWith('?')) {
      optional = true;
      type = type.slice(0, -1).trim();
    }

    if (type.startsWith('[') && type.endsWith(']')) {
      array = true;
      type = type.slice(1, -1).trim();
    }

    if (type.includes('|') && type.includes('"')) {
      enumValues = type.split('|').map(v => v.trim().replace(/"/g, ''));
      type = `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}Enum`;
    }

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

    return typeMap[ssfType] || ssfType;
  }

  testUserConcept() {
    const userConceptPath = join(this.specsDir, 'User.concept');
    const concept = this.parseConceptFile(userConceptPath);
    
    console.log('\n=== FINAL RESULT ===');
    console.log(JSON.stringify(concept, null, 2));
  }
}

// Test the User concept specifically
const generator = new DebugSchemaGenerator(
  join(__dirname, 'specs'),
  join(__dirname, 'prisma/schema.prisma')
);

generator.testUserConcept();
