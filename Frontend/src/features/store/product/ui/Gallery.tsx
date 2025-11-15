import { Box, Chip, Typography, useTheme } from "@mui/material";
import { useState } from "react";

export default function Gallery({
  images = [],
  status,
  lowQuantity,
  name,
}: {
  images?: string[];
  status?: string;
  lowQuantity?: number;
  name: string;
}) {
  const theme = useTheme();
  const [selectedImage, setSelectedImage] = useState(0);

  return (
    <Box
      sx={{
        flex: 1,
        minWidth: 0,
        display: "flex",
        flexDirection: { xs: "column", md: "row" },
        gap: 2,
      }}
    >
      {/* thumbnails */}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "row", md: "column" },
          order: { xs: 2, md: 1 },
          gap: 1,
          maxWidth: { md: 80 },
          overflowX: "auto",
          py: 1,
        }}
      >
        {images.map((img, index) => {
          const selected = selectedImage === index;
          return (
            <Box
              key={index}
              onClick={() => setSelectedImage(index)}
              sx={{
                width: 80,
                height: 80,
                borderRadius: 2,
                overflow: "hidden",
                cursor: "pointer",
                border: selected
                  ? "2px solid var(--brand)"
                  : `1px solid ${theme.palette.divider}`,
                opacity: selected ? 1 : 0.7,
                flexShrink: 0,
              }}
            >
              <img
                src={img}
                alt={`${name} thumbnail ${index}`}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </Box>
          );
        })}
      </Box>

      {/* main image */}
      <Box
        sx={{
          flex: 1,
          order: { xs: 1, md: 2 },
          borderRadius: 3,
          overflow: "hidden",
          position: "relative",
          height: { xs: 300, md: 450 },
          backgroundColor: theme.palette.grey[100],
        }}
      >
        {images?.[selectedImage] ? (
          <img
            src={images[selectedImage]}
            alt={name}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              padding: 20,
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
            <Typography color="text.secondary">لا توجد صورة</Typography>
          </Box>
        )}
        <Box sx={{ position: "absolute", top: 16, left: 16 }}>
          {status === "out_of_stock" && (
            <Chip
              label="منتهي"
              color="error"
              sx={{ fontWeight: "bold", mr: 1 }}
            />
          )}
          {lowQuantity && lowQuantity < 10 && (
            <Chip
              label="ينفد سريعاً"
              color="warning"
              sx={{ fontWeight: "bold" }}
            />
          )}
        </Box>
      </Box>
    </Box>
  );
}
