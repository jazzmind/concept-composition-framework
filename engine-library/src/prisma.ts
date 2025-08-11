/**
 * Prisma Integration for Concept Design Engine
 */

import { PrismaClient } from '@prisma/client';
import { ConceptInterface } from './types';

export interface PrismaConceptConfig {
    prisma?: PrismaClient;
    modelName?: string;
}

export interface PrismaConcept extends ConceptInterface {
    prisma: PrismaClient;
    modelName: string;
}

/**
 * Base class for Prisma-backed concepts
 */
export class BasePrismaConcept implements PrismaConcept {
    public prisma: PrismaClient;
    public modelName: string;

    constructor(
        config: PrismaConceptConfig = {},
        modelName?: string
    ) {
        this.prisma = config.prisma || new PrismaClient();
        this.modelName = modelName || config.modelName || this.constructor.name.toLowerCase().replace('concept', '');
    }

    /**
     * Get the Prisma model delegate for this concept
     */
    protected get model(): any {
        return (this.prisma as any)[this.modelName];
    }

    /**
     * Helper method for creating standardized records
     */
    protected createRecord(data: any): any {
        return {
            ...data,
            id: data.id || this.generateId(),
            createdAt: new Date(),
            updatedAt: new Date()
        };
    }

    /**
     * Helper method for updating records
     */
    protected updateRecord(data: any): any {
        const { id, createdAt, ...updateData } = data;
        return {
            ...updateData,
            updatedAt: new Date()
        };
    }

    /**
     * Generate unique identifier
     */
    protected generateId(): string {
        return Math.random().toString(36).substring(2) + Date.now().toString(36);
    }

    /**
     * Standard error handling for concept actions
     */
    protected handleError(error: any): { error: string } {
        console.error(`Error in ${this.constructor.name}:`, error);
        
        // Handle Prisma-specific errors
        if (error.code === 'P2002') {
            return { error: 'A record with this information already exists' };
        } else if (error.code === 'P2025') {
            return { error: 'Record not found' };
        } else if (error.code === 'P2003') {
            return { error: 'Foreign key constraint failed' };
        }
        
        return {
            error: error instanceof Error ? error.message : 'Database operation failed'
        };
    }

    /**
     * Disconnect from the database
     */
    async disconnect(): Promise<void> {
        await this.prisma.$disconnect();
    }
}

/**
 * Factory function to create Prisma-backed concepts
 */
export function createPrismaConcept<T extends ConceptInterface>(
    ConceptClass: new (config: PrismaConceptConfig) => T,
    config: PrismaConceptConfig = {}
): T {
    return new ConceptClass(config);
}

/**
 * Prisma query helpers for common operations
 */
export class PrismaQueryHelpers {
    /**
     * Convert concept query parameters to Prisma where clause
     */
    static toWhere(params: Record<string, any>): Record<string, any> {
        const where: Record<string, any> = {};
        
        for (const [key, value] of Object.entries(params)) {
            if (value !== undefined && value !== null) {
                // Handle special query operators
                if (key.endsWith('_gt')) {
                    const field = key.replace('_gt', '');
                    where[field] = { gt: value };
                } else if (key.endsWith('_gte')) {
                    const field = key.replace('_gte', '');
                    where[field] = { gte: value };
                } else if (key.endsWith('_lt')) {
                    const field = key.replace('_lt', '');
                    where[field] = { lt: value };
                } else if (key.endsWith('_lte')) {
                    const field = key.replace('_lte', '');
                    where[field] = { lte: value };
                } else if (key.endsWith('_in')) {
                    const field = key.replace('_in', '');
                    where[field] = { in: Array.isArray(value) ? value : [value] };
                } else if (key.endsWith('_not')) {
                    const field = key.replace('_not', '');
                    where[field] = { not: value };
                } else if (key.endsWith('_contains')) {
                    const field = key.replace('_contains', '');
                    where[field] = { contains: value, mode: 'insensitive' };
                } else if (key.endsWith('_startsWith')) {
                    const field = key.replace('_startsWith', '');
                    where[field] = { startsWith: value, mode: 'insensitive' };
                } else if (key.endsWith('_endsWith')) {
                    const field = key.replace('_endsWith', '');
                    where[field] = { endsWith: value, mode: 'insensitive' };
                } else {
                    where[key] = value;
                }
            }
        }
        
        return where;
    }

    /**
     * Convert concept sort parameters to Prisma orderBy
     */
    static toOrderBy(sortBy?: string, sortOrder: 'asc' | 'desc' = 'asc'): Record<string, 'asc' | 'desc'> | undefined {
        if (!sortBy) return { createdAt: 'desc' }; // Default sort by creation date
        
        return { [sortBy]: sortOrder };
    }

    /**
     * Apply pagination to Prisma queries
     */
    static applyPagination(page: number = 1, limit: number = 10): { skip: number; take: number } {
        const skip = (page - 1) * limit;
        return { skip, take: limit };
    }

