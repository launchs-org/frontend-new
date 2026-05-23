import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Panel as ResizablePanel, Group, Separator } from 'react-resizable-panels';
import { Plus, ArrowLeft, Loader2, Box, Database, HardDrive } from 'lucide-react';

import { containerService, type CreateContainerFiles } from '../services/containerService';
import { ContainerSidePanel } from '../components/project/ContainerSidePanel';
import { DeployModal } from '../components/project/DeployModal';
import { TemplateDeployModal } from '../components/project/TemplateDeployModal';
import { ProjectVolumesPanel } from '../components/project/ProjectVolumesPanel';
import { TreeLayout } from '../components/TreeLayout';

const DEFAULT_FORM: CreateContainerFiles = {
    name: '', repository_url: '', branch: '', directory: '',
};

const ProjectDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();

    const [project, setProject] = useState<any>(null);
    const [containers, setContainers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [showVolumesPanel, setShowVolumesPanel] = useState(false);
    const [creating, setCreating] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [selectedTab, setSelectedTab] = useState<any>(undefined);
    const [formData, setFormData] = useState<CreateContainerFiles>(DEFAULT_FORM);

    const [notFound, setNotFound] = useState(false);

    const fetchData = useCallback(async (silent = false) => {
        if (!id || notFound) return;
        try {
            if (!silent) setLoading(true);
            const res = await containerService.getProject(id);
            setProject(res.data.data);
            setContainers(res.data.data.containers ?? []);
        } catch (err: any) {
            if (err?.response?.status === 404) {
                setNotFound(true);
            } else {
                console.error('Failed to fetch project:', err);
            }
        } finally {
            if (!silent) setLoading(false);
        }
    }, [id, notFound]);

    useEffect(() => { fetchData(); }, [fetchData]);
    useEffect(() => {
        if (notFound) return;
        const t = setInterval(() => fetchData(true), 3000);
        return () => clearInterval(t);
    }, [fetchData, notFound]);

    const handleContainerSelect = useCallback((cid: string, tab?: any) => {
        if (selectedId === cid && !tab) {
            setSelectedId(null);
            setSelectedTab(undefined);
        } else {
            setSelectedId(cid);
            setSelectedTab(tab);
            setShowVolumesPanel(false);
        }
    }, [selectedId]);

    const handleShowVolumes = () => {
        setShowVolumesPanel(true);
        setSelectedId(null);
        setSelectedTab(undefined);
    };

    const handleCreateContainer = async (evt: React.FormEvent) => {
        evt.preventDefault();
        if (!id) return;
        setCreating(true);
        try {
            await containerService.createContainer(id, formData);
            setShowModal(false);
            setFormData(DEFAULT_FORM);
            fetchData();
        } catch {
            alert('デプロイの開始に失敗しました。');
        } finally {
            setCreating(false);
        }
    };

    if (notFound) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-4">
                <p className="text-sm text-gray-400 font-mono">プロジェクトが見つかりません</p>
                <Link to="/projects" className="text-xs text-blue-500 hover:underline">プロジェクト一覧へ戻る</Link>
            </div>
        );
    }

    if (loading && !project) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-4">
                <Loader2 className="w-9 h-9 text-blue-500 animate-spin" />
                <p className="text-sm text-gray-400 font-mono">読み込み中…</p>
            </div>
        );
    }

    return (
        <div className="h-[calc(100vh-50px)] flex flex-col gap-4 animate-in fade-in duration-400">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
                <div className="flex flex-col gap-1">
                    <Link to="/projects" className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-500 transition-colors w-fit">
                        <ArrowLeft size={13} /> プロジェクト一覧
                    </Link>
                    <div className="flex items-center gap-3">
                        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">{project?.name}</h2>
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-400 text-[10px] font-mono rounded-md">
                            {project?.id?.slice(0, 8)}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleShowVolumes}
                        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl border transition-all active:scale-95 ${showVolumesPanel ? 'bg-gray-900 text-white border-gray-900 hover:bg-gray-800' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:shadow-md hover:-translate-y-0.5'}`}
                    >
                        <HardDrive size={16} /> ボリューム管理
                    </button>
                    <button
                        onClick={() => setShowTemplateModal(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-white text-gray-700 text-sm font-semibold rounded-xl border border-gray-200 hover:bg-gray-50 hover:shadow-md hover:-translate-y-0.5 transition-all active:scale-95"
                    >
                        <Database size={16} /> テンプレートから追加
                    </button>
                    <button
                        onClick={() => setShowModal(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-blue-500 text-white text-sm font-semibold rounded-xl hover:bg-blue-600 hover:shadow-lg hover:-translate-y-0.5 transition-all active:scale-95"
                    >
                        <Plus size={16} /> コンテナを追加
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-hidden rounded-2xl border border-gray-100 shadow-sm bg-white">
                <Group className="h-full">
                    <ResizablePanel defaultSize={selectedId || showVolumesPanel ? 60 : 100} minSize={30} className="h-full">
                        {containers.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full gap-3 bg-gray-50 text-gray-300">
                                <Box size={36} strokeWidth={1} />
                                <p className="text-sm font-mono">コンテナがありません</p>
                            </div>
                        ) : (
                            <TreeLayout
                                containers={containers}
                                selectedContainerId={selectedId}
                                onContainerSelect={handleContainerSelect}
                            />
                        )}
                    </ResizablePanel>

                    {(selectedId || showVolumesPanel) && (
                        <>
                            <Separator className="w-1 bg-gray-100 hover:bg-blue-500/20 active:bg-blue-500/30 transition-colors cursor-col-resize" />
                            <ResizablePanel defaultSize={40} minSize={25} className="h-full bg-white">
                                <div className="h-full border-l border-gray-50 overflow-hidden w-full">
                                    {selectedId ? (
                                        <ContainerSidePanel
                                            containerId={selectedId}
                                            containerData={containers.find(c => c.id === selectedId) ?? null}
                                            initialTab={selectedTab}
                                            onClose={() => {
                                                setSelectedId(null);
                                                setSelectedTab(undefined);
                                            }}
                                        />
                                    ) : (
                                        <ProjectVolumesPanel
                                            projectId={id!}
                                            onClose={() => setShowVolumesPanel(false)}
                                        />
                                    )}
                                </div>
                            </ResizablePanel>
                        </>
                    )}
                </Group>
            </div>

            {showModal && (
                <DeployModal
                    formData={formData}
                    setFormData={setFormData}
                    onSubmit={handleCreateContainer}
                    onClose={() => setShowModal(false)}
                    creating={creating}
                />
            )}

            {showTemplateModal && id && (
                <TemplateDeployModal
                    projectId={id}
                    onClose={() => setShowTemplateModal(false)}
                    onDeployed={() => { setShowTemplateModal(false); fetchData(); }}
                />
            )}
        </div>
    );
};

export default ProjectDetail;
