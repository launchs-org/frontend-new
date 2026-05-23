import { get, post, del } from '../lib/api';
import type { Volume, CreateVolumeRequest } from '../lib/types';

export async function listVolumes(projectId: string): Promise<Volume[]> {
  return get<Volume[]>(`/projects/${projectId}/volumes`);
}

export async function createVolume(projectId: string, req: CreateVolumeRequest): Promise<Volume> {
  return post<Volume>(`/projects/${projectId}/volumes`, req);
}

export async function deleteVolume(projectId: string, volumeId: string): Promise<void> {
  return del(`/projects/${projectId}/volumes/${volumeId}`);
}
