import * as fs from 'fs';
import * as path from 'path';
import { ConceptSpec, ConceptAction } from '../parsers/conceptParser';

export class ConceptCodeGenerator {
    
    /**
     * Generate TypeScript implementation from concept specification
     */
    generateConceptImplementation(
        spec: ConceptSpec, 
        outputPath: string, 
        useMongoDb: boolean = false
    ): string {
        const className = `${spec.name}Concept`;
        const interfaceName = `${spec.name}Record`;
        
        let code = this.generateImports(useMongoDb);
        code += '\n\n';
        code += this.generateInterface(spec, interfaceName);
        code += '\n\n';
        code += this.generateClass(spec, className, interfaceName, useMongoDb);
        
        return code;
    }

    private generateImports(useMongoDb: boolean): string {
        if (useMongoDb) {
            return `import { MongoClient, Db, Collection, ObjectId } from 'mongodb';
import { uuid } from '../engine/util';`;
        } else {
            return `import { PrismaClient } from '@prisma/client';
import { uuid } from '../engine/util';`;
        }
    }

    private generateInterface(spec: ConceptSpec, interfaceName: string): string {
        let code = `export interface ${interfaceName} {\n`;
        code += '    id: string;\n';
        
        // Generate fields from state specification
        for (const [entityName, fields] of Object.entries(spec.state)) {
            code += `    // ${entityName} fields\n`;
            for (const [fieldName, fieldType] of Object.entries(fields)) {
                const tsType = this.mapToTypeScriptType(fieldType);
                code += `    ${fieldName}: ${tsType};\n`;
            }
        }
        
        code += '    createdAt: Date;\n';
        code += '    updatedAt: Date;\n';
        code += '}';
        
        return code;
    }

    private generateClass(
        spec: ConceptSpec, 
        className: string, 
        interfaceName: string, 
        useMongoDb: boolean
    ): string {
        let code = `export class ${className} {\n`;
        
        // Add database connection
        if (useMongoDb) {
            code += `    private collection: Collection<${interfaceName}>;\n\n`;
            code += `    constructor(db: Db) {\n`;
            code += `        this.collection = db.collection('${spec.name.toLowerCase()}');\n`;
            code += `    }\n\n`;
        } else {
            code += `    private prisma: PrismaClient;\n\n`;
            code += `    constructor() {\n`;
            code += `        this.prisma = new PrismaClient();\n`;
            code += `    }\n\n`;
        }

        // Generate action methods
        for (const action of spec.actions) {
            code += this.generateActionMethod(action, useMongoDb, spec.name);
            code += '\n\n';
        }

        // Generate query methods
        for (const query of spec.queries) {
            code += this.generateQueryMethod(query, interfaceName, useMongoDb, spec.name);
            code += '\n\n';
        }

        code += '}';
        return code;
    }

    private generateActionMethod(action: ConceptAction, useMongoDb: boolean, conceptName: string): string {
        const inputType = this.generateInputType(action.inputs);
        const outputType = this.generateOutputType(action.outputs);
        
        let code = `    /**\n     * ${action.description || action.name}\n     */\n`;
        code += `    async ${action.name}(input: ${inputType}): Promise<${outputType} | { error: string }> {\n`;
        code += `        try {\n`;
        
        if (useMongoDb) {
            code += `            // MongoDB implementation\n`;
            code += `            const id = input.id || new ObjectId().toHexString();\n`;
            code += `            const record = {\n`;
            code += `                ...input,\n`;
            code += `                id,\n`;
            code += `                createdAt: new Date(),\n`;
            code += `                updatedAt: new Date()\n`;
            code += `            };\n\n`;
            code += `            const result = await this.collection.insertOne(record);\n`;
            code += `            return { id: result.insertedId.toHexString() };\n`;
        } else {
            code += `            // Prisma implementation\n`;
            code += `            const result = await this.prisma.${conceptName.toLowerCase()}.create({\n`;
            code += `                data: {\n`;
            code += `                    ...input\n`;
            code += `                }\n`;
            code += `            });\n`;
            code += `            return { id: result.id };\n`;
        }
        
        code += `        } catch (error) {\n`;
        code += `            return { error: error instanceof Error ? error.message : 'Unknown error' };\n`;
        code += `        }\n`;
        code += `    }`;
        
        return code;
    }

    private generateQueryMethod(query: ConceptAction, interfaceName: string, useMongoDb: boolean, conceptName: string): string {
        const inputType = this.generateInputType(query.inputs);
        
        let code = `    /**\n     * ${query.description || query.name}\n     */\n`;
        code += `    async ${query.name}(input: ${inputType}): Promise<Array<${interfaceName}>> {\n`;
        code += `        try {\n`;
        
        if (useMongoDb) {
            code += `            const results = await this.collection.find(input).toArray();\n`;
            code += `            return results;\n`;
        } else {
            code += `            const results = await this.prisma.${conceptName.toLowerCase()}.findMany({\n`;
            code += `                where: input\n`;
            code += `            });\n`;
            code += `            return results;\n`;
        }
        
        code += `        } catch (error) {\n`;
        code += `            console.error('Query error:', error);\n`;
        code += `            return [];\n`;
        code += `        }\n`;
        code += `    }`;
        
        return code;
    }

    private generateInputType(inputs: Record<string, string>): string {
        if (Object.keys(inputs).length === 0) {
            return '{}';
        }
        
        const fields = Object.entries(inputs)
            .map(([name, type]) => `${name}: ${this.mapToTypeScriptType(type)}`)
            .join('; ');
            
        return `{ ${fields} }`;
    }

    private generateOutputType(outputs: Record<string, string>): string {
        if (Object.keys(outputs).length === 0) {
            return '{}';
        }
        
        const fields = Object.entries(outputs)
            .map(([name, type]) => `${name}: ${this.mapToTypeScriptType(type)}`)
            .join('; ');
            
        return `{ ${fields} }`;
    }

    private mapToTypeScriptType(ssfType: string): string {
        // Handle optional types
        let optional = false;
        if (ssfType.endsWith('?')) {
            optional = true;
            ssfType = ssfType.slice(0, -1).trim();
        }

        // Handle array types
        let isArray = false;
        if (ssfType.startsWith('[') && ssfType.endsWith(']')) {
            isArray = true;
            ssfType = ssfType.slice(1, -1).trim();
        }

        const typeMap: Record<string, string> = {
            'String': 'string',
            'Number': 'number',
            'Boolean': 'boolean',
            'Flag': 'boolean',
            'Date': 'Date',
            'DateTime': 'Date',
            'ObjectId': 'string',
            'Object': 'any'
        };

        let tsType = typeMap[ssfType] || ssfType;
        
        if (isArray) {
            tsType += '[]';
        }
        
        if (optional) {
            tsType += ' | null';
        }

        return tsType;
    }
}


