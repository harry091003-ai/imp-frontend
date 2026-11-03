import { Inbox, MoreHorizontal, Pencil, Plus, Trash2, UserPlus } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import {
  CATEGORY_LABELS,
  INCIDENT_STATUSES,
  PRIORITIES,
  ROLE_LABELS,
  SEVERITIES,
  USER_STATUS_LABELS,
  type IncidentCategory,
  type IncidentStatus,
  type Role,
  type Severity,
  type UserStatus,
} from '@/shared/lib/constants/domain';
import {
  Avatar,
  Button,
  Card,
  ChartCard,
  Checkbox,
  createDataTableColumns,
  DataTable,
  DateTime,
  Dialog,
  EmptyState,
  ErrorState,
  Field,
  FilterBar,
  IconButton,
  InlineAlert,
  Input,
  Menu,
  OfflineBanner,
  PageHeader,
  Pagination,
  Popover,
  PriorityBadge,
  RoleBadge,
  SearchInput,
  SegmentedControl,
  Select,
  SeverityBadge,
  Sheet,
  Skeleton,
  SlaIndicator,
  StatCard,
  StatusPill,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  ThemeToggle,
  toOptions,
  ToastProvider,
  Tooltip,
  TraceReference,
  useToast,
  UserStatusBadge,
} from '@/shared/ui';

// Development only: App.tsx loads this page only in dev builds. The data below is made up for display.
interface SampleIncident {
  id: string;
  title: string;
  severity: Severity;
  status: IncidentStatus;
  assignee: string | null;
  createdAt: string;
}

const iso = (minutesFromNow: number) =>
  new Date(Date.now() + minutesFromNow * 60_000).toISOString();

const SAMPLE: SampleIncident[] = [
  {
    id: '1',
    title: 'Payment API returning 503 for card checkouts',
    severity: 'CRITICAL',
    status: 'IN_PROGRESS',
    assignee: 'priya.nair',
    createdAt: iso(-180),
  },
  {
    id: '2',
    title: 'Login page slow during morning peak',
    severity: 'HIGH',
    status: 'ASSIGNED',
    assignee: 'sam.lee',
    createdAt: iso(-1440),
  },
  {
    id: '3',
    title: 'Report export missing last row',
    severity: 'LOW',
    status: 'OPEN',
    assignee: null,
    createdAt: iso(-4320),
  },
];

const helper = createDataTableColumns<SampleIncident>();
const COLUMNS = helper.columns([
  helper.accessor('title', {
    header: 'Incident',
    cell: (info) => <span className="font-medium">{info.getValue()}</span>,
  }),
  helper.accessor('severity', {
    header: 'Severity',
    cell: (info) => <SeverityBadge severity={info.getValue()} />,
  }),
  helper.accessor('status', {
    header: 'Status',
    cell: (info) => <StatusPill status={info.getValue()} />,
  }),
  helper.accessor('assignee', {
    header: 'Assignee',
    cell: (info) => <Avatar name={info.getValue()} />,
  }),
  helper.accessor('createdAt', {
    header: 'Created',
    cell: (info) => <DateTime value={info.getValue()} format="relative" />,
  }),
]);

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold tracking-tight text-ink">{title}</h2>
      {children}
    </section>
  );
}

