import { removeOrganisation } from './organisations/remove-organisation';
import { syncUsers } from './users/sync-users';
import { scheduleUsersSynchronize } from './users/schedule-users-synchronize';
import { deleteUser } from './users/delete-users';

export const inngestFunctions = [
  removeOrganisation,
  syncUsers,
  scheduleUsersSynchronize,
  deleteUser,
];
