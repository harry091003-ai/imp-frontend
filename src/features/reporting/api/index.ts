import { z } from 'zod';
import { ENDPOINTS } from '@/shared/lib/api/endpoints';
import { parseResponse } from '@/shared/lib/api/schemas';
import type { IncidentStatus, Severity } from '@/shared/lib/constants/domain';
import { http } from '@/shared/lib/http';
import { metricsSchema, reportPageSchema, topServiceSchema, trendSchema } from '../types';

export async function fetchMetrics() {
  const { data } = await http.api.get<unknown>(ENDPOINTS.reports.metrics);
  return parseResponse(metricsSchema, data);
}

export async function fetchTrends(days: number) {
  const { data } = await http.api.get<unknown>(ENDPOINTS.reports.trends, { params: { days } });
  return parseResponse(z.array(trendSchema), data);
}

export async function fetchTopServices() {
  const { data } = await http.api.get<unknown>(ENDPOINTS.reports.topServices);
  return parseResponse(z.array(topServiceSchema), data);
}

export interface ReportListParams {
  page: number;
  size: number;
  status?: IncidentStatus | undefined;
  severity?: Severity | undefined;
}

export async function fetchReportRows(params: ReportListParams) {
  const { data } = await http.api.get<unknown>(ENDPOINTS.reports.incidents, { params });
  return parseResponse(reportPageSchema, data);
}
