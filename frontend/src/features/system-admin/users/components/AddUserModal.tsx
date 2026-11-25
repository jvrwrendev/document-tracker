import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, CheckCircle2, AlertTriangle, Trash2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { DraftIndicator } from '@/components/ui/DraftIndicator';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/features/authentication/hooks/useAuth';
import { useUsers } from '@/features/system-admin/users/hooks/useUsers';
import { useOffices } from '@/features/system-admin/offices/hooks/useOffices';
import { ApiError } from '@/features/system-admin/users/services/user.service';
import { useFormDraft } from '@/hooks/useFormDraft';
import { FORM_DRAFT_KEYS } from '@/lib/formDraftKeys';
import {
  ROLE_TO_API,
  STATUS_TO_API,
  type CredentialsEmailStatus,
  type OfficeSummary,
} from '@/features/system-admin/users/types/user';
import { UserFormFields, type AddUserFormState, type FormErrors } from '@/features/system-admin/users/components/UserFormFields';

const DEFAULT_FORM: AddUserFormState = {
  firstName: '',
  middleName: '',
  lastName: '',
  email: '',
  phone: '',
  position: '',
  officeId: '',
  role: 'document_encoder',
  username: '',
  password: '',
  status: 'active',
};

const TOUCHED_INITIAL: Record<string, boolean> = {
  firstName: false, middleName: false, lastName: false, email: false, phone: false,
  position: false, officeId: false, role: false, username: false, password: false, status: false,
};

function usernameFrom(firstName: string, lastName: string): string {
  const f = firstName.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  const l = lastName.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!f || !l) return '';
  return `${f}.${l}`;
}

function validate(form: AddUserFormState, username: string): FormErrors {
  const e: FormErrors = {};
  if (!form.firstName.trim()) e.firstName = 'First name is required';
  if (!form.lastName.trim()) e.lastName = 'Last name is required';
  if (!form.email.trim()) e.email = 'Email is required';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email format';
  if (form.phone && !/^[0-9+\-\s()]{7,20}$/.test(form.phone)) e.phone = 'Invalid phone number';
  if (!form.position.trim()) e.position = 'Position is required';
  if (!form.officeId) e.officeId = 'Office is required';
  if (!username) e.username = 'Username is required';
  else if (username.length < 3) e.username = 'At least 3 characters';
  return e;
}

function flattenOffices(tree: { id: string; name: string; code: string; type: 'main' | 'division' | 'unit' }[]): OfficeSummary[] {
  const out: OfficeSummary[] = [];
  for (const n of tree) out.push({ id: n.id, name: n.name, code: n.code, type: n.type, isActive: true });
  return out;
}

function touchedErrors(touched: Record<string, boolean>, errors: FormErrors): FormErrors {
  const out: FormErrors = {};
  (Object.keys(errors) as (keyof FormErrors)[]).forEach(key => { if (touched[key]) out[key] = errors[key]; });
  return out;
}

interface CreatedCredential {
  fullName: string;
  email: string;
  status: CredentialsEmailStatus;
  reason?: string;
}

interface AddUserModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function AddUserModal({ open, onClose, onCreated }: AddUserModalProps) {
  const toast = useToast();
  const { hasPermission } = useAuth();
  const { offices } = useOffices();
  const { createUser, creating, actionError, clearActionError } = useUsers();

  const [form, setForm] = useState<AddUserFormState>(DEFAULT_FORM);
  const [touched, setTouched] = useState<Record<string, boolean>>(TOUCHED_INITIAL);
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [credential, setCredential] = useState<CreatedCredential | null>(null);

  const formDraft = useFormDraft(FORM_DRAFT_KEYS.USER_CREATE, {
    enabled: open,
    onRestore: payload => {
      const restored: Partial<AddUserFormState> = {};
      for (const key of Object.keys(DEFAULT_FORM) as Array<keyof AddUserFormState>) {
        const v = payload[key as string];
        if (v !== undefined) (restored as Record<string, unknown>)[key] = v;
      }
      if (Object.keys(restored).length > 0) {
        setForm(prev => ({ ...prev, ...restored }));
        if (typeof payload.username === 'string' && payload.username.length > 0) setUsernameTouched(true);
      }
    },
  });

  const formRef = useRef(form);
  formRef.current = form;
  const handleFormChange = useCallback((next: AddUserFormState) => {
    setForm(next);
    const { password: _password, ...persistable } = next;
    void _password;
    formDraft.saveDraft(persistable as unknown as Record<string, unknown>);
  }, [formDraft]);

  const flatOffices = useMemo(() => flattenOffices(offices), [offices]);

  useEffect(() => {
    if (!form.officeId && flatOffices.length > 0) setForm(prev => ({ ...prev, officeId: flatOffices[0].id }));
  }, [flatOffices, form.officeId]);

  const fullName = useMemo(() => [form.firstName, form.middleName, form.lastName].map(s => s.trim()).filter(Boolean).join(' '), [form.firstName, form.middleName, form.lastName]);
  const suggestedUsername = useMemo(() => usernameFrom(form.firstName, form.lastName), [form.firstName, form.lastName]);
  const usernameValue = usernameTouched ? form.username : (form.username || suggestedUsername);
  const errors = useMemo(() => validate(form, usernameValue), [form, usernameValue]);
  const isValid = Object.keys(errors).length === 0;
  const showFormError = submitAttempted && !isValid;

