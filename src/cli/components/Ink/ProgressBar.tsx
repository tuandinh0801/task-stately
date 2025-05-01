import React, { FC } from 'react';
import { Text, TextProps } from 'ink';

interface ProgressBarProps extends Omit<TextProps, 'children'> {
  /** Progress fraction between 0 and 1 */
  percent: number;
  /** Number of empty columns on the left */
  left?: number;
  /** Number of empty columns on the right */
  right?: number;
  /** Total available columns for the bar */
  columns?: number;
  /** Character to draw the bar */
  character?: string;
  /** Whether to pad with spaces to fill the bar */
  rightPad?: boolean;
}

const ProgressBar: FC<ProgressBarProps> = ({
  percent,
  columns,
  left = 0,
  right = 0,
  character = '█',
  rightPad = false,
  ...textProps
}) => {
  const screen = columns || process.stdout.columns || 80;
  const space = screen - right - left;
  const filled = Math.min(Math.floor(space * percent), space);
  const bar = character.repeat(filled);

  const output = rightPad ? bar + ' '.repeat(space - filled) : bar;

  return <Text {...textProps}>{output}</Text>;
};

export default ProgressBar;