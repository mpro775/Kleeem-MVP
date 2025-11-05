'use client';

import { Paper, Typography, Box, Card, CardContent, Chip, LinearProgress } from "@mui/material";
const COLORS = ["#0077b6", "#00b4d8", "#90e0ef", "#ff9e00", "#ff6d00", "#ff5400"];
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

type KeywordType = {
  keyword: string;
  count: number;
};

interface KeywordsChartProps {
  keywords: KeywordType[];
}

export default function KeywordsChart({ keywords }: KeywordsChartProps) {
    const isEmpty = !keywords || keywords.length === 0;

  return (
    <Paper sx={{ p: 3, borderRadius: 3, boxShadow: 3 }}>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>أعلى الكلمات المفتاحية</Typography>
      {isEmpty ? (
        <Box sx={{ minHeight: 120, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#aaa" }}>
          <InfoOutlinedIcon sx={{ fontSize: 44, mb: 1 }} />
          <Typography variant="body1" fontWeight={500}>لا توجد كلمات مفتاحية لعرضها حالياً</Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>سيظهر هنا أكثر الكلمات استخداماً عند تفاعل العملاء مع البوت.</Typography>
        </Box>
      ) : (
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: 2,
          "& > *": { flex: "1 1 300px", minWidth: 300 },
        }}
      >
        {keywords.map((keyword, index: number) => (
          <Card variant="outlined" sx={{ borderRadius: 3 }} key={keyword.keyword}>
            <CardContent>
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                <Typography variant="subtitle1" fontWeight="bold">
                  {keyword.keyword}
                </Typography>
                <Chip label={`${keyword.count} مرة`} size="small" color="primary" />
              </Box>
              <LinearProgress
                variant="determinate"
                value={keywords[0]?.count ? (keyword.count / keywords[0].count) * 100 : 0}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  background: "#eee",
                  "& .MuiLinearProgress-bar": {
                    borderRadius: 4,
                    background: `linear-gradient(90deg, ${COLORS[index % COLORS.length]}, ${
                      COLORS[(index + 2) % COLORS.length]
                    })`,
                  },
                }}
              />
            </CardContent>
          </Card>
        ))}
      </Box>
        )}
    </Paper>
  );
}
