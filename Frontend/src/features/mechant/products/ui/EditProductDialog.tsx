import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  TextField,
  Switch,
  FormControlLabel,
  MenuItem,
  Alert,
} from "@mui/material";
import { LoadingButton } from "@mui/lab";
import type {
  ProductResponse,
  Currency,
  UpdateProductDto,
  Badge,
  AttributeDefinition,
  VariantInput,
} from "../type";
import {
  updateProduct,
  uploadProductImages,
  getAttributeDefinitions,
} from "../api";
import OfferEditor, { type OfferForm } from "./OfferEditor";
import AttributesEditor, { type AttributeSelection } from "./AttributesEditor";
import VariantsGenerator from "./VariantsGenerator";
import BadgesEditor from "./BadgesEditor";
import { ensureIdString } from "@/shared/utils/ids";
import { useErrorHandler } from "@/shared/errors";

interface Props {
  open: boolean;
  onClose: () => void;
  product: ProductResponse | null;
  onUpdated?: () => void;
}

export default function EditProductDialog({
  open,
  onClose,
  product,
  onUpdated,
}: Props) {
  const { handleError } = useErrorHandler();
  const [form, setForm] = useState<UpdateProductDto>({});
  const [currency, setCurrency] = useState<Currency>("SAR");
  const [offer, setOffer] = useState<OfferForm>({ enabled: false });
  const [attributes, setAttributes] = useState<AttributeSelection[]>([]);
  const [attributeDefs, setAttributeDefs] = useState<AttributeDefinition[]>([]);
  const [variants, setVariants] = useState<VariantInput[]>([]);
  const [hasVariants, setHasVariants] = useState<boolean>(false);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const hexFromBufferLike = (v: any): string | undefined => {
    // يدعم: {type:'Buffer', data:[..]} أو {buffer:{type:'Buffer', data:[..]}}
    const data =
      v?.buffer?.data ?? v?.data ?? (Array.isArray(v) ? v : undefined);
    if (!Array.isArray(data) || data.length !== 12) return;
    return Array.from(data)
      .map((b: number) => b.toString(16).padStart(2, "0"))
      .join("");
  };

  const toCategoryId = (c: any): string | undefined => {
    if (!c) return;
    if (typeof c === "string") return c;
    if (typeof c === "object") {
      // _id ممكن يكون سترينغ / ObjectId / Buffer
      if (typeof c._id === "string") return c._id;
      const fromBuf =
        hexFromBufferLike(c._id) ||
        hexFromBufferLike(c.id) ||
        hexFromBufferLike(c);
      if (fromBuf) return fromBuf;
      const maybe = c._id?.toString?.() ?? c.id?.toString?.() ?? c.toString?.();
      if (maybe && maybe !== "[object Object]") return String(maybe);
    }
    return;
  };
  useEffect(() => {
    if (open && product) {
      setImages(product.images || []);
      setForm({
        name: product.name,
        shortDescription: product.shortDescription,
        richDescription: product.richDescription,
        price: product.priceDefault ?? product.price ?? 0,
        isAvailable: product.isAvailable,
        category: toCategoryId(product.category), // ← مهم
        keywords: product.keywords,
        specsBlock: product.specsBlock,
      });
      setCurrency(product.currency || "YER");
      setOffer({
        enabled: !!product.offer?.enabled,
        oldPrice: product.offer?.oldPrice,
        newPrice: product.offer?.newPrice,
        startAt: product.offer?.startAt,
        endAt: product.offer?.endAt,
      });
      setAttributes(product.attributes || []);
      setHasVariants(!!product.hasVariants);
      setVariants(product.variants || []);
      setBadges(product.badges || []);
      setError(null);
    }
    } else if (!open) {
      setAttributeDefs([]);
    }
  }, [open, product]);

  useEffect(() => {
    if (!open) return;
    getAttributeDefinitions()
      .then(setAttributeDefs)
      .catch(() => setAttributeDefs([]));
  }, [open]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    if (name === "price") setForm((f) => ({ ...f, price: Number(value) }));
    else setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSwitch = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, isAvailable: e.target.checked }));

  const handleSubmit = async () => {
    if (!product) return;
    setLoading(true);
    setError(null);
    try {
      const { price, ...restForm } = form;
      const payload: UpdateProductDto = {
        ...restForm,
        prices: { [currency || "YER"]: form.price ?? 0 },
        category: form.category ? ensureIdString(form.category) : undefined,
        currency,
        images,
        offer: offer.enabled ? { ...offer } : { enabled: false },
        attributes,
        hasVariants,
        variants: hasVariants ? variants : undefined,
        badges,
      };

      await updateProduct(product._id, payload);
      onUpdated?.();
      onClose();
    } catch (error: any) {
      handleError(error);
      const msg =
        error?.response?.data?.message || error?.message || "فشل التحديث";
      setError(Array.isArray(msg) ? msg.join(" · ") : String(msg));
    } finally {
      setLoading(false);
    }
  };

  if (!product) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth dir="rtl">
      <DialogTitle>تعديل المنتج</DialogTitle>
      <DialogContent>
        <Stack spacing={2} mt={1}>
          <TextField
            label="اسم المنتج"
            name="name"
            value={form.name || ""}
            onChange={handleChange}
            fullWidth
          />
          <TextField
            label="وصف قصير"
            name="shortDescription"
            value={form.shortDescription || ""}
            onChange={handleChange}
            fullWidth
            multiline
            inputProps={{ maxLength: 200 }}
          />
          <TextField
            label="وصف تفصيلي (يمكن لصق HTML بسيط)"
            name="richDescription"
            value={form.richDescription || ""}
            onChange={handleChange}
            fullWidth
            multiline
            minRows={3}
          />

          <TextField
            label="السعر"
            name="price"
            type="number"
            value={form.price ?? 0}
            onChange={handleChange}
            inputProps={{ min: 0, step: "0.5" }}
          />

          {/* العملة */}
          <TextField
            select
            label="العملة"
            value={currency}
            onChange={(e) => setCurrency(e.target.value as Currency)}
          >
            <MenuItem value="SAR">ريال سعودي</MenuItem>
            <MenuItem value="YER">ريال يمني</MenuItem>
            <MenuItem value="USD">دولار أمريكي</MenuItem>
          </TextField>

          <FormControlLabel
            control={
              <Switch checked={!!form.isAvailable} onChange={handleSwitch} />
            }
            label="متاح للبيع"
          />

          {/* العرض */}
          <OfferEditor value={offer} onChange={setOffer} />

          {/* السمات */}
          <AttributesEditor
            value={attributes}
            onChange={setAttributes}
            definitions={attributeDefs}
          />

          {/* المتغيرات */}
          <Stack direction="row" alignItems="center" spacing={1}>
            <FormControlLabel
              control={
                <Switch
                  checked={hasVariants}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setHasVariants(checked);
                    if (!checked) setVariants([]);
                  }}
                />
              }
              label="يحتوي على متغيرات"
            />
            {hasVariants && (
              <Typography variant="body2" color="text.secondary">
                اختر أبعاد المتغيرات في السمات (isVariantDimension) ثم اضغط توليد.
              </Typography>
            )}
          </Stack>

          {hasVariants && (
            <VariantsGenerator
              attributes={attributes}
              definitions={attributeDefs}
              value={variants}
              onChange={setVariants}
            />
          )}

          {/* الملصقات */}
          <BadgesEditor value={badges} onChange={setBadges} />

          <Button
            variant="outlined"
            onClick={() => fileInputRef.current?.click()}
          >
            رفع صور (يُضاف لما هو موجود)
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            hidden
            multiple
            accept="image/png,image/jpeg,image/webp"
            onChange={async (e) => {
              const input = e.currentTarget as HTMLInputElement | null; // ← خزن المرجع قبل await
              const files = Array.from(input?.files ?? []);
              if (!product || files.length === 0) return;
              try {
                const res = await uploadProductImages(
                  product._id,
                  files,
                  false
                );
                setImages((prev) => [...prev, ...res.urls].slice(0, 6));
              } finally {
                if (input) input.value = ""; // ← احمِ من null
                // أو: if (fileInputRef.current) fileInputRef.current.value = "";
              }
            }}
          />

          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>إلغاء</Button>
        <LoadingButton
          onClick={handleSubmit}
          variant="contained"
          loading={loading}
          disabled={!form.category}
        >
          حفظ
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}
