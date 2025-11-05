'use client';

import { render, screen, waitFor } from "@testing-library/react";
import PreviewPane from "./PreviewPane";

test("writes embed tag into iframe", async () => {
  render(<PreviewPane embedTag="<div id='test'>Hi</div>" />);
  const iframe = screen.getByTitle("Chat Preview") as HTMLIFrameElement;
  await waitFor(() =>
    expect(iframe.contentDocument?.body.innerHTML).toContain("test")
  );
});
