# TinyTask MCP Troubleshooting Guide

This guide helps you diagnose and fix common issues with TinyTask MCP.

## Common Issues

### Server Won't Start

#### Issue: "Address already in use" error

**Symptoms:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solution:**
1. Check if another process is using the port:
```bash
lsof -i :3000
```

2. Either kill the process or change the port:
```bash
TINYTASK_PORT=3001 npm run start:sse
```

3. In Docker:
```yaml
environment:
  - TINYTASK_PORT=3001
ports:
  - "3001:3001"
```

#### Issue: "Database is locked" error

**Symptoms:**
```
Error: SQLITE_BUSY: database is locked
```

**Solution:**
1. Ensure only one instance is accessing the database
2. Check for zombie processes:
```bash
ps aux | grep tinytask
kill <pid>
```

3. If using Docker, ensure proper volume mounting:
```yaml
volumes:
  - ./data:/app/data
```

#### Issue: Module not found errors

**Symptoms:**
```
Error: Cannot find module './build/index.js'
```

**Solution:**
1. Build the project first:
```bash
npm run build
```

2. Ensure dependencies are installed:
```bash
npm install
```

3. Check that `build/` directory exists and contains compiled files

---

### MCP Client Connection Issues

#### Issue: stdio mode not connecting

**Symptoms:**
- Client shows "Connection failed" or "No response from server"
- No output when running the command

**Solution:**
1. Verify the path in your MCP client config:
```json
{
  "mcpServers": {
    "tinytask": {
      "command": "node",
      "args": ["/absolute/path/to/tinytask-mcp/build/index.js"]
    }
  }
}
```

2. Test the command directly in terminal:
```bash
node /path/to/tinytask-mcp/build/index.js
```

3. Check environment variables are set:
```json
{
  "env": {
    "TINYTASK_MODE": "stdio"
  }
}
```

4. Enable debug logging:
```json
{
  "env": {
    "TINYTASK_MODE": "stdio",
    "DEBUG": "tinytask:*"
  }
}
```

#### Issue: SSE mode not responding

**Symptoms:**
- HTTP requests timeout
- Health check fails
- Browser shows "Cannot connect"

**Solution:**
1. Verify server is running:
```bash
curl http://localhost:3000/health
```

2. Check the server logs:
```bash
# If running locally
npm run start:sse

# If using Docker
docker-compose logs -f
```

3. Ensure correct URL in client config:
```json
{
  "mcpServers": {
    "tinytask": {
      "url": "http://localhost:3000/mcp"
    }
  }
}
```

4. Check firewall settings (especially on production servers)

---

### Database Issues

#### Issue: Database corrupted

**Symptoms:**
- "Database malformed" error
- Queries returning unexpected results
- Server crashes on startup

**Solution:**
1. Stop the server
2. Backup current database:
```bash
cp data/tinytask.db data/tinytask.db.backup
```

3. Try database integrity check:
```bash
sqlite3 data/tinytask.db "PRAGMA integrity_check;"
```

4. If corrupted, restore from backup or recreate:
```bash
rm data/tinytask.db
npm run start  # Will create fresh database
```

#### Issue: Old schema version

**Symptoms:**
- Errors about missing columns or tables
- Application works but some features fail

**Solution:**
1. The application automatically initializes the schema on startup
2. If issues persist, backup and recreate:
```bash
cp data/tinytask.db data/tinytask.db.backup
rm data/tinytask.db
npm run start
```

3. Migrate data manually if needed (see Database Schema docs)

---

### Performance Issues

#### Issue: Slow query performance

**Symptoms:**
- Long response times for queue queries
- List operations taking several seconds

**Solution:**
1. Check database size:
```bash
ls -lh data/tinytask.db
```

2. Archive old completed tasks:
```typescript
// Get old completed tasks
const tasks = await listTasks();
const oldTasks = tasks.filter(t => 
  t.status === 'complete' && 
  new Date(t.updated_at) < Date.now() - 30 * 24 * 60 * 60 * 1000
);

// Archive them
for (const task of oldTasks) {
  await archiveTask({ id: task.id });
}
```

3. Consider database optimization:
```bash
sqlite3 data/tinytask.db "VACUUM;"
```

4. Ensure indexes are created (they should be automatically):
```sql
-- Check indexes
SELECT * FROM sqlite_master WHERE type='index';
```

#### Issue: Memory usage growing

**Symptoms:**
- Server memory usage increases over time
- Eventually runs out of memory

**Solution:**
1. Monitor memory usage:
```bash
# Local
ps aux | grep node

# Docker
docker stats tinytask-mcp
```

2. Restart server periodically if needed
3. Set memory limits in Docker:
```yaml
deploy:
  resources:
    limits:
      memory: 512M
```

---

### Docker Issues

#### Issue: Container exits immediately

**Symptoms:**
```
docker-compose up
# Container starts then exits
```

**Solution:**
1. Check logs:
```bash
docker-compose logs
```

2. Verify database volume is writable:
```bash
ls -la data/
chmod 755 data/
```

3. Run container interactively to see errors:
```bash
docker run -it tinytask-mcp node build/index.js
```

#### Issue: Volume mount not persisting data

**Symptoms:**
- Data lost when container restarts
- Empty database after restart

**Solution:**
1. Verify volume mount in docker-compose.yml:
```yaml
volumes:
  - ./data:/app/data  # Host:Container
```

2. Check volume exists:
```bash
docker-compose down
ls -la data/
docker-compose up -d
```

3. Use named volume instead of bind mount:
```yaml
volumes:
  - tinytask-data:/app/data

volumes:
  tinytask-data:
```

---

### Testing Issues

#### Issue: Tests fail with "Database is locked"

