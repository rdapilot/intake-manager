import { InvoiceLineItem, InvoiceRecord, InvoiceTask } from '../types/domain.js';

interface InvoiceInput {
  invoiceNumber: string;
  vendorName: string;
  vendorTaxId: string;
  poNumber: string;
  receiptNumber: string;
  currency: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  dueDate: string;
  paymentTerms: string;
  lineItems: InvoiceLineItem[];
}

const buildTasks = (
  details: Record<InvoiceTask['key'], { status: InvoiceTask['status']; detail: string }>
): InvoiceTask[] => [
  { key: 'ocr_invoice', label: 'OCR invoice', ...details.ocr_invoice },
  { key: 'extract_line_items', label: 'Extract line items', ...details.extract_line_items },
  { key: 'validate_vendor_tax', label: 'Validate vendor + tax info', ...details.validate_vendor_tax },
  { key: 'match_po_receipt', label: 'Match invoice with PO + receipt', ...details.match_po_receipt },
  { key: 'detect_anomalies', label: 'Detect anomalies / fraud', ...details.detect_anomalies },
  { key: 'route_exceptions', label: 'Route exceptions', ...details.route_exceptions },
  { key: 'optimize_payment_timing', label: 'Optimize payment timing', ...details.optimize_payment_timing }
];

export const processInvoice = (input: InvoiceInput, existingId?: string): InvoiceRecord => {
  const now = new Date().toISOString();
  const anomalies: string[] = [];
  const ocrConfidence = input.vendorTaxId ? 0.97 : 0.89;
  const vendorValid = input.vendorName.trim().length > 2;
  const taxValid = input.vendorTaxId.trim().length > 4;
  const receiptMatched = input.receiptNumber.trim().length > 3 && input.receiptNumber !== 'RCV-0000';
  const poMatched = input.poNumber.trim().length > 3;

  if (!taxValid) {
    anomalies.push('Vendor tax information is incomplete or missing.');
  }

  if (!receiptMatched) {
    anomalies.push('No valid receipt was found for the invoice match.');
  }

  const lineTotal = input.lineItems.reduce((sum, item) => sum + item.total, 0);
  if (Math.abs(lineTotal - input.subtotal) > 0.01) {
    anomalies.push('Extracted line item total does not match invoice subtotal.');
  }

  const dueDate = new Date(input.dueDate);
  const paymentDate = new Date(dueDate);
  paymentDate.setDate(paymentDate.getDate() - (input.paymentTerms.toLowerCase().includes('net 7') ? 1 : 3));

  const exceptionRoute = anomalies.length > 0 ? 'AP analyst + Procurement + Receiving' : 'Auto-cleared';
  const processingState = anomalies.length > 0 ? 'exception' : 'processed';

  const tasks = buildTasks({
    ocr_invoice: {
      status: 'completed',
      detail: `OCR completed with ${(ocrConfidence * 100).toFixed(0)}% confidence.`
    },
    extract_line_items: {
      status: 'completed',
      detail: `${input.lineItems.length} line item(s) extracted and normalized.`
    },
    validate_vendor_tax: {
      status: vendorValid && taxValid ? 'completed' : 'needs_review',
      detail: vendorValid && taxValid ? 'Vendor and tax info validated.' : 'Vendor or tax info needs review.'
    },
    match_po_receipt: {
      status: poMatched && receiptMatched ? 'completed' : 'needs_review',
      detail: poMatched && receiptMatched ? 'PO and receipt matched successfully.' : 'PO or receipt matching failed.'
    },
    detect_anomalies: {
      status: anomalies.length > 0 ? 'needs_review' : 'completed',
      detail: anomalies.length > 0 ? anomalies.join(' ') : 'No anomalies or fraud indicators detected.'
    },
    route_exceptions: {
      status: anomalies.length > 0 ? 'needs_review' : 'completed',
      detail: anomalies.length > 0 ? `Routed to ${exceptionRoute}.` : 'No exception route required.'
    },
    optimize_payment_timing: {
      status: anomalies.length > 0 ? 'pending' : 'optimized',
      detail: anomalies.length > 0 ? 'Payment scheduling waits for exception clearance.' : `Suggested payment date: ${paymentDate.toISOString().slice(0, 10)}.`
    }
  });

  return {
    id: existingId ?? `inv-${Math.random().toString(36).slice(2, 8)}`,
    invoiceNumber: input.invoiceNumber,
    vendorName: input.vendorName,
    vendorTaxId: input.vendorTaxId,
    poNumber: input.poNumber,
    receiptNumber: input.receiptNumber,
    currency: input.currency,
    subtotal: input.subtotal,
    taxAmount: input.taxAmount,
    totalAmount: input.totalAmount,
    dueDate: input.dueDate,
    paymentTerms: input.paymentTerms,
    ocrConfidence,
    lineItems: input.lineItems,
    tasks,
    anomalies,
    exceptionRoute,
    suggestedPaymentDate: anomalies.length > 0 ? '' : paymentDate.toISOString(),
    processingState,
    createdAt: now,
    updatedAt: now
  };
};