function Row({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2">{children}</div>;
}

function ToastDemo() {
  const toast = useToast();
  return (
    <Row>
      <Button
        onClick={() => {
          toast({ title: 'Incident created', description: 'The on-call supervisor can see it.' });
        }}
      >
        Success toast
      </Button>
      <Button
        onClick={() => {
          toast({
            title: 'Could not save the incident',
            description: 'Please try again.',
            tone: 'error',
            traceId: 'a1b2c3d4',
          });
        }}
      >
        Error toast
      </Button>
    </Row>
  );
}

function CategoryFormDemo() {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<IncidentCategory>();
  const [notify, setNotify] = useState(true);
  return (
    <Card className="grid gap-4 p-5 md:grid-cols-2">
      <Field label="Title" required count={title.length} maxLength={255}>
        {(control) => (
          <Input
            {...control}
            value={title}
            placeholder="What is broken?"
            onChange={(event) => {
              setTitle(event.target.value);
            }}
          />
        )}
      </Field>
      <Field label="Category" required hint="Used to find similar past incidents.">
        {(control) => (
          <Select
            {...control}
            value={category}
            onValueChange={setCategory}
            placeholder="Choose a category"
            options={toOptions<IncidentCategory>(CATEGORY_LABELS)}
          />
        )}
      </Field>
      <Field label="Affected source" error="Affected source must be at most 255 characters">
        {(control) => <Input {...control} defaultValue="payments-gateway-eu-west" />}
      </Field>
      <Field label="Disabled field">
        {(control) => <Input {...control} disabled value="Read only" readOnly />}
      </Field>
      <Field label="Description" className="md:col-span-2">
        {(control) => <Textarea {...control} placeholder="What happened, and when?" />}
      </Field>
      <Checkbox label="Tell my supervisor" checked={notify} onCheckedChange={setNotify} />
    </Card>
  );
}

export function UiGallery() {
  const [range, setRange] = useState<'7' | '30' | '90'>('7');
  const [page, setPage] = useState(0);

  return (
    <ToastProvider>
      <OfflineBanner />
      <main className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-8 md:px-8">
        <PageHeader
          title="UI components"
          description="Development preview. Sample data only, not from the backend."
          actions={<ThemeToggle />}
        />

        <Section title="Buttons">
          <Row>
            <Button variant="primary">
              <Plus aria-hidden="true" />
              Report incident
            </Button>
            <Button>Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Delete</Button>
            <Button loading>Saving</Button>
            <Button disabled>Disabled</Button>
            <Button size="sm">Small</Button>
            <IconButton label="Assign engineer" variant="secondary">
              <UserPlus aria-hidden="true" />
            </IconButton>
          </Row>
        </Section>

        <Section title="Badges">
          <Row>
            {SEVERITIES.map((severity) => (
              <SeverityBadge key={severity} severity={severity} />
            ))}
          </Row>
          <Row>
            {PRIORITIES.map((priority) => (
              <PriorityBadge key={priority} priority={priority} />
            ))}
          </Row>
          <Row>
            {INCIDENT_STATUSES.map((status) => (
              <StatusPill key={status} status={status} />
            ))}
          </Row>
          <Row>
            <SlaIndicator deadline={iso(600)} startedAt={iso(-60)} />
            <SlaIndicator deadline={iso(20)} startedAt={iso(-240)} />
            <SlaIndicator deadline={iso(-15)} />
            <SlaIndicator deadline={iso(-30)} stoppedAt={iso(-60)} />
            <SlaIndicator deadline={null} />
          </Row>
          <Row>
            {(Object.keys(ROLE_LABELS) as Role[]).map((role) => (
              <RoleBadge key={role} role={role} />
            ))}
            {(Object.keys(USER_STATUS_LABELS) as UserStatus[]).map((status) => (
              <UserStatusBadge key={status} status={status} />
            ))}
          </Row>
          <Row>
            <Avatar name="priya.nair" />
            <Avatar name="sam.lee" />
            <Avatar name="Dana Kim" size="lg" />
            <Avatar />
          </Row>
        </Section>

        <Section title="Forms">
          <CategoryFormDemo />
        </Section>

        <Section title="Overlays and navigation">
          <Row>
            <Dialog
              title="Assign engineer"
              description="They will be told straight away."
              trigger={<Button>Open dialog</Button>}
              footer={<Button variant="primary">Assign</Button>}
            >
              <SearchInput aria-label="Search engineers" placeholder="Search engineers" />
            </Dialog>
            <Sheet title="Incident details" trigger={<Button>Open sheet</Button>}>
              <p className="text-ink2">Details that sit beside the page.</p>
            </Sheet>
            <Popover label="Help" trigger={<Button>Popover</Button>}>
              <p className="max-w-56 text-label text-ink2">Short help text.</p>
            </Popover>
            <Tooltip content="Times show in your own timezone">
              <Button>Tooltip</Button>
            </Tooltip>
            <Menu
              trigger={
                <IconButton label="More actions" variant="secondary">
                  <MoreHorizontal aria-hidden="true" />
                </IconButton>
              }
              items={[
                { label: 'Edit', icon: <Pencil aria-hidden="true" />, onSelect: () => undefined },
                {
                  label: 'Remove',
                  icon: <Trash2 aria-hidden="true" />,
                  onSelect: () => undefined,
                  destructive: true,
                },
                { label: 'Not allowed', onSelect: () => undefined, disabled: true },
              ]}
            />
          </Row>
          <ToastDemo />
          <SegmentedControl
            label="Range"
            value={range}
            onValueChange={setRange}
            options={[
              { value: '7', label: '7 days' },
              { value: '30', label: '30 days' },
              { value: '90', label: '90 days' },
            ]}
          />
          <Tabs defaultValue="all">
            <TabsList aria-label="Incident scope">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="mine">Assigned to me</TabsTrigger>
              <TabsTrigger value="created">Created by me</TabsTrigger>
            </TabsList>
            <TabsContent value="all">All incidents you can see.</TabsContent>
            <TabsContent value="mine">Incidents assigned to you.</TabsContent>
            <TabsContent value="created">Incidents you reported.</TabsContent>
          </Tabs>
        </Section>

        <Section title="Messages">
          <InlineAlert tone="info" title="Suggestion from AI">
            Check this before you rely on it.
          </InlineAlert>
          <InlineAlert tone="success">Incident resolved.</InlineAlert>
          <InlineAlert tone="warning">The AI limit resets in 42 seconds.</InlineAlert>
          <InlineAlert tone="error" title="Could not save">
            Give a root cause and resolution notes.
          </InlineAlert>
          <Row>
            <TraceReference traceId="a1b2c3d4" />
          </Row>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <EmptyState
                icon={Inbox}
                title="No incidents yet"
                description="Nothing has been reported. That is good news."
                action={<Button variant="primary">Report incident</Button>}
              />
            </Card>
            <Card>
              <ErrorState
                message="The incident service did not answer."
                traceId="a1b2c3d4"
                onRetry={() => undefined}
              />
            </Card>
          </div>
        </Section>

        <Section title="Tables and filters">
          <FilterBar activeCount={1} onClear={() => undefined}>
            <SearchInput aria-label="Search incidents" placeholder="Search" className="md:w-64" />
            <Select
              aria-label="Severity"
              placeholder="Severity"
              className="md:w-40"
              options={SEVERITIES.map((severity) => ({ value: severity, label: severity }))}
            />
          </FilterBar>
          <DataTable
            caption="Sample incidents"
            columns={COLUMNS}
            data={SAMPLE}
            getRowId={(row) => row.id}
            renderMobileCard={(row) => (
              <div className="flex flex-col gap-2">
                <p className="font-medium text-ink">{row.title}</p>
                <Row>
                  <SeverityBadge severity={row.severity} />
                  <StatusPill status={row.status} />
                </Row>
              </div>
            )}
            footer={
              <Pagination
                page={page}
                pageSize={20}
                totalPages={3}
                totalElements={45}
                onPageChange={setPage}
              />
            }
          />
          <DataTable
            caption="Loading incidents"
            columns={COLUMNS}
            data={[]}
            getRowId={(row) => row.id}
            loading
          />
        </Section>

        <Section title="Dashboard cards">
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard label="Open incidents" value={42} hint="All time" />
            <StatCard label="SLA breaches" value={7} hint="Assignment and resolution" />
            <StatCard label="Loading" value={0} loading />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <ChartCard title="Loading chart" loading>
              <div />
            </ChartCard>
            <ChartCard title="Empty chart" empty>
              <div />
            </ChartCard>
            <ChartCard title="With content" description="Real charts arrive in Phase 4.">
              <div className="flex h-48 items-end gap-2">
                <Skeleton className="h-1/4 flex-1" />
                <Skeleton className="h-2/3 flex-1" />
                <Skeleton className="h-1/2 flex-1" />
              </div>
            </ChartCard>
          </div>
        </Section>
      </main>
    </ToastProvider>
  );
}
