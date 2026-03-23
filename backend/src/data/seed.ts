import { AuditEntry, Bundle, DashboardData, FormRequest, FormTemplate, InvoiceRecord, NotificationItem } from '../types/domain.js';

const now = new Date().toISOString();

export const seedTemplates: FormTemplate[] = [
  {
    id: 'tpl-intake-saas',
    name: 'SaaS Intake Form',
    description: 'For software, subscriptions, integrations, and data-sharing reviews.',
    type: 'intake',
    category: 'Technology',
    createdBy: 'Procurement Ops',
    createdAt: now,
    fields: [
      { id: 'f-name', label: 'Employee Name', key: 'employeeName', type: 'text', required: true },
      { id: 'f-track', label: 'Tracking Number', key: 'trackingNumber', type: 'text', required: true },
      { id: 'f-vendor', label: 'Preferred Supplier', key: 'supplierName', type: 'text', required: true },
      { id: 'f-items', label: 'Items / Services', key: 'itemsServices', type: 'textarea', required: true },
      { id: 'f-qty', label: 'Quantity', key: 'quantity', type: 'number', required: true },
      { id: 'f-just', label: 'Business Justification', key: 'justification', type: 'textarea', required: true },
      { id: 'f-budget', label: 'Budget Code', key: 'budgetCode', type: 'text', required: true },
      { id: 'f-data', label: 'Requires Data Sharing?', key: 'needsDataSharingReview', type: 'checkbox', required: false },
      { id: 'f-storage', label: 'Vendor stores company data?', key: 'needsStorageReview', type: 'checkbox', required: false }
    ]
  },
  {
    id: 'tpl-req-general',
    name: 'General Procurement Requisition',
    description: 'For hardware, facilities, and standard service procurement.',
    type: 'requisition',
    category: 'Operations',
    createdBy: 'Finance Controller',
    createdAt: now,
    fields: [
      { id: 'r-name', label: 'Employee Name', key: 'employeeName', type: 'text', required: true },
      { id: 'r-track', label: 'Tracking Number', key: 'trackingNumber', type: 'text', required: true },
      { id: 'r-item', label: 'Requested Item', key: 'requestedItem', type: 'text', required: true },
      { id: 'r-cost', label: 'Estimated Cost', key: 'amount', type: 'currency', required: true },
      { id: 'r-date', label: 'Required By', key: 'requiredBy', type: 'date', required: false },
      { id: 'r-just', label: 'Justification', key: 'justification', type: 'textarea', required: true }
    ]
  }
];

