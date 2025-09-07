import { useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  IconButton,
  MenuItem,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  Stack,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import type { SectionComponentProps } from "@/features/mechant/merchant-settings/types";
import type { WorkingHour } from "@/features/mechant/merchant-settings/types";

const weekdays = [
  { key: "Sunday", label: "الأحد", shortLabel: "أحد" },
  { key: "Monday", label: "الاثنين", shortLabel: "اثنين" },
  { key: "Tuesday", label: "الثلاثاء", shortLabel: "ثلاثاء" },
  { key: "Wednesday", label: "الأربعاء", shortLabel: "أربعاء" },
  { key: "Thursday", label: "الخميس", shortLabel: "خميس" },
  { key: "Friday", label: "الجمعة", shortLabel: "جمعة" },
  { key: "Saturday", label: "السبت", shortLabel: "سبت" },
];

export default function WorkingHoursForm({
  initialData,
  onSave,
  loading,
}: SectionComponentProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  
  const [hours, setHours] = useState<WorkingHour[]>(
    initialData.workingHours?.length ? initialData.workingHours : []
  );
  const [expandedDay, setExpandedDay] = useState<string | false>(false);

  const availableDays = weekdays.filter(
    (w) => !hours.find((h) => h.day === w.key)
  );

  const handleAddDay = () => {
    if (!availableDays.length) return;
    const newDay = availableDays[0].key;
    setHours([
      ...hours,
      { day: newDay, openTime: "09:00", closeTime: "18:00" },
    ]);
    setExpandedDay(newDay);
  };

  const handleChange = (
    i: number,
    key: "openTime" | "closeTime" | "day",
    value: string
  ) => {
    setHours((hs) =>
      hs.map((h, idx) => (idx === i ? { ...h, [key]: value } : h))
    );
  };

  const handleDelete = (i: number) => {
    setHours((hs) => hs.filter((_, idx) => idx !== i));
  };

  const getDayLabel = (dayKey: string) => {
    return weekdays.find(w => w.key === dayKey)?.label || dayKey;
  };

  const getDayShortLabel = (dayKey: string) => {
    return weekdays.find(w => w.key === dayKey)?.shortLabel || dayKey;
  };

  const formatTime = (time: string) => {
    return time.replace(":", " : ");
  };

  const handleAccordionChange = (day: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedDay(isExpanded ? day : false);
  };

  return (
    <Box dir="rtl">
      {/* Header Section */}
      <Card sx={{ mb: 3, bgcolor: 'background.paper' }}>
        <CardContent>
          <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
            <AccessTimeIcon color="primary" />
            <Typography variant="h6" component="h2">
              ساعات العمل
            </Typography>
            <Chip 
              label={`${hours.length} يوم`} 
              color="primary" 
              variant="outlined" 
              size="small"
            />
          </Stack>
          
          {hours.length === 0 && (
            <Box 
              sx={{ 
                textAlign: 'center', 
                py: 4,
                color: 'text.secondary',
                border: '2px dashed',
                borderColor: 'divider',
                borderRadius: 2
              }}
            >
              <CalendarTodayIcon sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
              <Typography variant="body1" sx={{ mb: 1 }}>
                لم يتم إضافة أي أيام عمل بعد
              </Typography>
              <Typography variant="body2" color="text.secondary">
                اضغط على "إضافة يوم جديد" لبدء إعداد ساعات العمل
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Working Hours List */}
      {hours.map((hour, index) => (
        <Accordion
          key={hour.day}
          expanded={expandedDay === hour.day}
          onChange={handleAccordionChange(hour.day)}
          sx={{ 
            mb: 2,
            '&:before': { display: 'none' },
            boxShadow: theme.shadows[2],
            borderRadius: 2,
            overflow: 'hidden'
          }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            sx={{
              bgcolor: expandedDay === hour.day ? 'primary.light' : 'background.paper',
              '&:hover': { bgcolor: 'action.hover' }
            }}
          >
            <Stack direction="row" alignItems="center" spacing={2} sx={{ width: '100%' }}>
              <Box sx={{ minWidth: 80 }}>
                <Typography variant="subtitle2" color="primary">
                  {isMobile ? getDayShortLabel(hour.day) : getDayLabel(hour.day)}
                </Typography>
              </Box>
              
              <Divider orientation="vertical" flexItem />
              
              <Stack direction="row" spacing={1} alignItems="center">
                <AccessTimeIcon fontSize="small" color="action" />
                <Typography variant="body2">
                  {formatTime(hour.openTime)} - {formatTime(hour.closeTime)}
                </Typography>
              </Stack>
              
              <Box sx={{ flexGrow: 1 }} />
              
              <IconButton
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(index);
                }}
                color="error"
                size="small"
                sx={{ 
                  '&:hover': { 
                    bgcolor: 'error.light',
                    color: 'error.contrastText'
                  }
                }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Stack>
          </AccordionSummary>
          
          <AccordionDetails sx={{ bgcolor: 'background.default' }}>
            <Stack 
              direction={isMobile ? "column" : "row"} 
              spacing={2}
              sx={{ width: '100%' }}
            >
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <TextField
                  select
                  label="اليوم"
                  value={hour.day}
                  onChange={(e) => handleChange(index, "day", e.target.value)}
                  fullWidth
                  size="small"
                  InputProps={{
                    startAdornment: <CalendarTodayIcon fontSize="small" sx={{ mr: 1, opacity: 0.7 }} />
                  }}
                >
                  {weekdays.map((w) => (
                    <MenuItem
                      key={w.key}
                      value={w.key}
                      disabled={
                        !!hours.find(
                          (hh, idx) => hh.day === w.key && idx !== index
                        )
                      }
                    >
                      {w.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>
              
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <TextField
                  type="time"
                  label="وقت الفتح"
                  value={hour.openTime}
                  onChange={(e) => handleChange(index, "openTime", e.target.value)}
                  required
                  size="small"
                  fullWidth
                  InputProps={{
                    startAdornment: <AccessTimeIcon fontSize="small" sx={{ mr: 1, opacity: 0.7 }} />
                  }}
                />
              </Box>
              
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <TextField
                  type="time"
                  label="وقت الإغلاق"
                  value={hour.closeTime}
                  onChange={(e) => handleChange(index, "closeTime", e.target.value)}
                  required
                  size="small"
                  fullWidth
                  InputProps={{
                    startAdornment: <AccessTimeIcon fontSize="small" sx={{ mr: 1, opacity: 0.7 }} />
                  }}
                />
              </Box>
            </Stack>
          </AccordionDetails>
        </Accordion>
      ))}

      {/* Action Buttons */}
      <Stack 
        direction={isMobile ? "column" : "row"} 
        spacing={2} 
        sx={{ mt: 3 }}
      >
        <Button
          startIcon={<AddIcon />}
          variant="outlined"
          onClick={handleAddDay}
          disabled={!availableDays.length}
          fullWidth={isMobile}
          sx={{ 
            minHeight: 48,
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 600
          }}
        >
          إضافة يوم جديد
          {availableDays.length > 0 && (
            <Chip 
              label={availableDays.length} 
              size="small" 
              sx={{ ml: 1 }}
            />
          )}
        </Button>
        
        <Button
          variant="contained"
          onClick={() => onSave({ workingHours: hours })}
          disabled={loading}
          fullWidth={isMobile}
          sx={{ 
            minHeight: 48,
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 600
          }}
        >
          {loading ? "جاري الحفظ..." : "حفظ ساعات العمل"}
        </Button>
      </Stack>
    </Box>
  );
}
