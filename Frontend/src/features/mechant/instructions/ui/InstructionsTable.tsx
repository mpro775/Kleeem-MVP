// src/features/mechant/instructions/components/InstructionsTable.tsx
import {
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  IconButton,
  Tooltip,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PauseCircleIcon from "@mui/icons-material/PauseCircle";
import type { Instruction } from "../type";

interface Props {
  instructions: Instruction[];
  onEdit: (instruction: Instruction) => void;
  onDelete: (id: string) => void;
  onToggle: (instruction: Instruction) => void;
}

export const InstructionsTable = ({
  instructions,
  onEdit,
  onDelete,
  onToggle,
}: Props) => (
  <Table size="small">
    <TableHead>
      <TableRow>
        <TableCell>النص</TableCell>
        <TableCell>النوع</TableCell>
        <TableCell>الحالة</TableCell>
        <TableCell align="center">إجراءات</TableCell>
      </TableRow>
    </TableHead>
    <TableBody>
      {instructions.map((row) => (
        <TableRow key={row._id} hover>
          <TableCell sx={{ maxWidth: 600 }}>{row.instruction}</TableCell>
          <TableCell>
            <Chip size="small" label={row.type} />
          </TableCell>
          <TableCell>
            {row.active ? (
              <Chip size="small" color="success" label="مفعّل" />
            ) : (
              <Chip size="small" color="default" label="غير مفعّل" />
            )}
          </TableCell>
          <TableCell align="center">
            <Tooltip title={row.active ? "تعطيل" : "تفعيل"}>
              <IconButton onClick={() => onToggle(row)}>
                {row.active ? <PauseCircleIcon /> : <CheckCircleIcon />}
              </IconButton>
            </Tooltip>
            <Tooltip title="تعديل">
              <IconButton onClick={() => onEdit(row)}>
                <EditIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="حذف">
              <IconButton onClick={() => onDelete(row._id)}>
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          </TableCell>
        </TableRow>
      ))}
      {instructions.length === 0 && (
        <TableRow>
          <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
            لا توجد توجيهات لعرضها.
          </TableCell>
        </TableRow>
      )}
    </TableBody>
  </Table>
);
