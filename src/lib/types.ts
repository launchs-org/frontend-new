// ============================================================
// Core Types derived from OpenAPI specification
// ============================================================

export type ProjectStatus = 'pending' | 'active' | 'terminating' | 'failed';

export type ContainerStatus =
  | 'pending'
  | 'building'
  | 'deploying'
  | 'applying'
  | 'running'
  | 'scaling'
  | 'failed'
  | 'stopped';

export type ResourceSize = 'small' | 'medium' | 'large';

export type PortProtocol = 'TCP' | 'UDP';

export type RouteType = 'service' | 'ingress';

export type VolumeStatus = 'pending' | 'bound' | 'lost';

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export type BuildJobStatus = 'pending' | 'running' | 'complete' | 'failed';

export type PodStatusValue =
  | 'Running'
  | 'Pending'
  | 'Failed'
  | 'Succeeded'
  | 'Unknown';

// ============================================================
// Project
// ============================================================

export interface Project {
  id: string;
  name: string;
  slug: string;
  namespace: string;
  status: ProjectStatus;
  container_count: number;
  last_deployed_at: string | null;
  created_at: string;
}

export interface CreateProjectRequest {
  name: string;
}

// ============================================================
// Pod
// ============================================================

export interface PodStatus {
  pod_name: string;
  status: PodStatusValue;
  ready: boolean;
  restart_count: number;
  node_name: string;
  started_at: string | null;
}

// ============================================================
// Container
// ============================================================

export interface ContainerSummary {
  id: string;
  name: string;
  status: ContainerStatus;
  replicas: number;
  ready_replicas: number;
  failed_replicas: number;
  resource_size: ResourceSize;
  active_deploy_workflow_id: string | null;
  active_scale_workflow_id: string | null;
  pods: PodStatus[];
  created_at: string;
  updated_at: string;
}

export interface ContainerDetail extends ContainerSummary {
  git_repo: string | null;
  git_branch: string | null;
  git_subdir: string | null;
  env_vars: EnvVar[];
  ports: Port[];
  routes: NetworkRoute[];
  mounts: Mount[];
}

export interface CreateContainerFromGitHubRequest {
  name: string;
  git_repo: string;
  git_branch: string;
  git_subdir?: string;
  resource_size?: ResourceSize;
}

export interface CreateContainerFromTemplateRequest {
  name: string;
  template_name: string;
  resource_size?: ResourceSize;
}

export interface ScaleContainerRequest {
  replicas: number;
}

// ============================================================
// EnvVar
// ============================================================

export interface EnvVar {
  id: string;
  key: string;
  value: string;
}

export interface UpsertEnvVarsRequest {
  env_vars: { key: string; value: string }[];
}

export interface DeleteEnvVarsRequest {
  keys: string[];
}

// ============================================================
// Port
// ============================================================

export interface Port {
  id: string;
  port: number;
  protocol: PortProtocol;
}

export interface CreatePortRequest {
  port: number;
  protocol: PortProtocol;
}

// ============================================================
// NetworkRoute
// ============================================================

export interface NetworkRoute {
  id: string;
  type: RouteType;
  port: number;
  protocol: string;
  subdomain: string | null;
  cluster_ip: string | null;
  created_at: string;
}

export interface CreateServiceRouteRequest {
  port: number;
  protocol: string;
}

export interface CreateIngressRouteRequest {
  port: number;
  subdomain?: string;
}

// ============================================================
// Volume
// ============================================================

export interface Volume {
  id: string;
  name: string;
  size_mb: number;
  storage_class: string;
  status: VolumeStatus;
  mounts: Mount[];
  created_at: string;
}

export interface CreateVolumeRequest {
  name: string;
  size_mb: number;
  storage_class?: string;
}

export interface Mount {
  id: string;
  volume_id: string;
  volume_name?: string;
  mount_path: string;
  container_id?: string;
}

export interface CreateMountRequest {
  volume_id: string;
  mount_path: string;
}

// ============================================================
// Logs & Metrics
// ============================================================

export interface LogLine {
  timestamp: string;
  level: LogLevel;
  message: string;
  pod_name: string;
}

export interface MetricPoint {
  timestamp: string;
  value: number;
}

export interface Metrics {
  cpu: MetricPoint[];
  memory: MetricPoint[];
}

// ============================================================
// BuildJob
// ============================================================

export interface BuildJob {
  id: string;
  git_repo: string;
  git_branch: string;
  git_commit: string | null;
  status: BuildJobStatus;
  temporal_workflow_id: string | null;
  started_at: string | null;
  finished_at: string | null;
  image_id: string | null;
  created_at: string;
}

// ============================================================
// Template
// ============================================================

export interface TemplateSummary {
  name: string;
  display_name: string;
  category: string;
  description: string;
  version: string;
  icon: string;
  color: string;
}

// ============================================================
// Job
// ============================================================

export interface Job {
  id: string;
  type: string;
  status: string;
  container_id?: string;
  container_name?: string;
  temporal_workflow_id?: string;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
}

// ============================================================
// Snapshot
// ============================================================

export interface Snapshot {
  id: string;
  name?: string;
  description?: string;
  created_at: string;
  container_count: number;
  size_mb?: number;
}

// ============================================================
// Connection
// ============================================================

export interface Connection {
  id: string;
  from_container_id: string;
  from_container_name: string;
  to_container_id: string;
  to_container_name: string;
  port: number;
  protocol: string;
}

// ============================================================
// API Response Wrapper
// ============================================================

export interface ApiResponse<T> {
  data: T;
  error: null | { code: string; message: string };
}
