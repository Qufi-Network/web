'use client';

import { useCallback, useRef, useState } from 'react';
import { stage } from '../../experience/stage';
import { submitRegistration, validate, type SubmitOutcome } from '../../lib/waitlist';

/**
 * Registering interest in a genesis node.
 *
 * The last chapter has already established that one node is missing and that it
 * is the visitor's. This is where that becomes an action, so filling it in is
 * wired to the scene: touching a field reaches into the network, and completing
 * the form connects the node properly. The call to action is the last move in
 * the experience rather than a panel bolted underneath it.
 */

const FIELDS = [
  { key: 'name', label: 'Name', type: 'text', autoComplete: 'name', required: true },
  { key: 'email', label: 'Email', type: 'email', autoComplete: 'email', required: true },
  {
    key: 'organisation',
    label: 'Organisation',
    type: 'text',
    autoComplete: 'organization',
    required: false,
  },
] as const;

type FieldKey = (typeof FIELDS)[number]['key'];

export function GenesisForm() {
  const [values, setValues] = useState<Record<FieldKey, string>>({
    name: '',
    email: '',
    organisation: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<SubmitOutcome | null>(null);
  const [sending, setSending] = useState(false);
  const form = useRef<HTMLFormElement>(null);

  const onSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      if (sending) return;

      const problem = validate(values);
      if (problem) {
        setError(problem);
        return;
      }

      setError(null);
      setSending(true);
      const result = await submitRegistration(values);
      setSending(false);
      setOutcome(result);

      if (result.status !== 'failed') {
        // The node joins. Every lane lights, which is the only celebration this
        // design allows itself.
        stage.reach = 4;
      }
    },
    [sending, values],
  );

  if (outcome && outcome.status !== 'failed') {
    return (
      <div className="genesis" data-state="done">
        <p className="genesis-done">
          {outcome.status === 'sent'
            ? 'Registered. We will be in touch as the genesis programme opens.'
            : 'Details checked and valid.'}
        </p>
        {outcome.status === 'preview' ? (
          <p className="genesis-note">
            Preview build — the register is not connected to a mailing list yet, so nothing was
            sent.
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <form className="genesis" ref={form} onSubmit={onSubmit} noValidate>
      <div className="genesis-fields">
        {FIELDS.map((field, lane) => (
          <label key={field.key} className="genesis-field">
            <span className="genesis-label">
              {field.label}
              {field.required ? null : <span className="genesis-optional"> optional</span>}
            </span>
            <input
              type={field.type}
              name={field.key}
              autoComplete={field.autoComplete}
              value={values[field.key]}
              // Reaching for a field reaches into the network. Each one connects
              // to a different part of it, so filling the form in traces a path.
              onFocus={() => {
                stage.reach = lane;
              }}
              onBlur={() => {
                stage.reach = -1;
              }}
              onChange={(event) => {
                setValues((current) => ({ ...current, [field.key]: event.target.value }));
                if (error) setError(null);
              }}
            />
          </label>
        ))}
      </div>

      <div className="genesis-actions">
        <button type="submit" className="edge-light" data-always="true" disabled={sending}>
          <span className="genesis-mark" aria-hidden="true" />
          {sending ? 'Registering' : 'Register interest'}
        </button>
        <p className="genesis-note">
          One thousand genesis nodes at launch. Registering interest is not an allocation.
        </p>
      </div>

      <p className="genesis-error" role="alert" data-shown={Boolean(error || outcome)}>
        {error ?? (outcome?.status === 'failed' ? outcome.reason : '')}
      </p>
    </form>
  );
}
