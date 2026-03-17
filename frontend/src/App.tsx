import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import { api } from './api';
import {
  AuditEntry,
  DashboardData,
  FieldType,
  FormRequest,
  NotificationItem,
  RequestStatus,
  TemplateField,
  TemplateType
} from './types';

type PageKey =
  | 'overview'
  | 'templates'
  | 'requests'
  | 'approvals'
  | 'bundling'
  | 'procurement'
  | 'final'
  | 'notifications'
  | 'audit';

interface BuilderState {
  name: string;
  description: string;
  type: TemplateType;
  category: string;
  createdBy: string;
  fields: TemplateField[];
}

interface RequestDraft {
  templateId: string;
  requesterName: string;
  department: string;
  supplierName: string;
  amount: number;
  currency: string;
  category: string;
  budgetCode: string;
  justification: string;
  trackingNumber: string;
  requiresLegal: boolean;
  requiresInfoSec: boolean;
  needsDataSharingReview: boolean;
  needsStorageReview: boolean;
  formData: Record<string, string | number | boolean>;
}

const navItems: { key: PageKey; label: string; hint: string }[] = [
  { key: 'overview', label: 'Overview', hint: 'Pipeline and health' },
  { key: 'templates', label: 'Template Builder', hint: 'Dynamic intake forms' },
  { key: 'requests', label: 'Submit Request', hint: 'Employee workbench' },
  { key: 'approvals', label: 'Approvals', hint: 'Line manager and budget owner' },
  { key: 'bundling', label: 'Bundling', hint: 'Consolidation queue' },
  { key: 'procurement', label: 'Procurement', hint: 'Commercial review' },
  { key: 'final', label: 'Final Approval', hint: 'Verification and ERP export' },
  { key: 'notifications', label: 'Notifications', hint: 'Progress updates' },
  { key: 'audit', label: 'Audit Trail', hint: 'Finalization log' }
];

const baseFields = (): TemplateField[] => [
  { id: 'base-name', label: 'Employee Name', key: 'employeeName', type: 'text', required: true },
  { id: 'base-tracking', label: 'Tracking Number', key: 'trackingNumber', type: 'text', required: true }
];

const emptyBuilder = (): BuilderState => ({
  name: '',
  description: '',
  type: 'intake',
  category: 'Technology',
  createdBy: 'Workflow Designer',
  fields: [
    ...baseFields(),
    { id: crypto.randomUUID(), label: 'Items / Services', key: 'itemsServices', type: 'textarea', required: true }
  ]
});

const emptyRequestDraft = (): RequestDraft => ({
  templateId: '',
  requesterName: '',
  department: '',
  supplierName: '',
  amount: 0,
  currency: 'USD',
  category: '',
  budgetCode: '',
  justification: '',
  trackingNumber: '',
  requiresLegal: false,
  requiresInfoSec: false,
  needsDataSharingReview: false,
  needsStorageReview: false,
  formData: {}
});

const statusOrder: RequestStatus[] = [
  'submitted',
  'line_manager_review',
  'budget_owner_review',
  'legal_review',
  'infosec_review',
  'consolidation',
  'procurement_review',
  'final_approval',
  'approved',
  'exported'
];

const nextStatusMap: Record<RequestStatus, RequestStatus> = {
  draft: 'submitted',
  submitted: 'line_manager_review',
  line_manager_review: 'budget_owner_review',
  budget_owner_review: 'legal_review',
  legal_review: 'infosec_review',
  infosec_review: 'consolidation',
  consolidation: 'procurement_review',
  procurement_review: 'final_approval',
  final_approval: 'approved',
  approved: 'exported',
  exported: 'exported'
};

const actorForStatus: Partial<Record<RequestStatus, string>> = {
  line_manager_review: 'line_manager',
  budget_owner_review: 'budget_owner',
  legal_review: 'legal',
  infosec_review: 'infosec',
  consolidation: 'procurement',
  procurement_review: 'procurement',
  final_approval: 'finance_controller',
  approved: 'finance_controller',
  exported: 'system'
};

const fieldTypes: FieldType[] = ['text', 'textarea', 'number', 'date', 'select', 'currency', 'checkbox'];

