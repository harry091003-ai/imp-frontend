import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { useState } from 'react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { INCIDENT_STATUSES, INCIDENT_STATUS_LABELS, SEVERITIES } from '../lib/constants/domain';
import { applyServerFieldErrors } from '../lib/forms';
import {
  Avatar,
  Button,
  createDataTableColumns,
  DataTable,
  DateTime,
  Dialog,
  ErrorState,
  Field,
  FilterBar,
  IconButton,
  InlineAlert,
  Input,
  Menu,
  Pagination,
  SegmentedControl,
  Select,
  SeverityBadge,
  StatusPill,
  ToastProvider,
  useToast,
} from './index';

// jsdom has no layout engine, and Radix's menus ask for these.
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
  Element.prototype.hasPointerCapture = vi.fn(() => false);
  Element.prototype.releasePointerCapture = vi.fn();
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    },
  );
});

describe('Button', () => {
  it('does not submit a form by accident', () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole('button', { name: 'Save' })).toHaveAttribute('type', 'button');
  });

  it('blocks a second click while loading', async () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Save
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Save' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('can style a link instead of being a button', () => {
    render(
      <Button asChild variant="primary">
        <a href="/incidents">Incidents</a>
      </Button>,
    );
    expect(screen.getByRole('link', { name: 'Incidents' })).toHaveClass('bg-btn');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('gives an icon-only button a name', () => {
    render(
      <IconButton label="Close">
        <svg />
      </IconButton>,
    );
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
  });

  it('lets a caller override the size', () => {
    render(<Button className="h-20">Big</Button>);
    expect(screen.getByRole('button')).toHaveClass('h-20');
    expect(screen.getByRole('button')).not.toHaveClass('h-9');
  });
});

describe('Field', () => {
  it('links the label, hint and error to the control', () => {
    render(
      <Field label="Title" hint="Keep it short" error="Title is required" required>
        {(control) => <Input {...control} />}
      </Field>,
    );
    const input = screen.getByRole('textbox', { name: /Title/ });
    expect(input).toBeInvalid();
    expect(input).toBeRequired();
    expect(input).toHaveAccessibleDescription('Title is required Keep it short');
  });

  it('is not marked invalid with no error', () => {
    render(<Field label="Title">{(control) => <Input {...control} />}</Field>);
    expect(screen.getByRole('textbox')).toBeValid();
  });

  it('warns when over the backend length limit', () => {
    render(
      <Field label="Title" count={300} maxLength={255}>
        {(control) => <Input {...control} />}
      </Field>,
    );
    expect(screen.getByText('300/255')).toHaveClass('text-crit');
  });
});

describe('forms', () => {
  interface Values {
    title: string;
    severity: string;
  }

  function IncidentForm({ onSubmit }: { onSubmit: (values: Values) => void }) {
    const {
      register,
      control,
      handleSubmit,
      setError,
      formState: { errors },
    } = useForm<Values>({ defaultValues: { title: '', severity: '' } });
    return (
      <form onSubmit={(event) => void handleSubmit(onSubmit)(event)}>
        <Field label="Title" error={errors.title?.message}>
          {(field) => <Input {...field} {...register('title')} />}
        </Field>
        <Field label="Severity" error={errors.severity?.message}>
          {(field) => (
            <Controller
              control={control}
              name="severity"
              render={({ field: { value, onChange, onBlur, ref } }) => (
                <Select
                  {...field}
                  ref={ref}
                  value={value || undefined}
                  onValueChange={onChange}
                  onBlur={onBlur}
                  options={SEVERITIES.map((level) => ({ value: level, label: level }))}
                />
              )}
            />
          )}
        </Field>
        <Button type="submit">Create</Button>
        <Button
          onClick={() => {
            applyServerFieldErrors(
              [{ field: 'title', message: 'Title is required' }],
              ['title', 'severity'],
              setError,
            );
          }}
        >
          Server refuses
        </Button>
      </form>
    );
  }

  it('works with React Hook Form, including the custom Select', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<IncidentForm onSubmit={onSubmit} />);

    await user.type(screen.getByRole('textbox', { name: 'Title' }), 'Payments down');
    await user.click(screen.getByRole('combobox', { name: 'Severity' }));
    await user.click(await screen.findByRole('option', { name: 'HIGH' }));
    await user.click(screen.getByRole('button', { name: 'Create' }));

    expect(onSubmit.mock.calls[0]?.[0]).toEqual({ title: 'Payments down', severity: 'HIGH' });
  });

  it('shows a backend error on the right field and focuses it', async () => {
    const user = userEvent.setup();
    render(<IncidentForm onSubmit={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Server refuses' }));

    const title = screen.getByRole('textbox', { name: 'Title' });
    expect(title).toBeInvalid();
    expect(title).toHaveAccessibleDescription('Title is required');
    expect(title).toHaveFocus();
  });
});

