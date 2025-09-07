import { useState } from "react";
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Avatar,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import EditCategoryDialog from "./EditCategoryDialog";
import DeleteCategoryDialog from "./DeleteCategoryDialog";
import type { Category } from "../type";

interface CategoriesTableProps {
  categories: Category[];
  merchantId: string;     // ✅ نحتاجه لحفظ التعديلات
  onRefresh: () => void;
}

export default function CategoriesTable({
  categories,
  merchantId,
  onRefresh,
}: CategoriesTableProps) {
  const [editCat, setEditCat] = useState<Category | null>(null);
  const [deleteCat, setDeleteCat] = useState<Category | null>(null);

  // جدول اسم الأب السريع
  const idToName = Object.fromEntries(categories.map((c) => [c._id, c.name]));

  return (
    <>
      <TableContainer component={Paper} sx={{ overflowX: "auto" }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ minWidth: 80 }}>الصورة</TableCell>
              <TableCell sx={{ minWidth: 160 }}>اسم الفئة</TableCell>
              <TableCell
                sx={{ minWidth: 160, display: { xs: "none", sm: "table-cell" } }}
              >
                الفئة الرئيسية
              </TableCell>
              <TableCell sx={{ minWidth: 120 }}>إجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {categories.map((cat) => (
              <TableRow key={cat._id} hover>
                <TableCell>
                  {cat.image ? (
                    <Avatar src={cat.image} alt={cat.name} />
                  ) : (
                    <Avatar>{cat.name?.[0] || "ف"}</Avatar>
                  )}
                </TableCell>
                <TableCell>{cat.name}</TableCell>
                <TableCell
                  sx={{ display: { xs: "none", sm: "table-cell" } }}
                >
                  {cat.parent ? idToName[cat.parent] ?? "—" : "—"}
                </TableCell>
                <TableCell>
                  <IconButton color="primary" onClick={() => setEditCat(cat)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton color="error" onClick={() => setDeleteCat(cat)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {categories.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} sx={{ color: "text.secondary" }}>
                  لا توجد فئات بعد.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* تعديل */}
      {editCat && (
        <EditCategoryDialog
          open={!!editCat}
          onClose={() => setEditCat(null)}
          onSaved={() => {
            setEditCat(null);
            onRefresh();
          }}
          merchantId={merchantId}
          category={editCat}
        />
      )}

      {/* حذف (يفترض وجود هذا المكون لديك) */}
      {deleteCat && (
        <DeleteCategoryDialog
          open={!!deleteCat}
          onClose={() => setDeleteCat(null)}
          onDeleted={() => {
            setDeleteCat(null);
            onRefresh();
          }}
          categoryName={deleteCat.name}
          categoryId={deleteCat._id}
          merchantId={merchantId}
          hasChildren={categories.some((c) => c.parent === deleteCat._id)}
        />
      )}
    </>
  );
}
