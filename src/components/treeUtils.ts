import type { Node, Edge } from '@xyflow/react';

export const STATUS_STYLES = {
    Running:     { dot: '#22c55e', bg: '#f0fdf4', text: '#15803d', border: '#86efac', label: '実行中' },
    Pending:     { dot: '#f59e0b', bg: '#fffbeb', text: '#92400e', border: '#fcd34d', label: '準備中' },
    Failed:      { dot: '#ef4444', bg: '#fef2f2', text: '#991b1b', border: '#fca5a5', label: '失敗' },
    Deploying:   { dot: '#3b82f6', bg: '#eff6ff', text: '#1e40af', border: '#93c5fd', label: 'デプロイ中' },
    Redeploying: { dot: '#3b82f6', bg: '#eff6ff', text: '#1e40af', border: '#93c5fd', label: '再デプロイ中' },
    Scaling:     { dot: '#06b6d4', bg: '#ecfeff', text: '#0e7490', border: '#67e8f9', label: 'スケール中' },
    Building:    { dot: '#8b5cf6', bg: '#f5f3ff', text: '#5b21b6', border: '#ddd6fe', label: 'ビルド中' },
    Queued:      { dot: '#64748b', bg: '#f8fafc', text: '#334155', border: '#e2e8f0', label: '待機中' },
    Unknown:     { dot: '#9ca3af', bg: '#f9fafb', text: '#4b5563', border: '#d1d5db', label: '不明' },
} as const;

export const getStatus = (s?: string) =>
    STATUS_STYLES[s as keyof typeof STATUS_STYLES] ?? STATUS_STYLES.Unknown;

export interface ContainerItem {
    id: string;
    name: string;
    status?: string;
    repository_url?: string;
    branch?: string;
    version?: string;
    replicas?: number;
    container_type?: string;
    template_name?: string;
    image_id?: string;
    ingress?: { subdomain?: string; status?: string };
    service?: { type?: string; ports?: any; is_active?: boolean; internal_ip?: string; external_ip?: string; status?: string };
    volumes?: { id: string; name?: string; mount_path?: string; size_mb?: number }[];
}

// ─── Layout constants ────────────────────────────────────────────────────────
const COL_WORLD     =   0;
const COL_TUNNEL    = 180;
const COL_INGRESS   = 400;
const COL_SERVICE   = 620;
const COL_CONTAINER = 880;

// Pod card size
const CARD_W = 260;
const CARD_H = 160;  // h-40

// Grid layout inside the group
const GRID_COLS   = 2;
const GRID_GAP_X  = 16;
const GRID_GAP_Y  = 16;
const GROUP_PAD   = 20;  // padding inside group border
const LABEL_H     = 28;  // space above group for the label bar

// Compute group box size for `count` pods
function groupSize(count: number) {
    const cols = Math.min(count, GRID_COLS);
    const rows = Math.ceil(count / GRID_COLS);
    const w = GROUP_PAD * 2 + cols * CARD_W + (cols - 1) * GRID_GAP_X;
    const h = GROUP_PAD * 2 + rows * CARD_H + (rows - 1) * GRID_GAP_Y;
    return { w, h };
}

// Y position of pod card `i` within the group (relative to group top-left)
function podPos(i: number) {
    const col = i % GRID_COLS;
    const row = Math.floor(i / GRID_COLS);
    return {
        x: GROUP_PAD + col * (CARD_W + GRID_GAP_X),
        y: GROUP_PAD + row * (CARD_H + GRID_GAP_Y),
    };
}

