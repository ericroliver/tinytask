/**
 * Read all content from stdin as a string.
 *
 * Used by the `--stdin` flag on commands that accept free-form text content
 * (comments, descriptions, move comments). Reading from stdin completely
 * sidesteps shell quoting/escaping issues — especially bash command
 * substitution triggered by backticks inside double-quoted arguments.
 *
 * If stdin is a TTY (no piped input), returns `undefined` so the caller can
 * fall back to the CLI argument or error out with a helpful message.
 *
 * @param timeoutMs - How long to wait for stdin data before giving up (default 5000ms)
 * @returns The full stdin content as a string, or `undefined` if no piped input is available
 */
export async function readStdin(timeoutMs = 5000): Promise<string | undefined> {
  const stdin = process.stdin;

  // If stdin is a TTY, there is no piped input to read
  if (stdin.isTTY) {
    return undefined;
  }

  return new Promise<string | undefined>((resolve) => {
    let data = '';
    let settled = false;

    const finish = (result: string | undefined) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      stdin.removeAllListeners();
      resolve(result);
    };

    // Timeout — if no data arrives within the window, give up gracefully
    const timer = setTimeout(() => {
      finish(data.length > 0 ? data : undefined);
    }, timeoutMs);

    stdin.setEncoding('utf8');

    stdin.on('data', (chunk) => {
      data += chunk;
    });

    stdin.on('end', () => {
      finish(data);
    });

    stdin.on('error', () => {
      finish(undefined);
    });

    // Some environments (e.g. when piped from heredoc) may not emit 'end'
    // promptly; the timeout acts as a safety net.
  });
}

/**
 * Resolve the content for a command that accepts a `--stdin` flag.
 *
 * If `useStdin` is true, reads content from stdin and returns it.
 * If stdin is available but empty, returns an empty string (valid — the user
 * explicitly asked for stdin).
 * If `useStdin` is true but no stdin is available (TTY), throws an error
 * instructing the user to pipe content.
 *
 * @param useStdin - Whether the `--stdin` flag was passed
 * @param fallback - The content from the CLI argument (may be undefined)
 * @returns The resolved content string, or the fallback if --stdin was not used
 */
export async function resolveContent(
  useStdin: boolean,
  fallback: string | undefined
): Promise<string | undefined> {
  if (!useStdin) {
    return fallback;
  }

  const stdinContent = await readStdin();

  if (stdinContent === undefined) {
    throw new Error(
      '--stdin was specified but no piped input was detected.\n' +
        'Pipe content via stdin, e.g.:\n' +
        '  echo "content" | tinytask comment add <task-id> --stdin\n' +
        '  tinytask comment add <task-id> --stdin <<EOF\n' +
        '  your multi-line content here\n' +
        '  EOF'
    );
  }

  return stdinContent;
}
