# Deployment Guide - Concept Design Engine

## Overview

The `@sonnenreich/concept-design-engine` package is configured for deployment to GitHub Package Registry as a public NPM package.

## 🚀 Quick Deployment

### Option 1: Automated (Recommended)

```bash
# From repository root
cd /Users/wessonnenreich/Code/sonnenreich/concept

# Commit all changes
git add .
git commit -m "Release engine v1.0.0"

# Create and push tag to trigger automated publishing
git tag engine-v1.0.0
git push origin main
git push origin engine-v1.0.0
```

This will automatically:
- ✅ Build the package
- ✅ Run tests 
- ✅ Publish to GitHub Packages
- ✅ Create a GitHub Release

### Option 2: Manual Publishing

```bash
# Navigate to engine library
cd engine-library

# Set up environment with GitHub token
cp .env.example .env
# Edit .env and add your GitHub token

# Load environment and publish
export $(cat .env | xargs)
npm run build
npm publish
```

## 📦 Package Details

- **Package Name**: `@sonnenreich/concept-design-engine`
- **Registry**: GitHub Package Registry (https://npm.pkg.github.com)
- **Current Version**: 1.0.0
- **Build Size**: ~15.6 kB compressed, 65.4 kB unpacked

## 🛠 Installation for Users

### For End Users

```bash
# Configure npm for GitHub packages
echo "@sonnenreich:registry=https://npm.pkg.github.com" >> .npmrc

# Install the package
npm install @sonnenreich/concept-design-engine
```

### Usage Example

```typescript
import { createNextJSEngine, BasePrismaConcept } from '@sonnenreich/concept-design-engine';

// Create concepts
class UserConcept extends BasePrismaConcept {
  // Implementation
}

// Set up engine
const engine = createNextJSEngine({
  concepts: { User: new UserConcept() }
});
```

## 🔧 Development Setup

### Prerequisites

1. **GitHub Personal Access Token**
   - Go to: https://github.com/settings/tokens
   - Create token with `packages:write` and `repo` scopes
   - Add to `.env` file: `GITHUB_TOKEN=your_token_here`

2. **Repository Permissions**
   - Push access to create tags
   - GitHub Actions enabled

### Files Created

```
engine-library/
├── .npmrc                 # NPM registry configuration
├── .env.example          # Environment template
├── package.json          # Updated with GitHub registry
├── CHANGELOG.md          # Version history
├── PUBLISHING.md         # Detailed publishing guide
└── LICENSE               # MIT license

.github/workflows/
├── publish-engine.yml    # Automated publishing
└── test-engine.yml       # CI/CD testing
```

## 🎯 Version Management

### Creating New Releases

1. **Update Version**
   ```bash
   cd engine-library
   npm version patch  # or minor, major
   ```

2. **Update Changelog**
   - Add changes to `CHANGELOG.md`
   - Follow semantic versioning

3. **Tag and Release**
   ```bash
   git add .
   git commit -m "Release v1.0.1"
   git tag engine-v1.0.1
   git push origin main
   git push origin engine-v1.0.1
   ```

### Tag Naming Convention

- Format: `engine-v{MAJOR}.{MINOR}.{PATCH}`
- Examples: `engine-v1.0.0`, `engine-v1.1.0`, `engine-v2.0.0`

## 📊 Package Contents

The published package includes:

```
dist/                     # Compiled TypeScript
├── index.js/.d.ts       # Main exports
├── mongodb.js/.d.ts     # MongoDB integration
├── prisma.js/.d.ts      # Prisma integration
├── nextjs.js/.d.ts      # Next.js utilities
└── ...                  # Other compiled modules

README.md                # Documentation
LICENSE                  # MIT license
package.json            # Package metadata
```

## 🚦 Status & Next Steps

### ✅ Completed
- [x] Package configuration for GitHub Registry
- [x] Automated CI/CD with GitHub Actions
- [x] Comprehensive documentation and examples
- [x] Build and packaging verification
- [x] Environment configuration with `.env` support

### 📋 Ready to Publish
The package is ready for initial publication. Choose automated or manual deployment based on your preference.

### 🔄 Future Improvements
- Add comprehensive test suite
- Set up automated security scanning
- Add performance benchmarks
- Create example applications

## 🆘 Troubleshooting

### Common Issues

1. **Authentication Failed**
   - Verify GitHub token has correct permissions
   - Check `.npmrc` configuration
   - Ensure token is properly set in environment

2. **Build Failures**
   - Run `npm run clean && npm run build`
   - Check TypeScript compilation errors
   - Verify all dependencies are installed

3. **Publishing Denied**
   - Confirm repository is public or you have access
   - Check package name matches exactly
   - Verify registry URL is correct

### Getting Help

- Check logs in GitHub Actions
- Review `PUBLISHING.md` for detailed instructions
- Verify configuration against working examples

---

🎉 **Ready to deploy!** The Concept Design Engine is configured and ready for publication to GitHub Package Registry.
