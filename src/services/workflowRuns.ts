import { get } from '../lib/api';
import type { WorkflowRun, WorkflowRunEvent } from '../lib/types';

export async function listWorkflowRuns(projectId: string): Promise<WorkflowRun[]> {
  return get<WorkflowRun[]>(`/projects/${projectId}/workflow-runs`);
}

export async function getWorkflowRunEvents(projectId: string, runId: string): Promise<WorkflowRunEvent[]> {
  return get<WorkflowRunEvent[]>(`/projects/${projectId}/workflow-runs/${runId}/events`);
}
