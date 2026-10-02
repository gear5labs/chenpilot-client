import { ApiResponse, PromptVersion, PromptVersionRecord } from '@/types';

const asRecord = (value: unknown): PromptVersionRecord =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? value as PromptVersionRecord
    : {};

const asString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined;

function recordsFromResponse(response: unknown): PromptVersionRecord[] {
  if (Array.isArray(response)) return response.map(asRecord);
  const record = asRecord(response);
  if (Array.isArray(record.versions)) return record.versions.map(asRecord);
  if (Array.isArray(record.data)) return record.data.map(asRecord);
  if (record.data && typeof record.data === 'object') return recordsFromResponse(record.data);
  return [];
}

export function normalizePromptVersions(response: unknown): PromptVersion[] {
  return recordsFromResponse(response).map((raw, index) => {
    const id = asString(raw.id) ?? asString(raw._id) ?? asString(raw.versionId) ?? `version-${index + 1}`;
    const template = asString(raw.template) ?? asString(raw.prompt) ?? asString(raw.content) ?? '';
    const rawTags = Array.isArray(raw.tags) ? raw.tags : [];
    return {
      id,
      label: asString(raw.label) ?? asString(raw.name) ?? `Version ${index + 1}`,
      description: asString(raw.description) ?? 'No description provided.',
      template,
      version: asString(raw.version) ?? id,
      isActive: raw.isActive === true || raw.active === true || raw.status === 'active',
      createdAt: asString(raw.createdAt) ?? asString(raw.created_at) ?? null,
      updatedAt: asString(raw.updatedAt) ?? asString(raw.updated_at) ?? null,
      tags: rawTags.filter((tag): tag is string => typeof tag === 'string'),
      raw,
    };
  });
}

export function renderPromptTemplate(template: string, variables: Record<string, unknown>): string {
  return template.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (token, path: string) => {
    const value = path.split('.').reduce<unknown>((current, key) => {
      if (current && typeof current === 'object') return (current as Record<string, unknown>)[key];
      return undefined;
    }, variables);
    return value == null ? token : String(value);
  });
}

// Keep this assertion local so callers can retain the API's historical return type.
export type PromptVersionsResponse = PromptVersionRecord[] | ApiResponse<PromptVersionRecord[]> | PromptVersionRecord;
