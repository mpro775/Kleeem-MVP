'use client';

import React from "react";
import { Box, Typography, Button } from "@mui/material";

// يفضل وضع الألوان والثيم في ملف منفصل، هنا لأغراض العرض فقط
const accentColor = "#AE1A33"; // لون كلمة "تخلص"
const mainColor = "#2D1B62"; // لون "استمتع"
const buttonGradient = "linear-gradient(90deg, #7D5CF6 0%, #734DDB 100%)"; // جريدينت الزر

const InviteBanner: React.FC = () => {
  return (
    <Box
      sx={{
        minHeight: 350,
        minWidth: { xs: "90vw", md: 480 },
        maxWidth: { xs: "98vw", md: 500 },
        background: "rgba(246,246,250, 0.95)", // خلفية الفقاعة
        borderRadius: 10,
        boxShadow: "0 6px 40px 0 rgba(125, 92, 246, 0.10)",
        position: "relative",
        m: "auto",
        mt: 8,
        px: { xs: 2, md: 5 },
        py: { xs: 4, md: 6 },
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        fontFamily: "Tajawal, Alexandria, sans-serif",
      }}
    >
      <Typography
        variant="h5"
        sx={{
          fontWeight: 700,
          mb: 1,
          fontSize: { xs: 22, md: 26 },
          letterSpacing: 0,
        }}
      >
        <Box component="span" sx={{ color: accentColor }}>
          تخلص
        </Box>
        {" من المشاكل القديمة "}
        <br />و{" "}
        <Box component="span" sx={{ color: mainColor }}>
          استمتع
        </Box>
        <Box component="span" sx={{ color: "#7D5CF6", fontWeight: 700 }}>
          {" "}
          بمزايا كَلِيم
        </Box>
      </Typography>
      <Typography
        sx={{
          color: "#707070",
          fontSize: 15,
          fontWeight: 400,
          mt: 1,
          mb: 4,
        }}
      >
        قم بترقية تجربة عملائك اليوم ووفر وقتك وجهدك
      </Typography>
      <Button
        variant="contained"
        sx={{
          px: 5,
          py: 1.5,
          fontWeight: "bold",
          fontSize: 17,
          background: buttonGradient,
          borderRadius: 2.5,
          boxShadow: "none",
          color: "#fff",
          transition: "0.2s",
          "&:hover": {
            background: buttonGradient,
            opacity: 0.9,
          },
        }}
      >
        ابدأ المحادثة الآن
      </Button>
      {/* رسمات جرافيك خارجية يمكنك إضافتها كـ <img> أو SVG absolute  */}
      {/* مثال: */}
      {/* <Box
        sx={{
          position: "absolute",
          top: -40,
          right: -40,
          width: 90,
          height: 90,
          opacity: 0.15,
          background: "url(/path-to-graphic.svg) no-repeat center/contain",
        }}
      /> */}
    </Box>
  );
};

export default InviteBanner;
