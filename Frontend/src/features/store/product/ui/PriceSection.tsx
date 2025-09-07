import { Box, Chip, Typography } from "@mui/material";
import {
  formatMoney,
  isOfferActive,
  discountPct,
  type Currency,
} from "@/features/store/product/utils";

export default function PriceSection({
  price,
  offer,
  currency = "SAR",
}: {
  price?: number;
  offer?: {
    oldPrice?: number;
    newPrice?: number;
    enabled?: boolean;
    startAt?: string | Date;
    endAt?: string | Date;
  };
  currency?: Currency;
}) {
  const offerOld = offer?.oldPrice ?? price ?? 0;
  const offerNew = offer?.newPrice ?? price ?? 0;
  const pct = discountPct(offerOld, offerNew);

  return isOfferActive(offer) ? (
    <Box sx={{ mb: 3 }}>
      <Typography
        variant="h4"
        fontWeight="bold"
        color="error.main"
        sx={{ display: "inline", mr: 1 }}
      >
        {formatMoney(offerNew, currency)}
      </Typography>
      <Typography
        component="span"
        sx={{ textDecoration: "line-through", color: "text.disabled", mr: 1 }}
      >
        {formatMoney(offerOld, currency)}
      </Typography>
      {pct > 0 && (
        <Chip
          label={`-${pct}%`}
          color="error"
          size="small"
          sx={{ fontWeight: "bold" }}
        />
      )}
    </Box>
  ) : (
    <Typography
      variant="h4"
      fontWeight="bold"
      sx={{ mb: 3, color: "var(--brand)" }}
    >
      {formatMoney(price ?? 0, currency)}
    </Typography>
  );
}
