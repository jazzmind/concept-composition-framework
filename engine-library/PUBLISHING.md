# Publishing Guide

This document explains how to publish the @sonnenreich/concept-design-engine package to GitHub Packages.

## Prerequisites

1. **GitHub Personal Access Token** with `packages:write` permission
2. **Repository access** to push tags and trigger workflows

## Method 1: Automated Publishing (Recommended)

### 1. Create and Push a Tag

```bash
# From the repository root
cd /Users/wessonnenreich/Code/sonnenreich/concept

# Create a tag for the engine library
git tag engine-v1.0.0

# Push the tag to trigger the workflow
git push origin engine-v1.0.0
```

### 2. Monitor the Workflow

- Go to: https://github.com/sonnenreich/concept/actions
- Watch the "Publish Engine Library to GitHub Packages" workflow
- The workflow will automatically:
  - Build the package
  - Run tests
  - Publish to GitHub Packages
  - Create a GitHub Release

## Method 2: Manual Publishing

### 1. Set up Authentication

```bash
# Option A: Using .env file (Recommended)
# Create/update .env file in the engine-library directory:
echo "GITHUB_TOKEN=your_github_token_here" >> .env

# The .npmrc file is already configured to use ${GITHUB_TOKEN} from environment

# Option B: Using npm config
npm config set "@sonnenreich:registry" "https://npm.pkg.github.com"
npm config set "//npm.pkg.github.com/:_authToken" "YOUR_GITHUB_TOKEN"
```

### 2. Build and Publish

```bash
cd /Users/wessonnenreich/Code/sonnenreich/concept/engine-library

# Load environment variables from .env file
export $(cat .env | xargs)

# Or manually export the token:
# export GITHUB_TOKEN=your_token_here

# Build the package
npm run build

# Publish to GitHub Packages
npm publish
```

## Installation for Users

Once published, users can install the package:

### Option 1: Configure .npmrc (Recommended)

```bash
# In their project root, create/update .npmrc
echo "@sonnenreich:registry=https://npm.pkg.github.com" >> .npmrc

# Then install normally
npm install @sonnenreich/concept-design-engine
```

### Option 2: One-time Install

```bash
npm install @sonnenreich/concept-design-engine --registry=https://npm.pkg.github.com
```

## Version Management

### Updating Versions

1. Update version in `package.json`
2. Update `CHANGELOG.md` with new changes
3. Commit changes
4. Create new tag: `git tag engine-v1.1.0`
5. Push tag: `git push origin engine-v1.1.0`

### Version Naming Convention

- Tags: `engine-v{MAJOR}.{MINOR}.{PATCH}`
- Examples: `engine-v1.0.0`, `engine-v1.1.0`, `engine-v2.0.0`

## Troubleshooting

### Authentication Issues

```bash
# Check current registry configuration
npm config get registry
npm config get "@sonnenreich:registry"

# Reset if needed
npm config delete "@sonnenreich:registry"
npm config delete "//npm.pkg.github.com/:_authToken"
```

### Package Not Found

- Ensure the repository is public or you have access
- Check that the package name matches exactly: `@sonnenreich/concept-design-engine`
- Verify the registry is set correctly

### Build Issues

```bash
# Clean and rebuild
npm run clean
npm install
npm run build
```

## GitHub Package Registry

The package will be available at:
- Registry: https://npm.pkg.github.com
- Package Page: https://github.com/sonnenreich/concept/packages
- Documentation: This repository's README.md
