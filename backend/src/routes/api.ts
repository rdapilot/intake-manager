import { Router } from 'express';
import { buildWorkflow, syncWorkflowForStatus } from '../services/workflow.js';
import { store } from '../services/store.js';
import { simulateVerification } from '../services/verification.js';
import { processInvoice } from '../services/invoiceProcessor.js';
import { FormRequest, FormTemplate, InvoiceLineItem, NotificationItem, RequestStatus, TemplateField } from '../types/domain.js';

const router = Router();

const createId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 8)}`;

router.get('/health', (_req, res) => {
  res.json({ ok: true, mode: 'seeded-memory' });
});

router.get('/dashboard', (_req, res) => {
  res.json(store);
});

router.get('/templates', (_req, res) => {
  res.json(store.templates);
});

router.post('/templates', (req, res) => {
  const payload = req.body as Partial<FormTemplate>;
  const fields = payload.fields ?? [];

  if (!payload.name || !payload.type || !Array.isArray(fields) || fields.length === 0) {
    return res.status(400).json({ message: 'Template name, type, and at least one field are required.' });
  }

  const mandatoryKeys = new Set(fields.map((field) => field.key));
  if (!mandatoryKeys.has('employeeName') || !mandatoryKeys.has('trackingNumber')) {
    return res.status(400).json({ message: 'Templates must include employeeName and trackingNumber fields.' });
  }

  const template: FormTemplate = {
    id: createId('tpl'),
    name: payload.name,
    description: payload.description ?? '',
    type: payload.type,
    category: payload.category ?? 'General',
    createdBy: payload.createdBy ?? 'Workflow Designer',
    createdAt: new Date().toISOString(),
    fields: fields as TemplateField[]
  };

  store.templates.unshift(template);
  return res.status(201).json(template);
});

router.get('/requests', (_req, res) => {
  res.json(store.requests);
});

router.post('/requests', async (req, res) => {
  const payload = req.body as Partial<FormRequest>;
  const mandatory = ['requesterName', 'trackingNumber', 'templateId', 'supplierName'];
  const missing = mandatory.filter((key) => !payload[key as keyof FormRequest]);

  if (missing.length > 0) {
    return res.status(400).json({ message: `Missing mandatory fields: ${missing.join(', ')}` });
  }

  const template = store.templates.find((item) => item.id === payload.templateId);
  if (!template) {
    return res.status(404).json({ message: 'Template not found.' });
  }

  const requiresInfoSec = Boolean(payload.needsDataSharingReview || payload.needsStorageReview || payload.requiresInfoSec);
  const requiresLegal = Boolean(payload.requiresLegal || requiresInfoSec || template.category.toLowerCase() === 'technology');
  const submittedAt = new Date().toISOString();
  const verification = await simulateVerification(payload.supplierName ?? '');

  const requestItem: FormRequest = {
    id: createId('req'),
    trackingNumber: String(payload.trackingNumber),
    templateId: template.id,
    templateName: template.name,
    templateType: template.type,
    requesterName: String(payload.requesterName),
    department: String(payload.department ?? 'General'),
    supplierName: String(payload.supplierName),
    amount: Number(payload.amount ?? 0),
    currency: String(payload.currency ?? 'USD'),
    category: String(payload.category ?? template.category),
    budgetCode: String(payload.budgetCode ?? 'UNASSIGNED'),
    requiresLegal,
    requiresInfoSec,
    needsDataSharingReview: Boolean(payload.needsDataSharingReview),
    needsStorageReview: Boolean(payload.needsStorageReview),
    justification: String(payload.justification ?? 'No justification supplied.'),
    status: 'submitted',
    workflow: buildWorkflow({ requiresLegal, requiresInfoSec }),
    formData: payload.formData ?? {},
    verification,
    submittedAt,
    lastUpdatedAt: submittedAt
  };

  store.requests.unshift(requestItem);

  const nextNotifications: NotificationItem[] = [
    {
      id: createId('ntf'),
      requestId: requestItem.id,
      audience: 'line_manager',
      title: 'New request requires line manager review',
      message: `${requestItem.trackingNumber} has been submitted by ${requestItem.requesterName}.`,
      read: false,
      createdAt: submittedAt
    },
    {
      id: createId('ntf'),
      requestId: requestItem.id,
      audience: 'budget_owner',
      title: 'Budget owner approval queued',
      message: `${requestItem.trackingNumber} will route to budget owner after manager approval.`,
      read: false,
      createdAt: submittedAt
    }
  ];

  if (requiresLegal) {
    nextNotifications.push({
      id: createId('ntf'),
      requestId: requestItem.id,
      audience: 'legal',
      title: 'Legal may be required for this request',
      message: `${requestItem.trackingNumber} includes conditions that may require contract review.`,
      read: false,
      createdAt: submittedAt
    });
  }

  if (requiresInfoSec) {
    nextNotifications.push({
      id: createId('ntf'),
      requestId: requestItem.id,
      audience: 'infosec',
      title: 'InfoSec review flagged',
      message: `${requestItem.trackingNumber} includes data-sharing or storage risk indicators.`,
      read: false,
      createdAt: submittedAt
    });
  }

  store.notifications.unshift(...nextNotifications);
  store.auditTrail.unshift({
    id: createId('adt'),
    requestId: requestItem.id,
    actor: 'employee',
    action: 'submitted',
    detail: `Created from template ${template.name}.`,
    timestamp: submittedAt
  });

  return res.status(201).json(requestItem);
});

router.patch('/requests/:id/status', (req, res) => {
  const { id } = req.params;
  const { status, actor, detail } = req.body as { status: RequestStatus; actor: string; detail?: string };
  const target = store.requests.find((item) => item.id === id);

  if (!target) {
    return res.status(404).json({ message: 'Request not found.' });
  }

  target.status = status;
  target.workflow = syncWorkflowForStatus(target.workflow, status);
  target.lastUpdatedAt = new Date().toISOString();

  store.auditTrail.unshift({
    id: createId('adt'),
    requestId: target.id,
    actor: (actor as FormRequest['workflow'][number]['actor']) ?? 'system',
    action: 'status_changed',
    detail: detail ?? `Request moved to ${status}.`,
    timestamp: target.lastUpdatedAt
  });

  store.notifications.unshift({
    id: createId('ntf'),
    requestId: target.id,
    audience: 'all',
    title: `Status updated to ${status}`,
    message: `${target.trackingNumber} is now in ${status.replaceAll('_', ' ')}.`,
    read: false,
    createdAt: target.lastUpdatedAt
  });

  return res.json(target);
});

router.post('/bundles', (req, res) => {
  const { title, category, requestIds, owner } = req.body as { title: string; category: string; requestIds: string[]; owner: string };
  const linkedRequests = store.requests.filter((item) => requestIds.includes(item.id));

  const bundle = {
    id: createId('bnd'),
    title,
    category,
    requestIds,
    totalAmount: linkedRequests.reduce((sum, item) => sum + item.amount, 0),
    owner: owner ?? 'Procurement',
    status: 'bundled' as const
  };

  store.bundles.unshift(bundle);
  res.status(201).json(bundle);
});

router.get('/notifications', (_req, res) => {
  res.json(store.notifications);
});

router.get('/audit-trail', (_req, res) => {
  res.json(store.auditTrail);
});

router.get('/invoices', (_req, res) => {
  res.json(store.invoices);
});

router.post('/invoices', (req, res) => {
  const payload = req.body as {
    invoiceNumber?: string;
    vendorName?: string;
    vendorTaxId?: string;
    poNumber?: string;
    receiptNumber?: string;
    currency?: string;
    subtotal?: number;
    taxAmount?: number;
    totalAmount?: number;
    dueDate?: string;
    paymentTerms?: string;
    lineItems?: InvoiceLineItem[];
  };

  const required = ['invoiceNumber', 'vendorName', 'poNumber', 'currency', 'dueDate'];
  const missing = required.filter((key) => !payload[key as keyof typeof payload]);

  if (missing.length > 0) {
    return res.status(400).json({ message: `Missing invoice fields: ${missing.join(', ')}` });
  }

  const lineItems = payload.lineItems?.length
    ? payload.lineItems
    : [
        {
          id: createId('line'),
          description: 'Extracted invoice line',
          quantity: 1,
          unitPrice: Number(payload.subtotal ?? payload.totalAmount ?? 0),
          total: Number(payload.subtotal ?? payload.totalAmount ?? 0)
        }
      ];

  const invoice = processInvoice({
    invoiceNumber: String(payload.invoiceNumber),
    vendorName: String(payload.vendorName),
    vendorTaxId: String(payload.vendorTaxId ?? ''),
    poNumber: String(payload.poNumber),
    receiptNumber: String(payload.receiptNumber ?? ''),
    currency: String(payload.currency ?? 'USD'),
    subtotal: Number(payload.subtotal ?? payload.totalAmount ?? 0),
    taxAmount: Number(payload.taxAmount ?? 0),
    totalAmount: Number(payload.totalAmount ?? payload.subtotal ?? 0),
    dueDate: String(payload.dueDate),
    paymentTerms: String(payload.paymentTerms ?? 'Net 30'),
    lineItems
  });

  store.invoices.unshift(invoice);
  store.auditTrail.unshift({
    id: createId('adt'),
    requestId: invoice.id,
    actor: 'system',
    action: 'invoice_processed',
    detail: `Invoice ${invoice.invoiceNumber} processed through OCR, matching, anomaly detection, and payment timing.`,
    timestamp: invoice.updatedAt
  });
  store.notifications.unshift({
    id: createId('ntf'),
    requestId: invoice.id,
    audience: 'finance_controller',
    title: invoice.processingState === 'exception' ? 'Invoice exception routed' : 'Invoice ready for payment review',
    message:
      invoice.processingState === 'exception'
        ? `${invoice.invoiceNumber} has anomalies and was routed to ${invoice.exceptionRoute}.`
        : `${invoice.invoiceNumber} completed processing and has a suggested payment date.`,
    read: false,
    createdAt: invoice.updatedAt
  });

  return res.status(201).json(invoice);
});

router.post('/invoices/:id/run', (req, res) => {
  const target = store.invoices.find((item) => item.id === req.params.id);
  if (!target) {
    return res.status(404).json({ message: 'Invoice not found.' });
  }

  const refreshed = processInvoice(
    {
      invoiceNumber: target.invoiceNumber,
      vendorName: target.vendorName,
      vendorTaxId: target.vendorTaxId,
      poNumber: target.poNumber,
      receiptNumber: target.receiptNumber,
      currency: target.currency,
      subtotal: target.subtotal,
      taxAmount: target.taxAmount,
      totalAmount: target.totalAmount,
      dueDate: target.dueDate,
      paymentTerms: target.paymentTerms,
      lineItems: target.lineItems
    },
    target.id
  );

  Object.assign(target, refreshed, { createdAt: target.createdAt, updatedAt: new Date().toISOString() });
  res.json(target);
});

router.get('/requests/:id/export', (req, res) => {
  const target = store.requests.find((item) => item.id === req.params.id);
  if (!target) {
    return res.status(404).json({ message: 'Request not found.' });
  }

  res.json({
    purchaseRequestNumber: `PR-${target.trackingNumber}`,
    erpSystem: 'ERP / P2P Placeholder',
    request: {
      supplierName: target.supplierName,
      amount: target.amount,
      currency: target.currency,
      budgetCode: target.budgetCode,
      category: target.category,
      justification: target.justification,
      trackingNumber: target.trackingNumber
    },
    downloadable: true,
    format: 'json'
  });
});

router.post('/requests/:id/verify', async (req, res) => {
  const target = store.requests.find((item) => item.id === req.params.id);
  if (!target) {
    return res.status(404).json({ message: 'Request not found.' });
  }

  target.verification = await simulateVerification(target.supplierName);
  target.lastUpdatedAt = new Date().toISOString();
  res.json(target.verification);
});

export default router;
