'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { VOICE_MESSAGE } from '@/constants';

// ─── Types ────────────────────────────────────────────────────────────────────

export type RecorderStatus =
  | 'idle'        // nothing happening
  | 'recording'   // MediaRecorder is running
  | 'stopped'     // recording finished, audio ready to preview/send
  | 'cancelled';  // user cancelled, audio discarded

export interface VoiceRecording {
  /** base64 data URL ready to store in ChatMessage.voice.audioUrl */
  audioUrl: string;
  /** Approximate raw size before base64 encoding */
  sizeBytes: number;
  /** Duration in seconds */
  duration: number;
  /** MIME type reported by the browser */
  mimeType: string;
  /** Auto-transcript from Web Speech API (empty string if unavailable) */
  transcript: string;
}

export interface UseVoiceRecorderReturn {
  status: RecorderStatus;
  /** Elapsed recording time in seconds (updates every second while recording) */
  elapsedSeconds: number;
  /** Live transcript while recording (interim + final) */
  liveTranscript: string;
  /** Completed recording — available when status === 'stopped' */
  recording: VoiceRecording | null;
  /** Whether MediaRecorder is supported in the current browser */
  isSupported: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  cancelRecording: () => void;
  /** Reset back to idle and discard any recording */
  reset: () => void;
}

// ─── Helper: pick the best supported MIME type ────────────────────────────────

function pickMimeType(): string {
  for (const mime of VOICE_MESSAGE.PREFERRED_MIME_TYPES) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(mime)) {
      return mime;
    }
  }
  return ''; // let the browser choose
}

// ─── Helper: Blob → base64 data URL ──────────────────────────────────────────

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useVoiceRecorder(): UseVoiceRecorderReturn {
  const [status, setStatus] = useState<RecorderStatus>('idle');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [recording, setRecording] = useState<VoiceRecording | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const mimeTypeRef = useRef<string>('');
  const transcriptRef = useRef<string>('');

  // Speech recognition for live transcript
  const recognitionRef = useRef<any>(null);

  const isSupported =
    typeof window !== 'undefined' &&
    typeof navigator.mediaDevices?.getUserMedia === 'function' &&
    typeof MediaRecorder !== 'undefined';

  // ── Clean up on unmount ──────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      stopTimer();
      stopStream();
      stopRecognition();
    };
  }, []);

  // ── Helpers ──────────────────────────────────────────────────────────────────

  function stopTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  function stopRecognition() {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* ignore */ }
      recognitionRef.current = null;
    }
  }

  function startLiveTranscription() {
    if (typeof window === 'undefined') return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';
      for (let i = 0; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += t + ' ';
        } else {
          interim += t;
        }
      }
      const combined = (final + interim).trim();
      transcriptRef.current = final.trim();
      setLiveTranscript(combined);
    };

    recognition.onerror = () => { /* non-fatal — transcript just won't be available */ };

    try {
      recognition.start();
      recognitionRef.current = recognition;
    } catch { /* ignore */ }
  }

  // ── Public API ───────────────────────────────────────────────────────────────

  const startRecording = useCallback(async () => {
    if (!isSupported) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      chunksRef.current = [];
      transcriptRef.current = '';
      setLiveTranscript('');
      setRecording(null);

      const mimeType = pickMimeType();
      mimeTypeRef.current = mimeType;

      const options = mimeType ? { mimeType } : {};
      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);

          // Live size guard — stop early if we exceed MAX_SIZE_BYTES
          const accumulated = chunksRef.current.reduce((acc, b) => acc + b.size, 0);
          if (accumulated >= VOICE_MESSAGE.MAX_SIZE_BYTES) {
            stopRecording();
          }
        }
      };

      recorder.onstop = async () => {
        stopTimer();
        stopStream();
        stopRecognition();

        const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000);
        const effectiveMime = mimeTypeRef.current || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: effectiveMime });

        if (blob.size === 0) {
          setStatus('cancelled');
          return;
        }

        if (blob.size > VOICE_MESSAGE.MAX_SIZE_BYTES) {
          setStatus('cancelled');
          return;
        }

        const audioUrl = await blobToDataUrl(blob);

        setRecording({
          audioUrl,
          sizeBytes: blob.size,
          duration: elapsed,
          mimeType: effectiveMime,
          transcript: transcriptRef.current,
        });
        setStatus('stopped');
      };

      // Request data every 250ms for live size checking
      recorder.start(250);
      startTimeRef.current = Date.now();
      setElapsedSeconds(0);
      setStatus('recording');

      // Elapsed timer
      timerRef.current = setInterval(() => {
        const secs = Math.round((Date.now() - startTimeRef.current) / 1000);
        setElapsedSeconds(secs);

        // Auto-stop at max duration
        if (secs >= VOICE_MESSAGE.MAX_DURATION_SECONDS) {
          stopRecording();
        }
      }, 1000);

      // Start optional live transcription in parallel
      startLiveTranscription();
    } catch (err: any) {
      setStatus('idle');
      throw err; // caller (ChatEngine) shows the toast
    }
  }, [isSupported]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    stopTimer();
    // onstop handler will finalise the blob and set status → 'stopped'
  }, []);

  const cancelRecording = useCallback(() => {
    stopTimer();
    stopRecognition();
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    stopStream();
    chunksRef.current = [];
    setRecording(null);
    setLiveTranscript('');
    setElapsedSeconds(0);
    setStatus('cancelled');
  }, []);

  const reset = useCallback(() => {
    cancelRecording();
    setStatus('idle');
  }, [cancelRecording]);

  return {
    status,
    elapsedSeconds,
    liveTranscript,
    recording,
    isSupported,
    startRecording,
    stopRecording,
    cancelRecording,
    reset,
  };
}
