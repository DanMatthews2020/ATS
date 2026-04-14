'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Checkbox } from '@/components/ui/Checkbox';
import { Tooltip } from '@/components/ui/Tooltip';
import { Button } from '@/components/ui/Button';

/**
 * Internal test harness for UI primitives — not linked in navigation.
 * Used by Playwright tests in tests/ui-primitives.spec.ts.
 */
export default function UiTestPage() {
  // Modal state
  const [modalOpen, setModalOpen] = useState(false);

  // Select state
  const [selectValue, setSelectValue] = useState('');
  const [selectError, setSelectError] = useState('');

  // Checkbox state
  const [checked, setChecked] = useState(false);
  const [cbError, setCbError] = useState('');

  return (
    <div className="p-8 space-y-10 max-w-2xl">
      <h1 className="text-xl font-bold">UI Primitives Test Harness</h1>

      {/* ── Modal ──────────────────────────────────────────────────────── */}
      <section data-testid="modal-section">
        <h2 className="text-base font-semibold mb-3">Modal</h2>
        <Button onClick={() => setModalOpen(true)} data-testid="open-modal">
          Open Modal
        </Button>
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Test Modal"
          footer={
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button data-testid="modal-confirm">Confirm</Button>
            </div>
          }
        >
          <p data-testid="modal-body">This is the modal body content.</p>
          <input data-testid="modal-input" className="mt-3 border rounded px-2 py-1" placeholder="Focusable input" />
        </Modal>
      </section>

      {/* ── Select ─────────────────────────────────────────────────────── */}
      <section data-testid="select-section">
        <h2 className="text-base font-semibold mb-3">Select</h2>
        <Select
          label="Favourite colour"
          placeholder="Choose a colour…"
          options={[
            { value: 'red', label: 'Red' },
            { value: 'green', label: 'Green' },
            { value: 'blue', label: 'Blue' },
            { value: 'disabled-opt', label: 'Disabled Option', disabled: true },
          ]}
          value={selectValue}
          onChange={(v) => { setSelectValue(v); setSelectError(''); }}
          error={selectError}
        />
        <div className="flex gap-2 mt-2">
          <Button
            variant="secondary"
            size="sm"
            data-testid="select-show-error"
            onClick={() => setSelectError('Please choose a colour')}
          >
            Show Error
          </Button>
          <p data-testid="select-value" className="text-sm text-[var(--color-text-muted)] self-center">
            Selected: {selectValue || '(none)'}
          </p>
        </div>
      </section>

      {/* ── Checkbox ───────────────────────────────────────────────────── */}
      <section data-testid="checkbox-section">
        <h2 className="text-base font-semibold mb-3">Checkbox</h2>
        <Checkbox
          label="I agree to the terms"
          checked={checked}
          onChange={(v) => { setChecked(v); setCbError(''); }}
          error={cbError}
          hint="Required for GDPR compliance"
        />
        <div className="flex gap-2 mt-2">
          <Button
            variant="secondary"
            size="sm"
            data-testid="checkbox-show-error"
            onClick={() => setCbError('You must agree to continue')}
          >
            Show Error
          </Button>
          <p data-testid="checkbox-value" className="text-sm text-[var(--color-text-muted)] self-center">
            Checked: {checked ? 'true' : 'false'}
          </p>
        </div>
      </section>

      {/* ── Tooltip ────────────────────────────────────────────────────── */}
      <section data-testid="tooltip-section">
        <h2 className="text-base font-semibold mb-3">Tooltip</h2>
        <div className="flex gap-6 mt-4">
          <Tooltip content="Tooltip on top" position="top">
            <Button variant="secondary" size="sm" data-testid="tooltip-trigger-hover">
              Hover me
            </Button>
          </Tooltip>
          <Tooltip content="Tooltip on focus" position="bottom">
            <button
              data-testid="tooltip-trigger-focus"
              className="px-3 py-1.5 text-sm border border-[var(--color-border)] rounded-lg"
            >
              Focus me
            </button>
          </Tooltip>
        </div>
      </section>
    </div>
  );
}
