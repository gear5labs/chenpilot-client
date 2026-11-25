import { describe, it, expect, beforeEach, vi } from 'vitest';

const { mockAxiosInstance, mockBareAxios } = vi.hoisted(() => {
  const mockAxiosInstance = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    patch: vi.fn(),
    defaults: {
      baseURL: 'http://localhost:2333',
      headers: { 'Content-Type': 'application/json' },
    },
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  };

  const mockBareAxios = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    patch: vi.fn(),
    create: vi.fn(() => mockAxiosInstance),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
    isAxiosError: vi.fn((err: unknown) =>
      !!(
        err &&
        typeof err === 'object' &&
        ('isAxiosError' in err || 'response' in err)
      ),
    ),
    isCancel: vi.fn(() => false),
  };

  return { mockAxiosInstance, mockBareAxios };
});

vi.mock('axios', () => ({
  default: mockBareAxios,
  ...mockBareAxios,
}));

vi.mock('../agentService', () => ({
  default: {
    isAgentConnected: vi.fn(() => false),
    queryAgentStreaming: vi.fn(),
    getStatus: vi.fn(),
    getCapabilities: vi.fn(),
    healthCheck: vi.fn(),
    getTools: vi.fn(),
    executeTool: vi.fn(),
    getMemory: vi.fn(),
    clearMemory: vi.fn(),
  },
  classifyAgentError: vi.fn(),
  isStateChangingQuery: vi.fn(),
  agentErrorMessage: vi.fn(),
}));

import {
  ApiService,
  EXPORT_FALLBACK_FILENAME,
  EXPORT_FALLBACK_MIME_TYPE,
  parseContentDispositionFilename,
  parseExportMimeType,
} from '../api';

describe('parseContentDispositionFilename (#512)', () => {
  it('parses a quoted filename', () => {
    expect(
      parseContentDispositionFilename('attachment; filename="account-export.json"'),
    ).toBe('account-export.json');
  });

  it('parses an unquoted filename', () => {
    expect(
      parseContentDispositionFilename('attachment; filename=export.csv'),
    ).toBe('export.csv');
  });

  it('prefers the RFC 5987 filename* form and decodes it', () => {
    expect(
      parseContentDispositionFilename(
        "attachment; filename=\"fallback.json\"; filename*=UTF-8''export-%E2%82%AC.json",
      ),
    ).toBe('export-€.json');
  });

  it('rejects path separators and traversal attempts', () => {
    const result = parseContentDispositionFilename(
      'attachment; filename="../../etc/passwd"',
    );
    expect(result).not.toBeNull();
    expect(result).not.toContain('/');
    expect(result).not.toContain('\\');
  });

  it('rejects bare dot names and malformed headers', () => {
    expect(parseContentDispositionFilename('attachment; filename=".."')).toBeNull();
    expect(parseContentDispositionFilename('attachment; filename="."')).toBeNull();
    expect(parseContentDispositionFilename('attachment; filename')).toBeNull();
    expect(parseContentDispositionFilename('attachment')).toBeNull();
    expect(parseContentDispositionFilename(null)).toBeNull();
    expect(parseContentDispositionFilename(undefined)).toBeNull();
  });

  it('rejects names that sanitize to nothing', () => {
    expect(parseContentDispositionFilename('attachment; filename="///"')).toBeNull();
  });
});

describe('parseExportMimeType (#512)', () => {
  it('uses the response content type without parameters', () => {
    expect(parseExportMimeType('application/json; charset=utf-8')).toBe('application/json');
    expect(parseExportMimeType('application/x-ndjson')).toBe('application/x-ndjson');
  });

  it('falls back for missing or malformed types', () => {
    expect(parseExportMimeType(undefined)).toBe(EXPORT_FALLBACK_MIME_TYPE);
    expect(parseExportMimeType('not a mime')).toBe(EXPORT_FALLBACK_MIME_TYPE);
  });
});

describe('ApiService.exportUserData (#511, #512)', () => {
  let apiService: ApiService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockBareAxios.create.mockReturnValue(mockAxiosInstance);
    apiService = new ApiService();
  });

  it('returns blob, validated filename and response MIME type', async () => {
    const blob = new Blob(['{}'], { type: 'application/json' });
    mockAxiosInstance.get.mockResolvedValueOnce({
      status: 200,
      data: blob,
      headers: {
        'content-disposition': 'attachment; filename="my-export.json"',
        'content-type': 'application/x-ndjson; charset=utf-8',
      },
    });

    const result = await apiService.exportUserData();

    expect(result.blob).toBe(blob);
    expect(result.fileName).toBe('my-export.json');
    expect(result.mimeType).toBe('application/x-ndjson');
    expect(mockAxiosInstance.get).toHaveBeenCalledWith(
      '/data-export',
      expect.objectContaining({ responseType: 'blob' }),
    );
  });

  it('falls back to a safe filename and generic MIME when headers are absent', async () => {
    mockAxiosInstance.get.mockResolvedValueOnce({
      status: 200,
      data: new Blob(['{}']),
      headers: {},
    });

    const result = await apiService.exportUserData();

    expect(result.fileName).toBe(EXPORT_FALLBACK_FILENAME);
    expect(result.mimeType).toBe(EXPORT_FALLBACK_MIME_TYPE);
  });

  it('uses the fallback when the filename header is unsafe', async () => {
    mockAxiosInstance.get.mockResolvedValueOnce({
      status: 200,
      data: new Blob(['{}']),
      headers: { 'content-disposition': 'attachment; filename=".."' },
    });

    const result = await apiService.exportUserData();
    expect(result.fileName).toBe(EXPORT_FALLBACK_FILENAME);
  });

  it('tries the next candidate endpoint after a 404', async () => {
    mockAxiosInstance.get
      .mockRejectedValueOnce({ isAxiosError: true, response: { status: 404 } })
      .mockResolvedValueOnce({
        status: 200,
        data: new Blob(['{}']),
        headers: {},
      });

    const result = await apiService.exportUserData();
    expect(result.blob).toBeInstanceOf(Blob);
    expect(mockAxiosInstance.get).toHaveBeenCalledTimes(2);
    expect(mockAxiosInstance.get).toHaveBeenLastCalledWith(
      '/data/export',
      expect.anything(),
    );
  });

  it('reports download progress through onProgress', async () => {
    mockAxiosInstance.get.mockImplementationOnce((_url, config) => {
      config.onDownloadProgress({ loaded: 50, total: 100 });
      config.onDownloadProgress({ loaded: 100, total: 100 });
      return Promise.resolve({ status: 200, data: new Blob(['{}']), headers: {} });
    });
    const onProgress = vi.fn();

    await apiService.exportUserData({ onProgress });

    expect(onProgress).toHaveBeenCalledTimes(2);
    expect(onProgress).toHaveBeenLastCalledWith({ loaded: 100, total: 100, percent: 100 });
  });

  it('passes an AbortSignal through to the request config', async () => {
    mockAxiosInstance.get.mockResolvedValueOnce({
      status: 200,
      data: new Blob(['{}']),
      headers: {},
    });
    const controller = new AbortController();

    await apiService.exportUserData({ signal: controller.signal });

    expect(mockAxiosInstance.get).toHaveBeenCalledWith(
      '/data-export',
      expect.objectContaining({ signal: controller.signal }),
    );
  });
});
