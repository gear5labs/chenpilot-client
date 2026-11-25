import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VOICE_MESSAGE } from '@/constants';
import { useVoiceRecorder } from './useVoiceRecorder';

// ─── Mock MediaRecorder / getUserMedia ────────────────────────────────────────

type DataAvailableHandler = (event: { data: Blob }) => void;
type StopHandler = () => void | Promise<void>;

class MockMediaRecorder {
  static isTypeSupported = vi.fn(() => true);
  static instances: MockMediaRecorder[] = [];

  state: 'inactive' | 'recording' = 'inactive';
  ondataavailable: DataAvailableHandler | null = null;
  onstop: StopHandler | null = null;

  constructor(
    public stream: unknown,
    public options?: MediaRecorderOptions,
  ) {
    MockMediaRecorder.instances.push(this);
  }

  start() {
    this.state = 'recording';
  }

  stop() {
    if (this.state !== 'recording') return;
    this.state = 'inactive';
    // Browsers fire onstop asynchronously after stop()
    queueMicrotask(() => {
      void this.onstop?.();
    });
  }

  emit(chunk: Blob) {
    this.ondataavailable?.({ data: chunk });
  }
}

const lastRecorder = () => MockMediaRecorder.instances[MockMediaRecorder.instances.length - 1];

const fakeStream = {
  getTracks: () => [{ stop: vi.fn() }],
} as unknown as MediaStream;

// Flush queued microtasks (onstop → blobToDataUrl → FileReader) under fake timers.
const flushRecorder = async () => {
  for (let i = 0; i < 5; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });
  }
};

describe('useVoiceRecorder duration limit (#516)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    MockMediaRecorder.instances = [];
    MockMediaRecorder.isTypeSupported.mockReturnValue(true);
    vi.stubGlobal('MediaRecorder', MockMediaRecorder);
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: vi.fn().mockResolvedValue(fakeStream),
      },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('exposes the default maximum duration before recording', () => {
    const { result } = renderHook(() => useVoiceRecorder());
    expect(result.current.maxDurationSeconds).toBe(VOICE_MESSAGE.MAX_DURATION_SECONDS);
    expect(result.current.durationLimitReached).toBe(false);
  });

  it('honours a configurable maximum duration', () => {
    const { result } = renderHook(() => useVoiceRecorder({ maxDurationSeconds: 5 }));
    expect(result.current.maxDurationSeconds).toBe(5);
  });

  it('auto-stops at the configured limit and flags the boundary', async () => {
    const { result } = renderHook(() => useVoiceRecorder({ maxDurationSeconds: 3 }));

    await act(async () => {
      await result.current.startRecording();
    });
    expect(result.current.status).toBe('recording');

    act(() => {
      lastRecorder().emit(new Blob(['voice-data'], { type: 'audio/webm' }));
    });

    // Advance past the 3 second limit — the recorder must stop itself.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3100);
    });
    await flushRecorder();

    expect(result.current.status).toBe('stopped');
    expect(result.current.durationLimitReached).toBe(true);
    expect(result.current.recording?.duration).toBeGreaterThanOrEqual(3);
    expect(lastRecorder().state).toBe('inactive');
  });

  it('does not flag the limit when the user stops early', async () => {
    const { result } = renderHook(() => useVoiceRecorder({ maxDurationSeconds: 30 }));

    await act(async () => {
      await result.current.startRecording();
    });

    act(() => {
      lastRecorder().emit(new Blob(['voice-data'], { type: 'audio/webm' }));
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    act(() => {
      result.current.stopRecording();
    });
    await flushRecorder();

    expect(result.current.status).toBe('stopped');
    expect(result.current.durationLimitReached).toBe(false);
  });

  it('resets the limit flag when a new recording starts', async () => {
    const { result } = renderHook(() => useVoiceRecorder({ maxDurationSeconds: 2 }));

    await act(async () => {
      await result.current.startRecording();
    });
    act(() => {
      lastRecorder().emit(new Blob(['a'], { type: 'audio/webm' }));
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2100);
    });
    await flushRecorder();
    expect(result.current.status).toBe('stopped');
    expect(result.current.durationLimitReached).toBe(true);

    await act(async () => {
      await result.current.startRecording();
    });
    expect(result.current.durationLimitReached).toBe(false);
    expect(result.current.status).toBe('recording');
  });

  it('rejects startRecording when the microphone is unavailable', async () => {
    (navigator.mediaDevices.getUserMedia as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('Permission denied'),
    );
    const { result } = renderHook(() => useVoiceRecorder());

    await expect(
      act(async () => {
        await result.current.startRecording();
      }),
    ).rejects.toThrow('Permission denied');
    expect(result.current.status).toBe('idle');
  });
});
