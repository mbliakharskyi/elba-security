import { synchronizeUsers } from './users/sync-users';
import { scheduleUsersSynchronize } from './users/schedule-users-syncs';
import { deleteSourceUsers } from './users/delete-users';

export const inngestFunctions = [synchronizeUsers, scheduleUsersSynchronize, deleteSourceUsers];
