import { seedAuditTrail, seedBundles, seedInvoices, seedNotifications, seedRequests, seedTemplates } from '../data/seed.js';
import { AuditEntry, Bundle, FormRequest, FormTemplate, InvoiceRecord, NotificationItem } from '../types/domain.js';

export const store: {
  templates: FormTemplate[];
  requests: FormRequest[];
  bundles: Bundle[];
  invoices: InvoiceRecord[];
  notifications: NotificationItem[];
  auditTrail: AuditEntry[];
} = {
  templates: structuredClone(seedTemplates),
  requests: structuredClone(seedRequests),
  bundles: structuredClone(seedBundles),
  invoices: structuredClone(seedInvoices),
  notifications: structuredClone(seedNotifications),
  auditTrail: structuredClone(seedAuditTrail)
};
