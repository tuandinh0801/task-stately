import React, { FC, useCallback, useState } from 'react';
import TextInput, { Props as TextInputProps } from './TextInput';

interface ConfirmInputProps
  extends Omit<
    TextInputProps,
    'onSubmit' | 'onChange' | 'value' | 'placeholder'
  > {
  /** Default boolean value when input isn't a yes/no string */
  isChecked?: boolean;
  /** Called on each input change */
  onChange?: (value: string) => void;
  /** Called on submit with a boolean response */
  onSubmit: (confirmed: boolean) => void;
  /** Placeholder text for the input field */
  placeholder?: string;
  /** Current input value */
  value?: string;
}

const ConfirmInput: FC<ConfirmInputProps> = ({
  isChecked,
  onChange,
  onSubmit,
  placeholder,
  value,
  ...props
}) => {
  const [text, setText] = useState(value ?? '');
  const handleSubmit = useCallback(
    (newValue: string) => {
      const lower = newValue.toLowerCase().trim();
      let result: boolean;
      if (lower === 'yes' || lower === 'y') result = true;
      else if (lower === 'no' || lower === 'n') result = false;
      else result = !!isChecked;
      onSubmit(result);
    },
    [isChecked, onSubmit]
  );

  return (
    <TextInput
      {...props}
      placeholder={placeholder}
      value={text}
      onChange={onChange ?? setText}
      onSubmit={handleSubmit}
    />
  );
};

export default ConfirmInput;
