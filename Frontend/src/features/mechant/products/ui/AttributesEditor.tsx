import { useEffect, useMemo, useState } from "react";
import {
  Stack,
  TextField,
  IconButton,
  Chip,
  Typography,
  Paper,
  Divider,
  Button,
  Autocomplete,
  Tooltip,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";

import type { AttributeDefinition } from "../type";

export interface AttributeSelection {
  keySlug: string;
  valueSlugs: string[];
}

interface Props {
  value?: AttributeSelection[];
  onChange?: (val: AttributeSelection[]) => void;
  label?: string;
  definitions?: AttributeDefinition[];
}

export default function AttributesEditor({
  value,
  onChange,
  label = "السمات",
  definitions = [],
}: Props) {
  const [attrs, setAttrs] = useState<AttributeSelection[]>(value || []);
  const [selectedKey, setSelectedKey] = useState<string>("");
  const [customValue, setCustomValue] = useState<Record<string, string>>({});

  useEffect(() => {
    setAttrs(value || []);
  }, [value]);

  const emit = (next: AttributeSelection[]) => {
    setAttrs(next);
    onChange?.(next);
  };

  const availableDefs = useMemo(
    () =>
      definitions.filter(
        (d) => !attrs.some((a) => a.keySlug === d.keySlug)
      ),
    [definitions, attrs]
  );

  const addAttribute = () => {
    const key = selectedKey.trim();
    if (!key) return;
    if (attrs.some((a) => a.keySlug === key)) {
      setSelectedKey("");
      return;
    }
    emit([...attrs, { keySlug: key, valueSlugs: [] }]);
    setSelectedKey("");
  };

  const removeAttribute = (keySlug: string) => {
    emit(attrs.filter((a) => a.keySlug !== keySlug));
  };

  const handleValuesChange = (
    keySlug: string,
    slugs: string[],
  ) => {
    emit(
      attrs.map((a) =>
        a.keySlug === keySlug ? { ...a, valueSlugs: slugs } : a
      )
    );
  };

  const renderAttribute = (attr: AttributeSelection) => {
    const def = definitions.find((d) => d.keySlug === attr.keySlug);
    const options =
      def?.allowedValues?.map((v) => ({
        valueSlug: v.valueSlug,
        label: v.label,
      })) ?? [];

    const toOption = (slug: string) =>
      options.find((o) => o.valueSlug === slug) || {
        valueSlug: slug,
        label: slug,
      };

    const valueOptions = attr.valueSlugs.map(toOption);

    const isFreeSolo = !options.length || def?.type !== "list";

    return (
      <Paper key={attr.keySlug} variant="outlined" sx={{ p: 1.5 }}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography fontWeight={600}>{def?.label || attr.keySlug}</Typography>
            <Tooltip title={attr.keySlug}>
              <Typography variant="caption" color="text.secondary">
                ({attr.keySlug})
              </Typography>
            </Tooltip>
          </Stack>
          <IconButton color="error" onClick={() => removeAttribute(attr.keySlug)}>
            <DeleteForeverIcon />
          </IconButton>
        </Stack>

        <Stack mt={1} spacing={1}>
          <Autocomplete
            multiple
            freeSolo={isFreeSolo}
            options={options}
            value={valueOptions}
            onChange={(_, newOptions) => {
              const next = newOptions
                .map((opt: any) =>
                  typeof opt === "string"
                    ? opt
                    : opt?.valueSlug || opt?.label || ""
                )
                .filter(Boolean);
              handleValuesChange(attr.keySlug, Array.from(new Set(next)));
            }}
            getOptionLabel={(opt) =>
              typeof opt === "string" ? opt : opt.label || opt.valueSlug
            }
            isOptionEqualToValue={(opt, val) =>
              (opt as any).valueSlug === (val as any).valueSlug ||
              (typeof opt === "string" && opt === (val as any).valueSlug)
            }
            renderTags={(tagValue, getTagProps) =>
              tagValue.map((option, index) => (
                <Chip
                  {...getTagProps({ index })}
                  key={(option as any).valueSlug || option}
                  label={
                    typeof option === "string"
                      ? option
                      : option.label || option.valueSlug
                  }
                />
              ))
            }
            renderInput={(params) => (
              <TextField
                {...params}
                size="small"
                label="القيم"
                placeholder="اختر أو اكتب قيمة"
                helperText={
                  isFreeSolo
                    ? "يمكنك كتابة قيم جديدة"
                    : "اختر من القيم المتاحة"
                }
              />
            )}
          />

          {isFreeSolo && (
            <Stack direction="row" spacing={1}>
              <TextField
                size="small"
                label="قيمة جديدة ثم Enter"
                value={customValue[attr.keySlug] || ""}
                onChange={(e) =>
                  setCustomValue((prev) => ({
                    ...prev,
                    [attr.keySlug]: e.target.value,
                  }))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const next = (customValue[attr.keySlug] || "").trim();
                    if (next) {
                      handleValuesChange(
                        attr.keySlug,
                        Array.from(new Set([...attr.valueSlugs, next]))
                      );
                      setCustomValue((prev) => ({ ...prev, [attr.keySlug]: "" }));
                    }
                  }
                }}
                fullWidth
              />
              <Button
                onClick={() => {
                  const next = (customValue[attr.keySlug] || "").trim();
                  if (!next) return;
                  handleValuesChange(
                    attr.keySlug,
                    Array.from(new Set([...attr.valueSlugs, next]))
                  );
                  setCustomValue((prev) => ({ ...prev, [attr.keySlug]: "" }));
                }}
              >
                إضافة
              </Button>
            </Stack>
          )}
        </Stack>
      </Paper>
    );
  };

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography fontWeight={600} mb={1}>
        {label}
      </Typography>

      <Stack direction="row" spacing={1} mb={1}>
        <TextField
          select
          label="اختر سمة لإضافتها"
          value={selectedKey}
          onChange={(e) => setSelectedKey(e.target.value)}
          size="small"
          fullWidth
          SelectProps={{ native: true }}
        >
          <option value="">-- اختر --</option>
          {availableDefs.map((d) => (
            <option key={d.keySlug} value={d.keySlug}>
              {d.label} ({d.keySlug})
            </option>
          ))}
        </TextField>
        <IconButton color="primary" onClick={addAttribute} disabled={!selectedKey}>
          <AddIcon />
        </IconButton>
      </Stack>

      <Divider sx={{ my: 1 }} />

      <Stack spacing={2}>
        {attrs.map(renderAttribute)}

        {!attrs.length && (
          <Typography variant="body2" color="text.secondary">
            أضف سمة من القائمة أعلاه ثم اختر قيمها.
          </Typography>
        )}

        {!definitions.length && (
          <Typography variant="body2" color="warning.main">
            لا توجد تعريفات سمات متاحة. أنشئها أولاً في لوحة السمات.
          </Typography>
        )}
      </Stack>
    </Paper>
  );
}
