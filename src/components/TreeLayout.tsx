import React, { useMemo, useEffect } from 'react';
import {
    ReactFlow,
    Background,
    Controls,
    Panel,
    type NodeTypes,
    useReactFlow,
    ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { WorldNode }          from './nodes/WorldNode';
import { CloudflareTunnelNode } from './nodes/CloudflareTunnelNode';
import { IngressNode }          from './nodes/IngressNode';
import { ServiceNode }          from './nodes/ServiceNode';
import { ContainerNode }        from './nodes/ContainerNode';
import { VolumeNode }           from './nodes/VolumeNode';
import { PodGroupNode }         from './nodes/PodGroupNode';
import { buildFlow, STATUS_STYLES } from './treeUtils';
import type { ContainerItem } from './treeUtils';

const nodeTypes: NodeTypes = {
    worldNode:          WorldNode,
    cloudflareTunnelNode: CloudflareTunnelNode,
    ingressNode:        IngressNode,
    serviceNode:        ServiceNode,
    containerNode:      ContainerNode,
    volumeNode:         VolumeNode,
    podGroupNode:       PodGroupNode,
};

interface Props {
    containers: ContainerItem[];
    selectedContainerId: string | null;
    onContainerSelect: (id: string, tab?: string) => void;
}

const TreeLayoutContent: React.FC<Props> = ({
    containers,
    selectedContainerId,
    onContainerSelect,
}) => {
    const { fitView } = useReactFlow();

    // inject selection state into container nodes
    const { nodes, edges } = useMemo(() => {
        const flow = buildFlow(containers);
        const isSelected = (cid: string) => cid === selectedContainerId;

        return {
            nodes: flow.nodes.map((n) => {
                if (n.type === 'containerNode') {
                    return {
                        ...n,
                        data: {
                            ...n.data,
                            isSelected: isSelected(n.data.id as string),
                            onSelect: (id: string) => onContainerSelect(id),
                        },
                    };
                }

                if (n.type === 'podGroupNode') {
                    return {
                        ...n,
                        data: {
                            ...n.data,
                            isSelected: isSelected(n.id.replace('group-', '')),
                        },
                    };
                }

                // Make Ingress and Service nodes clickable
                if (n.type === 'ingressNode' || n.type === 'serviceNode') {
                    return {
                        ...n,
                        data: {
                            ...n.data,
                            onSelect: () => {
                                // IDs are like "ingress-<containerId>" or "service-<containerId>"
                                const prefix = n.type === 'ingressNode' ? 'ingress-' : 'service-';
                                const containerId = n.id.slice(prefix.length);
                                if (containerId) onContainerSelect(containerId, 'networking');
                            }
                        }
                    };
                }

                return n;
            }),
            edges: flow.edges.map((e) => {
                const cid = e.data?.containerId as string;
                // group-xxx edges use the container id embedded in containerId
                if (!cid || !isSelected(cid)) return e;

                // Highlight selected path
                let stroke = '#4285f4'; // default blue
                if (e.id.includes('ingress')) stroke = '#a855f7'; // purple
                if (e.id.includes('service')) stroke = '#0ea5e9'; // light blue
                if (e.id.includes('vol'))     stroke = '#f97316'; // orange

                return {
                    ...e,
                    style: {
                        ...e.style,
                        stroke,
                        strokeWidth: 3,
                    },
                };
            }),
        };
    }, [containers, selectedContainerId, onContainerSelect]);

    // Re-center when selection changes or containers update
    useEffect(() => {
        const timer = setTimeout(() => {
            fitView({ duration: 400, padding: 0.2 });
        }, 50);
        return () => clearTimeout(timer);
    }, [selectedContainerId, containers.length, fitView]);

    return (
        <div className="h-full relative">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                fitView
                fitViewOptions={{ padding: 0.2 }}
                minZoom={0.3}
                maxZoom={2}
                nodesDraggable={false}
                nodesConnectable={false}
                elementsSelectable={true}
                proOptions={{ hideAttribution: true }}
            >
                <Background color="#cbd5e1" gap={24} size={1} />
                <Controls className="!shadow-sm !border-gray-100 !rounded-xl !bg-white" showInteractive={false} />

                {/* realtime indicator */}
                <Panel position="top-right">
                    <div className="flex items-center gap-2 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-gray-100 shadow-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-mono text-gray-400 tracking-wide">リアルタイム同期中</span>
                    </div>
                </Panel>

                {/* status legend */}
                <Panel position="bottom-left">
                    <div className="bg-white/95 backdrop-blur-sm px-3 py-2.5 rounded-xl border border-gray-100 shadow-sm flex flex-col gap-1.5">
                        <p className="text-[9px] font-mono text-gray-300 uppercase tracking-widest mb-0.5">Status</p>
                        {Object.entries(STATUS_STYLES).map(([key, val]) => (
                            <div key={key} className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: val.dot }} />
                                <span className="text-[10px] font-mono text-gray-500">{val.label}</span>
                            </div>
                        ))}
                    </div>
                </Panel>

                {/* hint */}
                <Panel position="bottom-right">
                    <span className="text-[9px] font-mono text-gray-300 select-none">
                        scroll to zoom · drag to pan · click container to inspect
                    </span>
                </Panel>
            </ReactFlow>
        </div>
    );
};

export const TreeLayout: React.FC<Props> = (props) => {
    return (
        <ReactFlowProvider>
            <TreeLayoutContent {...props} />
        </ReactFlowProvider>
    );
};