    /**
     * Build complete Prisma query options
     */
    static buildQuery(input: {
        where?: Record<string, any>;
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
        page?: number;
        limit?: number;
        include?: Record<string, any>;
        select?: Record<string, any>;
    }): any {
        const query: any = {};

        if (input.where) {
            query.where = this.toWhere(input.where);
        }

        if (input.sortBy) {
            query.orderBy = this.toOrderBy(input.sortBy, input.sortOrder);
        }

        if (input.page || input.limit) {
            const pagination = this.applyPagination(input.page, input.limit);
            query.skip = pagination.skip;
            query.take = pagination.take;
        }

        if (input.include) {
            query.include = input.include;
        }

        if (input.select) {
            query.select = input.select;
        }

        return query;
    }
}

/**
 * Example Prisma concept implementation
 */
export class ExamplePrismaConcept extends BasePrismaConcept {
    constructor(config: PrismaConceptConfig = {}) {
        super(config, 'example'); // Assumes Prisma model named 'Example'
    }

    async create(input: { 
        name: string; 
        description?: string; 
        data?: any 
    }): Promise<{ id: string; example: any } | { error: string }> {
        try {
            const record = this.createRecord({
                id: this.generateId(),
                name: input.name,
                description: input.description,
                data: input.data || {}
            });

            const example = await this.model.create({
                data: record
            });
            
            return { id: example.id, example };
        } catch (error) {
            return this.handleError(error);
        }
    }

    async update(input: { 
        id: string; 
        name?: string; 
        description?: string; 
        data?: any 
    }): Promise<{ example: any } | { error: string }> {
        try {
            const updateData = this.updateRecord({
                ...(input.name && { name: input.name }),
                ...(input.description !== undefined && { description: input.description }),
                ...(input.data && { data: input.data })
            });

            const example = await this.model.update({
                where: { id: input.id },
                data: updateData
            });

            return { example };
        } catch (error) {
            return this.handleError(error);
        }
    }

    async delete(input: { id: string }): Promise<{ success: boolean } | { error: string }> {
        try {
            await this.model.delete({
                where: { id: input.id }
            });
            
            return { success: true };
        } catch (error) {
            return this.handleError(error);
        }
    }

    async _findById(input: { id: string; include?: Record<string, any> }): Promise<Array<any>> {
        try {
            const example = await this.model.findUnique({
                where: { id: input.id },
                ...(input.include && { include: input.include })
            });
            
            return example ? [example] : [];
        } catch (error) {
            console.error('Query error:', error);
            return [];
        }
    }

    async _findMany(input: {
        where?: Record<string, any>;
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
        page?: number;
        limit?: number;
        include?: Record<string, any>;
    } = {}): Promise<Array<any>> {
        try {
            const query = PrismaQueryHelpers.buildQuery(input);
            
            const examples = await this.model.findMany(query);
            
            return examples;
        } catch (error) {
            console.error('Query error:', error);
            return [];
        }
    }

    async _count(input: { where?: Record<string, any> } = {}): Promise<Array<{ count: number }>> {
        try {
            const where = input.where ? PrismaQueryHelpers.toWhere(input.where) : {};
            
            const count = await this.model.count({ where });
            
            return [{ count }];
        } catch (error) {
            console.error('Query error:', error);
            return [{ count: 0 }];
        }
    }

    async _search(input: {
        query: string;
        fields?: string[];
        page?: number;
        limit?: number;
    }): Promise<Array<any>> {
        try {
            const fields = input.fields || ['name', 'description'];
            const searchConditions = fields.map(field => ({
                [field]: {
                    contains: input.query,
                    mode: 'insensitive' as const
                }
            }));

            const query = PrismaQueryHelpers.buildQuery({
                where: { OR: searchConditions },
                page: input.page,
                limit: input.limit,
                sortBy: 'createdAt',
                sortOrder: 'desc'
            });

            const examples = await this.model.findMany(query);
            
            return examples;
        } catch (error) {
            console.error('Search error:', error);
            return [];
        }
    }
}

/**
 * Transaction helpers for multi-concept operations
 */
export class PrismaTransactionHelpers {
    /**
     * Execute multiple operations in a transaction
     */
    static async transaction(
        prisma: PrismaClient,
        operations: ((tx: any) => Promise<any>)[]
    ): Promise<any[]> {
        return await prisma.$transaction(async (tx: any) => {
            const results = [];
            for (const operation of operations) {
                const result = await operation(tx);
                results.push(result);
            }
            return results;
        });
    }

    /**
     * Atomic update with validation
     */
    static async atomicUpdate(
        prisma: PrismaClient,
        modelName: string,
        id: string,
        updateFn: (current: any) => any
    ): Promise<any> {
        return await prisma.$transaction(async (tx: any) => {
            const model = (tx as any)[modelName];
            
            // Read current state
            const current = await model.findUnique({
                where: { id }
            });

            if (!current) {
                throw new Error('Record not found');
            }

            // Apply update function
            const updates = updateFn(current);

            // Update with new data
            return await model.update({
                where: { id },
                data: {
                    ...updates,
                    updatedAt: new Date()
                }
            });
        });
    }
}
