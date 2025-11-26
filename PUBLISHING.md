# Publishing Guide

This guide explains how to publish the RabbitMQ Multi-Node Connector to npm.

## Prerequisites

1. **npm Account**: You need an npm account
   ```bash
   npm login
   ```

2. **Organization/Scope** (if using scoped package):
   - Create an organization on npmjs.com
   - Update `package.json` name to `@your-org/rabbitmq-connector`

3. **Repository**: Ensure your GitHub repository is set up
   - Update URLs in `package.json`
   - Update links in README.md

## Pre-Publishing Checklist

### 1. Update Package Name and Metadata

In `package.json`, update:
- `name`: Change from `@your-scope/rabbitmq-connector` to your actual scope
- `repository.url`: Your GitHub repository URL
- `bugs.url`: Your GitHub issues URL
- `homepage`: Your repository homepage

Example:
```json
{
  "name": "@mycompany/rabbitmq-connector",
  "repository": {
    "type": "git",
    "url": "https://github.com/mycompany/rabbitmq-connector.git"
  },
  "bugs": {
    "url": "https://github.com/mycompany/rabbitmq-connector/issues"
  },
  "homepage": "https://github.com/mycompany/rabbitmq-connector#readme"
}
```

### 2. Update README Badges

In `README.md`, update:
```markdown
[![npm version](https://badge.fury.io/js/%40mycompany%2Frabbitmq-connector.svg)](https://www.npmjs.com/package/@mycompany/rabbitmq-connector)
```

### 3. Test Locally

```bash
# Clean previous builds
npm run clean

# Build the project
npm run build

# Link locally
npm link

# In a test project
npm link @your-scope/rabbitmq-connector

# Test the package
# Create a test file and import the package
```

### 4. Run All Checks

```bash
# Run linter
npm run lint

# Fix any issues
npm run lint:fix

# Run tests (if you have them)
npm test

# Check formatting
npm run format:check
```

### 5. Update Version

Follow [Semantic Versioning](https://semver.org/):

```bash
# For bug fixes
npm version patch  # 1.0.0 -> 1.0.1

# For new features (backward compatible)
npm version minor  # 1.0.0 -> 1.1.0

# For breaking changes
npm version major  # 1.0.0 -> 2.0.0
```

This will:
- Update version in `package.json`
- Create a git tag
- Run the `version` script (build and stage dist files)

### 6. Update CHANGELOG

Before publishing, update `CHANGELOG.md`:

```markdown
## [1.0.0] - 2025-01-10

### Added
- Initial release
- Connection pooling
- Circuit breaker pattern
...

### Changed
- ...

### Fixed
- ...
```

## Publishing Steps

### Option 1: Manual Publishing

```bash
# 1. Ensure you're on the main branch
git checkout main
git pull origin main

# 2. Build the project
npm run clean
npm run build

# 3. Test one more time
npm test

# 4. Dry run (see what will be published)
npm publish --dry-run

# 5. Publish to npm
npm publish

# For scoped public packages
npm publish --access public
```

### Option 2: Automated Publishing (Recommended)

Use the npm scripts:

```bash
# This will:
# 1. Clean old builds
# 2. Build the project
# 3. Run linter
# 4. Publish to npm
npm run prepublishOnly && npm publish --access public
```

### Post-Publishing

```bash
# Push the version commit and tag
git push origin main --follow-tags

# Or manually:
git push origin main
git push origin v1.0.0
```

## Verify Publication

1. **Check npm:**
   ```bash
   npm view @your-scope/rabbitmq-connector
   ```

2. **Visit npm page:**
   ```
   https://www.npmjs.com/package/@your-scope/rabbitmq-connector
   ```

3. **Test installation:**
   ```bash
   mkdir test-install
   cd test-install
   npm init -y
   npm install @your-scope/rabbitmq-connector
   ```

## Publishing Updates

For subsequent versions:

```bash
# 1. Make your changes
# 2. Update CHANGELOG.md
# 3. Commit changes
git add .
git commit -m "feat: add new feature"

# 4. Bump version
npm version patch  # or minor/major

# 5. Publish
npm publish --access public

# 6. Push changes
git push origin main --follow-tags
```

## Unpublishing (Use Carefully!)

⚠️ **Warning**: Unpublishing is discouraged and has restrictions

```bash
# Unpublish a specific version (within 72 hours)
npm unpublish @your-scope/rabbitmq-connector@1.0.0

# Unpublish entire package (within 72 hours)
npm unpublish @your-scope/rabbitmq-connector --force
```

## Deprecating Versions

Better alternative to unpublishing:

```bash
# Deprecate a specific version
npm deprecate @your-scope/rabbitmq-connector@1.0.0 "Use version 1.0.1 instead"

# Deprecate all versions
npm deprecate @your-scope/rabbitmq-connector "Package is no longer maintained"
```

## CI/CD Publishing (GitHub Actions)

Create `.github/workflows/publish.yml`:

```yaml
name: Publish to npm

on:
  release:
    types: [created]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          registry-url: 'https://registry.npmjs.org'
      - run: npm ci
      - run: npm run build
      - run: npm test
      - run: npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## Troubleshooting

### "Package already exists"
- Change the package name
- Use a scoped package: `@your-username/package-name`

### "You must be logged in"
```bash
npm login
```

### "402 Payment Required"
- Your organization requires a paid plan
- Use a personal account
- Make the package public: `npm publish --access public`

### "Package name too similar to existing package"
- Choose a more unique name
- Use a scope: `@your-scope/package-name`

## Best Practices

1. ✅ Always test locally before publishing
2. ✅ Use semantic versioning
3. ✅ Keep CHANGELOG.md updated
4. ✅ Tag releases in git
5. ✅ Use `prepublishOnly` script for safety checks
6. ✅ Include only necessary files (check with `npm publish --dry-run`)
7. ✅ Document breaking changes clearly
8. ✅ Don't publish secrets or credentials

## Resources

- [npm Documentation](https://docs.npmjs.com/)
- [Semantic Versioning](https://semver.org/)
- [Creating and publishing scoped public packages](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages)

