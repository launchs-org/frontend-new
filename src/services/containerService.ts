import { api } from '../lib/api';

export interface CreateContainerFiles {
    name: string;
    repository_url: string;
    branch: string;
    directory: string;
}

const base = '/api/v1';

export const containerService = {
    // ── Projects ────────────────────────────────────────────────
    getProjects: () =>
        api.get(`${base}/projects`),

    getProject: (projectId: string) =>
        api.get(`${base}/projects/${projectId}`),

    createProject: (data: { name: string }) =>
        api.post(`${base}/projects`, data),

    deleteProject: (projectId: string) =>
        api.delete(`${base}/projects/${projectId}`),

    deployProject: (projectId: string) =>
        api.post(`${base}/projects/${projectId}/deploy`),

    getProjectJobs: (projectId: string) =>
        api.get(`${base}/projects/${projectId}/jobs`),

    // ── Project Env Vars ─────────────────────────────────────────
    getProjectEnvVars: (projectId: string) =>
        api.get(`${base}/projects/${projectId}/env-vars`),

    updateProjectEnvVars: (projectId: string, envVars: { key: string; value: string }[]) =>
        api.put(`${base}/projects/${projectId}/env-vars`, { env_vars: envVars }),

    deleteProjectEnvVar: (projectId: string, key: string) =>
        api.delete(`${base}/projects/${projectId}/env-vars`, { data: { key } }),

    // ── Containers ───────────────────────────────────────────────
    getContainers: (projectId: string) =>
        api.get(`${base}/projects/${projectId}/containers`),

    getContainer: (projectId: string, containerId: string) =>
        api.get(`${base}/projects/${projectId}/containers/${containerId}`),

    createContainer: (projectId: string, data: CreateContainerFiles) =>
        api.post(`${base}/projects/${projectId}/containers/deploy`, {
            name: data.name,
            git_repo: data.repository_url,
            git_branch: data.branch,
            git_commit: 'HEAD',
            subdir: data.directory || '.',
        }),

    redeployContainer: (projectId: string, containerId: string) =>
        api.post(`${base}/projects/${projectId}/containers/${containerId}/redeploy`),

    deleteContainer: (projectId: string, containerId: string) =>
        api.delete(`${base}/projects/${projectId}/containers/${containerId}`),

    scaleContainer: (projectId: string, containerId: string, replicas: number) =>
        api.put(`${base}/projects/${projectId}/containers/${containerId}/scale`, { replicas }),

    updateContainer: (projectId: string, containerId: string, data: { resource_size?: string }) =>
        api.put(`${base}/projects/${projectId}/containers/${containerId}`, data),

    createWebhook: (projectId: string, containerId: string) =>
        api.post(`${base}/projects/${projectId}/containers/${containerId}/webhook`),

    // ── Container Env Vars ───────────────────────────────────────
    getContainerEnvVars: (projectId: string, containerId: string) =>
        api.get(`${base}/projects/${projectId}/containers/${containerId}/env-vars`),

    updateContainerEnvVars: (projectId: string, containerId: string, envVars: { key: string; value: string }[]) =>
        api.put(`${base}/projects/${projectId}/containers/${containerId}/env-vars`, { env_vars: envVars }),

    deleteContainerEnvVar: (projectId: string, containerId: string, key: string) =>
        api.delete(`${base}/projects/${projectId}/containers/${containerId}/env-vars`, { data: { key } }),

    // ── Ports ────────────────────────────────────────────────────
    getPorts: (projectId: string, containerId: string) =>
        api.get(`${base}/projects/${projectId}/containers/${containerId}/ports`),

    addPort: (projectId: string, containerId: string, data: { port: number; protocol: 'TCP' | 'UDP' }) =>
        api.post(`${base}/projects/${projectId}/containers/${containerId}/ports`, data),

    deletePort: (projectId: string, containerId: string, portId: string) =>
        api.delete(`${base}/projects/${projectId}/containers/${containerId}/ports/${portId}`),

    // ── Routes ───────────────────────────────────────────────────
    getRoutes: (projectId: string, containerId: string) =>
        api.get(`${base}/projects/${projectId}/containers/${containerId}/routes`),

    createServiceRoute: (projectId: string, containerId: string, data: { port: number; protocol: 'TCP' | 'UDP' }) =>
        api.post(`${base}/projects/${projectId}/containers/${containerId}/routes/service`, data),

    createIngressRoute: (projectId: string, containerId: string, data: { port: number }) =>
        api.post(`${base}/projects/${projectId}/containers/${containerId}/routes/ingress`, data),

    deleteRoute: (projectId: string, containerId: string, routeId: string) =>
        api.delete(`${base}/projects/${projectId}/containers/${containerId}/routes/${routeId}`),

    // ── Build Jobs ───────────────────────────────────────────────
    getBuildJobs: (projectId: string, containerId: string) =>
        api.get(`${base}/projects/${projectId}/containers/${containerId}/build-jobs`),

    getBuildLogs: (projectId: string, buildJobId: string, params?: { cursor?: string; limit?: number }) =>
        api.get(`${base}/projects/${projectId}/build-jobs/${buildJobId}/logs`, { params }),

    stopBuildJob: (projectId: string, buildJobId: string) =>
        api.delete(`${base}/projects/${projectId}/build-jobs/${buildJobId}`),

    // ── Runtime Logs ─────────────────────────────────────────────
    getLogs: (projectId: string, containerId: string, params?: { cursor?: string; limit?: number; pod_name?: string }) =>
        api.get(`${base}/projects/${projectId}/containers/${containerId}/logs`, { params }),

    // ── Metrics ──────────────────────────────────────────────────
    getMetrics: (projectId: string, containerId: string, params: { from: string; to: string; pod_name?: string }) =>
        api.get(`${base}/projects/${projectId}/containers/${containerId}/metrics`, { params }),

    // ── Volumes ──────────────────────────────────────────────────
    getVolumes: (projectId: string) =>
        api.get(`${base}/projects/${projectId}/volumes`),

    createVolume: (projectId: string, data: { name: string; size_mb: number; storage_class?: string }) =>
        api.post(`${base}/projects/${projectId}/volumes`, data),

    deleteVolume: (projectId: string, volumeId: string) =>
        api.delete(`${base}/projects/${projectId}/volumes/${volumeId}`),

    // ── Mounts ───────────────────────────────────────────────────
    mountVolume: (projectId: string, containerId: string, data: { volume_id: string; mount_path: string }) =>
        api.post(`${base}/projects/${projectId}/containers/${containerId}/mounts`, data),

    unmountVolume: (projectId: string, containerId: string, volumeId: string) =>
        api.delete(`${base}/projects/${projectId}/containers/${containerId}/mounts/${volumeId}`),

    createAndMountVolume: async (projectId: string, containerId: string, data: { name: string; size_mb: number; mount_path: string; storage_class?: string }) => {
        const volRes = await api.post(`${base}/projects/${projectId}/volumes`, {
            name: data.name,
            size_mb: data.size_mb,
            storage_class: data.storage_class ?? 'standard',
        });
        const volumeId: string = volRes.data.data.volume_id;
        return api.post(`${base}/projects/${projectId}/containers/${containerId}/mounts`, {
            volume_id: volumeId,
            mount_path: data.mount_path,
        });
    },

    unmountAndDeleteVolume: async (projectId: string, containerId: string, volumeId: string) => {
        await api.delete(`${base}/projects/${projectId}/containers/${containerId}/mounts/${volumeId}`);
        return api.delete(`${base}/projects/${projectId}/volumes/${volumeId}`);
    },

    // ── Templates ────────────────────────────────────────────────
    getTemplates: () =>
        api.get(`${base}/templates`),

    getTemplate: (templateName: string) =>
        api.get(`${base}/templates/${templateName}`),

    deployFromTemplate: (projectId: string, data: {
        name: string;
        template_name: string;
        resource_size?: string;
        params?: Record<string, string>;
        volume_id?: string;
        mount_path?: string;
    }) =>
        api.post(`${base}/projects/${projectId}/containers/from-template`, data),

    // ── Snapshots ────────────────────────────────────────────────
    getSnapshots: (projectId: string) =>
        api.get(`${base}/projects/${projectId}/snapshots`),

    restoreSnapshot: (projectId: string, snapshotId: string) =>
        api.post(`${base}/projects/${projectId}/snapshots/${snapshotId}/restore`),

    // ── Connections ──────────────────────────────────────────────
    getConnections: (projectId: string) =>
        api.get(`${base}/projects/${projectId}/connections`),
};

/**
 * ContainerDetail レスポンスの routes 配列から
 * コンポーネントが扱いやすい service / ingress オブジェクトを合成する。
 */
export function extractRoutesFromContainer(container: any): any {
    if (!container) return container;
    const routes: any[] = container.routes ?? [];

    const serviceRoute = routes.find((r: any) => r.type === 'service') ?? null;
    const ingressRoute = routes.find((r: any) => r.type === 'ingress') ?? null;

    return {
        ...container,
        service: serviceRoute
            ? {
                id: serviceRoute.id,
                is_active: true,
                port: serviceRoute.port,
                protocol: serviceRoute.protocol,
              }
            : null,
        ingress: ingressRoute
            ? {
                id: ingressRoute.id,
                subdomain: ingressRoute.subdomain,
                port: ingressRoute.port,
              }
            : null,
    };
}
