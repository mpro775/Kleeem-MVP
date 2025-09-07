import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  useTheme,
} from "@mui/material";
import { Schedule, Star } from "@mui/icons-material";
import type { MerchantInfo } from "../type";
import { normalizeWorkingHours } from "../utils/transform";

type Props = { merchant: MerchantInfo };

export default function HoursCard({ merchant }: Props) {
  const theme = useTheme();
  const hours = normalizeWorkingHours(merchant.workingHours);

  return (
    <Card sx={{ borderRadius: 3, height: "100%" }}>
      <CardContent>
        <Typography
          variant="h5"
          sx={{
            mb: 3,
            display: "flex",
            alignItems: "center",
            fontWeight: "bold",
            color: "var(--brand)",
          }}
        >
          <Schedule sx={{ mr: 1 }} /> ساعات العمل
        </Typography>

        {hours.length ? (
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
            {hours.map((h, idx) => (
              <Box
                key={idx}
                sx={{
                  width: { xs: "100%", sm: "calc(50% - 8px)" },
                  minWidth: 0,
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    p: 2,
                    backgroundColor: theme.palette.grey[100],
                    borderRadius: 2,
                  }}
                >
                  <Typography fontWeight="bold">{h.day}:</Typography>
                  <Chip
                    label={`${h.openTime} - ${h.closeTime}`}
                    size="small"
                    sx={{
                      fontWeight: "bold",
                      bgcolor: "var(--brand)",
                      color: "var(--on-brand)",
                    }}
                  />
                </Box>
              </Box>
            ))}
          </Box>
        ) : (
          <Typography color="text.secondary" textAlign="center" py={3}>
            لم يتم تحديد ساعات العمل
          </Typography>
        )}

        <Box
          sx={{
            mt: 3,
            p: 2,
            backgroundColor: theme.palette.warning.light,
            borderRadius: 2,
            display: "flex",
            alignItems: "center",
          }}
        >
          <Star sx={{ color: theme.palette.warning.dark, mr: 1 }} />
          <Typography>المتجر مغلق أيام العطل الرسمية</Typography>
        </Box>
      </CardContent>
    </Card>
  );
}
