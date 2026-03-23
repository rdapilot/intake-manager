CREATE TABLE IF NOT EXISTS templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('intake', 'requisition')),
  category TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  fields JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS requests (
  id TEXT PRIMARY KEY,
  tracking_number TEXT NOT NULL UNIQUE,
  template_id TEXT NOT NULL REFERENCES templates(id),
  template_name TEXT NOT NULL,
  template_type TEXT NOT NULL,
  requester_name TEXT NOT NULL,
  department TEXT NOT NULL,
  supplier_name TEXT NOT NULL,
  amount NUMERIC(14,2) NOT NULL,
  currency TEXT NOT NULL,
  category TEXT NOT NULL,
  budget_code TEXT NOT NULL,
  requires_legal BOOLEAN NOT NULL,
  requires_infosec BOOLEAN NOT NULL,
  needs_data_sharing_review BOOLEAN NOT NULL,
  needs_storage_review BOOLEAN NOT NULL,
  justification TEXT NOT NULL,
  status TEXT NOT NULL,
  workflow JSONB NOT NULL,
  form_data JSONB NOT NULL,
  verification JSONB NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL,
  last_updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS bundles (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  request_ids JSONB NOT NULL,
  total_amount NUMERIC(14,2) NOT NULL,
  owner TEXT NOT NULL,
  status TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  invoice_number TEXT NOT NULL UNIQUE,
  vendor_name TEXT NOT NULL,
  vendor_tax_id TEXT NOT NULL,
  po_number TEXT NOT NULL,
  receipt_number TEXT NOT NULL,
  currency TEXT NOT NULL,
  subtotal NUMERIC(14,2) NOT NULL,
  tax_amount NUMERIC(14,2) NOT NULL,
  total_amount NUMERIC(14,2) NOT NULL,
  due_date TIMESTAMPTZ NOT NULL,
  payment_terms TEXT NOT NULL,
  ocr_confidence NUMERIC(5,2) NOT NULL,
  line_items JSONB NOT NULL,
  tasks JSONB NOT NULL,
  anomalies JSONB NOT NULL,
  exception_route TEXT NOT NULL,
  suggested_payment_date TIMESTAMPTZ,
  processing_state TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL,
  audience TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_trail (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  detail TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL
);
