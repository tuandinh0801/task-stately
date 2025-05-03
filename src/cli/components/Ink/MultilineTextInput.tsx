import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import chalk from 'chalk';

export type Props = {
  /**
   * Text to display when `value` is empty.
   */
  readonly placeholder?: string;

  /**
   * Listen to user's input. Useful in case there are multiple input components
   * at the same time and input must be "routed" to a specific component.
   */
  readonly focus?: boolean;

  /**
   * Value to display in the text input.
   */
  readonly value: string;

  /**
   * Function to call when value updates.
   */
  readonly onChange: (value: string) => void;

  /**
   * Function to call when `Enter` is pressed, where first argument is a value of the input.
   * In multiline mode, Enter adds a new line unless Ctrl+Enter or Cmd+Enter is pressed.
   */
  readonly onSubmit?: (value: string) => void;

  /**
   * Show instructions for multiline input.
   */
  readonly showInstructions?: boolean;
};

/**
 * A multiline text input component for Ink.
 * Allows users to enter text with multiple lines.
 * Press Enter to add a new line, Ctrl+Enter or Cmd+Enter to submit.
 */
function MultilineTextInput({
  value: originalValue,
  placeholder = '',
  focus = true,
  showInstructions = true,
  onChange,
  onSubmit,
}: Props) {
  const previousKey = React.useRef<any>(null);
  const [value, setValue] = useState(originalValue || '');
  const [cursorRow, setCursorRow] = useState(0);
  const [cursorCol, setCursorCol] = useState(0);

  // Update cursor position when value changes externally
  useEffect(() => {
    setValue(originalValue || '');
    const lines = (originalValue || '').split('\n');
    setCursorRow(lines.length - 1);
    setCursorCol(lines[lines.length - 1]?.length || 0);
  }, [originalValue]);

  // Handle input
  useInput(
    useCallback(
      (input, key) => {
        if (!focus) return;
        previousKey.current = key;

        // Submit on Ctrl+Enter or Cmd+Enter
        if (
          key.return &&
          (previousKey.current === key.ctrl || previousKey.current === key.meta)
        ) {
          onSubmit?.(value);
          return;
        }

        let newValue = value;
        let newCursorRow = cursorRow;
        let newCursorCol = cursorCol;
        const lines = value.split('\n');

        // Handle special keys
        if (key.return) {
          // Add a new line on Enter
          const beforeCursor = lines[cursorRow]?.substring(0, cursorCol) || '';
          const afterCursor = lines[cursorRow]?.substring(cursorCol) || '';

          lines.splice(cursorRow, 1, beforeCursor, afterCursor);
          newValue = lines.join('\n');
          newCursorRow++;
          newCursorCol = 0;
        } else if (key.backspace) {
          if (cursorCol > 0) {
            // Delete character before cursor
            const line = lines[cursorRow];
            lines[cursorRow] =
              line.substring(0, cursorCol - 1) + line.substring(cursorCol);
            newCursorCol--;
          } else if (cursorRow > 0) {
            // Join with previous line
            const previousLine = lines[cursorRow - 1];
            const currentLine = lines[cursorRow];
            newCursorCol = previousLine.length;
            lines.splice(cursorRow - 1, 2, previousLine + currentLine);
            newCursorRow--;
          }
          newValue = lines.join('\n');
        } else if (key.delete || (key.backspace && cursorCol === 0)) {
          const line = lines[cursorRow];
          if (cursorCol < line.length) {
            // Delete character after cursor
            lines[cursorRow] =
              line.substring(0, cursorCol) + line.substring(cursorCol + 1);
          } else if (cursorRow < lines.length - 1) {
            // Join with next line
            const nextLine = lines[cursorRow + 1];
            lines.splice(cursorRow, 2, line + nextLine);
          }
          newValue = lines.join('\n');
        } else if (key.upArrow) {
          if (cursorRow > 0) {
            newCursorRow--;
            const prevLineLength = lines[newCursorRow]?.length || 0;
            newCursorCol = Math.min(cursorCol, prevLineLength);
          }
        } else if (key.downArrow) {
          if (cursorRow < lines.length - 1) {
            newCursorRow++;
            const nextLineLength = lines[newCursorRow]?.length || 0;
            newCursorCol = Math.min(cursorCol, nextLineLength);
          }
        } else if (key.leftArrow) {
          if (cursorCol > 0) {
            newCursorCol--;
          } else if (cursorRow > 0) {
            newCursorRow--;
            newCursorCol = lines[newCursorRow]?.length || 0;
          }
        } else if (key.rightArrow) {
          const lineLength = lines[cursorRow]?.length || 0;
          if (cursorCol < lineLength) {
            newCursorCol++;
          } else if (cursorRow < lines.length - 1) {
            newCursorRow++;
            newCursorCol = 0;
          }
          // Use ctrl+a for home and ctrl+e for end (common terminal shortcuts)
        } else if (key.ctrl && input === 'a') {
          newCursorCol = 0;
        } else if (key.ctrl && input === 'e') {
          newCursorCol = lines[cursorRow]?.length || 0;
        } else if (!key.ctrl && !key.meta && !key.tab && input) {
          // Insert character at cursor position
          const line = lines[cursorRow] || '';
          lines[cursorRow] =
            line.substring(0, cursorCol) + input + line.substring(cursorCol);
          newValue = lines.join('\n');
          newCursorCol += input.length;
        }

        if (newValue !== value) {
          setValue(newValue);
          onChange(newValue);
        }

        setCursorRow(newCursorRow);
        setCursorCol(newCursorCol);
      },
      [value, cursorRow, cursorCol, focus, onChange, onSubmit]
    ),
    { isActive: focus }
  );

  // Render the multiline input
  const lines = value.split('\n');
  const renderedLines = lines.map((line, index) => {
    if (index === cursorRow && focus) {
      // Add cursor to the current line
      const beforeCursor = line.substring(0, cursorCol);
      const atCursor = line.substring(cursorCol, cursorCol + 1) || ' ';
      const afterCursor = line.substring(cursorCol + 1);

      return (
        <Text key={index}>
          {beforeCursor}
          {chalk.inverse(atCursor)}
          {afterCursor}
        </Text>
      );
    }
    return <Text key={index}>{line || ' '}</Text>;
  });

  // If empty, show placeholder
  if (value === '' && placeholder) {
    renderedLines.push(
      <Text key="placeholder" dimColor>
        {placeholder}
      </Text>
    );
  }

  return (
    <Box flexDirection="column">
      {renderedLines}
      {showInstructions && focus && (
        <Text dimColor italic>
          Press Enter for new line, Ctrl+Enter to submit
        </Text>
      )}
    </Box>
  );
}

export default MultilineTextInput;
