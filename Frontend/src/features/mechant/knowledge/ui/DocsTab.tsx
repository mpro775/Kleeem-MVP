// src/features/knowledge/ui/DocsTab.tsx
import { useState } from "react";
import {
  Box, Table, TableHead, TableRow, TableCell, TableBody,
  IconButton, Button, LinearProgress, Typography,
} from "@mui/material";
import { CloudDownload as DownloadIcon, Delete as DeleteIcon } from "@mui/icons-material";
import { useSnackbar } from "notistack";
import { useDocs } from "../hooks";
import { MAX_FILES, MAX_SIZE_MB, ACCEPTED_EXTENSIONS } from "../types";

export default function DocsTab({ merchantId }: { merchantId: string }) {
  const { enqueueSnackbar } = useSnackbar();
  const { docs, loading, uploading, upload, remove } = useDocs(merchantId);
  const [fileInputKey, setFileInputKey] = useState(0);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setFileInputKey((k) => k + 1); // لإعادة تهيئة input
    if (!file) return;
    try {
      await upload(file);
      enqueueSnackbar("تم رفع الوثيقة بنجاح", { variant: "success" });
    } catch (err: any) {
      enqueueSnackbar(err?.message || "فشل رفع الوثيقة", { variant: "error" });
    }
  };

  const handleDelete = async (id: string) => {
    await remove(id);
    enqueueSnackbar("تم حذف الوثيقة بنجاح", { variant: "success" });
  };

  if (loading) return <LinearProgress />;

  return (
    <Box sx={{ p: 2 }}>
      <Button
        key={fileInputKey}
        variant="contained"
        component="label"
        disabled={uploading || docs.length >= MAX_FILES}
      >
        رفع وثيقة
        <input
          hidden
          type="file"
          onChange={handleUpload}
          accept={ACCEPTED_EXTENSIONS.map((e) => `.${e}`).join(",")}
        />
      </Button>
      <Typography variant="caption" color="text.secondary" ml={2}>
        يسمح فقط بـ {ACCEPTED_EXTENSIONS.join(", ").toUpperCase()} | الحجم الأقصى {MAX_SIZE_MB} ميجا | بحد أقصى {MAX_FILES} ملفات
      </Typography>

      <Table sx={{ mt: 2 }}>
        <TableHead>
          <TableRow>
            <TableCell>اسم الملف</TableCell>
            <TableCell>الحالة</TableCell>
            <TableCell>تاريخ الرفع</TableCell>
            <TableCell>إجراءات</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {docs.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} align="center">لا توجد وثائق بعد</TableCell>
            </TableRow>
          ) : (
            docs.map((d) => (
              <TableRow key={d._id}>
                <TableCell>{d.filename}</TableCell>
                <TableCell>{d.status}</TableCell>
                <TableCell>{new Date(d.createdAt).toLocaleString()}</TableCell>
                <TableCell>
                  {d.status === "completed" && (
                    <IconButton component="a" href={`/api/merchants/${merchantId}/documents/${d._id}`}>
                      <DownloadIcon />
                    </IconButton>
                  )}
                  <IconButton onClick={() => handleDelete(d._id)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </Box>
  );
}
