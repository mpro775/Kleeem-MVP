// src/pages/Categories/CategoriesPage.tsx
import { useState } from "react";
import { Box, Typography, Button, Stack } from "@mui/material";
import { useAuth } from "@/context/hooks";
import CategoryTree from "@/features/mechant/categories/ui/CategoryTree";
import AddCategoryDialog from "@/features/mechant/categories/ui/AddCategoryDialog";
import EditCategoryDialog from "@/features/mechant/categories/ui/EditCategoryDialog";
import DeleteCategoryDialog from "@/features/mechant/categories/ui/DeleteCategoryDialog";
import type { CategoryNode } from "@/features/mechant/categories/type";

export default function CategoriesPage() {
  const { user } = useAuth();
  const merchantId = user?.merchantId ?? "";

  const [refresh, setRefresh] = useState(0);
  const bump = () => setRefresh((r) => r + 1);

  // إضافة
  const [openAdd, setOpenAdd] = useState(false);
  const [parentForAdd, setParentForAdd] = useState<CategoryNode | null>(null);

  // تعديل
  const [editCat, setEditCat] = useState<CategoryNode | null>(null);

  // حذف
  const [delNode, setDelNode] = useState<CategoryNode | null>(null);
  const [openDel, setOpenDel] = useState(false);

  return (
    <Box
      sx={{ p: { xs: 2, md: 4 }, bgcolor: "#f9fafb", minHeight: "100vh" }}
      dir="rtl"
    >
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems={{ xs: "stretch", sm: "center" }}
        flexWrap="wrap"
        gap={1.5}
        mb={2}
      >
        <Typography variant="h5" fontWeight={800}>
          إدارة الفئات
        </Typography>
        <Button
          variant="contained"
          onClick={() => {
            setParentForAdd(null);
            setOpenAdd(true);
          }}
          sx={{ alignSelf: { xs: "flex-start", sm: "center" } }}
        >
          إضافة فئة رئيسية
        </Button>
      </Stack>

      {/* الشجرة */}
      <CategoryTree
        merchantId={merchantId}
        refresh={refresh}
        onAdd={(parent) => {
          setParentForAdd(parent ?? null);
          setOpenAdd(true);
        }}
        onEdit={(node) => setEditCat(node)}
        onDelete={(node) => {
          setDelNode(node);
          setOpenDel(true);
        }}
      />

      {/* Dialog الإضافة */}
      <AddCategoryDialog
        open={openAdd}
        onClose={() => setOpenAdd(false)}
        onAdd={() => {
          setOpenAdd(false);
          bump();
        }}
        merchantId={merchantId}
        defaultParentId={parentForAdd?._id ?? ""}
      />

      {/* Dialog التعديل */}
      {editCat && (
        <EditCategoryDialog
          open={!!editCat}
          onClose={() => setEditCat(null)}
          onSaved={() => {
            setEditCat(null);
            bump();
          }}
          merchantId={merchantId}
          category={editCat as CategoryNode}
        />
      )}

      {/* Dialog الحذف */}
      {delNode && (
        <DeleteCategoryDialog
          open={openDel}
          onClose={() => {
            setOpenDel(false);
            setDelNode(null);
          }}
          onDeleted={() => {
            setOpenDel(false);
            setDelNode(null);
            bump();
          }}
          categoryName={delNode.name}
          categoryId={delNode._id}
          merchantId={merchantId}
          hasChildren={(delNode.children?.length ?? 0) > 0}
        />
      )}
    </Box>
  );
}
