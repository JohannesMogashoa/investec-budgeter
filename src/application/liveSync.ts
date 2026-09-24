import type { Clock, TriggerManager } from '../platform/ports';
import { SettingsRepository } from '../sheets/settingsRepository';
import { SyncStateRepository } from '../sheets/syncStateRepository';

export interface LiveSyncStatus {
  readonly enabled: boolean;
  readonly untilUtc?: string;
  readonly triggerInstalled: boolean;
}

const LIVE_INTERVAL = 5 as const;

export function startLiveSync(
  settings: SettingsRepository,
  state: SyncStateRepository,
  triggers: TriggerManager,
  clock: Clock,
): LiveSyncStatus {
  const until = new Date(clock.now().getTime() + 4 * 60 * 60 * 1000).toISOString();
  settings.set('Live Sync Interval Minutes', String(LIVE_INTERVAL), 'Automatic polling interval.');
  state.save({ liveSyncEnabled: 'true', liveSyncUntilUtc: until });
  triggers.ensureTransactionSync(LIVE_INTERVAL);
  return { enabled: true, untilUtc: until, triggerInstalled: true };
}

export function stopLiveSync(state: SyncStateRepository, triggers: TriggerManager): LiveSyncStatus {
  state.save({ liveSyncEnabled: 'false' });
  triggers.removeTransactionSync();
  return { enabled: false, triggerInstalled: false };
}

export function liveSyncIsActive(
  state: SyncStateRepository,
  triggers: TriggerManager,
  clock: Clock,
): boolean {
  const checkpoint = state.get();
  const active =
    checkpoint.liveSyncEnabled === 'true' &&
    Boolean(checkpoint.liveSyncUntilUtc) &&
    new Date(checkpoint.liveSyncUntilUtc as string).getTime() > clock.now().getTime();
  if (!active && checkpoint.liveSyncEnabled === 'true') {
    state.save({ liveSyncEnabled: 'false' });
    triggers.removeTransactionSync();
  }
  return active;
}

export function getLiveSyncStatus(
  state: SyncStateRepository,
  triggers: TriggerManager,
  clock: Clock,
): LiveSyncStatus {
  const enabled = liveSyncIsActive(state, triggers, clock);
  return {
    enabled,
    untilUtc: state.get().liveSyncUntilUtc,
    triggerInstalled: triggers.hasTransactionSync(),
  };
}
