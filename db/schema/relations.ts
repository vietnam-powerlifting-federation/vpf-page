import { relations } from "drizzle-orm/relations"
import { meetInfo, legacyMeetResult, teams, members, meetResult } from "./schema"

export const legacyMeetResultRelations = relations(legacyMeetResult, ({ one }) => ({
  meetInfo: one(meetInfo, {
    fields: [legacyMeetResult.meetId],
    references: [meetInfo.meetId]
  }),
  team: one(teams, {
    fields: [legacyMeetResult.teamId],
    references: [teams.teamId]
  }),
  member: one(members, {
    fields: [legacyMeetResult.vpfId],
    references: [members.vpfId]
  }),
}))

export const meetInfoRelations = relations(meetInfo, ({ many }) => ({
  legacyMeetResults: many(legacyMeetResult),
  meetResults: many(meetResult),
}))

export const teamsRelations = relations(teams, ({ many }) => ({
  legacyMeetResults: many(legacyMeetResult),
  meetResults: many(meetResult),
}))

export const membersRelations = relations(members, ({ many }) => ({
  legacyMeetResults: many(legacyMeetResult),
  meetResults: many(meetResult),
}))

export const meetResultRelations = relations(meetResult, ({ one }) => ({
  meetInfo: one(meetInfo, {
    fields: [meetResult.meetId],
    references: [meetInfo.meetId]
  }),
  team: one(teams, {
    fields: [meetResult.teamId],
    references: [teams.teamId]
  }),
  member: one(members, {
    fields: [meetResult.vpfId],
    references: [members.vpfId]
  }),
}))