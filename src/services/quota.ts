import { get } from '../lib/api';
import type { QuotaInfo } from '../lib/types';

export async function getMyQuota(): Promise<QuotaInfo> {
  return get<QuotaInfo>('/quota');
}
