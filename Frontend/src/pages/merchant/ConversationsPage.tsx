// src/pages/merchant/ConversationsPage.tsx
import { useAuth } from "@/context/AuthContext";
import ChatWorkspace from "@/features/mechant/Conversations/ChatWorkspace";

export default function ConversationsPage() {
  const { user } = useAuth();
  const merchantId = user?.merchantId ?? "";
  return <ChatWorkspace merchantId={merchantId} />;
}
