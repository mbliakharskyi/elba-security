import { uuid, text, pgTable } from 'drizzle-orm/pg-core';
import { type InferSelectModel } from 'drizzle-orm';

export const Organisation = pgTable('organisation', {
  id: uuid('id').primaryKey(),
  region: text('region').notNull(),
  accessToken: text('access_token').notNull(),
  instanceURL: text('instance_url').notNull(),
});

export type SelectOrganisation = InferSelectModel<typeof Organisation>;
