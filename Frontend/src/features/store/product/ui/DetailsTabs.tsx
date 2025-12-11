import {
  Box,
  Paper,
  Tabs,
  Tab,
  Typography,
  useTheme,
  Badge,
} from "@mui/material";
import { useMemo, useState } from "react";

type Props = {
  specs?: string[];
  richDescription?: string;
};

function sanitizeRichHtml(html: string): string {
  // إزالة السكربت وأي on* attributes بشكل بسيط
  const withoutScripts = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
  return withoutScripts.replace(/\son\w+="[^"]*"/gi, "");
}

export default function DetailsTabs({ specs = [], richDescription }: Props) {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState(0);

  const cleanedRich = useMemo(
    () => (richDescription ? sanitizeRichHtml(richDescription) : ""),
    [richDescription],
  );
  const hasRich = Boolean(cleanedRich.trim());

  return (
    <Box sx={{ mb: 6 }}>
      <Tabs
        value={activeTab}
        onChange={(_, v) => setActiveTab(v)}
        sx={{
          borderBottom: 1,
          borderColor: "divider",
          "& .MuiTabs-indicator": { backgroundColor: "var(--brand)" },
          "& .MuiTab-root.Mui-selected": { color: "var(--brand)" },
        }}
      >
        {hasRich && <Tab label="الوصف التفصيلي" />}
        <Tab label="المواصفات" />
        <Tab 
          label={
            <Badge 
              badgeContent="قريباً" 
              color="warning"
              sx={{
                '& .MuiBadge-badge': {
                  fontSize: '0.6rem',
                  height: 'auto',
                  padding: '2px 6px',
                  borderRadius: '10px',
                  fontWeight: 'bold',
                }
              }}
            >
              <span>التقييمات</span>
            </Badge>
          } 
          disabled 
        />
        <Tab 
          label={
            <Badge 
              badgeContent="قريباً" 
              color="warning"
              sx={{
                '& .MuiBadge-badge': {
                  fontSize: '0.6rem',
                  height: 'auto',
                  padding: '2px 6px',
                  borderRadius: '10px',
                  fontWeight: 'bold',
                }
              }}
            >
              <span>الأسئلة الشائعة</span>
            </Badge>
          } 
          disabled 
        />
      </Tabs>

      {hasRich && activeTab === 0 && (
        <Paper
          sx={{
            p: 3,
            borderRadius: 3,
            backgroundColor: theme.palette.grey[50],
          }}
        >
          <Box
            sx={{
              "& p": { lineHeight: 1.7, mb: 1.5 },
              "& ul": { paddingInlineStart: 3 },
            }}
            dangerouslySetInnerHTML={{ __html: cleanedRich }}
          />
        </Paper>
      )}

      {(!hasRich && activeTab === 0) || (hasRich && activeTab === 1) ? (
        <Paper
          sx={{
            p: 3,
            borderRadius: 3,
            backgroundColor: theme.palette.grey[50],
          }}
        >
          {specs.length ? (
            <Box
              component="ul"
              sx={{ pl: 2, m: 0, columnCount: { md: 2 }, columnGap: 4 }}
            >
              {specs.map((s, i) => (
                <Box
                  component="li"
                  key={i}
                  sx={{
                    mb: 1.5,
                    breakInside: "avoid",
                    "&::marker": { color: "var(--brand)" },
                  }}
                >
                  <Typography>{s}</Typography>
                </Box>
              ))}
            </Box>
          ) : (
            <Typography textAlign="center" py={2}>
              لا توجد مواصفات متاحة لهذا المنتج
            </Typography>
          )}
        </Paper>
      ) : null}

      {(hasRich ? activeTab === 2 : activeTab === 1) && (
        <Paper
          sx={{
            p: 4,
            borderRadius: 3,
            backgroundColor: theme.palette.grey[50],
            textAlign: 'center',
            border: '2px dashed',
            borderColor: 'grey.300',
          }}
        >
          <Typography variant="h5" color="text.secondary" gutterBottom>
            ⭐ التقييمات
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
            قريباً
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            سيتم إضافة نظام التقييمات قريباً
          </Typography>
          <Typography variant="caption" color="text.disabled">
            هذه الميزة قيد التطوير
          </Typography>
        </Paper>
      )}

      {(hasRich ? activeTab === 3 : activeTab === 2) && (
        <Paper
          sx={{
            p: 4,
            borderRadius: 3,
            backgroundColor: theme.palette.grey[50],
            textAlign: 'center',
            border: '2px dashed',
            borderColor: 'grey.300',
          }}
        >
          <Typography variant="h5" color="text.secondary" gutterBottom>
            ❓ الأسئلة الشائعة
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
            قريباً
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            سيتم إضافة الأسئلة الشائعة قريباً
          </Typography>
          <Typography variant="caption" color="text.disabled">
            هذه الميزة قيد التطوير
          </Typography>
        </Paper>
      )}
    </Box>
  );
}
