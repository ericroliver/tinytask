# Story 1: Project Setup

## Title
Bootstrap TinyTask MCP project with TypeScript and MCP SDK

## Description
As a developer, I need to set up the foundational project structure with TypeScript, MCP SDK, and build tooling so that I can begin implementing the TinyTask MCP server.

## User Story
**As a** developer  
**I want to** bootstrap the project with proper TypeScript configuration and dependencies  
**So that** I have a solid foundation to build the MCP server

## Acceptance Criteria

### Must Have
- [ ] npm project initialized with package.json
- [ ] TypeScript configured with tsconfig.json
- [ ] MCP SDK (@modelcontextprotocol/sdk) installed
- [ ] better-sqlite3 and other core dependencies installed
- [ ] Build script compiles TypeScript to JavaScript
- [ ] Directory structure created (src/, build/, docs/)
- [ ] Git repository initialized with .gitignore
- [ ] README.md with basic project information
- [ ] ESLint and Prettier configured

### Should Have
- [ ] npm scripts for build, dev, lint, format
- [ ] VS Code workspace settings for consistency
- [ ] EditorConfig for cross-editor consistency

### Could Have
- [ ] GitHub Actions placeholder for future CI/CD
- [ ] Prettier pre-commit hook

## Technical Details

### Dependencies
```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "latest",
    "better-sqlite3": "^9.0.0",
    "express": "^4.18.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.0",
    "@types/express": "^4.17.0",
    "@types/node": "^20.0.0",
    "typescript": "^5.3.0",
    "eslint": "^8.0.0",
    "prettier": "^3.0.0",
    "tsx": "^4.0.0"
  }
}
```

### Directory Structure
```
tinytask-mcp/
├── src/
│   ├── index.ts
│   ├── server/
│   ├── tools/
│   ├── resources/
│   ├── services/
│   ├── db/
│   └── types/
├── build/          # Compiled JavaScript
├── data/           # Development SQLite database
├── docs/
│   ├── technical/
│   ├── product/
│   └── product-stories/
├── .gitignore
├── package.json
├── tsconfig.json
├── .eslintrc.json
├── .prettierrc
└── README.md
```

### tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "outDir": "./build",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "build"]
}
```

### package.json Scripts
```json
{
  "scripts": {
    "build": "tsc",
    "dev": "tsx watch src/index.ts",
    "start": "node build/index.js",
    "lint": "eslint src/**/*.ts",
    "format": "prettier --write src/**/*.ts",
    "clean": "rm -rf build"
  }
}
```

## Dependencies
None - this is the first story

## Subtasks
1. [ ] Run `npm init -y` to create package.json
2. [ ] Install production dependencies
3. [ ] Install dev dependencies
4. [ ] Create tsconfig.json with proper compiler options
5. [ ] Create directory structure
6. [ ] Create .gitignore (node_modules, build, data, .DS_Store, etc.)
7. [ ] Initialize git repository
8. [ ] Create README.md with project description
9. [ ] Configure ESLint with TypeScript rules
10. [ ] Configure Prettier
11. [ ] Test build process with simple hello world
12. [ ] Commit initial setup

## Testing
- [ ] `npm run build` compiles without errors
- [ ] `npm run lint` runs without errors
- [ ] `npm run format` formats code
- [ ] `npm run dev` starts development server
- [ ] TypeScript provides proper type checking

## Definition of Done
- All acceptance criteria met
- Build pipeline works
- Dependencies installed
- Project structure created
- README documents project
- Code committed to git

## Estimated Effort
**2-4 hours**

## Priority
**P0 - Critical** (Blocks all other work)

## Labels
`setup`, `infrastructure`, `typescript`, `phase-1`
