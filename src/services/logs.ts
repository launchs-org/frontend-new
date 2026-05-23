import { get } from '../lib/api';
import type { LogLine, Metrics } from '../lib/types';

export async function getLogs(
  projectId: string,
  containerId: string,
  params?: { since?: string; limit?: string; pod?: string }
): Promise<LogLine[]> {
  const p: Record<string, string> = {};
  if (params?.since) p.since = params.since;
  if (params?.limit) p.limit = params.limit;
  if (params?.pod) p.pod = params.pod;
  const res = await get<{ logs: LogLine[]; next_cursor: string | null }>(
    `/projects/${projectId}/containers/${containerId}/logs`,
    p,
  );
  return res.logs ?? [];
}

export async function getBuildJobLogs(
  projectId: string,
  buildJobId: string,
  params?: { limit?: string }
): Promise<LogLine[]> {
  const p: Record<string, string> = {};
  if (params?.limit) p.limit = params.limit;
  const res = await get<{ logs: LogLine[]; next_cursor: string | null }>(
    `/projects/${projectId}/build-jobs/${buildJobId}/logs`,
    p,
  );
  return res.logs ?? [];
}

export async function getMetrics(
  projectId: string,
  containerId: string,
  params?: { duration?: string }
): Promise<Metrics> {
  const p: Record<string, string> = {};
  if (params?.duration) p.duration = params.duration;
  return get<Metrics>(`/projects/${projectId}/containers/${containerId}/metrics`, p);
}
