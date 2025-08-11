# Sync Schema Command

## Overview

The new `syncSchema` command provides an improved way to generate or update Prisma schemas from concept specifications. Unlike the legacy `generateSchema` command that searches for external scripts, this command uses built-in functionality directly integrated into the VS Code extension.

## Features

### Interactive Directory Selection
- **Specs Directory**: Choose where your `.concept` files are located with common options:
  - `specs/` (default from config)
  - `src/specs/`
  - `concepts/`
  - Custom directory via file browser

- **Schema Path**: Choose where to save the Prisma schema file with common options:
  - `prisma/schema.prisma` (default)
  - `src/prisma/schema.prisma`
  - Root directory
  - Custom path via file browser

### Safety Features
- **Overwrite Protection**: Prompts before overwriting existing schema files
- **Directory Creation**: Automatically creates missing directories
- **File Validation**: Checks for `.concept` files before proceeding
- **Error Handling**: Comprehensive error messages and logging

### Schema Generation
- **SSF to Prisma Translation**: Converts Simple State Form specifications to Prisma models
- **Type Mapping**: Maps SSF types to appropriate Prisma types
- **Enum Support**: Handles enumerated values as Prisma enums
- **Relationship Handling**: Supports object references and arrays
- **Standard Fields**: Adds `id`, `createdAt`, and `updatedAt` fields automatically

## Usage

1. **Command Palette**: `Ctrl+Shift+P` → "Concept Design: Sync Prisma Schema with Concepts"
2. **Select Specs Directory**: Choose where your `.concept` files are located
3. **Select Schema Path**: Choose where to save the Prisma schema
4. **Confirm Overwrite**: If schema exists, confirm whether to overwrite
5. **Review Results**: Schema is generated and opened automatically

## Example

Given a concept file `specs/User.concept`:

```concept
concept User

purpose 
    to associate identifying information with individuals

state
    a set of Users with
        a name String
        an email String
        a status of ACTIVE or SUSPENDED
```

The command generates:

```prisma
// Generated Prisma schema from concept specifications
// DO NOT EDIT MANUALLY - This file is auto-generated

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum UserStatus {
  ACTIVE
  SUSPENDED
}

model User {
  id        String      @id @default(cuid())
  name      String
  email     String
  status    UserStatus
  createdAt DateTime    @default(now())
  updatedAt DateTime    @updatedAt

  @@map("user")
}
```

## Configuration

The command respects VS Code workspace settings:

```json
{
  "conceptDesign.directories.specs": "specs",
  "conceptDesign.directories.schema": "prisma/schema.prisma"
}
```

## Benefits Over Legacy Command

1. **No External Dependencies**: Works without separate script files
2. **Interactive UI**: Guides users through directory selection
3. **Better Error Handling**: Clear feedback on issues
4. **Type Safety**: Written in TypeScript with proper type checking
5. **Integrated Logging**: Uses VS Code output channel for debugging

## TypeScript Integration

The schema generator is fully typed with interfaces for:
- `ConceptField`: Individual field definitions
- `ConceptEntity`: State entities with fields
- `ConceptSpec`: Complete concept specifications

This ensures reliable parsing and generation even with complex concept files.
