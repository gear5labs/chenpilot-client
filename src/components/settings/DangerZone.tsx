"use client";

import React, { useRef, useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import apiService, { ExportProgress } from "@/services/api";

type ExportPhase = "idle" | "preparing" | "downloading" | "done" | "cancelled" | "error";

function triggerDownload(blob: Blob, fileName: string, mimeType: string) {
  const typedBlob = new Blob([blob], { type: mimeType });
  const url = URL.createObjectURL(typedBlob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function DangerZone({
  email,
  onDelete,
  disabled = false,
}: {
  email: string;
  onDelete: () => void;
  disabled?: boolean;
}) {
  const [confirmEmail, setConfirmEmail] = useState("");
  const [exportPhase, setExportPhase] = useState<ExportPhase>("idle");
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const exportAbortRef = useRef<AbortController | null>(null);

  const canDelete =
    !disabled && confirmEmail.trim().toLowerCase() === email.trim().toLowerCase();

  const isExporting = exportPhase === "preparing" || exportPhase === "downloading";

  const handleExport = async () => {
    if (isExporting) return;

    const controller = new AbortController();
    exportAbortRef.current = controller;
    setExportPhase("preparing");
    setExportProgress(null);
    setExportError(null);

    try {
      const result = await apiService.exportUserData({
        signal: controller.signal,
        onProgress: (progress) => {
          setExportPhase("downloading");
          setExportProgress(progress);
        },
      });

      triggerDownload(result.blob, result.fileName, result.mimeType);
      setExportPhase("done");
    } catch (error: unknown) {
      const wasCancelled =
        controller.signal.aborted ||
        axios.isCancel(error) ||
        (axios.isAxiosError(error) && error.code === "ERR_CANCELED");

      if (wasCancelled) {
        setExportPhase("cancelled");
      } else {
        setExportError(
          error instanceof Error ? error.message : "Data export failed. Please try again.",
        );
        setExportPhase("error");
      }
    } finally {
      exportAbortRef.current = null;
    }
  };

  const handleCancelExport = () => {
    exportAbortRef.current?.abort();
  };

  const progressPercent = exportProgress?.percent;

  return (
    <div className="rounded-lg border border-red-800/60 p-4 space-y-3">
      <h4 className="text-red-400 font-medium">Danger zone</h4>
      <p className="text-sm text-gray-400">
        On-chain history cannot be deleted. This removes your account, local
        conversations, and drafts.
      </p>
      <Input
        label="Type your email to confirm deletion"
        value={confirmEmail}
        onChange={(event) => setConfirmEmail(event.target.value)}
        placeholder={email}
      />
      <Button
        variant="ghost"
        className="w-full justify-start text-red-600 hover:text-red-700"
        disabled={!canDelete}
        onClick={onDelete}
      >
        Delete Account
      </Button>

      <div className="border-t border-red-800/40 pt-3 space-y-2">
        <h5 className="text-sm font-medium text-gray-200">Export account data</h5>
        <p className="text-xs text-gray-500">
          Download a copy of your account data. You can cancel while the export
          is being prepared or downloaded; once the file transfer finishes it
          cannot be cancelled.
        </p>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            className="justify-start"
            disabled={disabled || isExporting}
            onClick={() => void handleExport()}
          >
            {exportPhase === "error" ? "Retry data export" : "Export account data"}
          </Button>
          {isExporting && (
            <Button variant="ghost" onClick={handleCancelExport}>
              Cancel export
            </Button>
          )}
        </div>

        {exportPhase === "preparing" && (
          <p role="status" className="text-xs text-gray-400">
            Preparing your data export…
          </p>
        )}

        {exportPhase === "downloading" && (
          <div role="status" className="space-y-1">
            <div
              className="h-1.5 w-full rounded-full bg-gray-800 overflow-hidden"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progressPercent ?? undefined}
              aria-label="Data export download progress"
            >
              <div
                className={`h-full rounded-full bg-purple-500 transition-all ${
                  progressPercent === undefined ? "w-1/3 animate-pulse" : ""
                }`}
                style={progressPercent === undefined ? undefined : { width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-xs text-gray-400">
              {progressPercent === undefined
                ? "Downloading export…"
                : `Downloading export… ${progressPercent}%`}
            </p>
          </div>
        )}

        {exportPhase === "done" && (
          <p role="status" className="text-xs text-green-400">
            Export downloaded.
          </p>
        )}

        {exportPhase === "cancelled" && (
          <p role="status" className="text-xs text-gray-400">
            Export cancelled.
          </p>
        )}

        {exportPhase === "error" && exportError && (
          <p role="alert" className="text-xs text-red-400">
            {exportError}
          </p>
        )}
      </div>
    </div>
  );
}
