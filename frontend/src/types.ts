export type TemplateType = 'intake' | 'requisition';
export type FieldType = 'text' | 'textarea' | 'number' | 'date' | 'select' | 'currency' | 'checkbox';
export type RequestStatus =
  | 'draft'
  | 'submitted'
  | 'line_manager_review'
  | 'budget_owner_review'
  | 'legal_review'
  | 'infosec_review'
  | 'consolidation'
  | 'procurement_review'
  | 'final_approval'
  | 'approved'
  | 'exported';

export type WorkflowActor =
  | 'employee'
  | 'line_manager'
  | 'budget_owner'
  | 'legal'
  | 'infosec'
  | 'procurement'
  | 'finance_controller'
  | 'system';

export interface TemplateField {
  id: string;
  label: string;
  key: string;
  type: FieldType;
  required: boolean;
  helpText?: string;
  options?: string[];
}

export interface FormTemplate {
  id: string;
  name: string;
  description: string;
  type: TemplateType;
  category: string;
  fields: TemplateField[];
  createdBy: string;
  createdAt: string;
}

export interface WorkflowStep {
  actor: WorkflowActor;
  label: string;
  status: 'pending' | 'current' | 'approved' | 'skipped';
  required: boolean;
}

export interface VerificationResult {
  registrarValidated: boolean;
  aiProofValidated: boolean;
  ocrExtracted: boolean;
  notes: string[];
}

export interface FormRequest {
  id: string;
  trackingNumber: string;
  templateId: string;
  templateName: string;
  templateType: TemplateType;
  requesterName: string;
  department: string;
  supplierName: string;
  amount: number;
  currency: string;
  category: string;
  budgetCode: string;
  requiresLegal: boolean;
  requiresInfoSec: boolean;
  needsDataSharingReview: boolean;
  needsStorageReview: boolean;
  justification: string;
  status: RequestStatus;
  workflow: WorkflowStep[];
  formData: Record<string, string | number | boolean>;
  verification: VerificationResult;
  submittedAt: string;
  lastUpdatedAt: string;
}

export interface Bundle {
  id: string;
  title: string;
  category: string;
  requestIds: string[];
  totalAmount: number;
  owner: string;
  status: 'open' | 'bundled' | 'converted';
}

export interface NotificationItem {
  id: string;
  requestId: string;
  audience: WorkflowActor | 'all';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface AuditEntry {
  id: string;
  requestId: string;
  actor: WorkflowActor;
  action: string;
  detail: string;
  timestamp: string;
}

export interface DashboardData {
  templates: FormTemplate[];
  requests: FormRequest[];
  bundles: Bundle[];
  notifications: NotificationItem[];
  auditTrail: AuditEntry[];
}
