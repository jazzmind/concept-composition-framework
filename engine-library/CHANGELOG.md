# Changelog

All notable changes to the Concept Design Engine will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-01-11

### Added
- Initial release of @sonnenreich/concept-design-engine
- Complete Concept Design framework implementation
- Next.js integration utilities (`createNextJSEngine`, `createAPIRoute`)
- MongoDB support with `BaseMongoDBConcept` and query helpers
- Prisma support with `BasePrismaConcept` and advanced query/transaction helpers
- TypeScript support with comprehensive type definitions
- Automatic API route generation for concept actions
- Built-in error handling and validation
- Complete synchronization engine for concept interactions

### Core Features
- **Concept Classes**: `BaseMongoDBConcept`, `BasePrismaConcept`
- **Engine Integration**: `SyncConcept`, `createNextJSEngine`
- **Database Utilities**: Query helpers, transaction support, connection management
- **Type Safety**: Full TypeScript definitions for all components
- **Next.js Support**: Seamless integration with Next.js 14/15 applications

### Documentation
- Comprehensive README with examples for both MongoDB and Prisma
- TypeScript usage examples
- Testing patterns and best practices
- Environment setup instructions

[1.0.0]: https://github.com/sonnenreich/concept/releases/tag/engine-v1.0.0
