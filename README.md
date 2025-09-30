# Maven Test Runner MCP Server

An MCP (Model Context Protocol) server that allows Claude Desktop to run Maven tests, read source files, and make code changes. Perfect for verifying refactoring and editing code directly from Claude Desktop.

## Features

### Testing
- **Concise Test Reports**: Get clear ✅/❌ results without Maven's verbose output
- **Smart Error Detection**: Automatically identifies compilation issues, dependency problems, and test failures
- **Helpful Hints**: Suggests fixes for common issues (missing `-am` flag, Jackson errors, etc.)
- **Flexible Testing**: Run all tests in a module or target specific test classes

### File Operations
- **Read Source Files**: View any file in your workspace (Kotlin, Java, XML, etc.)
- **Edit Files**: Modify source code directly from Claude Desktop
- **Path Flexibility**: Support for both absolute and workspace-relative paths

### General
- **Workspace Awareness**: Configurable workspace directory with tilde expansion support
- **Safe Operations**: Read files before writing, with clear error messages

## Prerequisites

- Node.js (v18 or higher)
- Maven test wrapper script at `~/.claude/scripts/run-tests.sh`
- A Maven project workspace

## Installation

1. Clone or download this repository:
```bash
git clone https://github.com/RuneLind/mcp-maven-test-runner.git
cd mcp-maven-test-runner
```

2. Install dependencies and build:
```bash
npm install
npm run build
```

3. Add the server to your Claude Desktop configuration.

### Claude Desktop Configuration

Edit your Claude Desktop config file:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

Add this configuration:

```json
{
  "mcpServers": {
    "maven-test-runner": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-maven-test-runner/build/index.js"],
      "env": {
        "WORKSPACE_DIR": "/Users/username/source/nav/melosys-api",
        "PATH": "/Users/username/.sdkman/candidates/maven/current/bin:/Users/username/.sdkman/candidates/java/current/bin:/usr/local/bin:/usr/bin:/bin"
      }
    }
  }
}
```

**Important**:
- Replace `/absolute/path/to/mcp-maven-test-runner` with the actual path to this project
- Replace `WORKSPACE_DIR` with your Maven project's root directory
- **Update `PATH` to include your Maven and Java installations**:
  - Run `echo $PATH` in your terminal to get your full PATH
  - Make sure it includes paths to Maven (`mvn`) and Java (`java`)
  - Common locations: `~/.sdkman/candidates/maven/current/bin`, `/opt/homebrew/bin`, `/usr/local/bin`
- Tilde (`~`) expansion is supported in `WORKSPACE_DIR`

4. Restart Claude Desktop

## Usage

Once configured, Claude can run tests using natural language:

### Examples

**Run all tests in a module:**
```
Run all tests in the saksflyt module
```

**Run a specific test class:**
```
Run the LagreMedlemsperiodeMedlTest tests in the saksflyt module
```

**Verify refactoring:**
```
I just refactored the Medlemsperiode class. Can you run the tests to make sure everything still works?
```

**Read and edit files:**
```
Show me the Behandling.kt file in the domain module
```
```
Update the Behandling class to add a new method for validation
```

### Tool Interface

The server provides three tools:

#### 1. `run_tests`
Run Maven tests for a specific module.

Parameters:
- `project` (required): Maven module name (e.g., "saksflyt", "domain", "common")
- `testClass` (optional): Specific test class to run (e.g., "LagreMedlemsperiodeMedlTest")

#### 2. `read_file`
Read the contents of a source file.

Parameters:
- `filePath` (required): Path to file (absolute or relative to workspace)
  - Example: `domain/src/main/kotlin/no/nav/melosys/domain/Behandling.kt`
  - Example: `~/source/nav/melosys-api/domain/src/main/kotlin/no/nav/melosys/domain/Behandling.kt`

#### 3. `write_file`
Write or update a source file.

⚠️ **Warning**: This overwrites the entire file. Always read the file first!

Parameters:
- `filePath` (required): Path to file (absolute or relative to workspace)
- `content` (required): Complete new file content

## Output Examples

### Success
```
✅ All tests passed (12 tests run in 8s)
```

### Failure with Details
```
❌ Tests failed

Tests run: 5, Failures: 2, Errors: 0, Skipped: 0

🔍 Failure details:
testLagreMedlemsperiode: Expected <2023-01-01> but was <2023-01-02>
testOppdaterMedlemsperiode: NullPointerException at line 45

💡 Tip: Cross-module dependency issue. Try running with -am flag.
```

### No Tests Found
```
⚠️  No tests were run. Check your test configuration.
```

## Typical Workflow

Here's a common workflow using all three tools:

1. **Read existing code**:
   ```
   Show me the Behandling.kt file
   ```

2. **Make changes**:
   ```
   Add a validation method that checks if the status is valid
   ```
   (Claude will read the file, understand it, and write the updated version)

3. **Verify changes**:
   ```
   Run the domain tests to make sure my changes work
   ```

4. **Fix issues if needed**:
   ```
   The test failed - can you fix the validation logic?
   ```

## How It Works

1. Claude calls the `run_tests` tool with a project name and optional test class
2. The MCP server executes `~/.claude/scripts/run-tests.sh` with appropriate parameters
3. The script handles Maven's complexity (clean builds, dependency resolution, etc.)
4. The server parses the output and returns a concise summary to Claude
5. Claude presents the results in a human-readable format

## Troubleshooting

### "mvn: command not found" error
This is the most common issue. The MCP server runs in a minimal environment without your shell's PATH.

**Solution**: Add your PATH to the Claude Desktop config:
1. Run `echo $PATH` in your terminal
2. Copy the entire PATH value
3. Add it to the `env` section in your Claude Desktop config:
```json
"env": {
  "WORKSPACE_DIR": "/path/to/workspace",
  "PATH": "/your/full/path/here"
}
```
4. Make sure the PATH includes Maven and Java directories
5. Restart Claude Desktop

### "Script not found" error
- Verify the script exists at `~/.claude/scripts/run-tests.sh`
- Check that the script is executable: `chmod +x ~/.claude/scripts/run-tests.sh`

### "Permission denied" error
- Make the script executable: `chmod +x ~/.claude/scripts/run-tests.sh`

### Tests timeout (>5 minutes)
- Consider running fewer tests or specific test classes
- Check if tests are hanging or taking too long

### Wrong workspace directory
- Verify `WORKSPACE_DIR` in your Claude Desktop config
- Use absolute paths (tilde `~` is supported)
- Restart Claude Desktop after changing the config

### Server not appearing in Claude
- Check the config file syntax (valid JSON)
- Verify the absolute path to `build/index.js`
- Check Claude Desktop logs for error messages
- Restart Claude Desktop

## Development

### Build
```bash
npm run build
```

### Watch mode (rebuild on changes)
```bash
npm run watch
```

### Update dependencies
```bash
npm update
```

## Project Structure

```
mcp-maven-test-runner/
├── src/
│   └── index.ts          # Main server implementation
├── build/                 # Compiled JavaScript (generated)
├── package.json
├── tsconfig.json
└── README.md
```

## Contributing

This is a personal tool, but suggestions and improvements are welcome! Open an issue or submit a pull request.

## License

ISC License - See LICENSE file for details
