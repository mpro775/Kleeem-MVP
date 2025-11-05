'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  useMediaQuery,
  useTheme,
  Avatar,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard,
  Chat,
  Inventory,
  Category,
  ShoppingCart,
  People,
  Psychology,
  Book,
  Settings,
  Brightness4,
  Brightness7,
  Language,
  Logout,
  Analytics,
} from '@mui/icons-material';
import { useTranslations } from 'next-intl';
import { useThemeContext } from '@/providers/ThemeProvider';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

const drawerWidth = 280;

interface MerchantLayoutProps {
  children: React.ReactNode;
  locale: string;
}

export default function MerchantLayout({
  children,
  locale,
}: MerchantLayoutProps) {
  const theme = useTheme();
  const t = useTranslations('dashboard');
  const router = useRouter();
  const pathname = usePathname();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { mode, toggleTheme } = useThemeContext();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setAnchorEl(null);
  };

  const menuItems = [
    { text: t('menu.dashboard'), icon: <Dashboard />, href: `/${locale}/dashboard` },
    { text: t('menu.conversations'), icon: <Chat />, href: `/${locale}/dashboard/conversations` },
    { text: t('menu.products'), icon: <Inventory />, href: `/${locale}/dashboard/products` },
    { text: t('menu.categories'), icon: <Category />, href: `/${locale}/dashboard/categories` },
    { text: t('menu.orders'), icon: <ShoppingCart />, href: `/${locale}/dashboard/orders` },
    { text: t('menu.leads'), icon: <People />, href: `/${locale}/dashboard/leads` },
    { text: t('menu.prompt'), icon: <Psychology />, href: `/${locale}/dashboard/prompt` },
    { text: t('menu.knowledge'), icon: <Book />, href: `/${locale}/dashboard/knowledge` },
    { text: t('menu.analytics'), icon: <Analytics />, href: `/${locale}/dashboard/analytics` },
    { text: t('menu.settings'), icon: <Settings />, href: `/${locale}/dashboard/settings` },
  ];

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Toolbar>
        <Typography
          variant="h5"
          sx={{
            fontWeight: 800,
            background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          كليم
        </Typography>
      </Toolbar>
      <Divider />
      <List sx={{ flex: 1, py: 2 }}>
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <ListItem key={item.text} disablePadding sx={{ px: 2, mb: 0.5 }}>
              <ListItemButton
                component={Link}
                href={item.href}
                selected={isActive}
                sx={{
                  borderRadius: 2,
                  '&.Mui-selected': {
                    background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    '& .MuiListItemIcon-root': {
                      color: 'white',
                    },
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          background: theme.palette.mode === 'light' ? 'white' : theme.palette.background.paper,
          color: theme.palette.text.primary,
          boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {t('title')}
          </Typography>
          <IconButton color="inherit" onClick={toggleTheme}>
            {mode === 'light' ? <Brightness4 /> : <Brightness7 />}
          </IconButton>
          <IconButton
            color="inherit"
            onClick={() => {
              const newLocale = locale === 'ar' ? 'en' : 'ar';
              router.push(pathname.replace(`/${locale}`, `/${newLocale}`));
            }}
          >
            <Language />
          </IconButton>
          <IconButton onClick={handleUserMenuOpen}>
            <Avatar sx={{ width: 32, height: 32 }}>M</Avatar>
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleUserMenuClose}
          >
            <MenuItem onClick={handleUserMenuClose}>
              <Logout sx={{ mr: 1 }} /> Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          mt: 8,
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

