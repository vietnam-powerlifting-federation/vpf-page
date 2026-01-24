import { relations } from "drizzle-orm/relations"
import { users, userViolations, meets, legacyMeetResults, teams, meetResults } from "./schema"

export const userViolationsRelations = relations(userViolations, ({ one }) => ({
  user: one(users, {
    fields: [userViolations.vpfId],
    references: [users.vpfId]
  }),
}))

export const usersRelations = relations(users, ({ many }) => ({
  userViolations: many(userViolations),
  legacyMeetResults: many(legacyMeetResults),
  meetResults: many(meetResults),
}))

export const legacyMeetResultsRelations = relations(legacyMeetResults, ({ one }) => ({
  meet: one(meets, {
    fields: [legacyMeetResults.meetId],
    references: [meets.meetId]
  }),
  team: one(teams, {
    fields: [legacyMeetResults.teamId],
    references: [teams.teamId]
  }),
  user: one(users, {
    fields: [legacyMeetResults.vpfId],
    references: [users.vpfId]
  }),
}))

export const meetsRelations = relations(meets, ({ many }) => ({
  legacyMeetResults: many(legacyMeetResults),
  meetResults: many(meetResults),
}))

export const teamsRelations = relations(teams, ({ many }) => ({
  legacyMeetResults: many(legacyMeetResults),
  meetResults: many(meetResults),
}))

export const meetResultsRelations = relations(meetResults, ({ one }) => ({
  meet: one(meets, {
    fields: [meetResults.meetId],
    references: [meets.meetId]
  }),
  team: one(teams, {
    fields: [meetResults.teamId],
    references: [teams.teamId]
  }),
  user: one(users, {
    fields: [meetResults.vpfId],
    references: [users.vpfId]
  }),
}))