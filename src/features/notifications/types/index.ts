import { z } from 'zod';
import { ROUTES } from '@/shared/lib/constants/routes';

/** NotificationItemDTO. `type` stays a plain string, so a new backend type cannot break the page. */
export const notificationSchema = z.object({
  id: z.string(),
  incidentId: z.string().nullable(),
  type: z.string(),
  status: z.string(),
  message: z.string().nullable(),
  createdAt: z.string().nullable(),
});
export type Notification = z.infer<typeof notificationSchema>;

/** MyNotificationsResponseDTO. Not a Spring Page. */
export const notificationPageSchema = z.object({
  total: z.number(),
  page: z.number(),
  size: z.number(),
  items: z.array(notificationSchema),
});

export function alertLink(alert: Notification): string {
  return alert.incidentId ? ROUTES.incident(alert.incidentId) : ROUTES.alerts;
}
