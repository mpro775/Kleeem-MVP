'use client';

import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Avatar,
  Stack,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import BlockIcon from '@mui/icons-material/Block';
import { useTranslations } from 'next-intl';

export default function AdminUsersPage() {
  const t = useTranslations('admin');

  const users = [
    {
      _id: '1',
      name: 'Ahmed Ali',
      email: 'ahmed@example.com',
      role: 'merchant' as const,
      isActive: true,
      lastLogin: '2025-11-05',
    },
    {
      _id: '2',
      name: 'Sara Mohammed',
      email: 'sara@example.com',
      role: 'merchant' as const,
      isActive: true,
      lastLogin: '2025-11-04',
    },
    {
      _id: '3',
      name: 'Admin User',
      email: 'admin@kaleem.com',
      role: 'admin' as const,
      isActive: true,
      lastLogin: '2025-11-05',
    },
  ];

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'error';
      case 'merchant':
        return 'primary';
      default:
        return 'default';
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Typography variant="h5" fontWeight="bold" mb={3}>
        {t('users.title')}
      </Typography>

      <Paper elevation={0} sx={{ border: 1, borderColor: 'divider' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{t('users.name')}</TableCell>
              <TableCell>{t('users.email')}</TableCell>
              <TableCell>{t('users.role')}</TableCell>
              <TableCell>{t('users.status')}</TableCell>
              <TableCell>{t('users.lastLogin')}</TableCell>
              <TableCell align="right">{t('users.actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user._id} hover>
                <TableCell>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Avatar sx={{ width: 32, height: 32 }}>
                      {user.name.charAt(0)}
                    </Avatar>
                    <span>{user.name}</span>
                  </Stack>
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Chip label={user.role} color={getRoleColor(user.role)} size="small" />
                </TableCell>
                <TableCell>
                  <Chip
                    label={user.isActive ? t('users.active') : t('users.inactive')}
                    color={user.isActive ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>{user.lastLogin}</TableCell>
                <TableCell align="right">
                  <IconButton size="small" color="primary">
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" color="error">
                    <BlockIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}

