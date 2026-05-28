import { get } from '../lib/api';
import type { TemplateSummary, TemplateDetail } from '../lib/types';

export async function listTemplates(): Promise<TemplateSummary[]> {
  return get<TemplateSummary[]>('/templates');
}

export async function getTemplate(name: string): Promise<TemplateDetail> {
  return get<TemplateDetail>(`/templates/${name}`);
}
