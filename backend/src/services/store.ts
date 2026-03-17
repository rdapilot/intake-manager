import { seedAuditTrail, seedBundles, seedNotifications, seedRequests, seedTemplates } from '../data/seed.js';
import { AuditEntry, Bundle, FormRequest, FormTemplate, NotificationItem } from '../types/domain.js';

export const store: {
  templates: FormTemplate[];
  requests: FormRequest[];
  bundles: Bundle[];
  notifications: NotificationItem[];
  auditTrail: AuditEntry[];
} = {
  templates: structuredClone(seedTemplates),
  requests: structuredClone(seedRequests),
  bundles: structuredClone(seedBundles),
  notifications: structuredClone(seedNotifications),
  auditTrail: structuredClone(seedAuditTrail)
};
