import React from "react";
import { renderWithProviders } from "../../../test/test-utils";
import { screen } from "@testing-library/react";
import ChatBubble from "./ChatBubble";
import type { ChatMessage } from "../types";

test("يعرض نص الرسالة", () => {
  const msg: ChatMessage = { id: "1", from: "user", text: "مرحبا" };
  renderWithProviders(<ChatBubble msg={msg} />);
  expect(screen.getByText("مرحبا")).toBeInTheDocument();
});
