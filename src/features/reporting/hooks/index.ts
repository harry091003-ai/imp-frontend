import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  fetchMetrics,
  fetchReportRows,
  fetchTopServices,
  fetchTrends,
  type ReportListParams,
} from '../api';

const ROOT = 'reports';

export function useMetrics() {
  return useQuery({ queryKey: [ROOT, 'metrics'], queryFn: fetchMetrics });
}

export function useTrends(days: number) {
  return useQuery({
    queryKey: [ROOT, 'trends', days],
    queryFn: () => fetchTrends(days),
    placeholderData: keepPreviousData,
  });
}

export function useTopServices() {
  return useQuery({ queryKey: [ROOT, 'top-services'], queryFn: fetchTopServices });
}

export function useReportRows(params: ReportListParams) {
  return useQuery({
    queryKey: [ROOT, 'incidents', params],
    queryFn: () => fetchReportRows(params),
    placeholderData: keepPreviousData,
  });
}
