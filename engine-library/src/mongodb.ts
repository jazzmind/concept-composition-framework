/**
 * MongoDB Integration for Concept Design Engine
 */

import { MongoClient, Db, Collection } from 'mongodb';
import { ConceptInterface } from './types';

export interface MongoDBConceptConfig {
    connectionString: string;
    databaseName: string;
    collectionName?: string;
}

export interface MongoDBConcept extends ConceptInterface {
    db: Db;
    collection: Collection;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
}

/**
 * Base class for MongoDB-backed concepts
 */
export class BaseMongoDBConcept implements MongoDBConcept {
    protected client: MongoClient;
    public db: Db;
    public collection: Collection;
    protected connected: boolean = false;

    constructor(
        private config: MongoDBConceptConfig,
        collectionName?: string
    ) {
        this.client = new MongoClient(config.connectionString);
        this.db = this.client.db(config.databaseName);
        this.collection = this.db.collection(
            collectionName || config.collectionName || this.constructor.name.toLowerCase()
        );
    }

    async connect(): Promise<void> {
        if (!this.connected) {
            await this.client.connect();
            this.connected = true;
        }
    }

    async disconnect(): Promise<void> {
        if (this.connected) {
            await this.client.close();
            this.connected = false;
        }
    }

    /**
     * Ensure connection before database operations
     */
    protected async ensureConnection(): Promise<void> {
        if (!this.connected) {
            await this.connect();
        }
    }

    /**
     * Helper method for creating standardized records
     */
    protected createRecord(data: any): any {
        return {
            ...data,
            _id: data.id || this.generateId(),
            createdAt: new Date(),
            updatedAt: new Date()
        };
    }

    /**
     * Helper method for updating records
     */
    protected updateRecord(data: any): any {
        return {
            ...data,
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
        return {
            error: error instanceof Error ? error.message : 'Database operation failed'
        };
    }
}

/**
 * Factory function to create MongoDB-backed concepts
 */
export function createMongoDBConcept<T extends ConceptInterface>(
    ConceptClass: new (config: MongoDBConceptConfig) => T,
    config: MongoDBConceptConfig
): T {
    return new ConceptClass(config);
}

/**
 * MongoDB query helpers for common operations
 */
export class MongoDBQueryHelpers {
    /**
     * Convert concept query parameters to MongoDB filter
     */
    static toFilter(params: Record<string, any>): Record<string, any> {
        const filter: Record<string, any> = {};
        
        for (const [key, value] of Object.entries(params)) {
            if (value !== undefined && value !== null) {
                // Handle special query operators
                if (key.endsWith('_gt')) {
                    const field = key.replace('_gt', '');
                    filter[field] = { $gt: value };
                } else if (key.endsWith('_lt')) {
                    const field = key.replace('_lt', '');
                    filter[field] = { $lt: value };
                } else if (key.endsWith('_in')) {
                    const field = key.replace('_in', '');
                    filter[field] = { $in: Array.isArray(value) ? value : [value] };
                } else if (key.endsWith('_contains')) {
                    const field = key.replace('_contains', '');
                    filter[field] = { $regex: value, $options: 'i' };
                } else {
                    filter[key] = value;
                }
            }
        }
        
        return filter;
    }

    /**
     * Convert concept sort parameters to MongoDB sort
     */
    static toSort(sortBy?: string, sortOrder: 'asc' | 'desc' = 'asc'): Record<string, 1 | -1> {
        if (!sortBy) return { createdAt: -1 }; // Default sort by creation date
        
        return { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
    }

    /**
     * Apply pagination to MongoDB queries
     */
    static applyPagination(query: any, page: number = 1, limit: number = 10) {
        const skip = (page - 1) * limit;
        return query.skip(skip).limit(limit);
    }
}

/**
 * Example MongoDB concept implementation
 */
export class ExampleMongoDBConcept extends BaseMongoDBConcept {
    constructor(config: MongoDBConceptConfig) {
        super(config, 'examples');
    }

    async create(input: { name: string; data?: any }): Promise<{ id: string } | { error: string }> {
        try {
            await this.ensureConnection();
            
            const record = this.createRecord({
                id: this.generateId(),
                name: input.name,
                data: input.data || {}
            });

            const result = await this.collection.insertOne(record);
            
            return { id: record.id };
        } catch (error) {
            return this.handleError(error);
        }
    }

    async update(input: { id: string; name?: string; data?: any }): Promise<{ success: boolean } | { error: string }> {
        try {
            await this.ensureConnection();
            
            const updateData = this.updateRecord({
                ...(input.name && { name: input.name }),
                ...(input.data && { data: input.data })
            });

            const result = await this.collection.updateOne(
                { id: input.id },
                { $set: updateData }
            );

            return { success: result.modifiedCount > 0 };
        } catch (error) {
            return this.handleError(error);
        }
    }

    async delete(input: { id: string }): Promise<{ success: boolean } | { error: string }> {
        try {
            await this.ensureConnection();
            
            const result = await this.collection.deleteOne({ id: input.id });
            
            return { success: result.deletedCount > 0 };
        } catch (error) {
            return this.handleError(error);
        }
    }

    async _findById(input: { id: string }): Promise<Array<any>> {
        try {
            await this.ensureConnection();
            
            const document = await this.collection.findOne({ id: input.id });
            
            return document ? [document] : [];
        } catch (error) {
            console.error('Query error:', error);
            return [];
        }
    }

    async _findAll(input: { 
        page?: number; 
        limit?: number; 
        sortBy?: string; 
        sortOrder?: 'asc' | 'desc' 
    } = {}): Promise<Array<any>> {
        try {
            await this.ensureConnection();
            
            const { page = 1, limit = 10, sortBy, sortOrder } = input;
            
            let query = this.collection.find({});
            query = query.sort(MongoDBQueryHelpers.toSort(sortBy, sortOrder));
            query = MongoDBQueryHelpers.applyPagination(query, page, limit);
            
            return await query.toArray();
        } catch (error) {
            console.error('Query error:', error);
            return [];
        }
    }
}
