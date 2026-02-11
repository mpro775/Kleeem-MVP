// src/features/mechant/inventory/ui/InventoryTable.tsx
import { useState, useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Collapse,
  Box,
  Typography,
  Chip,
  Avatar,
  Tooltip,
  Skeleton,
} from '@mui/material';
import {
  KeyboardArrowDown as ExpandIcon,
  KeyboardArrowUp as CollapseIcon,
  History as HistoryIcon,
  Inventory as InventoryIcon,
  AllInclusive as UnlimitedIcon,
  Warning as LowStockIcon,
  Error as OutOfStockIcon,
} from '@mui/icons-material';
import type { InventoryItem, VariantStock, UpdateStockRequest } from '../types';
import { StockEditCell } from './StockEditCell';

interface InventoryTableProps {
  items: InventoryItem[];
  loading?: boolean;
  onUpdateStock: (productId: string, dto: UpdateStockRequest) => Promise<void>;
  onShowHistory: (productId: string) => void;
}

interface ExpandedRowProps {
  variants: VariantStock[];
  productId: string;
  onUpdateStock: (productId: string, dto: UpdateStockRequest) => Promise<void>;
}

function ExpandedRow({ variants, productId, onUpdateStock }: ExpandedRowProps) {
  return (
    <Box sx={{ py: 2, px: 4, bgcolor: 'grey.50' }}>
      <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
        المتغيرات
      </Typography>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>SKU</TableCell>
            <TableCell align="center">المخزون</TableCell>
            <TableCell align="center">الحالة</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {variants.map((variant) => (
            <TableRow key={variant.sku}>
              <TableCell>{variant.sku}</TableCell>
              <TableCell align="center">
                <StockEditCell
                  value={variant.stock}
                  onSave={async (newValue) => {
                    await onUpdateStock(productId, {
                      quantity: newValue,
                      variantSku: variant.sku,
                    });
                  }}
                />
              </TableCell>
              <TableCell align="center">
                {variant.stock <= 0 ? (
                  <Chip
                    label="منتهي"
                    color="error"
                    size="small"
                    icon={<OutOfStockIcon />}
                  />
                ) : variant.isLowStock ? (
                  <Chip
                    label="منخفض"
                    color="warning"
                    size="small"
                    icon={<LowStockIcon />}
                  />
                ) : (
                  <Chip
                    label="متاح"
                    color="success"
                    size="small"
                    icon={<InventoryIcon />}
                  />
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}

function InventoryRow({
  item,
  onUpdateStock,
  onShowHistory,
}: {
  item: InventoryItem;
  onUpdateStock: (productId: string, dto: UpdateStockRequest) => Promise<void>;
  onShowHistory: (productId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const getStatusChip = useCallback(() => {
    if (item.isUnlimitedStock) {
      return (
        <Chip
          label="غير محدود"
          color="info"
          size="small"
          icon={<UnlimitedIcon />}
        />
      );
    }
    if (item.isOutOfStock) {
      return (
        <Chip
          label="منتهي"
          color="error"
          size="small"
          icon={<OutOfStockIcon />}
        />
      );
    }
    if (item.isLowStock) {
      return (
        <Chip
          label="منخفض"
          color="warning"
          size="small"
          icon={<LowStockIcon />}
        />
      );
    }
    return (
      <Chip
        label="متاح"
        color="success"
        size="small"
        icon={<InventoryIcon />}
      />
    );
  }, [item]);

  return (
    <>
      <TableRow
        sx={{
          '&:hover': { bgcolor: 'action.hover' },
          ...(item.isOutOfStock && { bgcolor: 'error.lighter' }),
          ...(item.isLowStock &&
            !item.isOutOfStock && { bgcolor: 'warning.lighter' }),
        }}
      >
        <TableCell padding="checkbox">
          {item.hasVariants && (
            <IconButton size="small" onClick={() => setExpanded(!expanded)}>
              {expanded ? <CollapseIcon /> : <ExpandIcon />}
            </IconButton>
          )}
        </TableCell>
        <TableCell>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar
              src={item.images[0]}
              variant="rounded"
              sx={{ width: 40, height: 40, bgcolor: 'grey.200' }}
            >
              <InventoryIcon />
            </Avatar>
            <Box>
              <Typography variant="body2" fontWeight="medium">
                {item.name}
              </Typography>
              {item.hasVariants && (
                <Typography variant="caption" color="text.secondary">
                  {item.variants?.length || 0} متغير
                </Typography>
              )}
            </Box>
          </Box>
        </TableCell>
        <TableCell align="center">
          {item.hasVariants ? (
            <Typography variant="body2" color="text.secondary">
              انظر المتغيرات
            </Typography>
          ) : (
            <StockEditCell
              value={item.stock}
              isUnlimited={item.isUnlimitedStock}
              onSave={async (newValue) => {
                await onUpdateStock(item.productId, { quantity: newValue });
              }}
            />
          )}
        </TableCell>
        <TableCell align="center">
          {item.lowStockThreshold !== null ? (
            <Typography variant="body2">{item.lowStockThreshold}</Typography>
          ) : (
            <Typography variant="body2" color="text.secondary">
              —
            </Typography>
          )}
        </TableCell>
        <TableCell align="center">{getStatusChip()}</TableCell>
        <TableCell align="center">
          <Tooltip title="سجل التغييرات">
            <IconButton
              size="small"
              onClick={() => onShowHistory(item.productId)}
            >
              <HistoryIcon />
            </IconButton>
          </Tooltip>
        </TableCell>
      </TableRow>
      {item.hasVariants && item.variants && (
        <TableRow>
          <TableCell colSpan={6} sx={{ p: 0 }}>
            <Collapse in={expanded} timeout="auto" unmountOnExit>
              <ExpandedRow
                variants={item.variants}
                productId={item.productId}
                onUpdateStock={onUpdateStock}
              />
            </Collapse>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

function LoadingSkeleton() {
  return (
    <>
      {[1, 2, 3, 4, 5].map((i) => (
        <TableRow key={i}>
          <TableCell padding="checkbox">
            <Skeleton variant="circular" width={24} height={24} />
          </TableCell>
          <TableCell>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Skeleton variant="rounded" width={40} height={40} />
              <Skeleton variant="text" width={120} />
            </Box>
          </TableCell>
          <TableCell align="center">
            <Skeleton variant="text" width={80} sx={{ mx: 'auto' }} />
          </TableCell>
          <TableCell align="center">
            <Skeleton variant="text" width={40} sx={{ mx: 'auto' }} />
          </TableCell>
          <TableCell align="center">
            <Skeleton
              variant="rounded"
              width={60}
              height={24}
              sx={{ mx: 'auto' }}
            />
          </TableCell>
          <TableCell align="center">
            <Skeleton
              variant="circular"
              width={24}
              height={24}
              sx={{ mx: 'auto' }}
            />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

export function InventoryTable({
  items,
  loading = false,
  onUpdateStock,
  onShowHistory,
}: InventoryTableProps) {
  return (
    <TableContainer component={Paper} variant="outlined">
      <Table>
        <TableHead>
          <TableRow sx={{ bgcolor: 'grey.50' }}>
            <TableCell padding="checkbox" width={50} />
            <TableCell>المنتج</TableCell>
            <TableCell align="center" width={150}>
              المخزون
            </TableCell>
            <TableCell align="center" width={100}>
              عتبة التنبيه
            </TableCell>
            <TableCell align="center" width={120}>
              الحالة
            </TableCell>
            <TableCell align="center" width={80}>
              السجل
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {loading ? (
            <LoadingSkeleton />
          ) : items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                <InventoryIcon
                  sx={{ fontSize: 48, color: 'grey.400', mb: 1 }}
                />
                <Typography color="text.secondary">لا توجد منتجات</Typography>
              </TableCell>
            </TableRow>
          ) : (
            items.map((item) => (
              <InventoryRow
                key={item.productId}
                item={item}
                onUpdateStock={onUpdateStock}
                onShowHistory={onShowHistory}
              />
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export default InventoryTable;
