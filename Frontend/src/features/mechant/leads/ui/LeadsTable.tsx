// src/features/leads/ui/LeadsTable.tsx
import {
  Box,
  Stack,
  Button,
  Tooltip,
  IconButton,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import type { Lead, LeadField } from "../types";
import { useState } from "react";
  
function cellValue(lead: Lead, field: LeadField): string {
  const src = lead.data || {};
  // للحقل المحدّد (غير custom) استخدم المفتاح المباشر
  if (field.fieldType !== "custom") {
    const v = (src as any)[field.fieldType];
    if (typeof v === "string" || typeof v === "number") return String(v);
  }
  // للحقل custom جرّب label ثم key
  const try1 = (src as any)[field.label];
  if (typeof try1 === "string" || typeof try1 === "number") return String(try1);
  const try2 = (src as any)[field.key];
  if (typeof try2 === "string" || typeof try2 === "number") return String(try2);
  return "-";
}

function getPhone(lead: Lead): string {
  const p =
    (lead.data as any)?.phone ??
    (lead as any).phoneNormalized ?? // في حال أضفتها بالباك
    "";
  return typeof p === "string" ? p : String(p ?? "");
}

function csvEscape(v: unknown): string {
  const s = v == null ? "" : String(v);
  // لف بين " واقلب علامات " المكررة
  return `"${s.replace(/"/g, '""')}"`;
}

function exportLeadsToCSV(leads: Lead[], fields: LeadField[]) {
  const header = [
    "Session ID",
    ...fields.map((f) => f.label || f.fieldType),
    "رقم الجوال",
    "المصدر",
    "التاريخ",
  ];
  const rows = leads.map((lead) => {
    const phone = getPhone(lead);
    const cols = [
      lead.sessionId,
      ...fields.map((f) => cellValue(lead, f)),
      phone,
      lead.source ?? "",
      new Date(lead.createdAt).toLocaleString(),
    ];
    return cols.map(csvEscape).join(",");
  });
  const csv = [header.map(csvEscape).join(","), ...rows].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `leads_${new Date().toISOString().slice(0, 19)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // fallback
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  }
}

export default function LeadsTable({
  leads,
  fields,
}: {
  leads: Lead[];
  fields: LeadField[];
}) {
  // Pagination بسيط عميل-سايد
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const pagedLeads =
    rowsPerPage > 0
      ? leads.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
      : leads;

  return (
    <Box>
      {/* شريط أدوات أعلى الجدول */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
        <Box />
        <Button
          startIcon={<FileDownloadIcon />}
          onClick={() => exportLeadsToCSV(leads, fields)}
        >
          تصدير CSV
        </Button>
      </Stack>

      <TableContainer>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>Session ID</TableCell>
              {fields.map((f) => (
                <TableCell key={f.key}>{f.label || f.fieldType}</TableCell>
              ))}
              <TableCell>رقم الجوال</TableCell>
              <TableCell>المصدر</TableCell>
              <TableCell>التاريخ</TableCell>
              <TableCell>إجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pagedLeads.map((lead) => {
              const phone = getPhone(lead);
              const waLink = phone ? `https://wa.me/${encodeURIComponent(phone)}` : undefined;

              return (
                <TableRow key={lead._id} hover>
                  <TableCell>{lead.sessionId}</TableCell>

                  {fields.map((f) => (
                    <TableCell key={f.key}>{cellValue(lead, f)}</TableCell>
                  ))}

                  <TableCell>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Box component="span">{phone || "-"}</Box>
                      {phone ? (
                        <Tooltip title="نسخ">
                          <IconButton size="small" onClick={() => copy(phone)}>
                            <ContentCopyIcon fontSize="inherit" />
                          </IconButton>
                        </Tooltip>
                      ) : null}
                    </Stack>
                  </TableCell>

                  <TableCell>
                    {lead.source ? (
                      <Chip size="small" label={lead.source} />
                    ) : (
                      "-"
                    )}
                  </TableCell>

                  <TableCell>
                    {new Date(lead.createdAt).toLocaleString()}
                  </TableCell>

                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() =>
                          window.open(
                            `/admin/orders?phone=${encodeURIComponent(phone || "")}`,
                            "_self"
                          )
                        }
                        disabled={!phone}
                      >
                        عرض الطلبات
                      </Button>
                      <Tooltip title="واتساب">
                        <span>
                          <IconButton
                            size="small"
                            color="success"
                            component="a"
                            href={waLink || ""}
                            target="_blank"
                            disabled={!phone}
                          >
                            <WhatsAppIcon />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              );
            })}
            {pagedLeads.length === 0 && (
              <TableRow>
                <TableCell colSpan={5 + fields.length} align="center">
                  لا توجد بيانات.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      <TablePagination
        component="div"
        count={leads.length}
        page={page}
        onPageChange={(_, p) => setPage(p)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(parseInt(e.target.value, 10));
          setPage(0);
        }}
        labelRowsPerPage="عدد الصفوف"
        rowsPerPageOptions={[5, 10, 25, 50, { label: "الكل", value: -1 }]}
      />
    </Box>
  );
}
