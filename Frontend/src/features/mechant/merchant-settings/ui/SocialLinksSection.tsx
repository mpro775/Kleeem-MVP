import { useState } from "react";
import { Box, Button } from "@mui/material";
import type {
  MerchantInfo,
  SocialLinks,
} from "@/features/mechant/merchant-settings/types";
import SocialLinksEditor from "@/features/mechant/merchant-settings/ui/SocialLinksEditor";

interface Props {
  initialData: MerchantInfo;
  onSave: (data: Partial<MerchantInfo>) => Promise<void>;
  loading?: boolean;
}

export default function SocialLinksSection({
  initialData,
  onSave,
  loading,
}: Props) {
  const [links, setLinks] = useState<SocialLinks>(
    initialData.socialLinks || {}
  );
  const [changed, setChanged] = useState(false);

  const handleChange = (newLinks: SocialLinks) => {
    setLinks(newLinks);
    setChanged(true);
  };

  const handleSave = async () => {
    await onSave({ socialLinks: links });
    setChanged(false);
  };

  return (
    <Box dir="rtl">
      <SocialLinksEditor socialLinks={links} onChange={handleChange} />
      <Button
        onClick={handleSave}
        disabled={loading || !changed}
        variant="contained"
        sx={{ mt: 3, fontWeight: "bold", minWidth: 160 }}
      >
        {loading ? "جاري الحفظ..." : "حفظ الروابط"}
      </Button>
    </Box>
  );
}
