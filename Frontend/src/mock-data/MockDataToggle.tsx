import React, { useState, useEffect } from "react";
import { Switch, FormControlLabel, Box, Typography, Alert } from "@mui/material";
import { isMockDataEnabled, toggleMockData } from "./index";

/**
 * مكون زر التفعيل/إلغاء تفعيل البيانات الوهمية
 * يمكن إضافته في Admin أو Merchant Layout
 */
export const MockDataToggle: React.FC = () => {
  const [enabled, setEnabled] = useState(false);
  const [isChanging, setIsChanging] = useState(false);

  useEffect(() => {
    setEnabled(isMockDataEnabled());
  }, []);

  const handleToggle = async () => {
    setIsChanging(true);
    try {
      const newState = await toggleMockData();
      setEnabled(newState);

      // إعادة تحميل الصفحة بعد ثانية واحدة لإظهار التغييرات
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error("Failed to toggle mock data:", error);
      setIsChanging(false);
    }
  };

  return (
    <Box
      sx={{
        position: "fixed",
        bottom: 16,
        left: 16,
        zIndex: 9999,
        backgroundColor: "background.paper",
        padding: 2,
        borderRadius: 2,
        boxShadow: 3,
        border: "1px solid",
        borderColor: enabled ? "warning.main" : "divider",
        minWidth: 280,
      }}
    >
      <Alert
        severity={enabled ? "warning" : "info"}
        sx={{ mb: 1 }}
        icon={false}
      >
        <Typography variant="caption" fontWeight="bold">
          {enabled ? "وضع العرض التوضيحي نشط" : "وضع العرض التوضيحي معطل"}
        </Typography>
      </Alert>

      <FormControlLabel
        control={
          <Switch
            checked={enabled}
            onChange={handleToggle}
            disabled={isChanging}
            color="warning"
          />
        }
        label={
          <Typography variant="body2">
            {enabled ? "إيقاف البيانات الوهمية" : "تفعيل البيانات الوهمية"}
          </Typography>
        }
      />

      {enabled && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
          جميع البيانات وهمية - للعرض فقط
        </Typography>
      )}

      {isChanging && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
          جاري التحديث...
        </Typography>
      )}
    </Box>
  );
};

/**
 * مكون مبسط للاستخدام في Toolbar أو Settings
 */
export const MockDataToggleSimple: React.FC = () => {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(isMockDataEnabled());
  }, []);

  const handleToggle = async () => {
    try {
      const newState = await toggleMockData();
      setEnabled(newState);
      window.location.reload();
    } catch (error) {
      console.error("Failed to toggle mock data:", error);
    }
  };

  return (
    <FormControlLabel
      control={
        <Switch
          checked={enabled}
          onChange={handleToggle}
          color="warning"
          size="small"
        />
      }
      label={
        <Typography variant="body2" fontSize="0.75rem">
          {enabled ? "وضع العرض" : "وضع عادي"}
        </Typography>
      }
    />
  );
};

