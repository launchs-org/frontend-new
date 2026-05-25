import { get, post, put, del } from '../lib/api';
import type {
  Project,
  CreateProjectRequest,
  Job,
  Snapshot,
  Connection,
  EnvVar,
  UpsertEnvVarsRequest,
  DeleteEnvVarsRequest,
} from '../lib/types';

export async function listProjects(): Promise<Project[]> {
  return get<Project[]>('/projects');
}

export async function createProject(req: CreateProjectRequest): Promise<Project> {
  return post<Project>('/projects', req);
}

export async function getProject(id: string): Promise<Project> {
  return get<Project>(`/projects/${id}`);
}

export async function deleteProject(id: string): Promise<void> {
  return del(`/projects/${id}`);
}

export async function deployProject(id: string): Promise<void> {
  return post(`/projects/${id}/deploy`);
}

export async function listJobs(projectId: string): Promise<Job[]> {
  return get<Job[]>(`/projects/${projectId}/jobs`);
}

export async function listSnapshots(projectId: string): Promise<Snapshot[]> {
  return get<Snapshot[]>(`/projects/${projectId}/snapshots`);
}

export async function restoreSnapshot(projectId: string, snapshotId: string): Promise<void> {
  return post(`/projects/${projectId}/snapshots/${snapshotId}/restore`);
}

export async function listConnections(projectId: string): Promise<Connection[]> {
  return get<Connection[]>(`/projects/${projectId}/connections`);
}

export async function listProjectEnvVars(projectId: string): Promise<EnvVar[]> {
  return get<EnvVar[]>(`/projects/${projectId}/env-vars`);
}

export async function upsertProjectEnvVars(
  projectId: string,
  req: UpsertEnvVarsRequest
): Promise<void> {
  return put<void>(`/projects/${projectId}/env-vars`, req);
}

export async function deleteProjectEnvVars(
  projectId: string,
  req: DeleteEnvVarsRequest
): Promise<void> {
  return del(`/projects/${projectId}/env-vars`, req);
}
