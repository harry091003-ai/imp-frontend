import { useMemo, useState } from 'react';
import {
  ROLE_LABELS,
  USER_STATUS_LABELS,
  type Role,
  type UserStatus,
} from '@/shared/lib/constants/domain';
import { toApiError } from '@/shared/lib/http/errors';
import { useCurrentUser } from '@/shared/lib/session';
import {
  Avatar,
  Button,
  Checkbox,
  createDataTableColumns,
  DataTable,
  DateTime,
  EmptyState,
  Field,
  InlineAlert,
  PageHeader,
  QueryError,
  RoleBadge,
  SearchInput,
  SegmentedControl,
  Select,
  Sheet,
  toOptions,
  TraceReference,
  UserStatusBadge,
  useToast,
} from '@/shared/ui';
import {
  useEngineers,
  useSetRoles,
  useSetSupervisor,
  useSetUserStatus,
  useSupervisors,
} from '../hooks';
import type { User } from '../types';

type RoleFilter = 'ALL' | Role;
const ALL_ROLES = Object.keys(ROLE_LABELS) as Role[];
const NO_SUPERVISOR = 'NONE';
const isRole = (value: string): value is Role => value in ROLE_LABELS;

function ManagePanel({
  person,
  supervisors,
  onClose,
}: {
  person: User;
  supervisors: User[];
  onClose: () => void;
}) {
  const me = useCurrentUser();
  const toast = useToast();
  const setRoles = useSetRoles();
  const setStatus = useSetUserStatus();
  const setSupervisor = useSetSupervisor();
  const [roles, setSelectedRoles] = useState<Role[]>(person.roles.filter(isRole));
  const isEngineer = person.roles.includes('ROLE_ENGINEER');
  const isSelf = person.userid === me.id;
  const rolesChanged = [...roles].sort().join() !== person.roles.filter(isRole).sort().join();
  const failure = [setRoles.error, setStatus.error, setSupervisor.error].find(Boolean);
  const apiFailure = failure ? toApiError(failure) : null;

  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={`Manage ${person.username}`}
      description={person.email}
      footer={
        <>
          <Button onClick={onClose}>Close</Button>
          <Button
            variant="primary"
            disabled={!rolesChanged || roles.length === 0}
            loading={setRoles.isPending}
            onClick={() => {
              setRoles.mutate(
                { username: person.username, roles },
                {
                  onSuccess: () => {
                    toast({
                      title: 'Roles updated',
                      description: `${person.username} has been signed out of every device.`,
                    });
                    onClose();
                  },
                },
              );
            }}
          >
            Save roles
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        {apiFailure && (
          <InlineAlert tone="error">
            {apiFailure.message}
            {apiFailure.traceId && (
              <TraceReference traceId={apiFailure.traceId} className="mt-1 flex" />
            )}
          </InlineAlert>
        )}

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-label font-medium text-ink">Roles</legend>
          {ALL_ROLES.map((role) => {
            // The backend refuses this too (CANNOT_REMOVE_OWN_ADMIN_ROLE).
            const locked = isSelf && role === 'ROLE_ADMIN';
            return (
              <Checkbox
                key={role}
                label={
                  locked ? `${ROLE_LABELS[role]} (you cannot remove your own)` : ROLE_LABELS[role]
                }
                checked={roles.includes(role)}
                disabled={locked}
                onCheckedChange={(checked) => {
                  setSelectedRoles((current) =>
                    checked ? [...current, role] : current.filter((row) => row !== role),
                  );
                }}
              />
            );
          })}
          <p className="text-xs text-ink3">
            Saving a role change signs this person out of every device. The last admin cannot be
            removed.
          </p>
        </fieldset>

        {(isEngineer || person.roles.includes('ROLE_SUPERVISOR')) && (
          <Field label="Status">
            {(aria) => (
              <Select<UserStatus>
                {...aria}
                value={person.status}
                disabled={setStatus.isPending}
                options={toOptions<UserStatus>(USER_STATUS_LABELS)}
                onValueChange={(status) => {
                  setStatus.mutate(
                    { id: person.userid, status, supervisor: !isEngineer },
                    {
                      onSuccess: () => {
                        toast({ title: 'Status updated' });
                      },
                    },
                  );
                }}
              />
            )}
          </Field>
        )}

        {isEngineer && (
          <Field
            label="Supervisor"
            hint="Engineers can only be assigned incidents by their supervisor or an admin."
          >
            {(aria) => (
              <Select
                {...aria}
                value={person.supervisorId ?? NO_SUPERVISOR}
                disabled={setSupervisor.isPending}
                options={[
                  { value: NO_SUPERVISOR, label: 'No supervisor' },
                  ...supervisors.map((row) => ({ value: row.userid, label: row.username })),
                ]}
                onValueChange={(value) => {
                  setSupervisor.mutate(
                    {
                      engineerId: person.userid,
                      supervisorId: value === NO_SUPERVISOR ? null : value,
                    },
                    {
                      onSuccess: () => {
                        toast({ title: 'Supervisor updated' });
                      },
                    },
                  );
                }}
              />
            )}
          </Field>
        )}
      </div>
    </Sheet>
  );
}