**Symptoms:**
- Tests fail intermittently
- Multiple test files fail at once

**Solution:**
1. Tests use separate test databases
2. Ensure test cleanup is working:
```typescript
afterEach(() => {
  client.cleanup();  // This closes DB and deletes file
});
```

3. Run tests serially instead of parallel:
```bash
jest --runInBand
```

4. Increase test timeout if needed:
```javascript
jest.setTimeout(10000);
```

#### Issue: "Cannot find module" in tests

**Symptoms:**
```
Cannot find module '../../src/services/task-service.js'
```

**Solution:**
1. Build the project before testing:
```bash
npm run build && npm test
```

2. Or configure Jest to use source files directly with ts-jest
3. Check file extensions in imports (.js for ESM)

---

### Data Issues

#### Issue: Tasks not appearing in queue

**Symptoms:**
- Task created successfully
- `get_my_queue` returns empty array
- Task exists when queried directly

**Possible Causes & Solutions:**

1. **Wrong agent name:**
```typescript
// Task assigned to 'code-agent'
const queue = await getMyQueue({ agent_name: 'codeagent' });  // Wrong!
// Returns empty because name doesn't match
```

2. **Task is archived:**
```typescript
// Archived tasks don't appear in queues
const task = await getTask({ id: 1 });
console.log(task.archived);  // Check if archived
```

3. **Task is completed:**
- By default, queues only show idle and working tasks
- Completed tasks may be filtered out

#### Issue: Comments or links not showing on task

**Symptoms:**
- Added comment/link successfully
- Not returned when fetching task

**Solution:**
1. Verify the comment/link was created:
```typescript
const comments = await listComments({ task_id: 1 });
console.log(comments);
```

2. Check task is fetched correctly:
```typescript
const task = await getTask({ id: 1 });
console.log('Comments:', task.comments.length);
console.log('Links:', task.links.length);
```

3. Verify foreign key constraints:
```bash
sqlite3 data/tinytask.db
> PRAGMA foreign_keys;  # Should return 1
```

---

## Debug Mode

Enable detailed logging for debugging:

### Environment Variables

```bash
# Enable all TinyTask logs
export DEBUG="tinytask:*"

# Enable specific module logs
export DEBUG="tinytask:server,tinytask:db"

# Run with debug logging
DEBUG="tinytask:*" npm run start:sse
```

### Log Output

Look for these log messages:

```
tinytask:server Server starting in sse mode
tinytask:db Database initialized at ./data/tinytask.db
tinytask:server HTTP server listening on port 3000
tinytask:tools Processing tool call: create_task
```

---

## Getting Help

If you're still experiencing issues:

1. **Check the logs:**
   - Local: Terminal output
   - Docker: `docker-compose logs -f`

2. **Enable debug mode:**
   ```bash
   DEBUG="*" npm run start:sse
   ```

3. **Verify system requirements:**
   - Node.js 18+ or 20+
   - SQLite3 support
   - Write access to data directory

4. **Test with minimal config:**
   ```bash
   # Clean start
   rm -rf data/tinytask.db build/
   npm run build
   npm run start:sse
   ```

5. **File an issue on GitHub with:**
   - Full error message
   - Steps to reproduce
   - Environment details (OS, Node version, etc.)
   - Relevant logs (with DEBUG enabled)

---

## Health Checks

Use these endpoints/commands to verify system health:

### HTTP Health Check

```bash
curl http://localhost:3000/health
# Should return: {"status":"ok","timestamp":"..."}
```

### Database Health Check

```bash
sqlite3 data/tinytask.db "SELECT COUNT(*) FROM tasks;"
# Should return a number (0 or more)
```

### Full System Test

```bash
# Create a test task
curl -X POST http://localhost:3000/test-create

# List tasks
curl http://localhost:3000/test-list

# Check logs for any errors
```

---

## Performance Tuning

### For High Load Scenarios

1. **Increase connection pool (if needed in future versions)**
2. **Use WAL mode for better concurrency:**
```sql
PRAGMA journal_mode=WAL;
```

3. **Optimize queries with appropriate indexes**
4. **Archive old tasks regularly**
5. **Monitor and set appropriate timeouts**

### For Resource-Constrained Environments

1. **Set memory limits**
2. **Use smaller database page size**
3. **Limit concurrent connections**
4. **Regular VACUUM to compact database**

---

## Preventive Maintenance

### Regular Tasks

1. **Weekly:**
   - Archive completed tasks
   - Check logs for warnings
   - Verify backups

2. **Monthly:**
   - Database VACUUM
   - Review disk space
   - Update dependencies

3. **As Needed:**
   - Backup before major changes
   - Test restore procedures
   - Review and clean up old data

### Backup Strategy

```bash
# Simple backup
cp data/tinytask.db data/backups/tinytask-$(date +%Y%m%d).db

# Docker backup
docker exec tinytask-mcp sqlite3 /app/data/tinytask.db ".backup '/app/data/backup.db'"
```

### Monitoring

Monitor these metrics:
- Database file size
- Query response times
- Active task count
- Error rates in logs
- Memory usage
- Disk space

---

## Emergency Procedures

### Complete Reset

**Warning: This will delete all data!**

```bash
# Stop server
docker-compose down  # or Ctrl+C if running locally

# Remove database
rm -rf data/tinytask.db*

# Remove build artifacts
rm -rf build/

# Clean install
npm install
npm run build

# Start fresh
npm run start:sse
```

### Recovery from Backup

```bash
# Stop server
docker-compose down

# Restore backup
cp data/backups/tinytask-20240101.db data/tinytask.db

# Start server
docker-compose up -d

# Verify
curl http://localhost:3000/health
```
