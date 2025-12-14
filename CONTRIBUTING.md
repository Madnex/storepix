# Contributing to storepix

Thanks for your interest in contributing! Here's how to get started.

## Development Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/Madnex/storepix.git
   cd storepix
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Verify everything works:
   ```bash
   npm test
   node src/cli.js --help
   ```

## Testing Locally

Create a test project to try your changes:

```bash
# Initialize a test project
node src/cli.js init --dir ./tmp/test --template default

# Copy some screenshots to test with
cp /path/to/your/screenshots/*.png ./tmp/test/screenshots/

# Generate screenshots
node src/cli.js generate --config ./tmp/test/storepix.config.js

# Preview template with hot reload
node src/cli.js preview --config ./tmp/test/storepix.config.js --watch
```

## Project Structure

```
src/
├── cli.js              # CLI entry point
├── commands/           # Command implementations
├── devices/            # Device definitions
├── templates/          # Built-in templates
└── utils/              # Shared utilities

tests/
├── unit/               # Unit tests
├── integration/        # Integration tests
└── fixtures/           # Test files
```

## Pull Requests

1. **Create an issue first** for major changes to discuss the approach
2. **Keep PRs focused** - one feature or fix per PR
3. **Add tests** for new functionality
4. **Update README** if adding user-facing features
5. **Run tests** before submitting: `npm test`

## Coding Style

- Use ES modules (`import`/`export`)
- Follow existing patterns in the codebase
- Keep functions small and focused
- Add JSDoc comments for public APIs

## Templates

When modifying templates:

- Ensure they work across all device sizes
- Test with both light and dark themes
- Check panorama mode compatibility if applicable
- Update the template's README.md

## Questions?

Open an issue if you have questions or need help getting started.
