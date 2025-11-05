import MerchantLayout from '@/components/layouts/MerchantLayout';

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  
  return <MerchantLayout locale={locale}>{children}</MerchantLayout>;
}

