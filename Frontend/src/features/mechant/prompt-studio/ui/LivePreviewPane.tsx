import {
  Paper,
  Typography,
  Box,
  IconButton,
  Tooltip,
  LinearProgress,
  Fade,
} from "@mui/material";
import { styled } from "@mui/system";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import RefreshIcon from "@mui/icons-material/Refresh";
import CheckIcon from "@mui/icons-material/Check";
import { useState } from "react";

export interface LivePreviewPaneProps {
  content: string;
  isLivePreview?: boolean;
  onRefresh?: () => void;
  isLoading?: boolean;
}

const PreviewContainer = styled(Paper)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  height: "100%",
  minWidth: 0,
  backgroundColor:
    theme.palette.mode === "dark"
      ? theme.palette.grey[900]
      : theme.palette.grey[100],
  overflow: "hidden",
  position: "relative",
}));

const PreviewHeader = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: theme.spacing(1.5, 2),
  borderBottom: `1px solid ${theme.palette.divider}`,
}));

const PreviewContent = styled(Box)(({ theme }) => ({
  flexGrow: 1,
  overflow: "auto",
  padding: theme.spacing(2),
  fontFamily: "'Roboto Mono', monospace",
  fontSize: "0.875rem",
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
  backgroundColor: theme.palette.background.paper,
  color: theme.palette.text.primary,
  "& pre": { margin: 0, fontFamily: "inherit" },
}));

const PreviewFooter = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  padding: theme.spacing(1, 2),
  borderTop: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.default,
}));

export function LivePreviewPane({
  content,
  isLivePreview = false,
  onRefresh,
  isLoading = false,
}: LivePreviewPaneProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <PreviewContainer elevation={3}>
      <Fade in={isLoading} unmountOnExit>
        <LinearProgress
          color="primary"
          sx={{ position: "absolute", top: 0, left: 0, right: 0, height: 2 }}
        />
      </Fade>

      <PreviewHeader>
        <Typography variant="h6" component="div">
          {isLivePreview ? "المعاينة الحية" : "معاينة المحتوى"}
          {isLivePreview && (
            <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
              (تحديث تلقائي)
            </Typography>
          )}
        </Typography>

        <Box>
          {onRefresh && (
            <Tooltip title="تحديث المعاينة">
              <IconButton size="small" onClick={onRefresh} disabled={isLoading}>
                <RefreshIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title={copied ? "تم النسخ!" : "نسخ المحتوى"}>
            <IconButton size="small" onClick={handleCopy} disabled={!content} sx={{ ml: 1 }}>
              {copied ? <CheckIcon fontSize="small" color="success" /> : <ContentCopyIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
        </Box>
      </PreviewHeader>

      <PreviewContent>
        {content ? (
          <Typography component="pre">{content}</Typography>
        ) : (
          <Typography color="text.secondary" sx={{ fontStyle: "italic" }}>
            {isLoading ? "جاري تحميل المحتوى..." : "لا يوجد محتوى للعرض"}
          </Typography>
        )}
      </PreviewContent>

      <PreviewFooter>
        <Typography variant="caption" color="text.secondary">
          {content?.length ? `${content.length} حرف` : ""}
        </Typography>
      </PreviewFooter>
    </PreviewContainer>
  );
}
