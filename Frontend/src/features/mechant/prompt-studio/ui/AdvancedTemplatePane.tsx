// src/components/prompet/AdvancedTemplatePane.tsx

import { Paper, Box, Typography, IconButton } from "@mui/material";
import { styled } from "@mui/system";
import { useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { markdown } from "@codemirror/lang-markdown";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import FullscreenExitIcon from "@mui/icons-material/FullscreenExit";

const Container = styled(Paper)({
  display: "flex",
  flexDirection: "column",
  height: "100%",
  overflow: "hidden",
  minWidth: 0,
});

const Header = styled(Box)({
  display: "flex",
  justifyContent: "space-between",
  padding: 8,
});

const EditorWrapper = styled(Box)({
  flex: 1,
  overflow: "hidden",
  "& .cm-theme": { height: "100%" },
});

export function AdvancedTemplatePane({
  template,
  onChange,
  // onGenerateAI,
}: {
  template: string;
  onChange: (v: string) => void;
  onGenerateAI?: () => void;
}) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  return (
    <Container
      sx={{
        position: isFullscreen ? "fixed" : "relative",
        top: isFullscreen ? 0 : undefined,
        left: isFullscreen ? 0 : undefined,
        width: isFullscreen ? "100vw" : "100%",
        height: isFullscreen ? "100vh" : "100%",
        zIndex: isFullscreen ? 1300 : "auto",
      }}
    >
      <Header>
        <Typography variant="h6">محرر متقدم</Typography>
        <Box>
       
          <IconButton onClick={() => setIsFullscreen((f) => !f)}>
            {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
          </IconButton>
        </Box>
      </Header>

      <EditorWrapper>
        <CodeMirror
          value={template}
          height="100%"
          extensions={[markdown()]}
          onChange={(value) => onChange(value)}
          basicSetup={{
            lineNumbers: true,
            highlightActiveLine: true,
            bracketMatching: true,
          }}
          theme="light"
          style={{ fontSize: 16, lineHeight: "24px" }}
        />
      </EditorWrapper>
    </Container>
  );
}
