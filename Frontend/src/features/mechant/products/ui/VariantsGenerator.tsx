import {
    Stack,
    Paper,
    Typography,
    Button,
    TextField,
    IconButton,
    Switch,
    FormControlLabel,
    Divider,
    Chip,
  } from "@mui/material";
  import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
  import { useMemo } from "react";
  
  import type {
    AttributeDefinition,
    VariantInput,
  } from "../type";
  import type { AttributeSelection } from "./AttributesEditor";
  
  interface Props {
    attributes: AttributeSelection[];
    definitions: AttributeDefinition[];
    value: VariantInput[];
    onChange: (variants: VariantInput[]) => void;
  }
  
  function cartesian<T>(arrays: T[][]): T[][] {
    if (!arrays.length) return [];
    return arrays.reduce<T[][]>(
      (acc, curr) =>
        acc.flatMap((prefix) => curr.map((item) => [...prefix, item])),
      [[]] as T[][],
    );
  }
  
  export default function VariantsGenerator({
    attributes,
    definitions,
    value,
    onChange,
  }: Props) {
    const currencies = ["YER", "SAR", "USD"];
    const dimensions = useMemo(() => {
      return attributes
        .map((attr) => {
          const def = definitions.find((d) => d.keySlug === attr.keySlug);
          if (!def?.isVariantDimension || !attr.valueSlugs.length) return null;
          return {
            keySlug: attr.keySlug,
            label: def.label,
            values: attr.valueSlugs,
          };
        })
        .filter(Boolean) as { keySlug: string; label?: string; values: string[] }[];
    }, [attributes, definitions]);
  
    const regenerate = () => {
      if (!dimensions.length) {
        onChange([]);
        return;
      }
      const combos = cartesian(dimensions.map((d) => d.values));
      const next = combos.map((vals) => {
        const attrs: Record<string, string> = {};
        vals.forEach((v, idx) => {
          const dim = dimensions[idx];
          attrs[dim.keySlug] = v;
        });
        const signature = Object.entries(attrs)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([k, v]) => `${k}:${v}`)
          .join("|");
        const existing = value.find(
          (v) =>
            Object.entries(v.attributes || {})
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([k, val]) => `${k}:${val}`)
              .join("|") === signature,
        );
        return (
          existing || {
            sku: signature.replace(/\W+/g, "-").toUpperCase(),
            attributes: attrs,
            prices: { YER: 0 },
            stock: 0,
            isAvailable: true,
          }
        );
      });
      onChange(next);
    };
  
    const updateVariant = (idx: number, patch: Partial<VariantInput>) => {
      const next = value.map((v, i) => (i === idx ? { ...v, ...patch } : v));
      onChange(next);
    };
  
    const removeVariant = (idx: number) => {
      onChange(value.filter((_, i) => i !== idx));
    };
  
    return (
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
          <Typography fontWeight={700}>متغيرات المنتج</Typography>
          <Button variant="contained" onClick={regenerate} disabled={!dimensions.length}>
            توليد المتغيرات
          </Button>
        </Stack>
  
        {!dimensions.length && (
          <Typography variant="body2" color="text.secondary">
            حدد سمات مفعلة كأبعاد متغيرات (isVariantDimension) لاختيار قيمها ثم اضغط توليد.
          </Typography>
        )}
  
        {!!value.length && (
          <Stack spacing={2}>
            {value.map((variant, idx) => (
              <Paper key={idx} variant="outlined" sx={{ p: 1.5 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {Object.entries(variant.attributes || {}).map(([k, v]) => (
                      <Chip key={`${k}-${v}`} label={`${k}: ${v}`} />
                    ))}
                  </Stack>
                  <IconButton color="error" onClick={() => removeVariant(idx)}>
                    <DeleteForeverIcon />
                  </IconButton>
                </Stack>
  
                <Divider sx={{ my: 1 }} />
  
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  <TextField
                    label="SKU"
                    size="small"
                    value={variant.sku}
                    onChange={(e) => updateVariant(idx, { sku: e.target.value })}
                  />
                  {currencies.map((cur) => {
                    const currentPrices = variant.prices || {};
                    const value = currentPrices[cur] ?? "";
                    return (
                      <TextField
                        key={`${variant.sku}-${cur}`}
                        label={`السعر (${cur})`}
                        size="small"
                        type="number"
                        inputProps={{ min: 0, step: "0.5" }}
                        value={value}
                        onChange={(e) => {
                          const num = e.target.value === "" ? "" : Number(e.target.value) || 0;
                          const nextPrices = { ...currentPrices };
                          if (num === "") {
                            delete nextPrices[cur];
                          } else {
                            nextPrices[cur] = num as number;
                          }
                          updateVariant(idx, { prices: nextPrices });
                        }}
                      />
                    );
                  })}
                  <TextField
                    label="المخزون"
                    size="small"
                    type="number"
                    inputProps={{ min: 0, step: "1" }}
                    value={variant.stock}
                    onChange={(e) =>
                      updateVariant(idx, { stock: Number(e.target.value) || 0 })
                    }
                  />
                  <TextField
                    label="عتبة التنبيه"
                    size="small"
                    type="number"
                    inputProps={{ min: 0, step: "1" }}
                    value={variant.lowStockThreshold ?? ""}
                    onChange={(e) =>
                      updateVariant(idx, {
                        lowStockThreshold:
                          e.target.value === "" ? null : Number(e.target.value) || 0,
                      })
                    }
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={variant.isAvailable ?? true}
                        onChange={(e) =>
                          updateVariant(idx, { isAvailable: e.target.checked })
                        }
                      />
                    }
                    label="متاح"
                  />
                </Stack>
              </Paper>
            ))}
          </Stack>
        )}
      </Paper>
    );
  }
  