import { useState } from "react";
import {
  Box,
  TextField,
  Button,
  Stack,
  Card,
  CardContent,
  Typography,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  useTheme,
  useMediaQuery,
  Tooltip,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import VisibilityIcon from "@mui/icons-material/Visibility";
import PolicyIcon from "@mui/icons-material/Policy";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import type { SectionComponentProps } from "@/features/mechant/merchant-settings/types";

interface PolicyData {
  returnPolicy: string;
  exchangePolicy: string;
  shippingPolicy: string;
}

interface PolicyConfig {
  key: keyof PolicyData;
  label: string;
  icon: React.ReactNode;
  maxChars: number;
  placeholder: string;
}

const policyConfigs: PolicyConfig[] = [
  {
    key: "returnPolicy",
    label: "سياسة الاسترجاع",
    icon: <SwapHorizIcon />,
    maxChars: 1000,
    placeholder: "اكتب سياسة الاسترجاع الخاصة بمتجرك...",
  },
  {
    key: "exchangePolicy",
    label: "سياسة الاستبدال",
    icon: <SwapHorizIcon />,
    maxChars: 1000,
    placeholder: "اكتب سياسة الاستبدال الخاصة بمتجرك...",
  },
  {
    key: "shippingPolicy",
    label: "سياسة الشحن",
    icon: <LocalShippingIcon />,
    maxChars: 1000,
    placeholder: "اكتب سياسة الشحن الخاصة بمتجرك...",
  },
];

export default function PoliciesForm({
  initialData,
  onSave,
  loading,
}: SectionComponentProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  
  const [policies, setPolicies] = useState<PolicyData>({
    returnPolicy: initialData.returnPolicy ?? "",
    exchangePolicy: initialData.exchangePolicy ?? "",
    shippingPolicy: initialData.shippingPolicy ?? "",
  });

  const [editingPolicy, setEditingPolicy] = useState<keyof PolicyData | null>(null);
  const [editValue, setEditValue] = useState("");

  const handleChange = (k: keyof PolicyData, v: string) =>
    setPolicies((p) => ({ ...p, [k]: v }));

  const handleEditClick = (policyKey: keyof PolicyData) => {
    setEditingPolicy(policyKey);
    setEditValue(policies[policyKey]);
  };

  const handleEditSave = () => {
    if (editingPolicy) {
      handleChange(editingPolicy, editValue);
      setEditingPolicy(null);
      setEditValue("");
    }
  };

  const handleEditCancel = () => {
    setEditingPolicy(null);
    setEditValue("");
  };

  const truncateText = (text: string, maxLength: number = 100) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  const getPolicyConfig = (key: keyof PolicyData) => {
    return policyConfigs.find(config => config.key === key)!;
  };

  const getCharCount = (text: string) => {
    return text.length;
  };

  const getCharCountColor = (current: number, max: number) => {
    const percentage = (current / max) * 100;
    if (percentage >= 90) return "error";
    if (percentage >= 75) return "warning";
    return "success";
  };

  return (
    <Box dir="rtl">
      {/* Header */}
      <Card sx={{ mb: 3, bgcolor: 'background.paper' }}>
        <CardContent>
          <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
            <PolicyIcon color="primary" />
            <Typography variant="h6" component="h2">
              سياسات المتجر
            </Typography>
            <Chip 
              label={`${Object.values(policies).filter(p => p.trim()).length}/3`} 
              color="primary" 
              variant="outlined" 
              size="small"
            />
          </Stack>
          
          <Typography variant="body2" color="text.secondary">
            قم بتعيين السياسات الخاصة بمتجرك لتوضيح شروط الاسترجاع والاستبدال والشحن للعملاء
          </Typography>
        </CardContent>
      </Card>

      {/* Policies Display */}
      <Stack spacing={2}>
        {policyConfigs.map((config) => {
          const policy = policies[config.key];
          const charCount = getCharCount(policy);
          const charColor = getCharCountColor(charCount, config.maxChars);
          const isCompleted = policy.trim().length > 0;

          return (
            <Card
              key={config.key}
              sx={{
                border: isCompleted ? '2px solid' : '2px dashed',
                borderColor: isCompleted ? 'success.main' : 'divider',
                bgcolor: isCompleted ? 'success.light' : 'background.paper',
                opacity: isCompleted ? 1 : 0.8,
                transition: 'all 0.3s ease',
                '&:hover': {
                  boxShadow: theme.shadows[4],
                  transform: 'translateY(-2px)',
                }
              }}
            >
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                  <Box sx={{ color: 'primary.main' }}>
                    {config.icon}
                  </Box>
                  <Typography variant="h6" component="h3" sx={{ flexGrow: 1 }}>
                    {config.label}
                  </Typography>
                  <Stack direction="row" spacing={1}>
                    {isCompleted && (
                      <Chip 
                        label="مكتمل" 
                        color="success" 
                        size="small" 
                        variant="outlined"
                      />
                    )}
                    <Chip 
                      label={`${charCount}/${config.maxChars}`} 
                      color={charColor as any} 
                      size="small" 
                      variant="outlined"
                    />
                  </Stack>
                </Stack>

                <Box sx={{ mb: 2 }}>
                  {policy ? (
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        lineHeight: 1.6,
                        color: 'text.secondary',
                        bgcolor: 'background.default',
                        p: 2,
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: 'divider'
                      }}
                    >
                      {truncateText(policy, isMobile ? 80 : 120)}
                    </Typography>
                  ) : (
                    <Typography 
                      variant="body2" 
                      color="text.disabled"
                      sx={{ 
                        fontStyle: 'italic',
                        textAlign: 'center',
                        py: 2
                      }}
                    >
                      لم يتم إضافة {config.label.toLowerCase()} بعد
                    </Typography>
                  )}
                </Box>

                <Stack direction="row" spacing={1}>
                  <Button
                    startIcon={<EditIcon />}
                    variant="outlined"
                    size="small"
                    onClick={() => handleEditClick(config.key)}
                    sx={{ 
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 600
                    }}
                  >
                    {policy ? "تعديل" : "إضافة"}
                  </Button>
                  
                  {policy && (
                    <Tooltip title="عرض كامل النص">
                      <IconButton
                        size="small"
                        onClick={() => handleEditClick(config.key)}
                        sx={{ 
                          border: '1px solid',
                          borderColor: 'divider',
                          '&:hover': { bgcolor: 'action.hover' }
                        }}
                      >
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </Stack>
              </CardContent>
            </Card>
          );
        })}
      </Stack>

      {/* Save Button */}
      <Box sx={{ mt: 3 }}>
        <Button
          variant="contained"
          onClick={() => onSave(policies)}
          disabled={loading}
          fullWidth={isMobile}
          sx={{ 
            minHeight: 48,
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 600
          }}
        >
          {loading ? "جاري الحفظ..." : "حفظ السياسات"}
        </Button>
      </Box>

      {/* Edit Dialog */}
      <Dialog
        open={!!editingPolicy}
        onClose={handleEditCancel}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
        PaperProps={{
          sx: {
            borderRadius: isMobile ? 0 : 2,
            minHeight: isMobile ? '100vh' : 'auto'
          }
        }}
      >
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={2}>
            {editingPolicy && getPolicyConfig(editingPolicy).icon}
            <Typography variant="h6">
              {editingPolicy && getPolicyConfig(editingPolicy).label}
            </Typography>
          </Stack>
        </DialogTitle>
        
        <DialogContent>
          <TextField
            autoFocus
            multiline
            rows={isMobile ? 12 : 8}
            fullWidth
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            placeholder={editingPolicy ? getPolicyConfig(editingPolicy).placeholder : ""}
            variant="outlined"
            sx={{ mt: 1 }}
            inputProps={{
              maxLength: editingPolicy ? getPolicyConfig(editingPolicy).maxChars : undefined
            }}
          />
          
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              الحد الأقصى: {editingPolicy ? getPolicyConfig(editingPolicy).maxChars : 0} حرف
            </Typography>
            <Chip 
              label={`${getCharCount(editValue)}/${editingPolicy ? getPolicyConfig(editingPolicy).maxChars : 0}`} 
              color={editingPolicy ? getCharCountColor(getCharCount(editValue), getPolicyConfig(editingPolicy).maxChars) as any : "default"} 
              size="small" 
              variant="outlined"
            />
          </Box>
        </DialogContent>
        
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button
            onClick={handleEditCancel}
            variant="outlined"
            sx={{ 
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600
            }}
          >
            إلغاء
          </Button>
          <Button
            onClick={handleEditSave}
            variant="contained"
            disabled={!editValue.trim()}
            sx={{ 
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600
            }}
          >
            حفظ التغييرات
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
