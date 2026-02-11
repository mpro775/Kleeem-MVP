// src/features/mechant/inventory/ui/InventoryFilters.tsx
import { Box, Chip, TextField, Button, InputAdornment } from '@mui/material';
import {
  Search as SearchIcon,
  FileDownload as ExportIcon,
} from '@mui/icons-material';
import type { InventoryStatus } from '../types';
import { INVENTORY_STATUS_OPTIONS } from '../types';

interface InventoryFiltersProps {
  status: InventoryStatus;
  search: string;
  onStatusChange: (status: InventoryStatus) => void;
  onSearchChange: (search: string) => void;
  onExport: () => void;
  exportLoading?: boolean;
}

export function InventoryFilters({
  status,
  search,
  onStatusChange,
  onSearchChange,
  onExport,
  exportLoading = false,
}: InventoryFiltersProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        gap: 2,
        mb: 3,
        alignItems: { xs: 'stretch', md: 'center' },
        justifyContent: 'space-between',
      }}
    >
      {/* فلاتر الحالة */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {INVENTORY_STATUS_OPTIONS.map((option) => (
          <Chip
            key={option.value}
            label={option.label}
            color={status === option.value ? option.color : 'default'}
            variant={status === option.value ? 'filled' : 'outlined'}
            onClick={() => onStatusChange(option.value)}
            sx={{ cursor: 'pointer' }}
          />
        ))}
      </Box>

      {/* البحث والتصدير */}
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
        <TextField
          size="small"
          placeholder="بحث..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 200 }}
        />
        <Button
          variant="outlined"
          startIcon={<ExportIcon />}
          onClick={onExport}
          disabled={exportLoading}
        >
          تصدير CSV
        </Button>
      </Box>
    </Box>
  );
}

export default InventoryFilters;