function App() {
  const [page, setPage] = useState<PageKey>('overview');
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [builder, setBuilder] = useState<BuilderState>(emptyBuilder);
  const [draft, setDraft] = useState<RequestDraft>(emptyRequestDraft);
  const [bundleSelection, setBundleSelection] = useState<string[]>([]);
  const [bundleTitle, setBundleTitle] = useState('Q3 Combined Procurement Bundle');
  const [bundleOwner, setBundleOwner] = useState('Procurement Operations');
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const data = await api.getDashboard();
      setDashboard(data);
      if (!draft.templateId && data.templates[0]) {
        setDraft((current) => ({
          ...current,
          templateId: data.templates[0].id,
          category: data.templates[0].category
        }));
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDashboard();
  }, []);

  const templates = dashboard?.templates ?? [];
  const requests = dashboard?.requests ?? [];
  const bundles = dashboard?.bundles ?? [];
  const notifications = dashboard?.notifications ?? [];
  const auditTrail = dashboard?.auditTrail ?? [];

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === draft.templateId) ?? templates[0],
    [draft.templateId, templates]
  );

  useEffect(() => {
    if (!selectedTemplate) {
      return;
    }

    setDraft((current) => ({
      ...current,
      templateId: selectedTemplate.id,
      category: current.category || selectedTemplate.category,
      formData: selectedTemplate.fields.reduce<Record<string, string | number | boolean>>((acc, field) => {
        const existing = current.formData[field.key];
        if (existing !== undefined) {
          acc[field.key] = existing;
        } else {
          acc[field.key] = field.type === 'checkbox' ? false : '';
        }
        return acc;
      }, {})
    }));
  }, [selectedTemplate]);

  const requestSummary = useMemo(() => {
    const totalValue = requests.reduce((sum, item) => sum + item.amount, 0);
    const atFinal = requests.filter((item) => item.status === 'final_approval' || item.status === 'approved').length;
    const risky = requests.filter((item) => item.requiresInfoSec || item.requiresLegal).length;
    return { totalValue, atFinal, risky };
  }, [requests]);

  const updateField = (fieldId: string, patch: Partial<TemplateField>) => {
    setBuilder((current) => ({
      ...current,
      fields: current.fields.map((field) => (field.id === fieldId ? { ...field, ...patch } : field))
    }));
  };

  const addField = () => {
    setBuilder((current) => ({
      ...current,
      fields: [
        ...current.fields,
        {
          id: crypto.randomUUID(),
          label: 'New Field',
          key: 'field_' + Math.random().toString(36).slice(2, 6),
          type: 'text',
          required: false
        }
      ]
    }));
  };

  const removeField = (fieldId: string) => {
    setBuilder((current) => ({
      ...current,
      fields: current.fields.filter((field) => field.id !== fieldId && !['employeeName', 'trackingNumber'].includes(field.key))
    }));
  };

  const handleTemplateSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');

    try {
      await api.createTemplate(builder);
      setBuilder(emptyBuilder());
      setMessage('Template created and ready for employees to use.');
      await loadDashboard();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to create template.');
    }
  };

  const handleRequestSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedTemplate) {
      setError('Select or create a template first.');
      return;
    }

    setError('');
    setMessage('');

    try {
      await api.createRequest({
        ...draft,
        templateId: selectedTemplate.id,
        category: draft.category || selectedTemplate.category,
        formData: {
          ...draft.formData,
          employeeName: draft.requesterName,
          trackingNumber: draft.trackingNumber,
          supplierName: draft.supplierName,
          amount: draft.amount,
          justification: draft.justification,
          budgetCode: draft.budgetCode
        }
      });
      setDraft({
        ...emptyRequestDraft(),
        templateId: selectedTemplate.id,
        category: selectedTemplate.category
      });
      setMessage('Request submitted and auto-routed for approval.');
      setPage('approvals');
      await loadDashboard();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to submit request.');
    }
  };

  const moveRequest = async (requestId: string, currentStatus: RequestStatus, detail: string) => {
    const nextStatus = nextStatusMap[currentStatus];
    const actor = actorForStatus[nextStatus] ?? 'system';
    try {
      setError('');
      setMessage('');
      await api.updateRequestStatus(requestId, nextStatus, actor, detail);
      setMessage('Workflow status updated.');
      await loadDashboard();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Unable to update request.');
    }
  };

  const handleBundleCreate = async () => {
    if (bundleSelection.length === 0) {
      setError('Select at least one request to create a bundle.');
      return;
    }

    try {
      setError('');
      setMessage('');
      const sample = requests.find((item) => item.id === bundleSelection[0]);
      await api.createBundle({
        title: bundleTitle,
        category: sample?.category ?? 'General',
        requestIds: bundleSelection,
        owner: bundleOwner
      });
      setBundleSelection([]);
      setMessage('Bundle created for procurement consolidation.');
      await loadDashboard();
    } catch (bundleError) {
      setError(bundleError instanceof Error ? bundleError.message : 'Unable to create bundle.');
    }
  };

  const handleVerify = async (requestId: string) => {
    try {
      setError('');
      setMessage('');
      await api.verifyRequest(requestId);
      setMessage('Verification refreshed using the current proving configuration.');
      await loadDashboard();
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : 'Unable to verify request.');
    }
  };

  const handleExport = async (requestId: string, trackingNumber: string) => {
    try {
      setError('');
      setMessage('');
      const payload = await api.exportRequest(requestId);
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'purchase-request-' + trackingNumber + '.json';
      link.click();
      URL.revokeObjectURL(url);
      setMessage('ERP / P2P payload downloaded.');
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : 'Unable to export purchase request.');
    }
  };

  const pendingApprovals = requests.filter((item) =>
    ['submitted', 'line_manager_review', 'budget_owner_review', 'legal_review', 'infosec_review'].includes(item.status)
  );
  const bundlingCandidates = requests.filter((item) => ['consolidation', 'procurement_review'].includes(item.status));
  const procurementQueue = requests.filter((item) => item.status === 'procurement_review' || item.status === 'consolidation');
  const finalApprovalQueue = requests.filter((item) => ['final_approval', 'approved', 'exported'].includes(item.status));

  const renderTemplateFieldInput = (field: TemplateField) => {
    const value = draft.formData[field.key];
    const onChange = (nextValue: string | number | boolean) => {
      setDraft((current) => ({
        ...current,
        formData: { ...current.formData, [field.key]: nextValue }
      }));
    };

    if (field.key === 'employeeName' || field.key === 'trackingNumber') {
      return null;
    }

    if (field.type === 'textarea') {
      return (
        <textarea
          value={String(value ?? '')}
          onChange={(event) => onChange(event.target.value)}
          placeholder={field.label}
        />
      );
    }

    if (field.type === 'checkbox') {
      return (
        <label className="checkbox-row" key={field.id}>
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(event) => onChange(event.target.checked)}
          />
          <span>{field.label}</span>
        </label>
      );
    }

    if (field.type === 'select') {
      return (
        <select value={String(value ?? '')} onChange={(event) => onChange(event.target.value)}>
          <option value="">Select</option>
          {(field.options ?? []).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
    }

    return (
      <input
        type={field.type === 'number' || field.type === 'currency' ? 'number' : field.type}
        value={String(value ?? '')}
        onChange={(event) =>
          onChange(field.type === 'number' || field.type === 'currency' ? Number(event.target.value) : event.target.value)
        }
        placeholder={field.label}
      />
    );
  };

  return (
    <div className="shell">
      <aside className="sidebar">
        <div>
          <p className="eyebrow">Procurement workflow</p>
          <h1>Intake & Requisition Manager</h1>
          <p className="sidebar-copy">
            Template-driven procurement intake with routing, bundling, verification, notifications, and auditability.
          </p>
        </div>
        <nav className="nav-list">
          {navItems.map((item) => (
            <button
              key={item.key}
              type="button"
              className={page === item.key ? 'nav-item active' : 'nav-item'}
              onClick={() => setPage(item.key)}
            >
              <span>{item.label}</span>
              <small>{item.hint}</small>
            </button>
          ))}
        </nav>
        <div className="sidebar-card">
          <strong>Extra ideas</strong>
          <p>Supplier risk score, file upload + OCR, SLA timers, duplicate request detection, and ERP mappings per business unit.</p>
        </div>
      </aside>

      <main className="content">
        <section className="hero">
          <div>
            <p className="eyebrow">Workflow aligned to your image</p>
            <h2>Employee request to ERP-ready purchase request</h2>
            <p>
              Mandatory validation, auto-routing to line manager and budget owner, optional Legal and InfoSec routing,
              consolidation, procurement review, final approval, proving, notifications, and audit trail.
            </p>
          </div>
          <div className="hero-badge">
            <span>{templates.length} templates</span>
            <span>{requests.length} active requests</span>
            <span>{notifications.filter((item) => !item.read).length} notifications</span>
          </div>
        </section>

        {message ? <div className="banner success">{message}</div> : null}
        {error ? <div className="banner error">{error}</div> : null}
        {loading ? <div className="panel">Loading dashboard...</div> : null}

        {!loading && page === 'overview' ? (
          <>
            <section className="metrics-grid">
              <MetricCard title="Pipeline Value" value={'$' + requestSummary.totalValue.toLocaleString()} detail="Across all active requests" />
              <MetricCard title="Risk-Routed Requests" value={String(requestSummary.risky)} detail="Legal or InfoSec involved" />
              <MetricCard title="Near Approval" value={String(requestSummary.atFinal)} detail="At final approval or approved" />
              <MetricCard title="Bundles" value={String(bundles.length)} detail="Open consolidation groups" />
            </section>

            <section className="panel">
              <div className="panel-head">
                <div>
                  <p className="eyebrow">Workflow map</p>
                  <h3>Procurement journey</h3>
                </div>
              </div>
              <div className="timeline">
                {statusOrder.filter((status) => status !== 'draft').map((status) => (
                  <div className="timeline-step" key={status}>
                    <span className="status-dot" />
                    <strong>{status.replaceAll('_', ' ')}</strong>
                  </div>
                ))}
              </div>
            </section>

            <section className="panel-grid">
              <Panel title="Recent Requests" subtitle="Quick view into active work">
                {requests.slice(0, 4).map((request) => (
                  <RequestRow key={request.id} request={request} />
                ))}
              </Panel>
              <Panel title="System Enhancements" subtitle="Useful extras to keep">
                <ul className="plain-list">
                  <li>Approval thresholds by spend, category, or entity.</li>
                  <li>Duplicate supplier and duplicate request matching.</li>
                  <li>Supplier onboarding checklist and contract metadata capture.</li>
                  <li>SLA timers, escalation notifications, and overdue review highlighting.</li>
                </ul>
              </Panel>
            </section>
          </>
        ) : null}

        {!loading && page === 'templates' ? (
          <section className="panel-grid">
            <Panel title="Build a Template" subtitle="Users can design intake or requisition forms dynamically">
              <form className="form-grid" onSubmit={handleTemplateSubmit}>
                <input
                  value={builder.name}
                  onChange={(event) => setBuilder({ ...builder, name: event.target.value })}
                  placeholder="Template name"
                />
                <select value={builder.type} onChange={(event) => setBuilder({ ...builder, type: event.target.value as TemplateType })}>
                  <option value="intake">Intake</option>
                  <option value="requisition">Requisition</option>
                </select>
                <input
                  value={builder.category}
                  onChange={(event) => setBuilder({ ...builder, category: event.target.value })}
                  placeholder="Category"
                />
                <input
                  value={builder.createdBy}
                  onChange={(event) => setBuilder({ ...builder, createdBy: event.target.value })}
                  placeholder="Created by"
                />
                <textarea
                  value={builder.description}
                  onChange={(event) => setBuilder({ ...builder, description: event.target.value })}
                  placeholder="Template description"
                />

                <div className="field-builder-list">
                  {builder.fields.map((field) => (
                    <div className="field-builder-card" key={field.id}>
                      <input value={field.label} onChange={(event) => updateField(field.id, { label: event.target.value })} />
                      <input value={field.key} onChange={(event) => updateField(field.id, { key: event.target.value })} />
                      <select value={field.type} onChange={(event) => updateField(field.id, { type: event.target.value as FieldType })}>
                        {fieldTypes.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                      <label className="checkbox-row compact">
                        <input
                          type="checkbox"
                          checked={field.required}
                          onChange={(event) => updateField(field.id, { required: event.target.checked })}
                        />
                        <span>Required</span>
                      </label>
                      <button type="button" className="ghost-button" onClick={() => removeField(field.id)}>
                        Remove
                      </button>
                    </div>
                  ))}
                </div>

                <div className="button-row">
                  <button type="button" className="ghost-button" onClick={addField}>
                    Add field
                  </button>
                  <button type="submit">Save template</button>
                </div>
              </form>
            </Panel>

            <Panel title="Existing Templates" subtitle="Starter templates and any new ones you create">
              {templates.map((template) => (
                <div className="template-card" key={template.id}>
                  <div className="template-head">
                    <div>
                      <strong>{template.name}</strong>
                      <p>{template.description}</p>
                    </div>
                    <StatusPill status={template.type} />
                  </div>
                  <p className="muted">{template.category} · {template.fields.length} fields</p>
                </div>
              ))}
            </Panel>
          </section>
        ) : null}

        {!loading && page === 'requests' ? (
          <section className="panel-grid">
            <Panel title="Employee Submission Form" subtitle="Template-driven intake or requisition request">
              <form className="form-grid" onSubmit={handleRequestSubmit}>
                <select
                  value={selectedTemplate?.id ?? ''}
                  onChange={(event) => setDraft((current) => ({ ...current, templateId: event.target.value }))}
                >
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
                <input
                  value={draft.requesterName}
                  onChange={(event) => setDraft({ ...draft, requesterName: event.target.value })}
                  placeholder="Employee name"
                />
                <input
                  value={draft.trackingNumber}
                  onChange={(event) => setDraft({ ...draft, trackingNumber: event.target.value })}
                  placeholder="Tracking number"
                />
                <input
                  value={draft.department}
                  onChange={(event) => setDraft({ ...draft, department: event.target.value })}
                  placeholder="Department"
                />
                <input
                  value={draft.supplierName}
                  onChange={(event) => setDraft({ ...draft, supplierName: event.target.value })}
                  placeholder="Supplier name"
                />
                <input
                  type="number"
                  value={draft.amount}
                  onChange={(event) => setDraft({ ...draft, amount: Number(event.target.value) })}
                  placeholder="Estimated amount"
                />
                <input
                  value={draft.budgetCode}
                  onChange={(event) => setDraft({ ...draft, budgetCode: event.target.value })}
                  placeholder="Budget code"
                />
                <textarea
                  value={draft.justification}
                  onChange={(event) => setDraft({ ...draft, justification: event.target.value })}
                  placeholder="Business justification"
                />
                <div className="checkbox-grid">
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={draft.requiresLegal}
                      onChange={(event) => setDraft({ ...draft, requiresLegal: event.target.checked })}
                    />
                    <span>Explicit Legal review</span>
                  </label>
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={draft.needsDataSharingReview}
                      onChange={(event) => setDraft({ ...draft, needsDataSharingReview: event.target.checked })}
                    />
                    <span>Data sharing review</span>
                  </label>
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={draft.needsStorageReview}
                      onChange={(event) => setDraft({ ...draft, needsStorageReview: event.target.checked })}
                    />
                    <span>Vendor stores company data</span>
                  </label>
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={draft.requiresInfoSec}
                      onChange={(event) => setDraft({ ...draft, requiresInfoSec: event.target.checked })}
                    />
                    <span>Force InfoSec review</span>
                  </label>
                </div>

                <div className="dynamic-area">
                  <p className="eyebrow">Dynamic template fields</p>
                  <div className="dynamic-grid">
                    {selectedTemplate?.fields.map((field) => (
                      <label key={field.id} className="field-label">
                        <span>
                          {field.label}
                          {field.required ? ' *' : ''}
                        </span>
                        {renderTemplateFieldInput(field)}
                      </label>
                    ))}
                  </div>
                </div>

                <button type="submit">Submit and route</button>
              </form>
            </Panel>

            <Panel title="Routing Rules in this starter" subtitle="How the simple backend decides next reviewers">
              <ul className="plain-list">
                <li>`employeeName` and `trackingNumber` are mandatory on every template.</li>
                <li>Submitted requests route first to line manager and then budget owner.</li>
                <li>Technology or data-sharing requests trigger Legal and InfoSec review.</li>
                <li>Requests then move to bundling, procurement review, final approval, and export.</li>
              </ul>
            </Panel>
          </section>
        ) : null}

        {!loading && page === 'approvals' ? (
          <section className="panel">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Auto-routing</p>
                <h3>Line manager, budget owner, Legal, and InfoSec queues</h3>
              </div>
            </div>
            <div className="request-list">
              {pendingApprovals.map((request) => (
                <div className="request-card" key={request.id}>
                  <div className="request-top">
                    <div>
                      <strong>{request.trackingNumber}</strong>
                      <p>{request.templateName} · {request.requesterName}</p>
                    </div>
                    <StatusPill status={request.status} />
                  </div>
                  <p>{request.justification}</p>
                  <WorkflowView request={request} />
                  <div className="button-row">
                    <button
                      type="button"
                      onClick={() =>
                        moveRequest(request.id, request.status, 'Approval completed and routed to the next stakeholder.')
                      }
                    >
                      Advance workflow
                    </button>
                  </div>
                </div>
              ))}
              {pendingApprovals.length === 0 ? <EmptyState text="No pending approvals right now." /> : null}
            </div>
          </section>
        ) : null}

        {!loading && page === 'bundling' ? (
          <section className="panel-grid">
            <Panel title="Consolidation Queue" subtitle="Bundle similar requests before procurement review">
              {bundlingCandidates.map((request) => (
                <label className="bundle-row" key={request.id}>
                  <input
                    type="checkbox"
                    checked={bundleSelection.includes(request.id)}
                    onChange={(event) =>
                      setBundleSelection((current) =>
                        event.target.checked ? [...current, request.id] : current.filter((item) => item !== request.id)
                      )
                    }
                  />
                  <span>{request.trackingNumber}</span>
                  <small>{request.category}</small>
                  <small>${request.amount.toLocaleString()}</small>
                </label>
              ))}
              {bundlingCandidates.length === 0 ? <EmptyState text="No bundling candidates at the moment." /> : null}
            </Panel>

            <Panel title="Create Bundle" subtitle="Combine similar requests for efficiency">
              <div className="form-grid">
                <input value={bundleTitle} onChange={(event) => setBundleTitle(event.target.value)} placeholder="Bundle title" />
                <input value={bundleOwner} onChange={(event) => setBundleOwner(event.target.value)} placeholder="Owner" />
                <button type="button" onClick={handleBundleCreate}>
                  Create bundle
                </button>
              </div>
              <div className="bundle-list">
                {bundles.map((bundle) => (
                  <div className="template-card" key={bundle.id}>
                    <div className="template-head">
                      <strong>{bundle.title}</strong>
                      <StatusPill status={bundle.status} />
                    </div>
                    <p>{bundle.category} · {bundle.requestIds.length} requests · ${bundle.totalAmount.toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </Panel>
          </section>
        ) : null}

        {!loading && page === 'procurement' ? (
          <section className="panel">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Commercial review</p>
                <h3>Procurement workspace</h3>
              </div>
            </div>
            <div className="request-list">
              {procurementQueue.map((request) => (
                <div className="request-card" key={request.id}>
                  <div className="request-top">
                    <div>
                      <strong>{request.trackingNumber}</strong>
                      <p>{request.supplierName} · {request.department}</p>
                    </div>
                    <StatusPill status={request.status} />
                  </div>
                  <div className="detail-grid">
                    <span>Budget: {request.budgetCode}</span>
                    <span>Amount: ${request.amount.toLocaleString()}</span>
                    <span>Category: {request.category}</span>
                  </div>
                  <div className="button-row">
                    <button
                      type="button"
                      onClick={() =>
                        moveRequest(request.id, request.status, 'Procurement reviewed commercial terms and moved to final approval.')
                      }
                    >
                      Send to final approval
                    </button>
                  </div>
                </div>
              ))}
              {procurementQueue.length === 0 ? <EmptyState text="Procurement queue is clear." /> : null}
            </div>
          </section>
        ) : null}

        {!loading && page === 'final' ? (
          <section className="panel">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Validation</p>
                <h3>Final approval and ERP conversion</h3>
              </div>
            </div>
            <div className="request-list">
              {finalApprovalQueue.map((request) => (
                <div className="request-card" key={request.id}>
                  <div className="request-top">
                    <div>
                      <strong>{request.trackingNumber}</strong>
                      <p>{request.supplierName} · {request.templateName}</p>
                    </div>
                    <StatusPill status={request.status} />
                  </div>
                  <div className="verification-grid">
                    <VerificationTile label="Registrar" value={request.verification.registrarValidated} />
                    <VerificationTile label="AI Proving" value={request.verification.aiProofValidated} />
                    <VerificationTile label="OCR Ready" value={request.verification.ocrExtracted} />
                  </div>
                  <ul className="plain-list compact-list">
                    {request.verification.notes.map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                  <div className="button-row">
                    <button type="button" className="ghost-button" onClick={() => handleVerify(request.id)}>
                      Re-run verification
                    </button>
                    {request.status !== 'exported' ? (
                      <button
                        type="button"
                        onClick={() =>
                          moveRequest(request.id, request.status, 'Finance controller validated and approved the request.')
                        }
                      >
                        Advance status
                      </button>
                    ) : null}
                    <button type="button" onClick={() => handleExport(request.id, request.trackingNumber)}>
                      Download ERP payload
                    </button>
                  </div>
                </div>
              ))}
              {finalApprovalQueue.length === 0 ? <EmptyState text="Nothing is waiting for final approval." /> : null}
            </div>
          </section>
        ) : null}

        {!loading && page === 'notifications' ? (
          <section className="panel">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Alerts</p>
                <h3>Progress notifications</h3>
              </div>
            </div>
            <div className="notification-list">
              {notifications.map((notification) => (
                <NotificationRow key={notification.id} item={notification} />
              ))}
            </div>
          </section>
        ) : null}

        {!loading && page === 'audit' ? (
          <section className="panel">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Traceability</p>
                <h3>Audit trail</h3>
              </div>
            </div>
            <div className="audit-list">
              {auditTrail.map((entry) => (
                <AuditRow key={entry.id} entry={entry} />
              ))}
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}

function MetricCard({ title, value, detail }: { title: string; value: string; detail: string }) {
  return (
    <div className="metric-card">
      <p>{title}</p>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}

function Panel({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function StatusPill({ status }: { status: string }) {
  return <span className={'status-pill status-' + status.replaceAll('_', '-')}>{status.replaceAll('_', ' ')}</span>;
}

function WorkflowView({ request }: { request: FormRequest }) {
  return (
    <div className="workflow-row">
      {request.workflow.map((step) => (
        <div className={'workflow-pill ' + step.status} key={step.actor}>
          {step.label}
        </div>
      ))}
    </div>
  );
}

function RequestRow({ request }: { request: FormRequest }) {
  return (
    <div className="row-item">
      <div>
        <strong>{request.trackingNumber}</strong>
        <p>{request.templateName}</p>
      </div>
      <div className="row-end">
        <span>${request.amount.toLocaleString()}</span>
        <StatusPill status={request.status} />
      </div>
    </div>
  );
}

function NotificationRow({ item }: { item: NotificationItem }) {
  return (
    <div className="row-item">
      <div>
        <strong>{item.title}</strong>
        <p>{item.message}</p>
      </div>
      <div className="row-end">
        <span>{item.audience}</span>
        <small>{new Date(item.createdAt).toLocaleString()}</small>
      </div>
    </div>
  );
}

function AuditRow({ entry }: { entry: AuditEntry }) {
  return (
    <div className="row-item">
      <div>
        <strong>{entry.action}</strong>
        <p>{entry.detail}</p>
      </div>
      <div className="row-end">
        <span>{entry.actor}</span>
        <small>{new Date(entry.timestamp).toLocaleString()}</small>
      </div>
    </div>
  );
}

function VerificationTile({ label, value }: { label: string; value: boolean }) {
  return (
    <div className={value ? 'verification-tile good' : 'verification-tile'}>
      <span>{label}</span>
      <strong>{value ? 'Validated' : 'Pending'}</strong>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="empty-state">{text}</div>;
}

export default App;