export default function AdminUsersPage() {
  const engineers = useEngineers();
  const supervisors = useSupervisors();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('ALL');
  const [managingId, setManagingId] = useState<string>();

  // Until BCR-10 adds a paged list, this joins the two lists that exist. Admins are in neither.
  const everyone = useMemo(() => {
    const merged = new Map<string, User>();
    [...(supervisors.data ?? []), ...(engineers.data ?? [])].forEach((row) =>
      merged.set(row.userid, row),
    );
    return [...merged.values()].sort((a, b) => a.username.localeCompare(b.username));
  }, [engineers.data, supervisors.data]);
  const text = search.trim().toLowerCase();
  const shown = useMemo(
    () =>
      everyone.filter(
        (row) =>
          (roleFilter === 'ALL' || row.roles.includes(roleFilter)) &&
          (!text ||
            row.username.toLowerCase().includes(text) ||
            row.email.toLowerCase().includes(text)),
      ),
    [everyone, roleFilter, text],
  );
  const managing = everyone.find((row) => row.userid === managingId);

  const columns = useMemo(() => {
    const helper = createDataTableColumns<User>();
    return helper.columns([
      helper.accessor('username', {
        header: 'Person',
        cell: ({ row: { original } }) => (
          <div className="flex min-w-52 items-center gap-3">
            <Avatar name={original.username} size="lg" />
            <div className="min-w-0 leading-snug">
              <b className="font-semibold text-ink">{original.username}</b>
              <p className="truncate font-mono text-xs text-ink3">{original.email}</p>
            </div>
          </div>
        ),
      }),
      helper.accessor('roles', {
        header: 'Roles',
        cell: (info) => (
          <div className="flex flex-wrap gap-1.5">
            {info
              .getValue()
              .filter(isRole)
              .map((role) => (
                <RoleBadge key={role} role={role} />
              ))}
          </div>
        ),
      }),
      helper.accessor('status', {
        header: 'Status',
        cell: (info) => <UserStatusBadge status={info.getValue()} />,
      }),
      helper.accessor('lastLoginAt', {
        header: 'Last sign in',
        cell: (info) => (
          <DateTime
            value={info.getValue()}
            format="relative"
            className="whitespace-nowrap text-label text-ink3"
          />
        ),
      }),
      helper.display({
        id: 'manage',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row: { original } }) => (
          <Button
            size="sm"
            aria-label={`Manage ${original.username}`}
            onClick={() => {
              setManagingId(original.userid);
            }}
          >
            Manage
          </Button>
        ),
      }),
    ]);
  }, []);

  const error = engineers.error ?? supervisors.error;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Users and roles"
        description="Find a person, then change what they can do. Role changes sign them out of every device."
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SearchInput
          aria-label="Search by name or email"
          placeholder="Search by name or email"
          className="md:w-95"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
          }}
        />
        <SegmentedControl<RoleFilter>
          label="Role filter"
          value={roleFilter}
          onValueChange={setRoleFilter}
          options={[
            { value: 'ALL', label: 'All' },
            { value: 'ROLE_SUPERVISOR', label: 'Supervisors' },
            { value: 'ROLE_ENGINEER', label: 'Engineers' },
          ]}
        />
      </div>
      <DataTable
        caption="Users"
        columns={columns}
        data={shown}
        getRowId={(row) => row.userid}
        loading={engineers.isPending || supervisors.isPending}
        error={
          error ? <QueryError error={error} onRetry={() => void engineers.refetch()} /> : undefined
        }
        empty={<EmptyState title="No one matches" description="Try a name or email." />}
      />
      {managing && (
        <ManagePanel
          key={managing.userid}
          person={managing}
          supervisors={supervisors.data ?? []}
          onClose={() => {
            setManagingId(undefined);
          }}
        />
      )}
    </div>
  );
}
