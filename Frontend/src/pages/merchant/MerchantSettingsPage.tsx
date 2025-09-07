// src/pages/dashboard/MerchantSettingsPage.tsx
import { useEffect, useState } from "react";
import {
  Box,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { useAuth } from "@/context/AuthContext";
import { useErrorHandler } from "@/shared/errors";
import type { MerchantInfo } from "@/features/mechant/merchant-settings/types";
import {
  updateMerchantInfo,
  getMerchantInfo,
} from "@/features/mechant/merchant-settings/api";

import { SECTIONS } from "@/features/mechant/merchant-settings/sections";
import { filterUpdatableFields } from "@/features/mechant/merchant-settings/utils";

export default function MerchantSettingsPage() {
  const { user } = useAuth();
  const { handleError } = useErrorHandler();
  const merchantId = user?.merchantId ?? null;

  const [data, setData] = useState<MerchantInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [tab, setTab] = useState(0);

  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up("md"));

  // جلب بيانات التاجر
  useEffect(() => {
    if (!merchantId) return;
    setLoading(true);
    getMerchantInfo(merchantId)
      .then((response) => {
        setData(response);
      })
      .catch(handleError)
      .finally(() => setLoading(false));
  }, [merchantId, handleError]);

  const handleSectionSave = async (sectionData: Partial<MerchantInfo>) => {
    try {
      if (!merchantId || !data) return;
      setSaveLoading(true);

      const newData: MerchantInfo = { ...data, ...sectionData };
      await updateMerchantInfo(merchantId, filterUpdatableFields(newData));
      setData(newData);
    } catch (error) {
      handleError(error);
    } finally {
      setSaveLoading(false);
    }
  };

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="100dvh"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!data) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" mt={10}>
        <Alert severity="warning" sx={{ mb: 2 }}>
          لم يتم العثور على بيانات التاجر
        </Alert>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100dvh",
        width: "100%",
        bgcolor: "#f5f6fa",
      }}
    >
      <Box
        dir="rtl"
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: isMdUp ? "row" : "column",
          overflow: "hidden",
        }}
      >
        {/* Tabs Sidebar */}
        <Box
          sx={{
            ...(isMdUp
              ? {
                  width: 260,
                  flexShrink: 0,
                  borderLeft: 1,
                  borderColor: "divider",
                  overflowY: "auto",
                  position: "sticky",
                  top: 0,
                  height: "100dvh",
                }
              : {
                  width: "100%",
                  borderBottom: 1,
                  borderColor: "divider",
                }),
            bgcolor: "#fff",
            zIndex: 2,
          }}
        >
          <Tabs
            orientation={isMdUp ? "vertical" : "horizontal"}
            value={tab}
            onChange={(_, v) => setTab(v)}
            variant="scrollable"
            scrollButtons={isMdUp ? false : "auto"}
            allowScrollButtonsMobile
            sx={{
              py: 2,
              "& .MuiTab-root": {
                fontWeight: 600,
                fontSize: 14,
                mx: isMdUp ? 1 : 0.5,
                my: isMdUp ? 0.5 : 0,
                borderRadius: 2,
                textAlign: "right",
                minHeight: 42,
              },
              "& .Mui-selected": {
                color: "primary.main",
                bgcolor: isMdUp ? "#f9f9f9" : "transparent",
                boxShadow: isMdUp ? 1 : 0,
              },
              ...(isMdUp
                ? {}
                : {
                    "& .MuiTabs-indicator": {
                      height: 3,
                    },
                  }),
            }}
          >
            {SECTIONS.map((s, i) => (
              <Tab key={i} label={s.label} />
            ))}
          </Tabs>
        </Box>

        {/* Content */}
        <Box
          sx={{
            flex: 1,
            p: { xs: 2, md: 4 },
            bgcolor: "#fff",
            overflowY: "auto",
          }}
        >
          {SECTIONS.map(({ component: SectionComp }, i) =>
            tab === i ? (
              <SectionComp
                key={i}
                initialData={data}
                onSave={handleSectionSave}
                loading={saveLoading}
              />
            ) : null
          )}
        </Box>
      </Box>
    </Box>
  );
}
