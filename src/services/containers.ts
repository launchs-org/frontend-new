import { get, post, put, del } from '../lib/api';
import type {
  ContainerSummary,
  ContainerDetail,
  CreateContainerFromGitHubRequest,
  CreateContainerFromImageRequest,
  CreateContainerFromTemplateRequest,
  ScaleContainerRequest,
  EnvVar,
  UpsertEnvVarsRequest,
  DeleteEnvVarsRequest,
  Port,
  CreatePortRequest,
  NetworkRoute,
  CreateServiceRouteRequest,
  CreateIngressRouteRequest,
  Mount,
  CreateMountRequest,
  BuildJob,
  ContainerStatusHistory,
} from '../lib/types';

export async function listContainers(projectId: string): Promise<ContainerSummary[]> {
  return get<ContainerSummary[]>(`/projects/${projectId}/containers`);
}

export async function getContainer(projectId: string, containerId: string): Promise<ContainerDetail> {
  return get<ContainerDetail>(`/projects/${projectId}/containers/${containerId}`);
}

export async function createContainerFromGitHub(
  projectId: string,
  req: CreateContainerFromGitHubRequest
): Promise<ContainerSummary> {
  return post<ContainerSummary>(`/projects/${projectId}/containers/deploy`, req);
}

export async function createContainerFromImage(
  projectId: string,
  req: CreateContainerFromImageRequest
): Promise<ContainerSummary> {
  return post<ContainerSummary>(`/projects/${projectId}/containers/deploy-image`, req);
}

export async function createContainerFromTemplate(
  projectId: string,
  req: CreateContainerFromTemplateRequest
): Promise<ContainerSummary> {
  return post<ContainerSummary>(`/projects/${projectId}/containers/from-template`, req);
}

export async function updateContainer(
  projectId: string,
  containerId: string,
  req: Partial<ContainerDetail>
): Promise<ContainerDetail> {
  return put<ContainerDetail>(`/projects/${projectId}/containers/${containerId}`, req);
}

export async function deleteContainer(projectId: string, containerId: string): Promise<void> {
  return del(`/projects/${projectId}/containers/${containerId}`);
}

export async function redeployContainer(projectId: string, containerId: string): Promise<void> {
  return post(`/projects/${projectId}/containers/${containerId}/redeploy`);
}

export async function rebuildContainer(projectId: string, containerId: string): Promise<ContainerSummary> {
  return post<ContainerSummary>(`/projects/${projectId}/containers/${containerId}/rebuild`);
}

export async function scaleContainer(
  projectId: string,
  containerId: string,
  req: ScaleContainerRequest
): Promise<void> {
  return put(`/projects/${projectId}/containers/${containerId}/scale`, req);
}

export async function createWebhook(projectId: string, containerId: string): Promise<{ url: string }> {
  return post<{ url: string }>(`/projects/${projectId}/containers/${containerId}/webhook`);
}

// Env vars
export async function listContainerEnvVars(projectId: string, containerId: string): Promise<EnvVar[]> {
  return get<EnvVar[]>(`/projects/${projectId}/containers/${containerId}/env-vars`);
}

export async function upsertContainerEnvVars(
  projectId: string,
  containerId: string,
  req: UpsertEnvVarsRequest
): Promise<void> {
  return put<void>(`/projects/${projectId}/containers/${containerId}/env-vars`, req);
}

export async function deleteContainerEnvVars(
  projectId: string,
  containerId: string,
  req: DeleteEnvVarsRequest
): Promise<void> {
  return del(`/projects/${projectId}/containers/${containerId}/env-vars`, req);
}

export async function getSelectedProjectEnvVarKeys(projectId: string, containerId: string): Promise<string[]> {
  const res = await get<{ keys: string[] }>(`/projects/${projectId}/containers/${containerId}/selected-project-env-vars`);
  return res.keys ?? [];
}

export async function setSelectedProjectEnvVarKeys(projectId: string, containerId: string, keys: string[]): Promise<void> {
  return put<void>(`/projects/${projectId}/containers/${containerId}/selected-project-env-vars`, { keys });
}

// Ports
export async function listPorts(projectId: string, containerId: string): Promise<Port[]> {
  return get<Port[]>(`/projects/${projectId}/containers/${containerId}/ports`);
}

export async function createPort(
  projectId: string,
  containerId: string,
  req: CreatePortRequest
): Promise<Port> {
  return post<Port>(`/projects/${projectId}/containers/${containerId}/ports`, req);
}

export async function deletePort(projectId: string, containerId: string, portId: string): Promise<void> {
  return del(`/projects/${projectId}/containers/${containerId}/ports/${portId}`);
}

// Routes
export async function listRoutes(projectId: string, containerId: string): Promise<NetworkRoute[]> {
  return get<NetworkRoute[]>(`/projects/${projectId}/containers/${containerId}/routes`);
}

export async function createServiceRoute(
  projectId: string,
  containerId: string,
  req: CreateServiceRouteRequest
): Promise<NetworkRoute> {
  return post<NetworkRoute>(`/projects/${projectId}/containers/${containerId}/routes/service`, req);
}

export async function createIngressRoute(
  projectId: string,
  containerId: string,
  req: CreateIngressRouteRequest
): Promise<NetworkRoute> {
  return post<NetworkRoute>(`/projects/${projectId}/containers/${containerId}/routes/ingress`, req);
}

export async function deleteRoute(
  projectId: string,
  containerId: string,
  routeId: string
): Promise<void> {
  return del(`/projects/${projectId}/containers/${containerId}/routes/${routeId}`);
}

// Mounts
export async function createMount(
  projectId: string,
  containerId: string,
  req: CreateMountRequest
): Promise<Mount> {
  return post<Mount>(`/projects/${projectId}/containers/${containerId}/mounts`, req);
}

export async function deleteMount(
  projectId: string,
  containerId: string,
  volumeId: string
): Promise<void> {
  return del(`/projects/${projectId}/containers/${containerId}/mounts/${volumeId}`);
}

// Build Jobs
export async function listBuildJobs(projectId: string, containerId: string): Promise<BuildJob[]> {
  return get<BuildJob[]>(`/projects/${projectId}/containers/${containerId}/build-jobs`);
}

export async function cancelBuildJob(projectId: string, buildJobId: string): Promise<void> {
  return del(`/projects/${projectId}/build-jobs/${buildJobId}`);
}

// Status Histories
export async function listStatusHistories(
  projectId: string,
  containerId: string
): Promise<ContainerStatusHistory[]> {
  return get<ContainerStatusHistory[]>(
    `/projects/${projectId}/containers/${containerId}/status-histories`
  );
}
