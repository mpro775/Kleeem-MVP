// src/pages/merchant/ConversationsPage.tsx
import { useAuth } from "@/context/hooks";
import ChatWorkspace from "@/features/mechant/Conversations/ChatWorkspace";

export default function ConversationsPage() {
  const { user } = useAuth();
  // استخدام ObjectId صالح للديمو إذا لم يكن هناك merchantId
  const merchantId = user?.merchantId ?? "507f1f77bcf86cd799439011";
  return <ChatWorkspace merchantId={merchantId} />;
}
