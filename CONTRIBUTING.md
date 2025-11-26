# Contributing to RabbitMQ Multi-Node Connector

Thank you for your interest in contributing! This guide will help you get started.

## Development Setup

1. **Fork and clone the repository:**

   ```bash
   git clone https://github.com/yourusername/rabbitmq-connector.git
   cd rabbitmq-connector
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Build the project:**
   ```bash
   npm run build
   ```

## Development Workflow

### Running in Development

```bash
# Watch mode for TypeScript compilation
npm run build:watch

# Run linter
npm run lint

# Fix linting issues automatically
npm run lint:fix

# Format code
npm run format

# Check formatting
npm run format:check
```

### Running Tests

```bash
# Run tests once
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:ci
```

### Before Submitting

1. **Ensure your code follows the style guide:**

   ```bash
   npm run lint:fix
   npm run format
   ```

2. **Add tests for new features**

3. **Update documentation if needed**

4. **Ensure all tests pass:**
   ```bash
   npm test
   ```

## Commit Messages

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

Example:

```
feat: add support for delayed messages
fix: resolve connection pool deadlock
docs: update cluster configuration examples
```

## Pull Request Process

1. **Create a feature branch:**

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes and commit:**

   ```bash
   git add .
   git commit -m "feat: your feature description"
   ```

3. **Push to your fork:**

   ```bash
   git push origin feature/your-feature-name
   ```

4. **Open a Pull Request** on GitHub

5. **Address review feedback** if needed

## Code Style Guidelines

- Use TypeScript strict mode
- Follow the existing code structure
- Add JSDoc comments for public APIs
- Keep functions focused and single-purpose
- Use meaningful variable and function names
- Prefer `async/await` over promise chains
- Handle errors appropriately

## Testing Guidelines

- Write unit tests for new features
- Maintain or improve code coverage
- Test edge cases and error conditions
- Use descriptive test names
- Mock external dependencies

## Documentation

- Update README.md for user-facing changes
- Add JSDoc comments for new public APIs
- Update examples if behavior changes
- Update CHANGELOG.md

## Questions?

Feel free to open an issue for:

- Bug reports
- Feature requests
- Documentation improvements
- General questions

Thank you for contributing!
