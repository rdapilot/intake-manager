import { FormRequest, RequestStatus, WorkflowActor, WorkflowStep } from '../types/domain.js';

const actorLabelMap: Record<WorkflowActor, string> = {
  employee: 'Submitted by employee',
  line_manager: 'Line manager review',
  budget_owner: 'Budget owner review',
  legal: 'Legal review',
  infosec: 'InfoSec review',
  procurement: 'Procurement review',
  finance_controller: 'Final approval',
  system: 'System activity'
};

export const buildWorkflow = (input: { requiresLegal: boolean; requiresInfoSec: boolean }): WorkflowStep[] => {
  const steps: WorkflowStep[] = [
    { actor: 'employee', label: actorLabelMap.employee, status: 'approved', required: true },
    { actor: 'line_manager', label: actorLabelMap.line_manager, status: 'current', required: true },
    { actor: 'budget_owner', label: actorLabelMap.budget_owner, status: 'pending', required: true },
    {
      actor: 'legal',
      label: actorLabelMap.legal,
      status: input.requiresLegal ? 'pending' : 'skipped',
      required: input.requiresLegal
    },
    {
      actor: 'infosec',
      label: actorLabelMap.infosec,
      status: input.requiresInfoSec ? 'pending' : 'skipped',
      required: input.requiresInfoSec
    },
    { actor: 'procurement', label: 'Consolidation / procurement review', status: 'pending', required: true },
    { actor: 'finance_controller', label: actorLabelMap.finance_controller, status: 'pending', required: true }
  ];

  return steps;
};

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

export const advanceStatus = (request: FormRequest): RequestStatus => {
  const index = statusOrder.indexOf(request.status);
  if (index < 0 || index === statusOrder.length - 1) {
    return request.status;
  }

  return statusOrder[index + 1];
};

export const syncWorkflowForStatus = (workflow: WorkflowStep[], status: RequestStatus): WorkflowStep[] => {
  const statusToActor: Partial<Record<RequestStatus, WorkflowActor>> = {
    submitted: 'line_manager',
    line_manager_review: 'line_manager',
    budget_owner_review: 'budget_owner',
    legal_review: 'legal',
    infosec_review: 'infosec',
    consolidation: 'procurement',
    procurement_review: 'procurement',
    final_approval: 'finance_controller',
    approved: 'finance_controller',
    exported: 'finance_controller'
  };

  const currentActor = statusToActor[status];

  return workflow.map((step) => {
    if (step.status === 'skipped') {
      return step;
    }

    if (!currentActor) {
      return step;
    }

    if (step.actor === currentActor) {
      return { ...step, status: status === 'approved' || status === 'exported' ? 'approved' : 'current' };
    }

    const currentIndex = workflow.findIndex((item) => item.actor === currentActor);
    const stepIndex = workflow.findIndex((item) => item.actor === step.actor);
    return {
      ...step,
      status: stepIndex < currentIndex ? 'approved' : 'pending'
    };
  });
};
