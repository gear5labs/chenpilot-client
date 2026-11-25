import React, { useEffect, useRef, useId } from "react";
import { pushFocus, popFocus } from "@/lib/focusManager";

export type ModalSize = "sm" | "md" | "lg" | "xl";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  ariaLabel?: string;
  className?: string;
  titleClassName?: string;
  /** Panel width preset; defaults to "md" (max-w-lg). */
  size?: ModalSize;
  children: React.ReactNode;
}

const SIZE_CLASSES: Record<ModalSize, string> = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  ariaLabel,
  className,
  titleClassName,
  size = "md",
  children,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  // Focus Management & Restoration.
  //
  // `pushFocus` records the element that had focus when this dialog opened —
  // for a nested dialog that is the exact trigger inside the parent dialog.
  // The effect cleanup pops the stack both when `isOpen` flips to false AND
  // when the component unmounts while still open (conditional rendering), so
  // focus always returns to the trigger instead of being dropped on <body>.
  useEffect(() => {
    if (!isOpen) return;

    pushFocus();

    // Focus first focusable element inside modal, or the container itself
    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    } else {
      modalRef.current?.focus();
    }

    return () => {
      popFocus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Helper to query focusable elements inside modal
  const getFocusableElements = (): HTMLElement[] => {
    if (!modalRef.current) return [];
    return Array.from(
      modalRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    );
  };

  // Keyboard Navigation: Focus Trapping & Escape Key Handling
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    // A nested dialog already handled this keystroke (it called preventDefault);
    // ancestor dialogs must not also close or re-trap on the same event.
    if (event.defaultPrevented) return;

    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }

    if (event.key === "Tab") {
      const focusables = getFocusableElements();
      if (focusables.length === 0) {
        event.preventDefault();
        return;
      }

      const firstElement = focusables[0];
      const lastElement = focusables[focusables.length - 1];

      if (event.shiftKey) {
        // Shift + Tab: Wrap from first to last
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab: Wrap from last to first
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    }
  };

  // Backdrop Click Handler
  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={handleBackdropClick}
      data-testid="modal-backdrop"
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={!title ? ariaLabel : undefined}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className={`relative w-full ${SIZE_CLASSES[size]} rounded-lg border border-gray-200 bg-white p-6 text-gray-900 shadow-xl focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 ${className ?? ''}`}
      >
        {title && (
          <h2 id={titleId} className={`text-xl font-semibold text-gray-900 mb-4 dark:text-white ${titleClassName ?? ''}`}>
            {title}
          </h2>
        )}
        {children}
      </div>
    </div>
  );
};
