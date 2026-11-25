import { Mail, Phone, User as UserIcon } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Combobox, type ComboboxOption } from '@/components/ui/Combobox';
import { PasswordInputField } from '@/features/system-admin/users/components/PasswordInputField';
import type { OfficeSummary } from '@/features/system-admin/users/types/user';
import { ALL_ROLES, ROLE_LABELS } from '@/constants';
import type { UserRole } from '@/types';
import {
  POSITION_OPTIONS,
  STATUS_FROM_API,
  USER_STATUS_API,
  USER_STATUS_LABELS,
  type UserStatusUi,
} from '@/features/system-admin/users/types/user';

export interface AddUserFormState {
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  employeeEmail?: string;
  phone: string;
  position: string;
  officeId: string;
  role: UserRole;
  username: string;
  password: string;
  status: UserStatusUi;
}

interface TouchedMap {
  [key: string]: boolean;
}

export interface FormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  position?: string;
  officeId?: string;
  username?: string;
  password?: string;
}

const STATUS_OPTIONS: { value: UserStatusUi; label: string }[] = USER_STATUS_API.map(
  s => ({ value: STATUS_FROM_API[s], label: USER_STATUS_LABELS[s] }),
);

const POSITION_SELECT_OPTIONS: ComboboxOption[] = POSITION_OPTIONS.map(p => ({
  value: p,
  label: p,
}));

export interface UserFormFieldsProps {
  form: AddUserFormState;
  onChange: (next: AddUserFormState) => void;
  touched: TouchedMap;
  onTouched: (field: string) => void;
  errors: FormErrors;
  offices: OfficeSummary[];
  usernameTouched: boolean;
  onUsernameTouched: (value: boolean) => void;
  suggestedUsername: string;
  onGeneratePassword?: () => void;
  disabled?: boolean;
  showPasswordField?: boolean;
  readOnlyEmployeeFields?: boolean;
  passwordRequired?: boolean;
  passwordHint?: string;
  credentialsDescription?: string;
  allowUnassignedOffice?: boolean;
}

