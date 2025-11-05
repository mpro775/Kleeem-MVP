'use client';

import { Autocomplete, TextField, Chip } from '@mui/material';

type TagsInputProps = {
  label: string;
  value: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
};

export default function TagsInput({
  label,
  value,
  onChange,
  placeholder,
  suggestions = [],
}: TagsInputProps) {
  return (
    <Autocomplete
      multiple
      freeSolo
      options={suggestions}
      value={value}
      onChange={(_, newVal) => onChange(newVal as string[])}
      renderTags={(tagValue, getTagProps) =>
        tagValue.map((option, index) => {
          const { key, ...tagProps } = getTagProps({ index });
          return <Chip {...tagProps} key={key} label={option} />;
        })
      }
      renderInput={(params) => (
        <TextField {...params} label={label} placeholder={placeholder} />
      )}
    />
  );
}

