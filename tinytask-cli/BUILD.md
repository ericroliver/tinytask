# Building TinyTask CLI

This document describes the build and packaging process for TinyTask CLI.

## Standard Build

The standard build process compiles TypeScript to JavaScript using tsup:

```bash
npm run build
```

This produces:
- `dist/index.js` - Bundled JavaScript with ES modules
- `dist/index.js.map` - Source maps for debugging
- `dist/index.d.ts` - TypeScript type definitions

### Build Configuration

Build settings are defined in [`tsup.config.ts`](tsup.config.ts:1):
- **Entry**: `src/index.ts`
- **Format**: ESM (ES modules)
- **Target**: ES2022
- **Sourcemaps**: Enabled
- **Clean**: Output directory cleaned before each build

## Standalone Executables

TinyTask CLI uses **Node.js Single Executable Applications (SEA)** to create true standalone executables.

### What is Node.js SEA?

Node.js SEA is the official Node.js feature (stable since Node 20+) that packages your application and the Node.js runtime into a single executable file. This creates true native executables that:
- ✅ Run without requiring Node.js installation
- ✅ Work on any compatible platform
- ✅ Include all dependencies bundled
- ✅ Are code-signed and distributable

### Quick Start

```bash
# Create macOS executable (default)
npm run package

# Or create for specific platforms
npm run sea:macos    # macOS executable
npm run sea:linux    # Linux executable  
npm run sea:windows  # Windows executable
```

### Output

Executables are created in `dist/`:
- `dist/tinytask-macos` - macOS executable (~95 MB)
- `dist/tinytask-linux` - Linux executable (~95 MB)
- `dist/tinytask.exe` - Windows executable (~95 MB)

### How It Works

The packaging process:

1. **Bundle with esbuild** (`npm run bundle`)
   - Compiles TypeScript to JavaScript
   - Bundles all dependencies into a single CommonJS file
   - Resolves @modelcontextprotocol/sdk wildcard exports
   - Outputs: `dist/bundle.cjs` (~10.5 MB)

2. **Create SEA blob** (`node --experimental-sea-config sea-config.json`)
   - Packages the bundle into Node.js SEA format
   - Outputs: `sea-prep.blob`

3. **Inject into Node binary** (`postject`)
   - Copies the Node.js runtime binary
   - Injects the SEA blob using postject
   - Creates the final executable

4. **Code sign** (macOS only)
   - Signs the executable with ad-hoc signature
   - Required for macOS executables to run

### Configuration Files

#### [`esbuild.config.mjs`](esbuild.config.mjs:1)

Handles bundling with custom plugin for @modelcontextprotocol/sdk resolution:

```javascript
{
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',  // CommonJS required for SEA
  outfile: 'dist/bundle.cjs',
  plugins: [mcpResolverPlugin]  // Resolves wildcard exports
}
```

#### [`sea-config.json`](sea-config.json:1)

Node.js SEA configuration:

```json
{
  "main": "dist/bundle.cjs",
  "output": "sea-prep.blob",
  "disableExperimentalSEAWarning": true,
  "useSnapshot": false,
  "useCodeCache": true
}
```

### Platform-Specific Commands

#### macOS

```bash
npm run sea:macos
# or
./dist/tinytask-macos --version
```

Includes code signing with `codesign --sign - --force` for ad-hoc signature.

#### Linux

```bash
npm run sea:linux
# or (on Linux)
./dist/tinytask-linux --version
```

No code signing required.

#### Windows

```bash
npm run sea:windows
# or (on Windows)
dist\tinytask.exe --version
```

Note: For distribution, consider proper code signing with a certificate.

### Testing the Executable

```bash
# Test version
./dist/tinytask-macos --version

# Test help
./dist/tinytask-macos --help

# Test command (requires server)
./dist/tinytask-macos config show
```

## Development Workflow

### Watch Mode

For active development with hot reload:

```bash
npm run dev
```

This watches for file changes and rebuilds automatically.

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test -- --coverage
```

### Code Quality

```bash
# Lint code
npm run lint

# Format code
npm run format

# Clean build artifacts
npm run clean
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Build Executables

on:
  push:
    tags:
      - 'v*'

jobs:
  build-macos:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
        working-directory: ./tinytask-cli
      - run: npm run sea:macos
        working-directory: ./tinytask-cli
      - uses: actions/upload-artifact@v4
        with:
          name: tinytask-macos
          path: tinytask-cli/dist/tinytask-macos

  build-linux:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
        working-directory: ./tinytask-cli
      - run: npm run sea:linux
        working-directory: ./tinytask-cli
      - uses: actions/upload-artifact@v4
        with:
          name: tinytask-linux
          path: tinytask-cli/dist/tinytask-linux

  build-windows:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
        working-directory: ./tinytask-cli
      - run: npm run sea:windows
        working-directory: ./tinytask-cli
      - uses: actions/upload-artifact@v4
        with:
          name: tinytask-windows
          path: tinytask-cli/dist/tinytask.exe
