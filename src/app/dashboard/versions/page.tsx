'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import apiService from '@/services/api';
import { Button } from '@/components/ui/Button';
import { normalizePromptVersions, renderPromptTemplate } from '@/utils/promptVersions';
import { PromptVersion } from '@/types';

const DEFAULT_VARIABLES = '{\n  "name": "Ada",\n  "task": "review the latest account activity"\n}';

export default function PromptVersionsPage() {
  const [versions, setVersions] = useState<PromptVersion[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [variablesText, setVariablesText] = useState(DEFAULT_VARIABLES);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadVersions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.getPromptVersions();
      const loaded = normalizePromptVersions(response);
      setVersions(loaded);
      setSelectedId(current => current && loaded.some(version => version.id === current)
        ? current
        : loaded.find(version => version.isActive)?.id ?? loaded[0]?.id ?? null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to load prompt versions.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadVersions(); }, [loadVersions]);

  const selected = versions.find(version => version.id === selectedId) ?? null;
  const active = versions.find(version => version.isActive) ?? null;
  const preview = useMemo(() => {
    if (!selected) return '';
    try {
      const variables: unknown = JSON.parse(variablesText);
      if (!variables || typeof variables !== 'object' || Array.isArray(variables)) return 'Variables must be a JSON object.';
      return renderPromptTemplate(selected.template, variables as Record<string, unknown>);
    } catch {
      return 'Enter valid JSON to preview this template.';
    }
  }, [selected, variablesText]);

  const activateSelected = async () => {
    if (!selected || selected.isActive || activating) return;
    setActivating(true);
    setError(null);
    setNotice(null);
    try {
      await apiService.activatePromptVersion(selected.id);
      setVersions(current => current.map(version => ({ ...version, isActive: version.id === selected.id })));
      setNotice(`${selected.label} is now active.`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to activate this prompt version.');
    } finally {
      setActivating(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link href="/dashboard" className="text-sm text-sky-300 hover:text-sky-200">← Back to dashboard</Link>
            <h1 className="mt-3 text-3xl font-semibold">Prompt versions</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">Review available prompt templates, preview sample variables, and activate the version used by the agent.</p>
          </div>
          <Button variant="secondary" onClick={() => void loadVersions()} loading={loading}>Refresh versions</Button>
        </div>

        {error && <div role="alert" className="rounded-lg border border-red-800 bg-red-950/60 p-4 text-sm text-red-200">{error}</div>}
        {notice && <div role="status" className="rounded-lg border border-emerald-800 bg-emerald-950/60 p-4 text-sm text-emerald-200">{notice}</div>}

        {loading ? (
          <p role="status" className="rounded-xl border border-slate-800 bg-slate-900 p-6 text-slate-300">Loading prompt versions…</p>
        ) : versions.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 text-slate-300">No prompt versions were returned by the API.</div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
            <section aria-labelledby="available-versions" className="rounded-xl border border-slate-800 bg-slate-900 p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 id="available-versions" className="text-lg font-medium">Available versions</h2>
                <span className="text-sm text-slate-400">Active: {active?.label ?? 'None'}</span>
              </div>
              <ul className="space-y-3">
                {versions.map(version => (
                  <li key={version.id}>
                    <button
                      type="button"
                      aria-pressed={selectedId === version.id}
                      onClick={() => { setSelectedId(version.id); setNotice(null); }}
                      className={`w-full rounded-lg border p-4 text-left transition ${selectedId === version.id ? 'border-sky-500 bg-sky-950/50' : 'border-slate-700 hover:border-slate-500'}`}
                    >
                      <span className="flex items-center justify-between gap-3">
                        <span className="font-medium">{version.label}</span>
                        {version.isActive && <span className="rounded-full bg-emerald-900 px-2 py-1 text-xs text-emerald-200">Active</span>}
                      </span>
                      <span className="mt-1 block text-sm text-slate-300">{version.description}</span>
                      <span className="mt-2 block text-xs text-slate-400">Version {version.version} · ID {version.id}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>

            <section aria-labelledby="version-preview" className="space-y-5 rounded-xl border border-slate-800 bg-slate-900 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 id="version-preview" className="text-lg font-medium">{selected?.label ?? 'Select a version'}</h2>
                  <p className="mt-1 text-sm text-slate-400">Preview is rendered locally; it does not send a prompt to the agent.</p>
                </div>
                <Button onClick={() => void activateSelected()} disabled={!selected || selected.isActive} loading={activating}>
                  {selected?.isActive ? 'Currently active' : 'Activate version'}
                </Button>
              </div>
              <label className="block text-sm font-medium" htmlFor="prompt-variables">Sample variables (JSON)</label>
              <textarea
                id="prompt-variables"
                value={variablesText}
                onChange={event => setVariablesText(event.target.value)}
                rows={6}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 font-mono text-sm text-slate-100 outline-none focus:border-sky-500"
              />
              <div>
                <h3 className="mb-2 text-sm font-medium">Rendered prompt preview</h3>
                <pre className="min-h-32 whitespace-pre-wrap rounded-lg border border-slate-800 bg-slate-950 p-4 text-sm text-slate-200">{preview || 'This version does not contain a prompt template.'}</pre>
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
