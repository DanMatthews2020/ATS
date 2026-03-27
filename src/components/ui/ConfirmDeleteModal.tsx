'use client';

import { useEffect } from 'react';
import { Button } from './Button';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  error?: string;
}

export function ConfirmDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
  title,
  description,
  confirmLabel = 'Delete',
  error,
}: ConfirmDeleteModalProps) {
  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-2">
          {title}
        </h2>
        <p className="text-sm text-[var(--color-text-muted)] leading-relaxed mb-6">
          {description}
        </p>

        {error && (
          <p className="text-xs text-red-600 mb-4">{error}</p>
        )}

        <div className="flex gap-3 justify-end">
          <Button
            variant="secondary"
            size="md"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            size="md"
            onClick={onConfirm}
            isLoading={isLoading}
            disabled={isLoading}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
