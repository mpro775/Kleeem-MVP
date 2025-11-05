'use client';

import { useRef, useState, type RefObject } from "react";
import {
  Box,
  Typography,
  Button,
  Paper,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { pricingData, type Plan } from '@/features/landing/data/pricingData'; // استيراد البيانات
import { usePricingAnimation } from '@/features/landing/hooks/usePricingAnimation'; 

// تصميم مخصص لبطاقة الأسعار
const PlanCard = styled(Paper, {
  shouldForwardProp: (prop) => prop !== 'popular',
})<{ popular: boolean }>(({ theme, popular }) => ({
  padding: theme.spacing(4),
  borderRadius: "24px",
  border: "1px solid transparent",
  transition: "transform 0.3s ease, box-shadow 0.3s ease",
  display: "flex",
  flexDirection: "column",
  ...(popular
    ? {
        backgroundColor: "#2c1c5b",
        color: "#ffffff",
        transform: "scale(1.05)",
        boxShadow: "0 20px 50px rgba(44, 28, 91, 0.4)",
        zIndex: 2,
      }
    : {
        backgroundColor: "rgba(255, 255, 255, 0.7)",
        backdropFilter: "blur(10px)",
        boxShadow: "0 10px 30px rgba(0, 0, 0, 0.05)",
        "&:hover": {
          transform: "translateY(-10px)",
          boxShadow: "0 15px 40px rgba(0, 0, 0, 0.1)",
        },
      }),
}));

// تصميم مخصص لمفتاح التبديل
const PricingSwitch = styled(Box)({
  display: "inline-flex",
  padding: "4px",
  backgroundColor: "rgba(255, 255, 255, 0.5)",
  borderRadius: "16px",
});

const SwitchButton = styled(Button, {
  shouldForwardProp: (prop) => prop !== 'active',
})<{ active: boolean }>(({ active }) => ({
  borderRadius: "12px",
  padding: "8px 24px",
  color: active ? "#ffffff" : "#2c1c5b",
  backgroundColor: active ? "#563fa6" : "transparent",
  boxShadow: active ? "0 4px 10px rgba(86, 63, 166, 0.3)" : "none",
  "&:hover": {
    backgroundColor: active ? "#4a3594" : "rgba(86, 63, 166, 0.1)",
  },
}));

// المكون الرئيسي
export default function PricingSection() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">(
    "monthly"
  );
  const sectionRef = useRef<HTMLDivElement>(null);
  usePricingAnimation(sectionRef as RefObject<HTMLElement>, billingCycle);

  const handleCycleChange = (cycle: "monthly" | "yearly") => {
    // لا نغير الحالة إلا إذا كانت مختلفة لتجنب إعادة تشغيل الأنميشن
    if (cycle !== billingCycle) {
      setBillingCycle(cycle);
    }
  };

  // البيانات الآن ثابتة أثناء الأنميشن، والخطاف هو من يحدث الأرقام
  const plans = pricingData[billingCycle];

  return (
    <Box
      ref={sectionRef}
      id="pricing"
      sx={{
        py: 10,
        px: 3,
        background: "linear-gradient(160deg, #f2e9f4 0%, #e3dffc 100%)",
        position: "relative",
      }}
    >
      {/* العنوان والوصف */}
      <Box sx={{ textAlign: "center", mb: 6, maxWidth: "600px", mx: "auto" }}>
        <Typography
          className="pricing-title"
          variant="h3"
          component="h2"
          fontWeight="bold"
          sx={{ mb: 2 }}
        >
          خطط الأسعار المناسبة لك
        </Typography>
        <Typography className="pricing-subtitle" variant="body1" color="text.secondary">
          اختر الباقة التي تناسب احتياجات عملك مع خصم يصل إلى 20% عند الاشتراك السنوي
        </Typography>
      </Box>

      {/* مفتاح التبديل شهري/سنوي */}
      <Box className="pricing-switch"  sx={{ display: "flex", justifyContent: "center", mb: 6 }}>
        <PricingSwitch>
          <SwitchButton
            active={billingCycle === "yearly"}
            onClick={() => handleCycleChange("yearly")}
          >
            سنوي (وفر 20%)
          </SwitchButton>
          <SwitchButton
            active={billingCycle === "monthly"}
            onClick={() => handleCycleChange("monthly")}
          >
            شهري
          </SwitchButton>
        </PricingSwitch>
      </Box>

      {/* بطاقات الأسعار */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
          gap: 4,
          alignItems: "center",
          maxWidth: "1100px",
          mx: "auto",
        }}
      >
        {plans.map((plan: Plan, index: number) => (
          <PlanCard key={index} popular={plan.popular || false}>
            {plan.popular && (
              <Chip
                label="الأكثر شعبية"
                sx={{
                  bgcolor: "rgba(255, 255, 255, 0.2)",
                  color: "white",
                  fontWeight: "bold",
                  alignSelf: "center",
                  mb: 2,
                }}
              />
            )}
            <Typography className="plan-price" variant="h4" component="div" fontWeight="bold">
              ${plan.price}
              <Typography
                component="span"
                color={plan.popular ? "grey.400" : "text.secondary"}
                sx={{ ml: 0.5 }}
              >
/شهريًا
              </Typography>
            </Typography>
            <Typography variant="h5" fontWeight="bold" sx={{ mt: 2, mb: 1 }}>
              {plan.title}
            </Typography>
            <Typography
              variant="body2"
              color={plan.popular ? "grey.300" : "text.secondary"}
              sx={{ minHeight: 40, mb: 3 }}
            >
              {plan.description}
            </Typography>
            <List sx={{ flexGrow: 1 }}>
              {plan.features.map((feature: string, i: number) => (
                <ListItem key={i} disableGutters>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <CheckCircleIcon
                      sx={{ color: plan.popular ? "#a78bfa" : "#563fa6" }}
                    />
                  </ListItemIcon>
                  <ListItemText primary={feature} />
                </ListItem>
              ))}
            </List>
            <Button
              variant="contained"
              fullWidth
              sx={{
                mt: 3,
                py: 1.5,
                borderRadius: "12px",
                bgcolor: plan.popular ? "#a78bfa" : "#563fa6",
                color: plan.popular ? "#2c1c5b" : "white",
                fontWeight: "bold",
                "&:hover": {
                  bgcolor: plan.popular ? "#9370db" : "#4a3594",
                },
              }}
            >
              اختر الباقة
            </Button>
          </PlanCard>
        ))}
      </Box>
    </Box>
  );
}
