'use client';

/**
 * Customers Page
 * @description Main page for customers management
 */

import { useState } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Paper,
  useTheme,
  useMediaQuery,
  Pagination,
  Stack,
  Button,
  TextField,
  InputAdornment,
  Chip,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import { Search, Add, Person } from '@mui/icons-material';

// Types (temporary - will be moved to features later)
interface Customer {
  _id: string;
  name: string;
  emailLower?: string;
  phoneNormalized?: string;
  signupSource: 'otp' | 'order' | 'lead' | 'manual';
  tags: string[];
  isBlocked: boolean;
  lastSeenAt?: string;
  stats: {
    totalOrders: number;
    totalSpend: number;
    lastOrderId?: string;
  };
  createdAt: string;
}

export default function CustomersPage() {
  const t = useTranslations('customers');
  const theme = useTheme();
  const isSm = useMediaQuery(theme.breakpoints.down('sm'));

  // State Management
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [signupSource, setSignupSource] = useState('');
  const [isBlocked, setIsBlocked] = useState<boolean | ''>('');

  // Mock data - will be replaced with actual API call
  const mockCustomers: Customer[] = [
    {
      _id: '1',
      name: 'أحمد محمد',
      emailLower: 'ahmed@example.com',
      phoneNormalized: '+966501234567',
      signupSource: 'otp',
      tags: ['VIP', 'loyal'],
      isBlocked: false,
      lastSeenAt: '2024-01-15T10:30:00Z',
      stats: {
        totalOrders: 5,
        totalSpend: 1250.50,
        lastOrderId: 'order123',
      },
      createdAt: '2024-01-01T08:00:00Z',
    },
    {
      _id: '2',
      name: 'فاطمة علي',
      phoneNormalized: '+966507654321',
      signupSource: 'order',
      tags: ['new'],
      isBlocked: false,
      stats: {
        totalOrders: 1,
        totalSpend: 75.00,
      },
      createdAt: '2024-01-10T14:20:00Z',
    },
  ];

  const [customers] = useState(mockCustomers);
  const [isLoading] = useState(false);
  const [totalPages] = useState(1);

  const handleSearch = (query: string) => {
    setSearch(query);
    setPage(1);
  };

  const handleTagFilter = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
    setPage(1);
  };

  const availableTags = ['VIP', 'loyal', 'new', 'inactive'];

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ mb: 1, fontWeight: 'bold' }}>
          إدارة العملاء
        </Typography>
        <Typography variant="body2" color="text.secondary">
          إدارة ومراقبة عملاء متجرك
        </Typography>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Stack spacing={3}>
          {/* Search */}
          <TextField
            fullWidth
            placeholder="البحث بالاسم، البريد الإلكتروني، أو رقم الهاتف"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
          />

          {/* Tag Filters */}
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              التاجات:
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {availableTags.map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  onClick={() => handleTagFilter(tag)}
                  color={selectedTags.includes(tag) ? 'primary' : 'default'}
                  variant={selectedTags.includes(tag) ? 'filled' : 'outlined'}
                  size="small"
                />
              ))}
            </Stack>
          </Box>

          {/* Other Filters */}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Button
              variant={signupSource === 'otp' ? 'contained' : 'outlined'}
              onClick={() => setSignupSource(signupSource === 'otp' ? '' : 'otp')}
              size="small"
            >
              OTP
            </Button>
            <Button
              variant={signupSource === 'order' ? 'contained' : 'outlined'}
              onClick={() => setSignupSource(signupSource === 'order' ? '' : 'order')}
              size="small"
            >
              طلبات
            </Button>
            <Button
              variant={isBlocked === true ? 'contained' : 'outlined'}
              onClick={() => setIsBlocked(isBlocked === true ? '' : true)}
              color="error"
              size="small"
            >
              محظور
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {/* Add Customer Button */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          startIcon={<Add />}
          size="large"
        >
          إضافة عميل
        </Button>
      </Box>

      {/* Customers List */}
      <Paper sx={{ p: 0 }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {/* Desktop Table View */}
            {!isSm && (
              <Box sx={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${theme.palette.divider}` }}>
                      <th style={{ padding: '16px', textAlign: 'right', fontWeight: 'bold' }}>
                        العميل
                      </th>
                      <th style={{ padding: '16px', textAlign: 'right', fontWeight: 'bold' }}>
                        التواصل
                      </th>
                      <th style={{ padding: '16px', textAlign: 'right', fontWeight: 'bold' }}>
                        المصدر
                      </th>
                      <th style={{ padding: '16px', textAlign: 'right', fontWeight: 'bold' }}>
                        الطلبات
                      </th>
                      <th style={{ padding: '16px', textAlign: 'right', fontWeight: 'bold' }}>
                        التاجات
                      </th>
                      <th style={{ padding: '16px', textAlign: 'right', fontWeight: 'bold' }}>
                        الحالة
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map((customer) => (
                      <tr
                        key={customer._id}
                        style={{
                          borderBottom: `1px solid ${theme.palette.divider}`,
                          cursor: 'pointer',
                          '&:hover': { backgroundColor: theme.palette.action.hover }
                        }}
                        onClick={() => window.location.href = `/dashboard/customers/${customer._id}`}
                      >
                        <td style={{ padding: '16px' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Person sx={{ color: theme.palette.primary.main }} />
                            <Typography variant="body1" fontWeight="medium">
                              {customer.name}
                            </Typography>
                          </Box>
                        </td>
                        <td style={{ padding: '16px' }}>
                          <Stack spacing={0.5}>
                            {customer.emailLower && (
                              <Typography variant="body2" color="text.secondary">
                                {customer.emailLower}
                              </Typography>
                            )}
                            {customer.phoneNormalized && (
                              <Typography variant="body2" color="text.secondary">
                                {customer.phoneNormalized}
                              </Typography>
                            )}
                          </Stack>
                        </td>
                        <td style={{ padding: '16px' }}>
                          <Chip
                            label={customer.signupSource === 'otp' ? 'OTP' :
                                  customer.signupSource === 'order' ? 'طلب' :
                                  customer.signupSource === 'lead' ? 'Lead' : 'يدوي'}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        </td>
                        <td style={{ padding: '16px' }}>
                          <Typography variant="body2">
                            {customer.stats.totalOrders} طلب ({customer.stats.totalSpend} ريال)
                          </Typography>
                        </td>
                        <td style={{ padding: '16px' }}>
                          <Stack direction="row" spacing={0.5} flexWrap="wrap">
                            {customer.tags.map((tag) => (
                              <Chip key={tag} label={tag} size="small" variant="outlined" />
                            ))}
                          </Stack>
                        </td>
                        <td style={{ padding: '16px' }}>
                          <Chip
                            label={customer.isBlocked ? 'محظور' : 'نشط'}
                            size="small"
                            color={customer.isBlocked ? 'error' : 'success'}
                            variant="outlined"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Box>
            )}

            {/* Mobile Card View */}
            {isSm && (
              <Stack spacing={2} sx={{ p: 2 }}>
                {customers.map((customer) => (
                  <Paper
                    key={customer._id}
                    sx={{
                      p: 2,
                      cursor: 'pointer',
                      '&:hover': { backgroundColor: theme.palette.action.hover }
                    }}
                    onClick={() => window.location.href = `/dashboard/customers/${customer._id}`}
                  >
                    <Stack spacing={1}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Person sx={{ color: theme.palette.primary.main }} />
                        <Typography variant="h6">{customer.name}</Typography>
                      </Box>

                      <Stack spacing={0.5}>
                        {customer.emailLower && (
                          <Typography variant="body2" color="text.secondary">
                            {customer.emailLower}
                          </Typography>
                        )}
                        {customer.phoneNormalized && (
                          <Typography variant="body2" color="text.secondary">
                            {customer.phoneNormalized}
                          </Typography>
                        )}
                      </Stack>

                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Chip
                          label={customer.signupSource === 'otp' ? 'OTP' : 'طلب'}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                        <Typography variant="body2">
                          {customer.stats.totalOrders} طلب
                        </Typography>
                        {customer.isBlocked && (
                          <Chip
                            label="محظور"
                            size="small"
                            color="error"
                            variant="outlined"
                          />
                        )}
                      </Box>
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            )}
          </>
        )}
      </Paper>

      {/* Pagination */}
      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, value) => setPage(value)}
            color="primary"
          />
        </Box>
      )}
    </Box>
  );
}
