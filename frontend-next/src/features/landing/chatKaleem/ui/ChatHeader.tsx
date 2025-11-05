import { Avatar, Box, Typography } from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import { KLEEM_COLORS } from '../constants';

export default function ChatHeader() {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', p: 2, borderBottom: '1px solid #f0f0f0' }}>
      <Avatar sx={{ bgcolor: KLEEM_COLORS.primary, width: 40, height: 40 }}>
        <SmartToyIcon />
      </Avatar>
      <Box sx={{ ml: 1.5 }}>
        <Typography variant="subtitle1" fontWeight="bold">
          كَلِيم
        </Typography>
        <Typography variant="caption" sx={{ color: 'success.main', display: 'flex', alignItems: 'center' }}>
          <Box sx={{ width: 6, height: 6, bgcolor: 'success.main', borderRadius: '50%', mr: 0.5 }} />
          Online
        </Typography>
      </Box>
    </Box>
  );
}