export function buildFlow(containers: ContainerItem[]): { nodes: Node[]; edges: Edge[] } {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // Pre-compute cumulative Y positions
    const rowTops: number[] = [];
    let cursor = 0;
    for (const c of containers) {
        rowTops.push(cursor);
        const reps = Math.min(Math.max(c.replicas ?? 1, 1), 5);
        const { h } = groupSize(reps);
        // replicas=1: just a plain card; replicas>1: group box + label space
        cursor += (reps === 1 ? CARD_H : LABEL_H + h) + 80;
    }

    const totalH = cursor - 80;
    const globalCenter = totalH / 2;

    nodes.push({
        id: 'world',
        type: 'worldNode',
        position: { x: COL_WORLD, y: globalCenter - 40 },
        data: {},
    });

    nodes.push({
        id: 'cf-tunnel',
        type: 'cloudflareTunnelNode',
        position: { x: COL_TUNNEL, y: globalCenter - 40 },
        data: {},
    });
    edges.push(edge('e-world-cf', 'world', 'cf-tunnel'));

    containers.forEach((c, idx) => {
        const cy = rowTops[idx];
        const replicas = Math.min(Math.max(c.replicas ?? 1, 1), 5);
        const { w: gw, h: gh } = groupSize(replicas);

        // Vertical center used to align Ingress/Service nodes
        const groupH = replicas === 1 ? CARD_H : LABEL_H + gh;
        const cyCenter = cy + groupH / 2;

        let prevId: string | undefined = undefined;
        const hasActiveService = c.service?.is_active;

        if (c.ingress && hasActiveService) {
            const nid = `ingress-${c.id}`;
            nodes.push({
                id: nid, type: 'ingressNode',
                position: { x: COL_INGRESS, y: cyCenter - 40 },
                data: { subdomain: c.ingress.subdomain, status: c.ingress.status },
            });
            edges.push(edge(`e-cf-${nid}`, 'cf-tunnel', nid, false, c.id));
            prevId = nid;
        }

        if (c.service?.is_active) {
            const nid = `service-${c.id}`;
            nodes.push({
                id: nid, type: 'serviceNode',
                position: { x: COL_SERVICE, y: cyCenter - 40 },
                data: {
                    type: c.service.type,
                    ports: c.service.ports,
                    internal_ip: c.service.internal_ip,
                    external_ip: c.service.external_ip,
                    status: c.service.status,
                    is_active: c.service.is_active,
                },
            });
            if (prevId) edges.push(edge(`e-${prevId}-${nid}`, prevId, nid, false, c.id));
            prevId = nid;
        }

        if (replicas === 1) {
            // ── Single pod: plain ContainerNode, no group ──────────────────
            nodes.push({
                id: c.id, type: 'containerNode',
                position: { x: COL_CONTAINER, y: cy },
                data: {
                    id: c.id, name: c.name, status: c.status,
                    branch: c.branch, replicas: 1,
                    repo: c.repository_url, version: c.version,
                    container_type: c.container_type,
                    template_name: c.template_name,
                    image_id: c.image_id,
                },
            });
            if (prevId) edges.push(edge(`e-${prevId}-${c.id}`, prevId, c.id, false, c.id));
        } else {
            // ── Multiple pods: group wrapper + child pod cards ─────────────
            const groupId = `group-${c.id}`;
            const groupY = cy + LABEL_H;

            nodes.push({
                id: groupId, type: 'podGroupNode',
                position: { x: COL_CONTAINER, y: groupY },
                style: { width: gw, height: gh },
                data: { name: c.name, status: c.status, replicas },
            });
            if (prevId) edges.push(edge(`e-${prevId}-${groupId}`, prevId, groupId, false, c.id));

            for (let i = 0; i < replicas; i++) {
                const podId = i === 0 ? c.id : `${c.id}-pod-${i}`;
                const { x: px, y: py } = podPos(i);
                nodes.push({
                    id: podId, type: 'containerNode',
                    parentId: groupId,
                    extent: 'parent',
                    position: { x: px, y: py },
                    data: {
                        id: c.id, name: c.name, status: c.status,
                        branch: c.branch, replicas,
                        repo: c.repository_url, version: c.version,
                        container_type: c.container_type,
                        template_name: c.template_name,
                        image_id: c.image_id,
                        podIndex: i,
                        isInGroup: true,
                    },
                });
            }
        }

        // Volume column: right of the actual group/card width
        const volX = replicas === 1
            ? COL_CONTAINER + CARD_W + 80
            : COL_CONTAINER + gw + 80;

        // Edge source: group node when replicas>1 (child nodes can't be edge sources),
        // otherwise the plain container card
        const volEdgeSource = replicas === 1 ? c.id : `group-${c.id}`;

        (c.volumes ?? []).forEach((vol, vi) => {
            const nid = `vol-${vol.id}`;
            const vOffset = (vi - (c.volumes!.length - 1) / 2) * 90;
            nodes.push({
                id: nid, type: 'volumeNode',
                position: { x: volX, y: cyCenter - 40 + vOffset },
                data: { name: vol.name, mountPath: vol.mount_path, size: vol.size_mb },
            });
            edges.push(edge(`e-${c.id}-${nid}`, volEdgeSource, nid, true, c.id));
        });
    });

    return { nodes, edges };
}

function edge(id: string, source: string, target: string, dashed = false, containerId?: string): Edge {
    return {
        id, source, target,
        type: 'smoothstep',
        animated: !dashed,
        data: { containerId },
        style: {
            stroke: dashed ? '#fed7aa' : '#cbd5e1',
            strokeWidth: 2,
            strokeDasharray: dashed ? '5 3' : undefined,
        },
    };
}
