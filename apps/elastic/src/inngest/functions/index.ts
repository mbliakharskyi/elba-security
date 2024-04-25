import { syncUsers } from './users/sync-users';
import { scheduleUsersSyncs } from './users/schedule-users-syncs';
import { deleteUser } from './users/delete-user';

export const inngestFunctions = [syncUsers, scheduleUsersSyncs, deleteUser];
