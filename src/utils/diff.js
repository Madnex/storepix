/**
 * Simple line-based diff utility for template comparison
 */

/**
 * Compute Longest Common Subsequence indices
 * @param {string[]} a - First array of lines
 * @param {string[]} b - Second array of lines
 * @returns {Array<[number, number]>} Array of [aIndex, bIndex] pairs for matching lines
 */
function computeLCS(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to find indices
  const result = [];
  let i = m, j = n;
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      result.unshift([i - 1, j - 1]);
      i--;
      j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  return result;
}

/**
 * Generate diff between two texts
 * @param {string} oldText - Original text
 * @param {string} newText - New text
 * @returns {Array<{type: 'same'|'add'|'remove', line: number, content: string}>}
 */
export function diff(oldText, newText) {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');

  const result = [];
  let oldIndex = 0;
  let newIndex = 0;

  const lcs = computeLCS(oldLines, newLines);

  for (const [oldIdx, newIdx] of lcs) {
    // Add removals (lines in old but not in new)
    while (oldIndex < oldIdx) {
      result.push({ type: 'remove', line: oldIndex + 1, content: oldLines[oldIndex] });
      oldIndex++;
    }
    // Add additions (lines in new but not in old)
    while (newIndex < newIdx) {
      result.push({ type: 'add', line: newIndex + 1, content: newLines[newIndex] });
      newIndex++;
    }
    // Same line
    result.push({ type: 'same', line: oldIndex + 1, content: oldLines[oldIndex] });
    oldIndex++;
    newIndex++;
  }

  // Handle remaining lines
  while (oldIndex < oldLines.length) {
    result.push({ type: 'remove', line: oldIndex + 1, content: oldLines[oldIndex] });
    oldIndex++;
  }
  while (newIndex < newLines.length) {
    result.push({ type: 'add', line: newIndex + 1, content: newLines[newIndex] });
    newIndex++;
  }

  return result;
}

/**
 * Format diff for console display with colors
 * @param {Array} diffResult - Result from diff()
 * @param {number} contextLines - Number of context lines around changes
 * @returns {string} Formatted diff string
 */
export function formatDiff(diffResult, contextLines = 3) {
  const output = [];
  let lastPrintedIndex = -contextLines - 1;
  let inHunk = false;

  for (let i = 0; i < diffResult.length; i++) {
    const item = diffResult[i];

    if (item.type !== 'same') {
      // Check if we need a separator
      if (lastPrintedIndex < i - contextLines - 1 && output.length > 0 && inHunk) {
        output.push('\x1b[36m...\x1b[0m');
      }
      inHunk = true;

      // Print context before change
      for (let j = Math.max(lastPrintedIndex + 1, i - contextLines); j < i; j++) {
        if (j >= 0 && diffResult[j].type === 'same') {
          output.push(`  ${diffResult[j].content}`);
        }
      }

      // Print the change
      if (item.type === 'add') {
        output.push(`\x1b[32m+ ${item.content}\x1b[0m`);
      } else {
        output.push(`\x1b[31m- ${item.content}\x1b[0m`);
      }

      lastPrintedIndex = i;

      // Look ahead for context after
      let afterContext = 0;
      for (let j = i + 1; j < diffResult.length && afterContext < contextLines; j++) {
        if (diffResult[j].type !== 'same') break;
        output.push(`  ${diffResult[j].content}`);
        lastPrintedIndex = j;
        afterContext++;
      }
    }
  }

  return output.join('\n');
}

/**
 * Check if two files have differences
 * @param {string} oldText - Original text
 * @param {string} newText - New text
 * @returns {boolean} True if files are different
 */
export function hasDifferences(oldText, newText) {
  return oldText !== newText;
}

/**
 * Count changes in diff result
 * @param {Array} diffResult - Result from diff()
 * @returns {{additions: number, removals: number}}
 */
export function countChanges(diffResult) {
  let additions = 0;
  let removals = 0;

  for (const item of diffResult) {
    if (item.type === 'add') additions++;
    if (item.type === 'remove') removals++;
  }

  return { additions, removals };
}
