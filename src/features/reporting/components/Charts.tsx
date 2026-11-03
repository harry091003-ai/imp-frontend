import {
  Area,
  AreaChart,
  Bar,
  type BarShapeProps,
  BarChart,
  CartesianGrid,
  Rectangle,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { SERVICE_LABELS, type ServiceName } from '@/shared/lib/constants/domain';
import { formatDate, parseBackendDate } from '@/shared/lib/date';
import { ChartCard, QueryError } from '@/shared/ui';
import type { TrendPoint } from '../types';

const AXIS_TICK = { fill: 'var(--ink3)', fontSize: 11 };

function dayLabel(value: string): string {
  const parsed = parseBackendDate(value.length > 10 && /^\d+$/.test(value) ? null : value);
  const date = parsed ?? new Date(Number(value));
  return Number.isNaN(date.getTime()) ? value : formatDate(date);
}

function shortDay(value: string): string {
  return dayLabel(value).replace(/,? \d{4}$/, '');
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: readonly { value?: unknown; payload?: { incidentsDate?: string } }[];
}

function ChartTooltip({ active, payload }: ChartTooltipProps) {
  const point = payload?.[0];
  if (!active || !point) return null;
  return (
    <div className="rounded-input border border-line bg-surface px-3 py-2 text-xs shadow-pop">
      <p className="text-ink3">{dayLabel(point.payload?.incidentsDate ?? '')}</p>
      <p className="font-semibold text-ink tabular-nums">{String(point.value)} incidents</p>
    </div>
  );
}

function summarize(points: TrendPoint[]): string {
  const peak = points.reduce((best, point) => (point.count > best.count ? point : best));
  const total = points.reduce((sum, point) => sum + point.count, 0);
  return `${String(total)} incidents over ${String(points.length)} days, peaking at ${String(peak.count)} on ${dayLabel(peak.incidentsDate)}.`;
}

export interface TrendChartProps {
  points: TrendPoint[] | undefined;
  days: number;
  loading: boolean;
  error: unknown;
  onRetry: () => void;
  action?: React.ReactNode;
  kind: 'area' | 'bar';
}

export function TrendChart({
  points,
  days,
  loading,
  error,
  onRetry,
  action,
  kind,
}: TrendChartProps) {
  const total = (points ?? []).reduce((sum, point) => sum + point.count, 0);
  const peakIndex = (points ?? []).reduce(
    (best, point, index, all) => (point.count > (all[best]?.count ?? 0) ? index : best),
    0,
  );

  return (
    <ChartCard
      title="Incidents per day"
      description={`${String(total)} incidents raised in the last ${String(days)} days`}
      action={action}
      loading={loading}
      empty={points?.length === 0}
      error={error ? <QueryError error={error} onRetry={onRetry} /> : undefined}
      summary={points?.length ? summarize(points) : undefined}
      className="min-w-0 flex-2 basis-140"
    >
      <div aria-hidden="true" className="h-60 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {kind === 'area' ? (
            <AreaChart
              accessibilityLayer={false}
              data={points}
              margin={{ top: 8, right: 8, bottom: 0, left: -24 }}
            >
              <CartesianGrid vertical={false} stroke="var(--line)" />
              <XAxis
                dataKey="incidentsDate"
                tickFormatter={shortDay}
                tick={AXIS_TICK}
                axisLine={{ stroke: 'var(--line2)' }}
                tickLine={false}
                minTickGap={32}
              />
              <YAxis allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'var(--line2)' }} />
              <Area
                type="monotone"
                dataKey="count"
                stroke="var(--acc)"
                strokeWidth={2}
                fill="var(--accbg)"
                activeDot={{ r: 5, stroke: 'var(--surface)', strokeWidth: 2 }}
                isAnimationActive={false}
              />
            </AreaChart>
          ) : (
            <BarChart
              accessibilityLayer={false}
              data={points}
              margin={{ top: 8, right: 8, bottom: 0, left: -24 }}
            >
              <CartesianGrid vertical={false} stroke="var(--line)" />
              <XAxis
                dataKey="incidentsDate"
                tickFormatter={shortDay}
                tick={AXIS_TICK}
                axisLine={{ stroke: 'var(--line2)' }}
                tickLine={false}
                minTickGap={32}
              />
              <YAxis allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--sunken)' }} />
              <Bar
                dataKey="count"
                radius={[4, 4, 0, 0]}
                isAnimationActive={false}
                // One hue. The busiest day is the only one in full strength.
                shape={(props: BarShapeProps) => (
                  <Rectangle
                    {...props}
                    fill={props.index === peakIndex ? 'var(--acc)' : 'var(--accline)'}
                  />
                )}
              />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

export function serviceLabel(name: string): string {
  return name in SERVICE_LABELS ? SERVICE_LABELS[name as ServiceName] : name;
}

/** Plain bars with the number written beside each, so it reads without hovering or colour. */
export function ServiceBars({
  rows,
  limit = 5,
}: {
  rows: { serviceName: string; count: number }[];
  limit?: number;
}) {
  const shown = rows.slice(0, limit);
  const max = Math.max(1, ...shown.map((row) => row.count));
  return (
    <ul className="flex flex-col gap-3.5">
      {shown.map((row) => (
        <li key={row.serviceName} className="flex flex-col gap-1.5">
          <div className="flex justify-between gap-3 text-label">
            <span className="font-medium text-ink">{serviceLabel(row.serviceName)}</span>
            <span className="text-ink3 tabular-nums">{row.count}</span>
          </div>
          <div aria-hidden="true" className="h-2 rounded-sm bg-sunken">
            <div
              className="h-2 rounded-sm bg-acc"
              style={{ width: `${String((row.count / max) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