```

## Troubleshooting

### Common Issues

#### "Cannot find module" during bundling

**Cause**: Import path doesn't match actual file structure

**Solution**: Ensure @modelcontextprotocol/sdk imports use correct paths:
```typescript
// Correct - matches actual file: dist/esm/client/streamableHttp.js
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
```

#### "Dynamic require not supported" error

**Cause**: ESM format with dynamic imports

**Solution**: Use CommonJS format (`format: 'cjs'`) in esbuild config.

#### "require is not defined in ES module scope"

**Cause**: CommonJS bundle has `.js` extension with `"type": "module"` in package.json

**Solution**: Use `.cjs` extension for CommonJS bundles.

#### Executable won't run on macOS

**Cause**: Not code-signed

**Solution**: 
```bash
codesign --sign - --force dist/tinytask-macos
# Or use npm run sea:macos which includes signing
```

#### Permission denied on Linux/macOS

**Cause**: Executable bit not set

**Solution**:
```bash
chmod +x dist/tinytask-linux
chmod +x dist/tinytask-macos
```

### Verification

After building, verify the executable:

```bash
# Check it exists and is executable
ls -lh dist/tinytask-macos

# Test basic commands
./dist/tinytask-macos --version
./dist/tinytask-macos --help

# Test actual functionality (requires server)
./dist/tinytask-macos config show
```

## Technical Details

### Why CommonJS for Bundling?

While the source code uses ESM, Node.js SEA currently works best with CommonJS:
- More stable for single-file executables
- Better compatibility with older dependencies
- Fewer dynamic import issues

The conversion happens during bundling:
- Source: TypeScript + ESM
- Bundle: CommonJS (dist/bundle.cjs)
- Executable: Native binary with embedded bundle

### The @modelcontextprotocol/sdk Challenge

This package uses wildcard exports which requires special handling:

```json
"exports": {
  "./client/*": { "import": "./dist/esm/*" }
}
```

Our esbuild plugin resolves these dynamically:
```javascript
'@modelcontextprotocol/sdk/client/streamableHttp.js'
// → node_modules/@modelcontextprotocol/sdk/dist/esm/client/streamableHttp.js
```

### File Sizes

- **Source bundle** (dist/bundle.cjs): ~10.5 MB
  - Application code + all dependencies bundled
  
- **SEA blob** (sea-prep.blob): ~10.5 MB
  - Compressed/prepared bundle

- **Final executable**: ~95 MB
  - Includes complete Node.js runtime (~85 MB)
  - Plus application bundle (~10 MB)

This is normal for Node.js SEA - you're packaging the entire runtime.

### Compression

The executables can be compressed for distribution:

```bash
# gzip (reduces to ~30-35 MB)
gzip -9 dist/tinytask-macos

# Users decompress:
gunzip tinytask-macos.gz
chmod +x tinytask-macos
```

## Distribution

### GitHub Releases

```bash
# Create release with executables
gh release create v0.1.0 \
  dist/tinytask-macos \
  dist/tinytask-linux \
  dist/tinytask.exe
```

### Installation Instructions

Users can download and run directly:

**macOS:**
```bash
curl -L https://github.com/user/repo/releases/download/v0.1.0/tinytask-macos -o tinytask
chmod +x tinytask
./tinytask --version
```

**Linux:**
```bash
curl -L https://github.com/user/repo/releases/download/v0.1.0/tinytask-linux -o tinytask
chmod +x tinytask
./tinytask --version
```

**Windows:**
```powershell
Invoke-WebRequest -Uri https://github.com/user/repo/releases/download/v0.1.0/tinytask.exe -OutFile tinytask.exe
.\tinytask.exe --version
```

### Code Signing for Distribution

For production distribution, consider proper code signing:

**macOS:**
```bash
# With Apple Developer ID
codesign --sign "Developer ID Application: Your Name" dist/tinytask-macos
```

**Windows:**
```powershell
# With code signing certificate
signtool sign /f cert.pfx /p password /t http://timestamp.digicert.com dist/tinytask.exe
```

## Distribution Checklist

Before releasing executables:

- [ ] All tests pass: `npm test`
- [ ] Linting passes: `npm run lint`
- [ ] Version bumped in `package.json`
- [ ] Bundle builds: `npm run bundle`
- [ ] macOS executable works: `npm run sea:macos && ./dist/tinytask-macos --version`
- [ ] Linux executable works (if on Linux): `npm run sea:linux && ./dist/tinytask-linux --version`
- [ ] Windows executable works (if on Windows): `npm run sea:windows && dist/tinytask.exe --version`
- [ ] Executables are code-signed (for distribution)
- [ ] Checksums generated for verification
- [ ] Release notes prepared
- [ ] CHANGELOG.md updated

## Resources

- [Node.js Single Executable Applications](https://nodejs.org/api/single-executable-applications.html)
- [postject - Node SEA Injection Tool](https://github.com/nodejs/postject)
- [esbuild Documentation](https://esbuild.github.io/)
- [Code Signing Guide](https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution)
