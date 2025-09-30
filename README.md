# Maven Test Runner MCP Server

An MCP (Model Context Protocol) server that allows Claude Desktop to run Maven tests and get concise, actionable test results. Perfect for verifying code refactoring without getting overwhelmed by verbose Maven output.

## Features

- **Concise Test Reports**: Get clear ✅/❌ results without Maven's verbose output
- **Smart Error Detection**: Automatically identifies compilation issues, dependency problems, and test failures
- **Helpful Hints**: Suggests fixes for common issues (missing `-am` flag, Jackson errors, etc.)
- **Flexible Testing**: Run all tests in a module or target specific test classes
- **Workspace Awareness**: Configurable workspace directory with tilde expansion support

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
        "WORKSPACE_DIR": "/Users/username/source/nav/melosys-api"
      }
    }
  }
}
```

**Important**:
- Replace `/absolute/path/to/mcp-maven-test-runner` with the actual path to this project
- Replace `WORKSPACE_DIR` with your Maven project's root directory
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

### Tool Interface

The server provides a `run_tests` tool with these parameters:

- `project` (required): Maven module name (e.g., "saksflyt", "domain", "common")
- `testClass` (optional): Specific test class to run (e.g., "LagreMedlemsperiodeMedlTest")

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

## How It Works

1. Claude calls the `run_tests` tool with a project name and optional test class
2. The MCP server executes `~/.claude/scripts/run-tests.sh` with appropriate parameters
3. The script handles Maven's complexity (clean builds, dependency resolution, etc.)
4. The server parses the output and returns a concise summary to Claude
5. Claude presents the results in a human-readable format

## Troubleshooting

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