export function UserFormFields({
  form,
  onChange,
  touched,
  onTouched,
  errors,
  offices,
  usernameTouched,
  onUsernameTouched,
  suggestedUsername,
  onGeneratePassword,
  disabled,
  showPasswordField = true,
  readOnlyEmployeeFields = false,
  passwordRequired = true,
  passwordHint,
  credentialsDescription,
  allowUnassignedOffice = false,
}: UserFormFieldsProps) {
  const usernameValue = usernameTouched ? form.username : (form.username || suggestedUsername);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Personal Information"
          description={readOnlyEmployeeFields ? 'Employee identity details (read-only)' : 'Basic identity details for the user'}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Input
            label="First Name"
            name="firstName"
            required
            value={form.firstName}
            onChange={e => onChange({ ...form, firstName: e.target.value })}
            onBlur={() => onTouched('firstName')}
            placeholder="Juan"
            error={touched.firstName ? errors.firstName : undefined}
            leftIcon={<UserIcon className="w-4 h-4" />}
            disabled={disabled || readOnlyEmployeeFields}
          />
          <Input
            label="Middle Name"
            name="middleName"
            value={form.middleName}
            onChange={e => onChange({ ...form, middleName: e.target.value })}
            placeholder="Santos"
            hint="Optional"
            disabled={disabled || readOnlyEmployeeFields}
          />
          <Input
            label="Last Name"
            name="lastName"
            required
            value={form.lastName}
            onChange={e => onChange({ ...form, lastName: e.target.value })}
            onBlur={() => onTouched('lastName')}
            placeholder="Dela Cruz"
            error={touched.lastName ? errors.lastName : undefined}
            disabled={disabled || readOnlyEmployeeFields}
          />
          <Input
            label="Email"
            name="email"
            required={!readOnlyEmployeeFields}
            type="email"
            value={readOnlyEmployeeFields ? (form.employeeEmail ?? form.email) : form.email}
            onChange={e => onChange({ ...form, email: e.target.value })}
            onBlur={() => onTouched('email')}
            placeholder="juan@example.com"
            error={touched.email ? errors.email : undefined}
            leftIcon={<Mail className="w-4 h-4" />}
            disabled={disabled || readOnlyEmployeeFields}
          />
          <Input
            label="Phone"
            name="phone"
            value={form.phone}
            onChange={e => onChange({ ...form, phone: e.target.value })}
            onBlur={() => onTouched('phone')}
            placeholder="09171234567"
            error={touched.phone ? errors.phone : undefined}
            leftIcon={<Phone className="w-4 h-4" />}
            disabled={disabled || readOnlyEmployeeFields}
          />
          <Combobox
            label="Position"
            name="position"
            required
            value={form.position}
            onChange={value => onChange({ ...form, position: value })}
            options={POSITION_SELECT_OPTIONS}
            placeholder="Select a position"
            error={touched.position ? errors.position : undefined}
            disabled={disabled || readOnlyEmployeeFields}
            searchable={false}
          />
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Work Information"
          description="Office assignment and access role"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Select
            label="Office"
            name="officeId"
            required={!allowUnassignedOffice}
            value={form.officeId}
            onChange={e => onChange({ ...form, officeId: e.target.value })}
            options={[
              ...(allowUnassignedOffice ? [{ value: '', label: 'Unassigned' }] : []),
              ...offices.map(o => ({ value: o.id, label: `${o.code} — ${o.name}` })),
            ]}
            hint={allowUnassignedOffice ? 'Unassigned users cannot perform office-scoped actions.' : undefined}
            disabled={disabled}
          />
          <Select
            label="Role"
            name="role"
            required
            value={form.role}
            onChange={e => onChange({ ...form, role: e.target.value as UserRole })}
            options={ALL_ROLES.map(r => ({ value: r, label: ROLE_LABELS[r] }))}
            hint="Determines user permissions"
            disabled={disabled}
          />
          <Select
            label="Status"
            name="status"
            value={form.status}
            onChange={e =>
              onChange({ ...form, status: e.target.value as UserStatusUi })
            }
            options={STATUS_OPTIONS}
            disabled={disabled}
          />
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Account Credentials"
          description={
            credentialsDescription ??
            (showPasswordField
              ? 'Login credentials for the new user'
              : 'A secure temporary password will be generated automatically when the user is created.')
          }
        />
        <div className={`grid grid-cols-1 ${showPasswordField ? 'md:grid-cols-2' : ''} gap-4`}>
          {readOnlyEmployeeFields && (
            <Input
              label="Account Email"
              name="accountEmail"
              required
              type="email"
              value={form.email}
              onChange={e => onChange({ ...form, email: e.target.value })}
              onBlur={() => onTouched('email')}
              placeholder="juan@example.com"
              error={touched.email ? errors.email : undefined}
              leftIcon={<Mail className="w-4 h-4" />}
              disabled={disabled}
            />
          )}
          <Input
            label="Username"
            name="username"
            required
            value={usernameValue}
            onChange={e => {
              onUsernameTouched(true);
              onChange({ ...form, username: e.target.value });
            }}
            onBlur={() => onTouched('username')}
            placeholder="juan.delacruz"
            error={touched.username ? errors.username : undefined}
            hint={!usernameTouched && suggestedUsername ? 'Auto-generated from name' : undefined}
            disabled={disabled}
          />
          {showPasswordField && (
            <PasswordInputField
              value={form.password}
              onChange={value => onChange({ ...form, password: value })}
              onBlur={() => onTouched('password')}
              error={touched.password ? errors.password : undefined}
              required={passwordRequired}
              hint={
                touched.password && errors.password
                  ? undefined
                  : (passwordHint ?? 'User will be required to change this password on first login.')
              }
              showGenerate={!!onGeneratePassword}
              onGenerate={onGeneratePassword}
              disabled={disabled}
              name="password"
            />
          )}
        </div>
      </Card>
    </div>
  );
}