describe('Dialog', () => {
  it('moves focus in, names itself, closes on Escape and returns focus', async () => {
    const user = userEvent.setup();
    render(
      <Dialog title="Assign engineer" description="Pick one" trigger={<Button>Assign</Button>}>
        <Input aria-label="Search" />
      </Dialog>,
    );
    const trigger = screen.getByRole('button', { name: 'Assign' });

    await user.click(trigger);
    const dialog = screen.getByRole('dialog', { name: 'Assign engineer' });
    expect(dialog).toHaveAccessibleDescription('Pick one');
    expect(dialog).toContainElement(document.activeElement as HTMLElement);

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});

describe('Menu', () => {
  it('runs an item and skips a disabled one', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(
      <Menu
        trigger={<Button>Actions</Button>}
        items={[
          { label: 'Edit', onSelect: onEdit },
          { label: 'Delete', onSelect: onDelete, disabled: true },
        ]}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Actions' }));
    await user.click(screen.getByRole('menuitem', { name: 'Delete' }));
    expect(onDelete).not.toHaveBeenCalled();
    await user.click(screen.getByRole('menuitem', { name: 'Edit' }));
    expect(onEdit).toHaveBeenCalledOnce();
  });
});

describe('SegmentedControl', () => {
  function Harness() {
    const [value, setValue] = useState<'week' | 'month'>('week');
    return (
      <SegmentedControl
        label="Range"
        value={value}
        onValueChange={setValue}
        options={[
          { value: 'week', label: 'Week' },
          { value: 'month', label: 'Month' },
        ]}
      />
    );
  }

  it('switches, and stays selected when the active one is pressed again', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const week = screen.getByRole('radio', { name: 'Week' });
    const month = screen.getByRole('radio', { name: 'Month' });

    await user.click(month);
    expect(month).toBeChecked();
    await user.click(month);
    expect(month).toBeChecked();
    expect(week).not.toBeChecked();
  });
});

describe('badges', () => {
  it.each(INCIDENT_STATUSES)('StatusPill labels %s in words', (status) => {
    render(<StatusPill status={status} />);
    expect(screen.getByText(INCIDENT_STATUS_LABELS[status])).toBeInTheDocument();
  });

  it('never relies on colour alone: severity is spoken and written', () => {
    const { container } = render(<SeverityBadge severity="CRITICAL" />);
    expect(container).toHaveTextContent('Severity: Critical');
  });

  it('marks an unassigned person, and shows initials for a name', () => {
    render(
      <>
        <Avatar />
        <Avatar name="priya.nair" />
      </>,
    );
    expect(screen.getByRole('img', { name: 'Unassigned' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'priya.nair' })).toHaveTextContent('PN');
  });
});

describe('DateTime', () => {
  it('shows a dash for a missing date, not "Invalid Date"', () => {
    const { container } = render(<DateTime value={null} />);
    expect(container).toHaveTextContent('—');
  });

  it('gives machines the exact moment', () => {
    const { container } = render(<DateTime value="2026-11-02T10:00:00" />);
    expect(container.querySelector('time')).toHaveAttribute('datetime', '2026-11-02T10:00:00.000Z');
  });
});

describe('error display', () => {
  it('announces itself, shows the reference and retries', async () => {
    const onRetry = vi.fn();
    render(<ErrorState message="Could not load." traceId="abc12345" onRetry={onRetry} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Could not load.');
    expect(screen.getByText('abc12345')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('offers no retry when the caller knows it cannot help', () => {
    render(<ErrorState message="You do not have access." />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('only errors interrupt a screen reader', () => {
    render(
      <>
        <InlineAlert tone="info">Saved draft</InlineAlert>
        <InlineAlert tone="error">Failed</InlineAlert>
      </>,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Saved draft');
    expect(screen.getByRole('alert')).toHaveTextContent('Failed');
  });
});

describe('Toast', () => {
  function Harness() {
    const toast = useToast();
    return (
      <Button
        onClick={() => {
          toast({ title: 'Could not save', tone: 'error', traceId: 'abc12345' });
        }}
      >
        Fail
      </Button>
    );
  }

  it('shows the message and the reference', async () => {
    render(
      <ToastProvider>
        <Harness />
      </ToastProvider>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Fail' }));
    expect(await screen.findByText('Could not save')).toBeInTheDocument();
    expect(screen.getByText('abc12345')).toBeInTheDocument();
  });

  it('fails loudly if used without its provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => render(<Harness />)).toThrow('useToast must be used inside ToastProvider');
  });
});

describe('DataTable', () => {
  interface Row {
    id: string;
    title: string;
  }
  const helper = createDataTableColumns<Row>();
  const columns = helper.columns([
    helper.accessor('title', { header: 'Title', cell: (info) => info.getValue() }),
  ]);
  const data: Row[] = [
    { id: '1', title: 'Payments down' },
    { id: '2', title: 'Login slow' },
  ];
  const base = { caption: 'Incidents', columns, getRowId: (row: Row) => row.id };

  it('renders a real table with a caption and headers', () => {
    render(<DataTable {...base} data={data} />);
    const table = screen.getByRole('table', { name: 'Incidents' });
    expect(within(table).getByRole('columnheader', { name: 'Title' })).toBeInTheDocument();
    expect(within(table).getByRole('cell', { name: 'Payments down' })).toBeInTheDocument();
  });

  it('shows placeholders on first load, not an empty message', () => {
    render(<DataTable {...base} data={[]} loading empty={<p>No incidents</p>} />);
    expect(screen.queryByText('No incidents')).not.toBeInTheDocument();
    expect(screen.getByRole('table').closest('[aria-busy]')).toHaveAttribute('aria-busy', 'true');
  });

  it('shows the empty message when there are truly no rows', () => {
    render(<DataTable {...base} data={[]} empty={<p>No incidents</p>} />);
    expect(screen.getByText('No incidents')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('shows the error instead of stale or empty rows', () => {
    render(<DataTable {...base} data={data} error={<p>Failed</p>} />);
    expect(screen.getByText('Failed')).toBeInTheDocument();
    expect(screen.queryByText('Payments down')).not.toBeInTheDocument();
  });

  it('keeps old rows visible while the next page loads', () => {
    render(<DataTable {...base} data={data} refreshing />);
    expect(screen.getByText('Payments down')).toBeInTheDocument();
  });

  it('can add a phone card layout', () => {
    render(
      <DataTable {...base} data={data} renderMobileCard={(row) => <span>Card {row.title}</span>} />,
    );
    expect(screen.getByText('Card Login slow')).toBeInTheDocument();
  });
});

describe('Pagination', () => {
  const base = { pageSize: 20, totalPages: 3, totalElements: 45, onPageChange: vi.fn() };

  it('turns a zero-based Spring page into words people read', () => {
    render(<Pagination {...base} page={2} />);
    expect(screen.getByText('41–45 of 45')).toBeInTheDocument();
    expect(screen.getByText('Page 3 of 3')).toBeInTheDocument();
  });

  it('cannot go before the first or past the last page', () => {
    const { rerender } = render(<Pagination {...base} page={0} />);
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
    rerender(<Pagination {...base} page={2} />);
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
  });

  it('asks for the next page by its zero-based number', async () => {
    const onPageChange = vi.fn();
    render(<Pagination {...base} page={0} onPageChange={onPageChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it('hides itself when there are no results', () => {
    const { container } = render(
      <Pagination {...base} page={0} totalPages={0} totalElements={0} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});

describe('FilterBar', () => {
  it('offers Clear only when a filter is on', () => {
    const { rerender } = render(
      <FilterBar activeCount={0} onClear={vi.fn()}>
        <span>Filter</span>
      </FilterBar>,
    );
    expect(screen.queryByRole('button', { name: 'Clear filters' })).not.toBeInTheDocument();
    rerender(
      <FilterBar activeCount={2} onClear={vi.fn()}>
        <span>Filter</span>
      </FilterBar>,
    );
    expect(screen.getByRole('button', { name: 'Clear filters' })).toBeInTheDocument();
  });
});
