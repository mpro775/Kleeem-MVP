import {
    Box,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Chip,
  } from "@mui/material";
  import type { ProductResponse } from "@/features/mechant/products/type";
  import mockProducts from "../../../data/mock-products.json";
  
  const asProducts = mockProducts as unknown as ProductResponse[];
  
  export default function InventoryPage() {
    const rows = asProducts.slice(0, 20); // عرض أول 20 منتج كعينة
  
    return (
      <Box sx={{ p: { xs: 2, md: 4 } }}>
        <Typography variant="h4" fontWeight="bold" sx={{ mb: 3 }}>
          إدارة المخزون
        </Typography>
  
        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>المنتج</TableCell>
                <TableCell align="center">المخزون</TableCell>
                <TableCell align="center">حالة المخزون</TableCell>
                <TableCell align="center">متاح للبيع</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((p) => {
                const isUnlimited = p.isUnlimitedStock;
                const stock = isUnlimited ? "غير محدود" : p.stock ?? p.quantity ?? 0;
                const isLow =
                  !isUnlimited &&
                  (p.stock ?? p.quantity ?? 0) <= (p.lowStockThreshold ?? 0);
                const isOut =
                  !isUnlimited && (p.stock ?? p.quantity ?? 0) <= 0;
  
                return (
                  <TableRow key={p._id}>
                    <TableCell>
                      <Typography fontWeight="bold">{p.name}</Typography>
                      {p.shortDescription && (
                        <Typography variant="body2" color="text.secondary">
                          {p.shortDescription}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="center">{stock}</TableCell>
                    <TableCell align="center">
                      {isUnlimited ? (
                        <Chip label="غير محدود" color="success" size="small" />
                      ) : isOut ? (
                        <Chip label="منتهي" color="error" size="small" />
                      ) : isLow ? (
                        <Chip label="منخفض" color="warning" size="small" />
                      ) : (
                        <Chip label="جيد" color="success" size="small" />
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={p.isAvailable ? "متاح" : "غير متاح"}
                        color={p.isAvailable ? "success" : "default"}
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    );
  }
  