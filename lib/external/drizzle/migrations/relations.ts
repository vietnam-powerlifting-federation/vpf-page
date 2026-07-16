import { relations } from "drizzle-orm/relations"
import { users, userViolations, competitionBanList, meets, legacyMeetResults, teams, meetResults, vipBenefits, purchases, vipPurchaseMetadata, vpfMembershipPurchaseMetadata, competitionPurchaseMetadata, identityVerifications } from "./schema"

export const userViolationsRelations = relations(userViolations, ({ one }) => ({
  user: one(users, {
    fields: [userViolations.vpfId],
    references: [users.vpfId]
  }),
}))

export const competitionBanListRelations = relations(competitionBanList, ({ one }) => ({
  meet: one(meets, {
    fields: [competitionBanList.meetId],
    references: [meets.meetId]
  }),
  user: one(users, {
    fields: [competitionBanList.vpfId],
    references: [users.vpfId]
  }),
}))

export const usersRelations = relations(users, ({ one, many }) => ({
  vipBenefits: one(vipBenefits),
  userViolations: many(userViolations),
  competitionBans: many(competitionBanList),
  legacyMeetResults: many(legacyMeetResults),
  meetResults: many(meetResults),
  purchases: many(purchases),
  identityVerification: one(identityVerifications, {
    fields: [users.vpfId],
    references: [identityVerifications.vpfId],
  }),
  reviewedIdentityVerifications: many(identityVerifications, { relationName: "reviewer" }),
}))

export const identityVerificationsRelations = relations(identityVerifications, ({ one }) => ({
  user: one(users, {
    fields: [identityVerifications.vpfId],
    references: [users.vpfId],
  }),
  reviewer: one(users, {
    fields: [identityVerifications.reviewedBy],
    references: [users.vpfId],
    relationName: "reviewer",
  }),
}))

export const vipBenefitsRelations = relations(vipBenefits, ({ one }) => ({
  user: one(users, {
    fields: [vipBenefits.vpfId],
    references: [users.vpfId]
  }),
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
  competitionPurchaseMetadata: many(competitionPurchaseMetadata),
  competitionBans: many(competitionBanList),
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

export const purchasesRelations = relations(purchases, ({ one }) => ({
  user: one(users, {
    fields: [purchases.vpfId],
    references: [users.vpfId]
  }),
  approver: one(users, {
    fields: [purchases.approvedBy],
    references: [users.vpfId],
    relationName: "approver"
  }),
  vipMetadata: one(vipPurchaseMetadata),
  vpfMembershipMetadata: one(vpfMembershipPurchaseMetadata),
  competitionMetadata: one(competitionPurchaseMetadata),
}))

export const vipPurchaseMetadataRelations = relations(vipPurchaseMetadata, ({ one }) => ({
  purchase: one(purchases, {
    fields: [vipPurchaseMetadata.purchaseId],
    references: [purchases.purchaseId]
  }),
}))

export const vpfMembershipPurchaseMetadataRelations = relations(vpfMembershipPurchaseMetadata, ({ one }) => ({
  purchase: one(purchases, {
    fields: [vpfMembershipPurchaseMetadata.purchaseId],
    references: [purchases.purchaseId]
  }),
}))

export const competitionPurchaseMetadataRelations = relations(competitionPurchaseMetadata, ({ one }) => ({
  purchase: one(purchases, {
    fields: [competitionPurchaseMetadata.purchaseId],
    references: [purchases.purchaseId]
  }),
  meet: one(meets, {
    fields: [competitionPurchaseMetadata.meetId],
    references: [meets.meetId]
  }),
}))