export const seedRequests: FormRequest[] = [
  {
    id: 'req-1001',
    trackingNumber: 'TRK-1001',
    templateId: 'tpl-intake-saas',
    templateName: 'SaaS Intake Form',
    templateType: 'intake',
    requesterName: 'Anita N.',
    department: 'Customer Success',
    supplierName: 'DocFlow AI',
    amount: 12400,
    currency: 'USD',
    category: 'Technology',
    budgetCode: 'CS-2026-11',
    requiresLegal: true,
    requiresInfoSec: true,
    needsDataSharingReview: true,
    needsStorageReview: true,
    justification: 'Centralize customer implementation workflows and automate document intake.',
    status: 'procurement_review',
    submittedAt: now,
    lastUpdatedAt: now,
    formData: {
      employeeName: 'Anita N.',
      trackingNumber: 'TRK-1001',
      supplierName: 'DocFlow AI',
      itemsServices: 'Enterprise workflow and OCR subscription',
      quantity: 100,
      justification: 'Centralize customer implementation workflows and automate document intake.',
      budgetCode: 'CS-2026-11',
      needsDataSharingReview: true,
      needsStorageReview: true
    },
    workflow: [
      { actor: 'employee', label: 'Submitted by employee', status: 'approved', required: true },
      { actor: 'line_manager', label: 'Line manager review', status: 'approved', required: true },
      { actor: 'budget_owner', label: 'Budget owner review', status: 'approved', required: true },
      { actor: 'legal', label: 'Legal review', status: 'approved', required: true },
      { actor: 'infosec', label: 'InfoSec review', status: 'approved', required: true },
      { actor: 'procurement', label: 'Procurement review', status: 'current', required: true },
      { actor: 'finance_controller', label: 'Final approval', status: 'pending', required: true }
    ],
    verification: {
      registrarValidated: true,
      aiProofValidated: false,
      ocrExtracted: true,
      notes: ['Registrar record matched supplier registration number.', 'Awaiting AI proof confidence threshold.']
    }
  },
  {
    id: 'req-1002',
    trackingNumber: 'TRK-1002',
    templateId: 'tpl-req-general',
    templateName: 'General Procurement Requisition',
    templateType: 'requisition',
    requesterName: 'Joel M.',
    department: 'Facilities',
    supplierName: 'Office Axis Ltd',
    amount: 6800,
    currency: 'USD',
    category: 'Operations',
    budgetCode: 'OPS-2026-07',
    requiresLegal: false,
    requiresInfoSec: false,
    needsDataSharingReview: false,
    needsStorageReview: false,
    justification: 'Refresh ergonomic desks for the expanded support floor.',
    status: 'consolidation',
    submittedAt: now,
    lastUpdatedAt: now,
    formData: {
      employeeName: 'Joel M.',
      trackingNumber: 'TRK-1002',
      requestedItem: 'Standing desks',
      amount: 6800,
      justification: 'Refresh ergonomic desks for the expanded support floor.'
    },
    workflow: [
      { actor: 'employee', label: 'Submitted by employee', status: 'approved', required: true },
      { actor: 'line_manager', label: 'Line manager review', status: 'approved', required: true },
      { actor: 'budget_owner', label: 'Budget owner review', status: 'approved', required: true },
      { actor: 'legal', label: 'Legal review', status: 'skipped', required: false },
      { actor: 'infosec', label: 'InfoSec review', status: 'skipped', required: false },
      { actor: 'procurement', label: 'Consolidation / bundling', status: 'current', required: true },
      { actor: 'finance_controller', label: 'Final approval', status: 'pending', required: true }
    ],
    verification: {
      registrarValidated: false,
      aiProofValidated: false,
      ocrExtracted: false,
      notes: ['Verification starts during final approval.']
    }
  }
];

export const seedBundles: Bundle[] = [
  {
    id: 'bnd-001',
    title: 'Q2 Workplace Upgrade Bundle',
    category: 'Operations',
    requestIds: ['req-1002'],
    totalAmount: 6800,
    owner: 'Procurement Analyst Team',
    status: 'open'
  }
];

