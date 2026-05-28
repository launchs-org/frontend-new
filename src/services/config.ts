import { get } from '../lib/api';

export interface AppConfig {
  max_volume_size_mb: number;
  min_volume_size_mb: number;
}

export async function getAppConfig(): Promise<AppConfig> {
  return get<AppConfig>('/config');
}
