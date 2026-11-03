import {
  createColumnHelper,
  tableFeatures,
  useTable,
  type ColumnDef,
  type RowData,
} from '@tanstack/react-table';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../lib/cn';
import { Button, IconButton } from './Button';
import { Card, EmptyState } from './Layout';
import { Skeleton } from './Skeleton';

// No client sorting or paging on purpose: the backend owns both. Sorting a browser's one page
// would show results that look complete but are not.
const features = tableFeatures({});
const SKELETON_ROWS = ['a', 'b', 'c', 'd', 'e'];

/** Define columns outside the component, or memoize them, so rows are not rebuilt on every render. */
export function createDataTableColumns<T extends RowData>() {
  return createColumnHelper<typeof features, T>();
}

export interface DataTableProps<T extends RowData> {
  /** Announced by screen readers, such as "Incidents". */
  caption: string;
  columns: ColumnDef<typeof features, T>[];
  data: readonly T[];
  getRowId: (row: T) => string;
  /** First load, with nothing to show yet. */
  loading?: boolean;
  /** Loading a new page while the old rows stay visible, so the page does not jump. */
  refreshing?: boolean;
  /** Replaces the table, such as an ErrorState. */
  error?: ReactNode;
  empty?: ReactNode;
  /** Shows a card per row on phones, instead of a table that scrolls sideways. */
  renderMobileCard?: (row: T) => ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function DataTable<T extends RowData>({
  caption,
  columns,
  data,
  getRowId,
  loading = false,
  refreshing = false,
  error,
  empty,
  renderMobileCard,
  footer,
  className,
}: DataTableProps<T>) {
  const table = useTable({
    features,
    columns,
    data,
    getRowId,
  });
  const rows = table.getRowModel().rows;
  const headers = table.getHeaderGroups();
  const columnCount = headers[0]?.headers.length ?? 1;

  if (error) return <Card className={className}>{error}</Card>;
  if (!loading && rows.length === 0) {
    return <Card className={className}>{empty ?? <EmptyState title="Nothing to show" />}</Card>;
  }

  return (
    <Card
      className={cn('overflow-hidden', refreshing && 'opacity-60', className)}
      aria-busy={loading || refreshing || undefined}
    >
      {renderMobileCard && !loading && (
        <ul className="divide-y divide-line md:hidden">
          {rows.map((row) => (
            <li key={row.id} className="p-4">
              {renderMobileCard(row.original)}
            </li>
          ))}
        </ul>
      )}
      <div
        // Keyboard users can scroll a wide table only if the scroll area can take focus.
        tabIndex={0}
        role="region"
        aria-label={`${caption} table`}
        className={cn('overflow-x-auto', renderMobileCard && !loading && 'max-md:hidden')}
      >
        <table className="w-full border-collapse text-left text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead>
            {headers.map((group) => (
              <tr key={group.id} className="border-b border-line bg-sunken">
                {group.headers.map((header) => (
                  <th
                    key={header.id}
                    scope="col"
                    className="h-10 px-4 text-xs font-semibold whitespace-nowrap text-ink3"
                  >
                    {!header.isPlaceholder && <table.FlexRender header={header} />}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-line">
            {loading
              ? SKELETON_ROWS.map((key) => (
                  <tr key={key}>
                    <td colSpan={columnCount} className="h-13 px-4">
                      <Skeleton className="w-full" />
                    </td>
                  </tr>
                ))
              : rows.map((row) => (
                  <tr key={row.id} className="hover:bg-sunken">
                    {row.getAllCells().map((cell) => (
                      <td key={cell.id} className="h-13 px-4 py-2 text-ink">
                        <table.FlexRender cell={cell} />
                      </td>
                    ))}
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
      {footer && <div className="border-t border-line">{footer}</div>}
    </Card>
  );
}

export interface PaginationProps {
  /** Zero-based, the same as a Spring Page's `number`. */
  page: number;
  pageSize: number;
  totalPages: number;
  totalElements: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
  className?: string;
}

export function Pagination({
  page,
  pageSize,
  totalPages,
  totalElements,
  onPageChange,
  disabled = false,
  className,
}: PaginationProps) {
  if (totalElements === 0) return null;
  const first = page * pageSize + 1;
  const last = Math.min((page + 1) * pageSize, totalElements);

  return (
    <nav
      aria-label="Pages"
      className={cn('flex flex-wrap items-center justify-between gap-3 px-4 py-2.5', className)}
    >
      <p className="text-label text-ink3 tabular-nums">
        {first}&ndash;{last} of {totalElements}
      </p>
      <div className="flex items-center gap-1.5">
        <IconButton
          label="Previous page"
          variant="secondary"
          size="sm"
          disabled={disabled || page <= 0}
          onClick={() => {
            onPageChange(page - 1);
          }}
        >
          <ChevronLeft aria-hidden="true" />
        </IconButton>
        <span className="px-1 text-label text-ink2 tabular-nums">
          Page {page + 1} of {Math.max(totalPages, 1)}
        </span>
        <IconButton
          label="Next page"
          variant="secondary"
          size="sm"
          disabled={disabled || page >= totalPages - 1}
          onClick={() => {
            onPageChange(page + 1);
          }}
        >
          <ChevronRight aria-hidden="true" />
        </IconButton>
      </div>
    </nav>
  );
}

export interface FilterBarProps {
  children: ReactNode;
  /** Shows "Clear filters" when above zero. */
  activeCount?: number;
  onClear?: () => void;
  className?: string;
}

export function FilterBar({ children, activeCount = 0, onClear, className }: FilterBarProps) {
  return (
    <div
      role="group"
      aria-label="Filters"
      className={cn('flex flex-wrap items-center gap-2 [&>*]:max-md:w-full', className)}
    >
      {children}
      {activeCount > 0 && onClear && (
        <Button variant="ghost" onClick={onClear}>
          <X aria-hidden="true" />
          Clear filters
        </Button>
      )}
    </div>
  );
}
