import { ENDPOINTS } from '@/shared/lib/api/endpoints';
import { parseResponse } from '@/shared/lib/api/schemas';
import { http } from '@/shared/lib/http';
import { notificationPageSchema } from '../types';

export async function fetchNotifications(page: number, size: number) {
  const { data } = await http.api.get<unknown>(ENDPOINTS.notifications.mine, {
    params: { page, size },
  });
  return parseResponse(notificationPageSchema, data);
}