export const seedInvoices: InvoiceRecord[] = [
  {
    id: 'inv-001',
    invoiceNumber: 'INV-2026-0041',
    vendorName: 'DocFlow AI',
    vendorTaxId: 'TIN-883014',
    poNumber: 'PO-22018',
    receiptNumber: 'RCV-9018',
    currency: 'USD',
    subtotal: 12000,
    taxAmount: 400,
    totalAmount: 12400,
    dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 12).toISOString(),
    paymentTerms: 'Net 15',
    ocrConfidence: 0.96,
    lineItems: [
      { id: 'li-1', description: 'Enterprise workflow subscription', quantity: 100, unitPrice: 120, total: 12000, glCode: '6100-SaaS' }
    ],
    tasks: [
      { key: 'ocr_invoice', label: 'OCR invoice', status: 'completed', detail: 'Invoice image parsed with 96% confidence.' },
      { key: 'extract_line_items', label: 'Extract line items', status: 'completed', detail: '1 line item extracted and normalized.' },
      { key: 'validate_vendor_tax', label: 'Validate vendor + tax info', status: 'completed', detail: 'Vendor and tax ID match master data.' },
      { key: 'match_po_receipt', label: 'Match invoice with PO + receipt', status: 'completed', detail: 'Three-way match succeeded.' },
      { key: 'detect_anomalies', label: 'Detect anomalies / fraud', status: 'completed', detail: 'No duplicate or amount mismatch flags.' },
      { key: 'route_exceptions', label: 'Route exceptions', status: 'completed', detail: 'No exception routing needed.' },
      { key: 'optimize_payment_timing', label: 'Optimize payment timing', status: 'optimized', detail: 'Recommended payment date preserves term compliance.' }
    ],
    anomalies: [],
    exceptionRoute: 'Auto-cleared',
    suggestedPaymentDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 10).toISOString(),
    processingState: 'processed',
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'inv-002',
    invoiceNumber: 'INV-2026-0177',
    vendorName: 'Office Axis Ltd',
    vendorTaxId: 'TIN-554821',
    poNumber: 'PO-22039',
    receiptNumber: 'RCV-0000',
    currency: 'USD',
    subtotal: 6800,
    taxAmount: 0,
    totalAmount: 6800,
    dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5).toISOString(),
    paymentTerms: 'Net 7',
    ocrConfidence: 0.88,
    lineItems: [
      { id: 'li-2', description: 'Standing desks', quantity: 20, unitPrice: 340, total: 6800, glCode: '6400-Facilities' }
    ],
    tasks: [
      { key: 'ocr_invoice', label: 'OCR invoice', status: 'completed', detail: 'OCR succeeded with moderate confidence.' },
      { key: 'extract_line_items', label: 'Extract line items', status: 'completed', detail: '1 line item extracted.' },
      { key: 'validate_vendor_tax', label: 'Validate vendor + tax info', status: 'completed', detail: 'Vendor matched, tax missing on invoice.' },
      { key: 'match_po_receipt', label: 'Match invoice with PO + receipt', status: 'needs_review', detail: 'Receipt record missing for one match leg.' },
      { key: 'detect_anomalies', label: 'Detect anomalies / fraud', status: 'needs_review', detail: 'Short payment term and missing receipt triggered review.' },
      { key: 'route_exceptions', label: 'Route exceptions', status: 'needs_review', detail: 'Routed to AP analyst and receiving team.' },
      { key: 'optimize_payment_timing', label: 'Optimize payment timing', status: 'pending', detail: 'Waiting for exception clearance before scheduling payment.' }
    ],
    anomalies: ['Receipt not found for PO-22039', 'Missing tax on invoice image'],
    exceptionRoute: 'AP analyst + Receiving',
    suggestedPaymentDate: '',
    processingState: 'exception',
    createdAt: now,
    updatedAt: now
  }
];

export const seedNotifications: NotificationItem[] = [
  {
    id: 'ntf-001',
    requestId: 'req-1001',
    audience: 'procurement',
    title: 'Procurement review required',
    message: 'TRK-1001 is ready for procurement commercial review.',
    read: false,
    createdAt: now
  },
  {
    id: 'ntf-002',
    requestId: 'req-1002',
    audience: 'all',
    title: 'Bundling candidate detected',
    message: 'TRK-1002 can be merged into the current facilities furniture bundle.',
    read: false,
    createdAt: now
  },
  {
    id: 'ntf-003',
    requestId: 'inv-002',
    audience: 'finance_controller',
    title: 'Invoice exception needs review',
    message: 'INV-2026-0177 failed receipt matching and has been routed for AP review.',
    read: false,
    createdAt: now
  }
];

export const seedAuditTrail: AuditEntry[] = [
  {
    id: 'adt-001',
    requestId: 'req-1001',
    actor: 'line_manager',
    action: 'approved',
    detail: 'Line manager confirmed team need and quantity.',
    timestamp: now
  },
  {
    id: 'adt-002',
    requestId: 'req-1001',
    actor: 'infosec',
    action: 'reviewed',
    detail: 'Vendor stores customer metadata; DPA required before contracting.',
    timestamp: now
  },
  {
    id: 'adt-003',
    requestId: 'inv-002',
    actor: 'system',
    action: 'invoice_exception_routed',
    detail: 'Invoice INV-2026-0177 routed to AP analyst and receiving after PO/receipt mismatch.',
    timestamp: now
  }
];

export const seedDashboard: DashboardData = {
  templates: seedTemplates,
  requests: seedRequests,
  bundles: seedBundles,
  invoices: seedInvoices,
  notifications: seedNotifications,
  auditTrail: seedAuditTrail
};
