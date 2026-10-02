import { describe, expect, it } from 'vitest';
import { normalizePromptVersions, renderPromptTemplate } from './promptVersions';

describe('prompt version utilities', () => {
  it('normalizes a wrapped API response and chooses the active version', () => {
    const versions = normalizePromptVersions({
      success: true,
      data: { versions: [{ _id: 'v2', name: 'Version Two', prompt: 'Hi {{user.name}}', status: 'active' }] },
    });

    expect(versions).toHaveLength(1);
    expect(versions[0]).toMatchObject({ id: 'v2', label: 'Version Two', template: 'Hi {{user.name}}', isActive: true });
  });

  it('renders nested variables and leaves missing placeholders visible', () => {
    expect(renderPromptTemplate('Hi {{ user.name }}; task={{task}}', { user: { name: 'Ada' } }))
      .toBe('Hi Ada; task={{task}}');
  });
});
