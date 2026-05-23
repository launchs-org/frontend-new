import { get } from '../lib/api';
import type { TemplateSummary } from '../lib/types';

export async function listTemplates(): Promise<TemplateSummary[]> {
  return get<TemplateSummary[]>('/templates');
}

export async function getTemplate(name: string): Promise<TemplateSummary> {
  return get<TemplateSummary>(`/templates/${name}`);
}
