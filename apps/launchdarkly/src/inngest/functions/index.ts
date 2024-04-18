import { synchronizeUsers } from './users/synchronize-users';
import { scheduleUsersSynchronize } from './users/schedule-users-sync';
import { deleteSourceUsers } from './users/delete-users';

export const inngestFunctions = [synchronizeUsers, scheduleUsersSynchronize, deleteSourceUsers];