  const markTouched = (field: string) => setTouched(prev => ({ ...prev, [field]: true }));

  const resetForm = useCallback(() => {
    setForm(DEFAULT_FORM);
    setTouched(TOUCHED_INITIAL);
    setUsernameTouched(false);
    setSubmitAttempted(false);
    clearActionError();
  }, [clearActionError]);

  const handleClose = () => {
    if (creating) return;
    if (credential) {
      setCredential(null);
      resetForm();
      void formDraft.clearDraft();
      onCreated();
      onClose();
      return;
    }
    onClose();
  };

  const handleDiscardDraft = () => {
    resetForm();
    void formDraft.clearDraft();
    toast.info('Draft discarded', 'The form has been reset.');
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setSubmitAttempted(true);
    setTouched({ firstName: true, lastName: true, email: true, phone: true, position: true, officeId: true, role: true, username: true, password: true, status: true });
    if (!isValid) { toast.error('Please fix the errors', 'Some required fields are missing or invalid.'); return; }
    if (!form.officeId) { toast.error('Office required', 'Please select an office for the new user.'); return; }
    clearActionError();
    try {
      const result = await createUser({
        employee: {
          firstName: form.firstName.trim(), middleName: form.middleName.trim() || undefined, lastName: form.lastName.trim(),
          position: form.position.trim(), email: form.email.trim().toLowerCase(), phone: form.phone.trim() || undefined,
          officeId: form.officeId, isActive: form.status === 'active',
        },
        user: {
          username: usernameValue.trim() || undefined, email: form.email.trim().toLowerCase(),
          role: ROLE_TO_API[form.role], status: STATUS_TO_API[form.status],
        },
      });
      setCredential({ fullName, email: result.user.email ?? form.email.trim().toLowerCase(), status: result.credentialsEmailStatus, reason: result.credentialsEmailReason });
      void formDraft.clearDraft();
    } catch (err) {
      if (err instanceof ApiError) toast.error('Could not create user', err.message);
      else toast.error('Could not create user', 'An unexpected error occurred.');
    }
  };

  const handleAcknowledged = () => {
    toast.success('User created', `${credential?.fullName ?? fullName} has been added to the system.`);
    setCredential(null);
    resetForm();
    void formDraft.clearDraft();
    onCreated();
    onClose();
  };

  if (!hasPermission('users.create')) return null;

  return (
    <>
      <Modal
        open={open && !credential}
        onClose={handleClose}
        title="Add New User"
        description="Create a new system user account. Fields marked with * are required."
        size="xl"
        footer={
          <>
            <Button variant="outline" onClick={handleClose} disabled={creating}>Cancel</Button>
            <Button leftIcon={<CheckCircle2 className="w-4 h-4" />} onClick={() => handleSubmit()} loading={creating} disabled={creating}>Create User</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <DraftIndicator
              state={formDraft.saving}
              lastSavedAt={formDraft.lastSavedAt}
              error={formDraft.error}
              onRetry={() => { const { password: _p, ...rest } = formRef.current; void _p; void formDraft.saveDraftNow(rest as unknown as Record<string, unknown>); }}
            />
            {formDraft.draft && (
              <button type="button" onClick={handleDiscardDraft} className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-rose-600 transition-colors">
                <Trash2 className="h-3.5 w-3.5" /> Discard draft
              </button>
            )}
          </div>

          {actionError && <div role="alert" className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{actionError}</div>}

          <form onSubmit={handleSubmit} className="space-y-6">
            <UserFormFields
              form={form}
              onChange={handleFormChange}
              touched={touched}
              onTouched={markTouched}
              errors={showFormError ? errors : touchedErrors(touched, errors)}
              offices={flatOffices}
              usernameTouched={usernameTouched}
              onUsernameTouched={setUsernameTouched}
              suggestedUsername={suggestedUsername}
              disabled={creating}
              showPasswordField={false}
            />
            {showFormError && <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">Please review the highlighted fields and try again.</div>}
          </form>
        </div>
      </Modal>

      <Modal
        open={!!credential}
        onClose={() => undefined}
        title={credential?.status === 'sent' ? 'Account created' : 'Account created — email not sent'}
        description={`${credential?.fullName ?? ''} can now sign in.`}
        size="md"
        hideCloseButton
        footer={<Button onClick={handleAcknowledged} leftIcon={<Check className="w-4 h-4" />}>Done</Button>}
      >
        {credential?.status === 'sent' ? (
          <div className="space-y-5">
            <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
              <div className="text-xs leading-relaxed text-emerald-800">A temporary password has been sent to the email address on the account. The user will be required to set a new private password on their first login.</div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Email</p>
              <p className="mt-1 font-mono text-sm text-slate-900 break-all">{credential.email}</p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div className="text-xs leading-relaxed text-amber-800">
              {credential?.status === 'skipped' ? (
                <><p>The account was created, but <strong>email is not configured</strong>, so no credentials email was sent.</p><p className="mt-2">Set the <code className="font-mono">MAIL_*</code> values in the API <code className="font-mono">.env</code>, then use <strong>Resend Credentials</strong> on the user's profile page.</p></>
              ) : (
                <><p>The account was created, but the credentials email could not be delivered.</p>{credential?.reason ? <p className="mt-2 font-mono text-[11px] break-all text-amber-700">{credential.reason}</p> : null}<p className="mt-2">Use <strong>Resend Credentials</strong> on the user's profile page once the mail service is available.</p></>
              )}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
