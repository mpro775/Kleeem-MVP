'use client';

import {
  Box,
  Typography,
  Button,
  TextField,
  MenuItem,
  Stack,
  TablePagination,
  useTheme,
  useMediaQuery,
  Paper,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import BoltIcon from "@mui/icons-material/Bolt";

import { useInstructions } from "@/features/merchant/instructions/hooks/useInstructions";
import { InstructionsTable } from "@/features/merchant/instructions/ui/InstructionsTable";
import { InstructionEditDialog } from "@/features/merchant/instructions/ui/InstructionEditDialog";

export default function InstructionsPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // استدعاء الخطاف الذي يحتوي على كل المنطق والحالة
  const {
    rows,
    totalRows,
    page,
    limit,
    activeFilter,
    editDialogOpen,
    editingInstruction,
    setPage,
    setLimit,
    setActiveFilter,
    setEditDialogOpen,
    handleOpenNew,
    handleOpenEdit,
    handleSave,
    handleDelete,
    handleToggleActive,
    handleOpenSuggest,
  } = useInstructions();

  return (
    <Box p={isMobile ? 2 : 3}>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
        flexWrap="wrap"
        gap={1}
      >
        <Typography variant="h5" fontWeight={700}>
          التوجيهات
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button
            startIcon={<BoltIcon />}
            variant="outlined"
            onClick={handleOpenSuggest}
          >
            اقتراحات
          </Button>
          <Button
            startIcon={<AddIcon />}
            variant="contained"
            onClick={handleOpenNew}
          >
            إضافة توجيه
          </Button>
        </Stack>
      </Stack>

      <Paper sx={{ p: 2, mb: 2 }}>
        <TextField
          size="small"
          select
          label="الحالة"
          value={activeFilter}
          onChange={(e) => setActiveFilter(e.target.value as "all" | "true" | "false")}
          sx={{ minWidth: 120 }}
        >
          <MenuItem value="all">الكل</MenuItem>
          <MenuItem value="true">مفعّل</MenuItem>
          <MenuItem value="false">غير مفعّل</MenuItem>
        </TextField>
      </Paper>

      <InstructionsTable
        instructions={rows}
        onEdit={handleOpenEdit}
        onDelete={handleDelete}
        onToggle={handleToggleActive}
      />

      <TablePagination
        component="div"
        count={totalRows}
        page={page}
        onPageChange={(_, p) => setPage(p)}
        rowsPerPage={limit}
        onRowsPerPageChange={(e) => setLimit(parseInt(e.target.value, 10))}
        rowsPerPageOptions={[10, 20, 50]}
      />

      <InstructionEditDialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        onSave={handleSave}
        instruction={editingInstruction}
      />
    </Box>
  );
}
