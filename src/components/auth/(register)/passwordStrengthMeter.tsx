"use client";

import React from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/utils/cn";
import {
  getPasswordStrength,
  PASSWORD_STRENGTH_MAX_SCORE,
  type PasswordStrengthLevel,
} from "@/utils/passwordStrength";

const LEVEL_ORDER: PasswordStrengthLevel[] = [
  "weak",
  "fair",
  "good",
  "strong",
];

const LEVEL_STYLES: Record<
  PasswordStrengthLevel,
  { segment: string; text: string }
> = {
  weak: { segment: "bg-red-500", text: "text-red-400" },
  fair: { segment: "bg-orange-500", text: "text-orange-400" },
  good: { segment: "bg-yellow-500", text: "text-yellow-400" },
  strong: { segment: "bg-green-500", text: "text-green-400" },
};

interface PasswordStrengthMeterProps {
  password: string;
  className?: string;
}

export function PasswordStrengthMeter({
  password,
  className,
}: PasswordStrengthMeterProps) {
  const { level, label, score, checks } = getPasswordStrength(password);

  // Nothing to show until the user starts typing.
  if (!password) {
    return null;
  }

  const filledSegments = LEVEL_ORDER.indexOf(level) + 1;
  const styles = LEVEL_STYLES[level];

  const requirements = [
    { label: "At least 8 characters", met: checks.minLength },
    { label: "Uppercase letter", met: checks.hasUppercase },
    { label: "Lowercase letter", met: checks.hasLowercase },
    { label: "Number", met: checks.hasNumber },
    { label: "Special character (recommended)", met: checks.hasSpecialChar },
  ];

  return (
    <div className={cn("mt-3", className)}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-white/40 font-light">
          Password strength
        </span>
        <span className={cn("text-xs font-light", styles.text)}>{label}</span>
      </div>

      <div
        className="flex gap-1"
        role="progressbar"
        aria-label="Password strength"
        aria-valuemin={0}
        aria-valuemax={PASSWORD_STRENGTH_MAX_SCORE}
        aria-valuenow={score}
      >
        {LEVEL_ORDER.map((levelKey, index) => (
          <div
            key={levelKey}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors duration-300",
              index < filledSegments ? styles.segment : "bg-white/10"
            )}
          />
        ))}
      </div>

      <ul className="mt-3 grid grid-cols-1 gap-1.5">
        {requirements.map((requirement) => (
          <li
            key={requirement.label}
            className="flex items-center gap-2 text-xs font-light"
          >
            {requirement.met ? (
              <Check className="h-3.5 w-3.5 shrink-0 text-green-400" />
            ) : (
              <X className="h-3.5 w-3.5 shrink-0 text-white/30" />
            )}
            <span
              className={requirement.met ? "text-white/60" : "text-white/30"}
            >
              {requirement.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
