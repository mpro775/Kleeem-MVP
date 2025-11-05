'use client';

import { Card, styled } from "@mui/material";

const SectionCard = styled(Card)(() => ({
  borderRadius: 12,
  boxShadow: "0 4px 20px rgba(0,0,0,.05)",
  transition: "all .3s ease",
  "&:hover": { boxShadow: "0 8px 30px rgba(0,0,0,.1)" },
}));

export default SectionCard;
