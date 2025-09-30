#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { spawn } from "child_process";
import { homedir } from "os";
import { resolve } from "path";

// Expand tilde in paths
function expandPath(path: string): string {
  if (path.startsWith("~/")) {
    return resolve(homedir(), path.slice(2));
  }
  return path;
}

// Get workspace directory from environment or use default
const WORKSPACE_DIR = expandPath(
  process.env.WORKSPACE_DIR || "~/source/nav/melosys-api"
);
const SCRIPT_PATH = expandPath("~/.claude/scripts/run-tests.sh");

interface TestResult {
  success: boolean;
  message: string;
  duration?: number;
}

// Parse test output for concise summary
function parseTestOutput(stdout: string, stderr: string, exitCode: number, duration: number): TestResult {
  const output = stdout + "\n" + stderr;

  // Extract test summary line
  const summaryMatch = output.match(/Tests run: (\d+).*?Failures: (\d+).*?Errors: (\d+).*?Skipped: (\d+)/);

  if (exitCode === 0) {
    if (summaryMatch) {
      const [, testsRun, failures, errors] = summaryMatch;
      const total = parseInt(testsRun);

      if (total === 0) {
        return {
          success: false,
          message: "⚠️  No tests were run. Check your test configuration.",
          duration
        };
      }

      return {
        success: true,
        message: `✅ All tests passed (${total} test${total === 1 ? '' : 's'} run in ${duration}s)`,
        duration
      };
    }

    return {
      success: true,
      message: `✅ Tests completed successfully (${duration}s)`,
      duration
    };
  }

  // Failed tests
  let message = "❌ Tests failed\n\n";

  if (summaryMatch) {
    const [, testsRun, failures, errors, skipped] = summaryMatch;
    message += `Tests run: ${testsRun}, Failures: ${failures}, Errors: ${errors}, Skipped: ${skipped}\n\n`;
  }

  // Extract failure details
  const failureBlocks: string[] = [];
  const lines = output.split("\n");

  let inFailure = false;
  let currentFailure: string[] = [];

  for (const line of lines) {
    if (line.includes("Failed tests:") || line.includes("Tests in error:")) {
      inFailure = true;
      continue;
    }

    if (inFailure) {
      if (line.trim() === "" && currentFailure.length > 0) {
        failureBlocks.push(currentFailure.join("\n"));
        currentFailure = [];
        if (failureBlocks.length >= 5) break; // Limit to first 5 failures
      } else if (line.trim()) {
        currentFailure.push(line.trim());
      }
    }
  }

  if (currentFailure.length > 0 && failureBlocks.length < 5) {
    failureBlocks.push(currentFailure.join("\n"));
  }

  if (failureBlocks.length > 0) {
    message += "🔍 Failure details:\n" + failureBlocks.join("\n\n");
  } else {
    // If no structured failures found, show relevant error lines
    const errorLines = lines
      .filter(line => line.includes("[ERROR]") || line.includes("FAILED") || line.includes("Exception"))
      .slice(0, 10);

    if (errorLines.length > 0) {
      message += "🔍 Errors:\n" + errorLines.join("\n");
    }
  }

  // Check for common issues and add hints
  if (output.includes("NoClassDefFoundError") || output.includes("ClassNotFoundException")) {
    message += "\n\n💡 Tip: Cross-module dependency issue. Try running with -am flag.";
  } else if (output.includes("JsonMappingException") || output.includes("JsonParseException")) {
    message += "\n\n💡 Tip: Jackson serialization issue (common after Java→Kotlin conversion).";
  } else if (output.includes("cannot find symbol") || output.includes("package") && output.includes("does not exist")) {
    message += "\n\n💡 Tip: Compilation error. Try clean build first.";
  }

  return {
    success: false,
    message,
    duration
  };
}

// Execute test script
async function runTests(project: string, testClass?: string): Promise<TestResult> {
  return new Promise((resolve, reject) => {
    // Build command arguments
    const args = ["-pl", project];

    if (testClass) {
      args.push(`-Dtest=${testClass}`);
    }

    const startTime = Date.now();

    // Execute the script
    const child = spawn(SCRIPT_PATH, args, {
      cwd: WORKSPACE_DIR,
      timeout: 300000, // 5 minutes
      shell: true,
    });

    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr?.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("error", (error) => {
      reject(new Error(`Failed to execute script: ${error.message}`));
    });

    child.on("close", (code) => {
      const duration = Math.round((Date.now() - startTime) / 1000);

      try {
        const result = parseTestOutput(stdout, stderr, code || 0, duration);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  });
}

// Define the tool
const RUN_TESTS_TOOL: Tool = {
  name: "run_tests",
  description: `Run Maven tests for a specific project module using the test wrapper script.

This tool executes tests in your Maven project and returns a concise summary.
Perfect for verifying code refactoring or checking if specific tests pass.

Parameters:
- project: The Maven module name (e.g., "saksflyt", "common", "domain")
- testClass: (optional) Specific test class to run (e.g., "LagreMedlemsperiodeMedlTest")

The tool automatically handles:
- Running tests in the correct workspace directory
- Rebuilding if compilation issues are detected
- Providing clear success/failure messages
- Suggesting fixes for common issues

Workspace: ${WORKSPACE_DIR}`,
  inputSchema: {
    type: "object",
    properties: {
      project: {
        type: "string",
        description: "The Maven module/project name (e.g., 'saksflyt')",
      },
      testClass: {
        type: "string",
        description: "Optional: Specific test class to run (e.g., 'LagreMedlemsperiodeMedlTest')",
      },
    },
    required: ["project"],
  },
};

// Create and configure the server
const server = new Server(
  {
    name: "maven-test-runner",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [RUN_TESTS_TOOL],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "run_tests") {
    const { project, testClass } = request.params.arguments as {
      project: string;
      testClass?: string;
    };

    if (!project) {
      throw new Error("Project parameter is required");
    }

    try {
      const result = await runTests(project, testClass);

      return {
        content: [
          {
            type: "text",
            text: result.message,
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Provide helpful error messages
      let message = `❌ Error running tests: ${errorMessage}`;

      if (errorMessage.includes("ENOENT") || errorMessage.includes("not found")) {
        message += `\n\n💡 Check that the script exists at: ${SCRIPT_PATH}`;
      } else if (errorMessage.includes("EACCES") || errorMessage.includes("permission denied")) {
        message += `\n\n💡 Make the script executable: chmod +x ${SCRIPT_PATH}`;
      } else if (errorMessage.includes("timeout")) {
        message += "\n\n💡 Tests took too long (>5 minutes). Consider running fewer tests.";
      }

      return {
        content: [
          {
            type: "text",
            text: message,
          },
        ],
        isError: true,
      };
    }
  }

  throw new Error(`Unknown tool: ${request.params.name}`);
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Log to stderr so it doesn't interfere with MCP protocol
  console.error("Maven Test Runner MCP Server started");
  console.error(`Workspace: ${WORKSPACE_DIR}`);
  console.error(`Script: ${SCRIPT_PATH}`);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});