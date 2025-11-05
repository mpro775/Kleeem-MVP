'use client';

import { useRef, useState, useEffect, useMemo } from 'react';
import {
  Box,
  TextField,
  IconButton,
  InputAdornment,
  Tooltip,
  CircularProgress,
  Typography,
  Fade,
  useTheme,
  Paper,
  Chip,
  Avatar,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import SendIcon from '@mui/icons-material/Send';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import InsertEmoticonIcon from '@mui/icons-material/InsertEmoticon';
import MicIcon from '@mui/icons-material/Mic';
import StopIcon from '@mui/icons-material/Stop';
import CloseIcon from '@mui/icons-material/Close';
import ImageRoundedIcon from '@mui/icons-material/ImageRounded';
import PictureAsPdfRoundedIcon from '@mui/icons-material/PictureAsPdfRounded';
import InsertDriveFileRoundedIcon from '@mui/icons-material/InsertDriveFileRounded';
import GraphicEqRoundedIcon from '@mui/icons-material/GraphicEqRounded';

interface Props {
  onSend: (payload: {
    text?: string;
    file?: File | null;
    audio?: Blob | null;
  }) => void;
  disabled?: boolean;
  disabledReason?: string;
}

const MAX_LEN = 1200;
const MAX_FILE_MB = 5;

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  const kb = n / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function isImage(file: File) {
  return file.type.startsWith('image/');
}
function isPdf(file: File) {
  return file.type === 'application/pdf';
}

const ChatInput: React.FC<Props> = ({ onSend, disabled, disabledReason }) => {
  const theme = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [audio, setAudio] = useState<Blob | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recorder, setRecorder] = useState<MediaRecorder | null>(null);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [audioDuration, setAudioDuration] = useState<number | null>(null);
  const isDisabled = !!disabled;

  const nearLimit = text.length >= MAX_LEN - 40;
  const canInteract = !isRecording && !loadingAudio && !isDisabled;

  const counterColor = useMemo(() => {
    if (text.length === 0) return 'text.secondary';
    if (nearLimit) return 'warning.main';
    return 'text.secondary';
  }, [text.length, nearLimit]);

  function resetStates() {
    setText('');
    setFile(null);
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    setAudio(null);
    setAudioDuration(null);
    setShowEmoji(false);
    setError(null);
  }

  function handleSend() {
    if (isDisabled) return;
    if (!text.trim() && !file && !audio) return;
    onSend({ text: text.trim() || undefined, file, audio });
    resetStates();
    setTimeout(() => textRef.current?.focus(), 0);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const chosenFile = e.target.files?.[0];
    if (chosenFile) {
      if (chosenFile.size > MAX_FILE_MB * 1024 * 1024) {
        setError(
          `حجم الملف كبير جداً. الرجاء اختيار ملف أقل من ${MAX_FILE_MB} ميجابايت`
        );
        e.target.value = '';
        return;
      }
      setFile(chosenFile);
      setAudio(null);
      setText('');
      setError(null);
    }
  }
  const handleRemoveFile = () => setFile(null);

  async function handleStartRecord() {
    if (isDisabled) return;
    setError(null);
    setLoadingAudio(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      mediaRecorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudio(blob);
        setIsRecording(false);
        setLoadingAudio(false);

        try {
          const url = URL.createObjectURL(blob);
          audioUrlRef.current = url;
          const a = new Audio(url);
          await new Promise<void>((res, rej) => {
            a.onloadedmetadata = () => {
              setAudioDuration(a.duration || null);
              res();
            };
            a.onerror = () => rej(new Error('audio metadata error'));
          });
        } catch {
          // Ignore
        }
      };
      mediaRecorder.start();
      setIsRecording(true);
      setRecorder(mediaRecorder);
    } catch {
      setError('تعذر بدء التسجيل الصوتي. تحقق من إعدادات الميكروفون.');
      setLoadingAudio(false);
    }
  }
  const handleStopRecord = () => {
    recorder?.stop();
    setRecorder(null);
    setIsRecording(false);
  };
  const handleRemoveAudio = () => {
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    audioUrlRef.current = null;
    setAudio(null);
    setAudioDuration(null);
  };

  // TODO: Add EmojiPicker when emoji-picker-react is installed
  // const handleEmojiClick = (emojiData: any) => {
  //   setText((t) => (t + emojiData.emoji).slice(0, MAX_LEN));
  // };

  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      if (!canInteract || file || audio) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const it of items) {
        if (it.kind === 'file') {
          const f = it.getAsFile();
          if (f) {
            if (f.size > MAX_FILE_MB * 1024 * 1024) {
              setError(`الصورة كبيرة. الحد ${MAX_FILE_MB}MB`);
              return;
            }
            setFile(f);
            setText('');
            setAudio(null);
            setError(null);
            break;
          }
        }
      }
    }
    document.addEventListener('paste', onPaste as any);
    return () => document.removeEventListener('paste', onPaste as any);
  }, [canInteract, file, audio]);

  useEffect(() => {
    function preventDefaults(e: Event) {
      e.preventDefault();
      e.stopPropagation();
    }
    const onDragEnter = (e: DragEvent) => {
      preventDefaults(e);
      if (!canInteract || file || audio) return;
      setDragOver(true);
    };
    const onDragOver = (e: DragEvent) => {
      preventDefaults(e);
      if (!canInteract || file || audio) return;
      setDragOver(true);
    };
    const onDragLeave = (e: DragEvent) => {
      preventDefaults(e);
      setDragOver(false);
    };
    const onDrop = (e: DragEvent) => {
      preventDefaults(e);
      setDragOver(false);
      if (!canInteract || file || audio) return;
      const f = e.dataTransfer?.files?.[0];
      if (!f) return;
      if (f.size > MAX_FILE_MB * 1024 * 1024) {
        setError(`حجم الملف كبير جداً. الحد ${MAX_FILE_MB}MB`);
        return;
      }
      setFile(f);
      setAudio(null);
      setText('');
      setError(null);
    };

    window.addEventListener('dragenter', onDragEnter);
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragenter', onDragEnter);
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('drop', onDrop);
    };
  }, [canInteract, file, audio]);

  useEffect(() => {
    return () => {
      recorder?.stop();
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const attachmentIcon = useMemo(() => {
    if (!file) return null;
    if (isImage(file)) return <ImageRoundedIcon />;
    if (isPdf(file)) return <PictureAsPdfRoundedIcon />;
    return <InsertDriveFileRoundedIcon />;
  }, [file]);

  return (
    <Box
      component="section"
      sx={{
        position: 'sticky',
        bottom: 0,
        zIndex: (t) => t.zIndex.appBar,
        borderTop: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
        backdropFilter: 'blur(10px)',
        background: `linear-gradient(180deg,
          ${alpha(
            theme.palette.background.paper,
            theme.palette.mode === 'dark' ? 0.3 : 0.65
          )} 0%,
          ${alpha(
            theme.palette.background.paper,
            theme.palette.mode === 'dark' ? 0.24 : 0.5
          )} 100%
        )`,
        boxShadow: `0 -8px 22px ${alpha(theme.palette.primary.main, 0.06)}`,
        paddingBottom: 'max(env(safe-area-inset-bottom), 0px)',
      }}
    >
      {isDisabled && disabledReason && (
        <Paper
          elevation={0}
          sx={{
            mb: 1,
            p: 1,
            borderRadius: 2,
            border: `1px solid ${alpha(theme.palette.warning.main, 0.35)}`,
            backgroundColor: alpha(theme.palette.warning.main, 0.08),
          }}
        >
          <Typography variant="body2" color="warning.main">
            {disabledReason}
          </Typography>
        </Paper>
      )}

      <Fade in={dragOver}>
        <Box
          sx={{
            position: 'fixed',
            inset: 0,
            background: alpha(theme.palette.primary.main, 0.08),
            backdropFilter: 'blur(2px)',
            border: `2px dashed ${alpha(theme.palette.primary.main, 0.4)}`,
            pointerEvents: 'none',
          }}
        />
      </Fade>

      <Box sx={{ p: 1.25, pt: 1 }}>
        <Fade in={!!error}>
          <Typography
            color="error"
            variant="body2"
            sx={{ mb: 0.5, px: 0.5, userSelect: 'text' }}
          >
            {error}
          </Typography>
        </Fade>

        {(file || audio) && (
          <Paper
            elevation={0}
            sx={{
              mb: 1,
              p: 1,
              borderRadius: 2,
              border: `1px solid ${alpha(theme.palette.primary.main, 0.25)}`,
              backgroundColor: alpha(theme.palette.primary.main, 0.06),
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              overflow: 'hidden',
            }}
          >
            {file && (
              <>
                <Avatar
                  variant="rounded"
                  sx={{
                    width: 36,
                    height: 36,
                    bgcolor: alpha(theme.palette.primary.main, 0.12),
                    color: theme.palette.primary.main,
                  }}
                >
                  {attachmentIcon}
                </Avatar>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography
                    noWrap
                    variant="body2"
                    sx={{ fontWeight: 600 }}
                    title={file.name}
                  >
                    {file.name}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: 'block' }}
                  >
                    {file.type || 'application/octet-stream'} •{' '}
                    {formatBytes(file.size)}
                  </Typography>
                </Box>
                <IconButton
                  size="small"
                  onClick={handleRemoveFile}
                  aria-label="حذف الملف"
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </>
            )}

            {audio && (
              <>
                <Avatar
                  variant="rounded"
                  sx={{
                    width: 36,
                    height: 36,
                    bgcolor: alpha(theme.palette.success.main, 0.12),
                    color: theme.palette.success.main,
                  }}
                >
                  <GraphicEqRoundedIcon />
                </Avatar>
                <audio
                  controls
                  src={
                    audioUrlRef.current
                      ? audioUrlRef.current
                      : (audioUrlRef.current = URL.createObjectURL(audio))
                  }
                  style={{ maxWidth: 220 }}
                  preload="metadata"
                />
                <Chip
                  size="small"
                  label={
                    audioDuration
                      ? `${Math.floor(audioDuration / 60)
                          .toString()
                          .padStart(2, '0')}:${Math.floor(audioDuration % 60)
                          .toString()
                          .padStart(2, '0')}`
                      : '...'
                  }
                  sx={{
                    borderColor: alpha(theme.palette.success.main, 0.35),
                    backgroundColor: alpha(theme.palette.success.main, 0.08),
                  }}
                  variant="outlined"
                />
                <IconButton
                  size="small"
                  onClick={handleRemoveAudio}
                  aria-label="حذف التسجيل الصوتي"
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </>
            )}
          </Paper>
        )}

        <Box display="flex" alignItems="center" gap={1}>
          <input
            ref={fileInputRef}
            type="file"
            style={{ display: 'none' }}
            onChange={handleFileChange}
            accept="image/*,video/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          />

          <Tooltip title="إرفاق ملف">
            <span>
              <IconButton
                onClick={() => fileInputRef.current?.click()}
                disabled={
                  !!file || !!audio || isRecording || loadingAudio || isDisabled
                }
                size="medium"
                color={file || audio ? 'primary' : 'default'}
                aria-label="إرفاق ملف"
                sx={{
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.25)}`,
                  backgroundColor: alpha(theme.palette.primary.main, 0.06),
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.primary.main, 0.1),
                  },
                }}
              >
                <AttachFileIcon />
              </IconButton>
            </span>
          </Tooltip>

          <Tooltip title="إدراج إيموجي (قريباً)">
            <IconButton
              onClick={() => setShowEmoji((s) => !s)}
              disabled={true}
              size="medium"
              aria-label="إدراج إيموجي"
              color={showEmoji ? 'primary' : 'default'}
              sx={{
                border: `1px solid ${alpha(theme.palette.primary.main, 0.18)}`,
                backgroundColor: showEmoji
                  ? alpha(theme.palette.primary.main, 0.12)
                  : 'transparent',
              }}
            >
              <InsertEmoticonIcon />
            </IconButton>
          </Tooltip>

          <TextField
            fullWidth
            multiline
            inputRef={(el) => (textRef.current = el)}
            maxRows={6}
            placeholder="اكتب رسالة..."
            value={text}
            disabled={
              !!file || !!audio || isRecording || loadingAudio || isDisabled
            }
            onChange={(e) => setText(e.target.value.slice(0, MAX_LEN))}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            sx={{
              borderRadius: 2,
              bgcolor:
                theme.palette.mode === 'light'
                  ? alpha('#fff', 0.9)
                  : alpha('#0b0b0b', 0.9),
              '& .MuiOutlinedInput-root': {
                pr: 0.5,
                background:
                  theme.palette.mode === 'dark'
                    ? `linear-gradient(180deg, ${alpha('#111', 0.8)}, ${alpha(
                        '#0d0d0d',
                        0.8
                      )})`
                    : `linear-gradient(180deg, ${alpha('#fff', 0.9)}, ${alpha(
                        '#f9f9f9',
                        0.9
                      )})`,
                '& fieldset': {
                  borderColor: alpha(theme.palette.primary.main, 0.25),
                },
                '&:hover fieldset': {
                  borderColor: alpha(theme.palette.primary.main, 0.45),
                },
                '&.Mui-focused fieldset': {
                  borderColor: theme.palette.primary.main,
                  boxShadow: `0 0 0 3px ${alpha(
                    theme.palette.primary.main,
                    0.12
                  )}`,
                },
              },
              '& .MuiInputBase-input': { fontSize: 14, lineHeight: 1.6 },
            }}
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end" sx={{ mr: 0.25 }}>
                    <Tooltip title="إرسال">
                      <span>
                        <IconButton
                          onClick={handleSend}
                          color="primary"
                          disabled={
                            (!text.trim() && !file && !audio) || isDisabled
                          }
                          size="medium"
                          aria-label="إرسال الرسالة"
                          sx={{
                            borderRadius: 2,
                            px: 1,
                            transition: 'transform .18s ease',
                            background:
                              !text.trim() && !file && !audio
                                ? 'transparent'
                                : `linear-gradient(90deg, ${alpha(
                                    theme.palette.primary.main,
                                    0.9
                                  )}, ${alpha(
                                    theme.palette.secondary.main ??
                                      theme.palette.primary.light,
                                    0.9
                                  )})`,
                            color:
                              !text.trim() && !file && !audio
                                ? 'inherit'
                                : '#fff',
                            '&:hover': {
                              transform:
                                !text.trim() && !file && !audio
                                  ? 'none'
                                  : 'translateY(-1px)',
                              boxShadow:
                                !text.trim() && !file && !audio
                                  ? 'none'
                                  : `0 8px 22px ${alpha(
                                      theme.palette.primary.main,
                                      0.25
                                    )}`,
                            },
                          }}
                        >
                          <SendIcon />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </InputAdornment>
                ),
              },
            }}
          />

          {isRecording ? (
            <Tooltip title="إيقاف التسجيل">
              <IconButton
                onClick={handleStopRecord}
                color="error"
                size="medium"
                aria-label="إيقاف التسجيل"
                sx={{
                  border: `1px solid ${alpha(theme.palette.error.main, 0.25)}`,
                  backgroundColor: alpha(theme.palette.error.main, 0.08),
                  '&::after': {
                    content: '""',
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: theme.palette.error.main,
                    display: 'inline-block',
                    marginInlineStart: 6,
                    boxShadow: `0 0 0 0 ${alpha(theme.palette.error.main, 0.8)}`,
                    animation: 'pulseRec 1.6s infinite',
                  },
                  '@keyframes pulseRec': {
                    '0%': {
                      boxShadow: `0 0 0 0 ${alpha(
                        theme.palette.error.main,
                        0.6
                      )}`,
                    },
                    '70%': {
                      boxShadow: `0 0 0 10px ${alpha(
                        theme.palette.error.main,
                        0
                      )}`,
                    },
                    '100%': { boxShadow: '0 0 0 0 transparent' },
                  },
                }}
              >
                <StopIcon />
              </IconButton>
            </Tooltip>
          ) : (
            <Tooltip title="تسجيل صوت">
              <span>
                <IconButton
                  onClick={handleStartRecord}
                  color="primary"
                  disabled={!!file || !!audio || loadingAudio || isDisabled}
                  size="medium"
                  aria-label="بدء التسجيل الصوتي"
                  sx={{
                    border: `1px solid ${alpha(
                      theme.palette.primary.main,
                      0.25
                    )}`,
                    backgroundColor: alpha(theme.palette.primary.main, 0.06),
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.primary.main, 0.1),
                    },
                  }}
                >
                  {loadingAudio ? <CircularProgress size={22} /> : <MicIcon />}
                </IconButton>
              </span>
            </Tooltip>
          )}
        </Box>

        {!file && !audio && (
          <Box
            sx={{
              mt: 0.5,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              px: 0.5,
            }}
          >
            <Typography variant="caption" color={counterColor}>
              {text.length} / {MAX_LEN}
            </Typography>
            {nearLimit && (
              <Typography variant="caption" color="warning.main">
                اقتربت من الحد الأقصى للنص.
              </Typography>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default ChatInput;

