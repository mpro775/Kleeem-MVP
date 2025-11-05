'use client';

import {
  Box,
  Paper,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Stack,
  Chip,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import type { FaqItem } from '../types';

interface FaqsListProps {
  faqs: FaqItem[];
  onEdit?: (faq: FaqItem) => void;
  onDelete?: (faqId: string) => void;
}

export function FaqsList({ faqs, onEdit, onDelete }: FaqsListProps) {
  if (faqs.length === 0) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 4,
          textAlign: 'center',
          border: 1,
          borderColor: 'divider',
        }}
      >
        <Typography variant="body2" color="text.secondary">
          لا توجد أسئلة شائعة بعد
        </Typography>
      </Paper>
    );
  }

  return (
    <Box>
      {faqs.map((faq) => (
        <Accordion
          key={faq._id}
          elevation={0}
          sx={{
            mb: 1,
            border: 1,
            borderColor: 'divider',
            '&:before': { display: 'none' },
          }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{ width: '100%' }}
            >
              <Typography sx={{ flex: 1 }}>{faq.question}</Typography>
              {!faq.enabled && (
                <Chip label="معطل" size="small" color="default" />
              )}
            </Stack>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={2}>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {faq.answer}
              </Typography>
              {faq.tags && faq.tags.length > 0 && (
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {faq.tags.map((tag) => (
                    <Chip key={tag} label={tag} size="small" />
                  ))}
                </Stack>
              )}
              <Stack direction="row" spacing={1}>
                {onEdit && (
                  <IconButton
                    size="small"
                    onClick={() => onEdit(faq)}
                    color="primary"
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                )}
                {onDelete && (
                  <IconButton
                    size="small"
                    onClick={() => onDelete(faq._id)}
                    color="error"
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                )}
              </Stack>
            </Stack>
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );
}

