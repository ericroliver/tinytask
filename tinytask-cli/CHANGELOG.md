# Changelog

All notable changes to the TinyTask CLI will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.2] - 2026-01-20

### Fixed
- Improved error handling in config loader for malformed JSON files
- Config loader now properly falls back to searching current directory when home config contains invalid JSON

## [0.2.0] - 2026-01-20

### Added
- Support for subtasks and queues
- New commands for subtask management
- Queue management and statistics commands
- Profile-based configuration management
- Multiple output formatters (table, JSON, CSV, compact, tree)
- Environment variable support for configuration
- Home directory config file support (~/.tinytaskrc.json)

### Changed
- **BREAKING**: Profile add command syntax changed from positional to option-based
  - **Old**: `tinytask config profile add <name> --url <url>`
  - **New**: `tinytask config profile add --name <name> --server-url <url>`
- Improved table formatting with better column alignment
- Enhanced error messages and user feedback

### Migration Guide

#### Profile Command Changes

If you have scripts or aliases using the old profile add syntax:

```bash
# Old syntax (no longer works)
tinytask config profile add myprofile --url http://localhost:3000/mcp

# New syntax (use this instead)
tinytask config profile add --name myprofile --server-url http://localhost:3000/mcp
```

## [0.1.0] - 2026-01-15

### Added
- Initial release of TinyTask CLI
- Basic task management commands (create, list, get, update, delete, archive)
- Comment and link management
- Configuration management
- MCP client integration for both stdio and HTTP transports
- JSON and table output formats
