// src/components/categories/CategoryTree.tsx
import { useEffect, useMemo, useState, type JSX } from "react";
import {
  Box, Stack, TextField, IconButton, Avatar, Typography,
  CircularProgress, Tooltip, Alert,
} from "@mui/material";

// ✅ استخدم MUI X Tree View
import { SimpleTreeView } from "@mui/x-tree-view/SimpleTreeView";
import { TreeItem } from "@mui/x-tree-view/TreeItem";

import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";

import { getCategoriesTree } from "../api";
import type { CategoryNode } from "../type";

function NodeLabel({
  node,
  onAdd,
  onEdit,
  onDelete,
}: {
  node: CategoryNode;
  onAdd: (n: CategoryNode) => void;
  onEdit: (n: CategoryNode) => void;
  onDelete: (n: CategoryNode) => void;
}) {
  const stop = (e: React.MouseEvent) => { e.stopPropagation(); e.preventDefault(); };
  return (
    <Stack direction="row" alignItems="center" spacing={1}>
      <Avatar src={node.image} sx={{ width: 28, height: 28 }}>
        {node.name?.[0]}
      </Avatar>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {node.name}
      </Typography>
      <Stack direction="row" spacing={0.5} ml={1}>
        <Tooltip title="إضافة ابن">
          <IconButton size="small" onMouseDown={stop} onClick={() => onAdd(node)}>
            <AddIcon fontSize="inherit" />
          </IconButton>
        </Tooltip>
        <Tooltip title="تعديل">
          <IconButton size="small" onMouseDown={stop} onClick={() => onEdit(node)}>
            <EditIcon fontSize="inherit" />
          </IconButton>
        </Tooltip>
        <Tooltip title="حذف">
          <IconButton size="small" color="error" onMouseDown={stop} onClick={() => onDelete(node)}>
            <DeleteIcon fontSize="inherit" />
          </IconButton>
        </Tooltip>
      </Stack>
    </Stack>
  );
}

function renderNodes(
  nodes: CategoryNode[],
  handlers: { onAdd: any; onEdit: any; onDelete: any }
): JSX.Element[] {
  return nodes.map((n) => (
    <TreeItem
      key={n._id}
      itemId={String(n._id)}
      label={<NodeLabel node={n} {...handlers} />}
    >
      {n.children?.length ? renderNodes(n.children, handlers) : null}
    </TreeItem>
  ));
}

export default function CategoryTree({
  merchantId,
  refresh = 0,
  onAdd,
  onEdit,
  onDelete,
}: {
  merchantId: string;
  refresh?: number;
  onAdd: (parent?: CategoryNode) => void;
  onEdit: (node: CategoryNode) => void;
  onDelete: (node: CategoryNode) => void;
}) {
  const [tree, setTree] = useState<CategoryNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    if (!merchantId) return;
    setLoading(true);
    setError(null);
    getCategoriesTree(merchantId)
      .then((data) => setTree(Array.isArray(data) ? data : []))
      .catch((e) => setError(e?.response?.data?.message || "فشل جلب الشجرة"))
      .finally(() => setLoading(false));
  }, [merchantId, refresh]);

  const filteredTree = useMemo(() => {
    if (!filter.trim()) return tree;
    const q = filter.toLowerCase();
    const dive = (n: CategoryNode): CategoryNode | null => {
      const hit =
        n.name.toLowerCase().includes(q) ||
        n.slug.toLowerCase().includes(q) ||
        n.path.toLowerCase().includes(q);
      const kids = (n.children ?? []).map(dive).filter(Boolean) as CategoryNode[];
      return (hit || kids.length) ? { ...n, children: kids } : null;
    };
    return tree.map(dive).filter(Boolean) as CategoryNode[];
  }, [tree, filter]);

  const handlers = { onAdd, onEdit, onDelete };

  return (
    <Box>
      <TextField
        placeholder="ابحث في الفئات..."
        size="small"
        fullWidth
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        sx={{ mb: 1.5 }}
      />

      {error ? (
        <Alert severity="error" sx={{ my: 2 }}>{error}</Alert>
      ) : loading ? (
        <Stack alignItems="center" py={3}><CircularProgress /></Stack>
      ) : filteredTree.length === 0 ? (
        <Typography sx={{ py: 2 }}>لا توجد فئات بعد.</Typography>
      ) : (
        <SimpleTreeView
          slots={{ expandIcon: ChevronRightIcon, collapseIcon: ExpandMoreIcon }}
        >
          {renderNodes(filteredTree, handlers)}
        </SimpleTreeView>
      )}
    </Box>
  );
}
