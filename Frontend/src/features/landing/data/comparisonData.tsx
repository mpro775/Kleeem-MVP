// src/components/landing/comparisonData.ts
import React from 'react';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import RecommendIcon from '@mui/icons-material/Recommend';
import AppsIcon from '@mui/icons-material/Apps';
import DashboardIcon from '@mui/icons-material/Dashboard';

export interface ComparisonItemData {
  icon: React.ReactNode;
  text: string;
}

export const beforeItems: ComparisonItemData[] = [
  { icon: <AccessTimeIcon />, text: "تأخير في الردود" },
  { icon: <ChatBubbleOutlineIcon />, text: "إدارة يدوية للطلبات" },
  { icon: <RecommendIcon />, text: "لا توجد توصيات للعملاء" },
  { icon: <AppsIcon />, text: "ردود غير موحدة" },
  { icon: <DashboardIcon />, text: "عدم توفر لوحة تحكم" },
];

export const afterItems: ComparisonItemData[] = [
  { icon: <AccessTimeIcon />, text: "ردود فورية عبر المنصات" },
  { icon: <ChatBubbleOutlineIcon />, text: "إدارة تلقائية ذكية" },
  { icon: <RecommendIcon />, text: "توصية العملاء" },
  { icon: <AppsIcon />, text: "ردود ذكية موحدة ومخصصة" },
  { icon: <DashboardIcon />, text: "لوحة تحكم مخصصة لكل تاجر" },
];