import {
  Dialog,
  DialogTitle,
  DialogContent,
  Typography,
  Box,
  Button,
  TextField,
  Stack,
  IconButton,
  CircularProgress,
  useTheme,
  Alert,
  InputAdornment,
} from "@mui/material";
import React, { useState, useEffect } from "react";
import { useCart } from "@/context/CartContext";
import axiosInstance from "@/shared/api/axios";
import type { CustomerInfo } from "../type";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import ShoppingCartCheckoutIcon from "@mui/icons-material/ShoppingCartCheckout";
import PaymentIcon from "@mui/icons-material/Payment";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { Person } from "@mui/icons-material";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import { saveLocalCustomer } from "@/shared/utils/customer";

export default function CartDialog({
  open,
  onClose,
  merchantId,
  onOrderSuccess,
  demo,
  sessionId,
  defaultCustomer,
}: {
  open: boolean;
  onClose: () => void;
  merchantId: string;
  onOrderSuccess: (orderId: string) => void;
  demo?: boolean;
  sessionId: string;
  defaultCustomer?: CustomerInfo;
}) {
  const theme = useTheme();
  const { items, clearCart, removeItem, updateQuantity } = useCart();

  const getInitialCustomer = (): CustomerInfo =>
    defaultCustomer || { name: "", phone: "", address: "" };

  const [customer, setCustomer] = useState<CustomerInfo>(getInitialCustomer());
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [couponCode, setCouponCode] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountAmount: number;
  } | null>(null);

  useEffect(() => {
    saveLocalCustomer({
      name: customer.name,
      phone: customer.phone,
      address: typeof customer.address === 'string' ? customer.address : customer.address?.line1 || '',
    });
  }, [customer]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!customer.name.trim()) newErrors.name = "الرجاء إدخال الاسم";
    if (!customer.phone.trim()) newErrors.phone = "الرجاء إدخال رقم الجوال";
    if (!customer.address || (typeof customer.address === 'string' && !customer.address.trim()) || (typeof customer.address === 'object' && !customer.address.line1?.trim())) newErrors.address = "الرجاء إدخال العنوان";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNextStep = () => {
    if (step === 1) setStep(2);
    else if (step === 2) {
      if (validateForm()) setStep(3);
    }
  };

  const handlePrevStep = () => {
    if (step > 1) setStep((s) => (s - 1) as 1 | 2);
  };

  const subtotalAmount = items.reduce(
    (sum, { product, quantity }) => sum + (product.price || 0) * quantity,
    0
  );

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponError("الرجاء إدخال كود الكوبون");
      return;
    }

    setCouponLoading(true);
    setCouponError(null);

    try {
      const res = await axiosInstance.post("/coupons/validate", {
        code: couponCode.trim().toUpperCase(),
        merchantId,
        cartItems: items.map(({ product, quantity }) => ({
          productId: product._id,
          categoryId: product.category,
          price: Number(product.price) || 0,
          quantity,
        })),
        totalAmount: subtotalAmount,
      });

      if (res.data.valid) {
        setAppliedCoupon({
          code: couponCode.trim().toUpperCase(),
          discountAmount: res.data.discountAmount || 0,
        });
        setCouponCode("");
        setCouponError(null);
      } else {
        setCouponError(res.data.message || "الكوبون غير صالح");
        setAppliedCoupon(null);
      }
    } catch (error: any) {
      setCouponError(
        error.response?.data?.message || "فشل التحقق من الكوبون"
      );
      setAppliedCoupon(null);
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
    setCouponError(null);
  };

  const discountAmount = appliedCoupon?.discountAmount || 0;
  const totalAmount = Math.max(0, subtotalAmount - discountAmount);

  const handleOrder = async () => {
    setLoading(true);
  
    const products = items.map(({ product, quantity }) => ({
      product: product._id || product.id, // لازم 24-hex، وإلا خلّها undefined
      name: product.name,
      price: Number(product.price) || 0,
      quantity,
    }));
  
    try {
      const res = await axiosInstance.post('/orders', {
        merchantId,
        sessionId,
        source: 'storefront',
        customer: { name: customer.name, phone: customer.phone, address: customer.address },
        products,
        couponCode: appliedCoupon?.code || undefined,
      });
  
      // الباك إند يرسل الآن: { success, data: order, requestId, timestamp }
      const order = res.data;
  
      const id = order?._id || order?.id;
  
      if (!id) {
        console.error("No order id in response:", res.data);
        // اختياري: أظهر Alert للمستخدم
        setLoading(false);
        return;
      }
  
      saveLocalCustomer({ 
      name: customer.name, 
      phone: customer.phone, 
      address: typeof customer.address === 'string' ? customer.address : customer.address?.line1 || ''
    });
  
      clearCart();
      setAppliedCoupon(null);
      setCouponCode("");
      onOrderSuccess(id);        // ✅ الآن نمرر الـ id الصحيح دائمًا
      onClose();
      setStep(1);
    } catch (e) {
       console.error('ORDER_CREATE_ERR', e); throw e; 
    } finally {
      setLoading(false);
    }
  };

  // تحقق من حجم الشاشة
  const isMobile = window.innerWidth <= 600;
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth={isMobile ? undefined : "md"}
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          borderRadius: isMobile ? 0 : 3,
          m: isMobile ? 0 : 2,
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          backgroundColor: "var(--brand)",
          color: "var(--on-brand)",
          py: isMobile ? 1 : 2,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <ShoppingCartCheckoutIcon sx={{ mr: 1 }} />
          <Typography variant="h6" fontWeight="bold">
            {step === 1
              ? "سلة الشراء"
              : step === 2
              ? "بيانات العميل"
              : "تأكيد الطلب"}
          </Typography>
        </Box>
        <IconButton
          onClick={onClose}
          sx={{
            color: "var(--on-brand)",
            "&:hover": { background: "var(--brand-hover)" },
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

  <DialogContent sx={{ p: isMobile ? 0 : 0 }}>
        {demo && (
          <Alert
            severity="info"
            sx={{ m: 2, borderRadius: 2, fontWeight: "bold" }}
          >
            هذه نسخة تجريبية — لن يتم إنشاء طلب حقيقي.
          </Alert>
        )}

        {/* شريط التقدم */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            py: isMobile ? 2 : 3,
            backgroundColor: theme.palette.grey[100],
            borderBottom: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              maxWidth: 600,
              width: "100%",
            }}
          >
            {[1, 2, 3].map((s) => (
              <React.Fragment key={s}>
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: step >= s ? "var(--brand)" : "#fff",
                    border: `2px solid ${
                      step >= s ? "var(--brand)" : theme.palette.grey[400]
                    }`,
                    color:
                      step >= s ? "var(--on-brand)" : theme.palette.grey[500],
                    fontWeight: "bold",
                    position: "relative",
                    zIndex: 2,
                  }}
                >
                  {step > s ? <CheckCircleIcon fontSize="small" /> : s}
                </Box>
                {s < 3 && (
                  <Box
                    sx={{
                      flex: 1,
                      height: 2,
                      backgroundColor:
                        step > s ? "var(--brand)" : theme.palette.grey[400],
                    }}
                  />
                )}
              </React.Fragment>
            ))}
          </Box>
        </Box>

        {items.length === 0 ? (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              py: 8,
              textAlign: "center",
            }}
          >
            <ShoppingCartCheckoutIcon
              sx={{ fontSize: 64, color: theme.palette.grey[400], mb: 2 }}
            />
            <Typography variant="h6" sx={{ mb: 1 }}>
              سلة الشراء فارغة
            </Typography>
            <Typography color="text.secondary">
              لم تقم بإضافة أي منتجات إلى سلة الشراء بعد
            </Typography>
            <Button variant="outlined" sx={{ mt: 3, background: "var(--brand)", color: "var(--on-brand)" }} onClick={onClose}>
              مواصلة التسوق
            </Button>
          </Box>
        ) : (
          <Box sx={{ p: isMobile ? 1 : 3 }}>
            {/* الخطوة 1 */}
            {step === 1 && (
              <>
                <Box sx={{ maxHeight: isMobile ? 250 : 400, overflowY: "auto", mb: isMobile ? 2 : 3 }}>
                  {items.map(({ product, quantity }) => (
                    <Box
                      key={product._id}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        p: isMobile ? 1 : 2,
                        mb: isMobile ? 0.5 : 1,
                        borderRadius: 2,
                        backgroundColor: theme.palette.grey[50],
                        "&:hover": { backgroundColor: theme.palette.grey[100] },
                        flexDirection: isMobile ? "column" : "row",
                        gap: isMobile ? 1 : 0,
                      }}
                    >
                      <Box
                        sx={{
                          width: isMobile ? 60 : 80,
                          height: isMobile ? 60 : 80,
                          borderRadius: 2,
                          overflow: "hidden",
                          mr: isMobile ? 0 : 2,
                          mb: isMobile ? 1 : 0,
                          flexShrink: 0,
                        }}
                      >
                        {product.images?.[0] ? (
                          <img
                            src={product.images[0]}
                            alt={product.name}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                          />
                        ) : (
                          <Box
                            sx={{
                              width: "100%",
                              height: "100%",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              backgroundColor: theme.palette.grey[200],
                            }}
                          >
                            <Typography color="text.secondary">
                              لا صورة
                            </Typography>
                          </Box>
                        )}
                      </Box>

                      <Box sx={{ flexGrow: 1, width: isMobile ? "100%" : "auto" }}>
                        <Typography fontWeight="bold" sx={{ mb: 0.5 }}>
                          {product.name}
                        </Typography>
                        <Typography
                          color="text.secondary"
                          sx={{ fontSize: 14 }}
                        >
                          {(product.shortDescription || product.richDescription || "")
                            .substring(0, 50)}
                          ...
                        </Typography>
                        <Typography
                          fontWeight="bold"
                          sx={{ mt: 1, color: "var(--brand)" }}
                        >
                          {product.price?.toFixed(2)} ر.س
                        </Typography>
                      </Box>

                      <Box
                        sx={{ display: "flex", alignItems: "center", ml: isMobile ? 0 : 2 }}
                      >
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (quantity > 1)
                              updateQuantity(product._id, quantity - 1);
                            else removeItem(product._id);
                          }}
                        >
                          <RemoveIcon fontSize="small" />
                        </IconButton>

                        <Typography sx={{ mx: 1 }}>{quantity}</Typography>

                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            updateQuantity(product._id, quantity + 1);
                          }}
                        >
                          <AddIcon fontSize="small" />
                        </IconButton>
                      </Box>

                      <IconButton
                        onClick={(e) => {
                          e.stopPropagation();
                          removeItem(product._id);
                        }}
                        sx={{ ml: isMobile ? 0 : 2 }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  ))}
                </Box>

                {/* حقل الكوبون */}
                <Box sx={{ mt: isMobile ? 2 : 3 }}>
                  <Typography
                    variant="subtitle2"
                    sx={{ mb: 1, fontWeight: "bold", color: "text.secondary" }}
                  >
                    كوبون الخصم
                  </Typography>
                  {appliedCoupon ? (
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        p: 1.5,
                        backgroundColor: theme.palette.success.light,
                        borderRadius: 2,
                        border: `1px solid ${theme.palette.success.main}`,
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <LocalOfferIcon sx={{ color: theme.palette.success.main }} />
                        <Box>
                          <Typography fontWeight="bold" sx={{ color: theme.palette.success.dark }}>
                            {appliedCoupon.code}
                          </Typography>
                          <Typography variant="caption" sx={{ color: theme.palette.success.dark }}>
                            خصم: {appliedCoupon.discountAmount.toFixed(2)} ر.س
                          </Typography>
                        </Box>
                      </Box>
                      <IconButton
                        size="small"
                        onClick={handleRemoveCoupon}
                        sx={{ color: theme.palette.success.dark }}
                      >
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  ) : (
                    <Box sx={{ display: "flex", gap: 1 }}>
                      <TextField
                        fullWidth
                        size="small"
                        placeholder="أدخل كود الكوبون"
                        value={couponCode}
                        onChange={(e) => {
                          setCouponCode(e.target.value.toUpperCase());
                          setCouponError(null);
                        }}
                        error={!!couponError}
                        helperText={couponError}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <LocalOfferIcon sx={{ color: "text.secondary" }} />
                            </InputAdornment>
                          ),
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleApplyCoupon();
                          }
                        }}
                        sx={{
                          "& .MuiOutlinedInput-root": {
                            "& fieldset": {
                              borderColor: "var(--brand)",
                            },
                            "&:hover fieldset": {
                              borderColor: "var(--brand-hover)",
                            },
                            "&.Mui-focused fieldset": {
                              borderColor: "var(--brand)",
                            },
                          },
                          "& .MuiInputLabel-root.Mui-focused": {
                            color: "var(--brand)",
                          },
                        }}
                      />
                      <Button
                        variant="outlined"
                        onClick={handleApplyCoupon}
                        disabled={couponLoading || !couponCode.trim()}
                        sx={{
                          minWidth: 100,
                          borderColor: "var(--brand)",
                          background: "var(--brand)",
                          color: "var(--on-brand)",
                          "&:hover": {
                            borderColor: "var(--brand-hover)",
                            background: "var(--brand-hover)",
                            color: "var(--on-brand)",
                          },
                        }}
                      >
                        {couponLoading ? (
                          <CircularProgress size={20} />
                        ) : (
                          "تطبيق"
                        )}
                      </Button>
                    </Box>
                  )}
                </Box>

                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 1,
                    mt: isMobile ? 2 : 3,
                    p: isMobile ? 1 : 2,
                    backgroundColor: theme.palette.grey[50],
                    borderRadius: 2,
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: isMobile ? "column" : "row",
                      justifyContent: "space-between",
                      alignItems: isMobile ? "flex-start" : "center",
                    }}
                  >
                    <Typography fontWeight="bold">المجموع الفرعي:</Typography>
                    <Typography fontWeight="bold">
                      {subtotalAmount.toFixed(2)} ر.س
                    </Typography>
                  </Box>
                  {appliedCoupon && (
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: isMobile ? "column" : "row",
                        justifyContent: "space-between",
                        alignItems: isMobile ? "flex-start" : "center",
                        color: theme.palette.success.main,
                      }}
                    >
                      <Typography fontWeight="bold">
                        خصم ({appliedCoupon.code}):
                      </Typography>
                      <Typography fontWeight="bold">
                        -{discountAmount.toFixed(2)} ر.س
                      </Typography>
                    </Box>
                  )}
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: isMobile ? "column" : "row",
                      justifyContent: "space-between",
                      alignItems: isMobile ? "flex-start" : "center",
                      pt: 1,
                      borderTop: `1px solid ${theme.palette.divider}`,
                    }}
                  >
                    <Typography fontWeight="bold" fontSize={18}>
                      الإجمالي:
                    </Typography>
                    <Typography
                      fontWeight="bold"
                      fontSize={20}
                      sx={{ color: "var(--brand)" }}
                    >
                      {totalAmount.toFixed(2)} ر.س
                    </Typography>
                  </Box>
                </Box>

                <Button
                  variant="contained"
                  fullWidth
                  size={isMobile ? "medium" : "large"}
                  sx={{
                    mt: isMobile ? 2 : 3,
                    py: isMobile ? 1 : 1.5,
                    borderRadius: 2,
                    fontWeight: "bold",
                    background: "var(--brand)",
                    color: "var(--on-brand)",
                    "&:hover": { backgroundColor: "var(--brand-hover)" },
                  }}
                  onClick={handleNextStep}
                  startIcon={<Person />}
                >
                  المتابعة إلى إدخال المعلومات
                </Button>
              </>
            )}

            {/* الخطوة 2 */}
            {step === 2 && (
              <>
                <Typography
                  variant="h6"
                  sx={{
                    mb: 3,
                    fontWeight: "bold",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <Person sx={{ mr: 1, color: "var(--brand)" }} />
                  معلومات العميل
                </Typography>

                <Stack spacing={isMobile ? 2 : 3} sx={{ maxWidth: 600, mx: "auto" }}>
                  <TextField
                    label="الاسم بالكامل"
                    value={customer.name}
                    onChange={(e) =>
                      setCustomer((c) => ({ ...c, name: e.target.value }))
                    }
                    error={!!errors.name}
                    helperText={errors.name}
                    fullWidth
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        "& fieldset": {
                          borderColor: "var(--brand)",
                        },
                        "&:hover fieldset": {
                          borderColor: "var(--brand-hover)",
                        },
                        "&.Mui-focused fieldset": {
                          borderColor: "var(--brand)",
                        },
                      },
                      "& .MuiInputLabel-root.Mui-focused": {
                        color: "var(--brand)",
                      },
                    }}
                  />

                  <TextField
                    label="رقم الجوال"
                    value={customer.phone}
                    onChange={(e) =>
                      setCustomer((c) => ({ ...c, phone: e.target.value }))
                    }
                    error={!!errors.phone}
                    helperText={errors.phone}
                    fullWidth
                    inputProps={{ maxLength: 20 }}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        "& fieldset": {
                          borderColor: "var(--brand)",
                        },
                        "&:hover fieldset": {
                          borderColor: "var(--brand-hover)",
                        },
                        "&.Mui-focused fieldset": {
                          borderColor: "var(--brand)",
                        },
                      },
                      "& .MuiInputLabel-root.Mui-focused": {
                        color: "var(--brand)",
                      },
                    }}
                  />

                  <TextField
                    label="العنوان التفصيلي"
                    value={customer.address}
                    onChange={(e) =>
                      setCustomer((c) => ({ ...c, address: e.target.value }))
                    }
                    error={!!errors.address}
                    helperText={errors.address}
                    fullWidth
                    multiline
                    rows={3}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        "& fieldset": {
                          borderColor: "var(--brand)",
                        },
                        "&:hover fieldset": {
                          borderColor: "var(--brand-hover)",
                        },
                        "&.Mui-focused fieldset": {
                          borderColor: "var(--brand)",
                        },
                      },
                      "& .MuiInputLabel-root.Mui-focused": {
                        color: "var(--brand)",
                      },
                    }}
                  />

                  <Box sx={{ mt: 2, display: "flex", gap: isMobile ? 1 : 2 }}>
                    <Button
                      variant="outlined"
                      fullWidth
                      size="large"
                      sx={{ py: 1.5, borderRadius: 2, fontWeight: "bold", background: "var(--brand)", color: "var(--on-brand)" }}
                      onClick={handlePrevStep}
                    >
                      رجوع
                    </Button>

                    <Button
                      variant="contained"
                      fullWidth
                      size="large"
                      sx={{
                        py: 1.5,
                        borderRadius: 2,
                        fontWeight: "bold",
                        background: "var(--brand)",
                        color: "var(--on-brand)",
                        "&:hover": { backgroundColor: "var(--brand-hover)" },
                      }}
                      onClick={handleNextStep}
                      startIcon={<PaymentIcon />}
                    >
                      المتابعة إلى بيانات الطلب
                    </Button>
                  </Box>
                </Stack>
              </>
            )}

            {/* الخطوة 3 */}
            {step === 3 && (
              <>
                <Typography
                  variant="h6"
                  sx={{
                    mb: 3,
                    fontWeight: "bold",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <PaymentIcon sx={{ mr: 1, color: "var(--brand)" }} />
                  تأكيد الطلب
                </Typography>

                <Box
                  sx={{
                    backgroundColor: theme.palette.grey[50],
                    borderRadius: 3,
                    p: isMobile ? 1.5 : 3,
                    mb: isMobile ? 2 : 3,
                    maxWidth: 600,
                    mx: "auto",
                  }}
                >
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: "bold" }}>
                    ملخص الطلب
                  </Typography>

                  <Box sx={{ mb: 3 }}>
                    {items.map(({ product, quantity }) => (
                      <Box
                        key={product._id}
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          py: 1,
                          borderBottom: `1px solid ${theme.palette.divider}`,
                        }}
                      >
                        <Typography>
                          {product.name} × {quantity}
                        </Typography>
                        <Typography>
                          {(product.price * quantity).toFixed(2)} ر.س
                        </Typography>
                      </Box>
                    ))}
                  </Box>

                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      mb: 1,
                    }}
                  >
                    <Typography>المجموع الفرعي:</Typography>
                    <Typography>{subtotalAmount.toFixed(2)} ر.س</Typography>
                  </Box>

                  {appliedCoupon && (
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        mb: 1,
                        color: theme.palette.success.main,
                      }}
                    >
                      <Typography>
                        خصم ({appliedCoupon.code}):
                      </Typography>
                      <Typography>
                        -{discountAmount.toFixed(2)} ر.س
                      </Typography>
                    </Box>
                  )}

                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      mb: 1,
                    }}
                  >
                    <Typography>رسوم الشحن:</Typography>
                    <Typography>0.00 ر.س</Typography>
                  </Box>

                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      mt: 2,
                      pt: 2,
                      borderTop: `2px solid ${theme.palette.divider}`,
                    }}
                  >
                    <Typography fontWeight="bold">الإجمالي النهائي:</Typography>
                    <Typography
                      fontWeight="bold"
                      fontSize={18}
                      sx={{ color: "var(--brand)" }}
                    >
                      {totalAmount.toFixed(2)} ر.س
                    </Typography>
                  </Box>
                </Box>

                <Box
                  sx={{
                    backgroundColor: theme.palette.grey[50],
                    borderRadius: 3,
                    p: isMobile ? 1.5 : 3,
                    mb: isMobile ? 2 : 3,
                    maxWidth: 600,
                    mx: "auto",
                  }}
                >
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: "bold" }}>
                    معلومات العميل
                  </Typography>

                  <Box sx={{ mb: 2 }}>
                    <Typography fontWeight="bold">الاسم:</Typography>
                    <Typography>{customer.name}</Typography>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography fontWeight="bold">رقم الجوال:</Typography>
                    <Typography>{customer.phone}</Typography>
                  </Box>

                  <Box>
                    <Typography fontWeight="bold">العنوان:</Typography>
                    <Typography>
                      {customer.address ? 
                        typeof customer.address === 'string' 
                          ? customer.address 
                          : `${customer.address.line1 || ''} ${customer.address.city || ''} ${customer.address.state || ''}`.trim() || 'غير محدد'
                        : 'غير محدد'
                      }
                    </Typography>
                  </Box>
                </Box>

                <Box
                  sx={{ display: "flex", gap: isMobile ? 1 : 2, maxWidth: 600, mx: "auto" }}
                >
                  <Button
                    variant="outlined"
                    fullWidth
                    size="large"
                    sx={{ py: 1.5, borderRadius: 2, fontWeight: "bold", background: "var(--brand)", color: "var(--on-brand)" }}
                    onClick={handlePrevStep}
                  >
                    رجوع
                  </Button>

                  <Button
                    variant="contained"
                    fullWidth
                    size="large"
                    sx={{
                      py: 1.5,
                      borderRadius: 2,
                      fontWeight: "bold",
                      background: "var(--brand)",
                      color: "var(--on-brand)",
                      "&:hover": { backgroundColor: "var(--brand-hover)" },
                    }}
                    disabled={loading}
                    onClick={handleOrder}
                    startIcon={
                      loading ? (
                        <CircularProgress size={20} />
                      ) : (
                        <CheckCircleIcon />
                      )
                    }
                  >
                    {loading ? "جاري إتمام الطلب..." : "تأكيد الطلب"}
                  </Button>
                </Box>
              </>
            )}
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}
