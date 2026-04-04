import { eq, and, inArray, gte, lte, or, isNull, sql } from "drizzle-orm"
import { db } from "~/lib/external/drizzle/drizzle"
import { legacyMeetResults, meetResults, meets, users, vipBenefits } from "~/lib/external/drizzle/migrations/schema"
import { addMetadataToMeetResults } from "~/lib/utils/meet-result"
import { userPublicSelect } from "~/lib/utils/queries/users"
import { sortResultsByKey, type SortKey } from "~/lib/utils/queries/results"
import type { MeetPublic } from "~/types/meets"
import type { Result, LegacyResultRaw, ResultRaw } from "~/types/results"
import type { UserPublic, UserPublicWithDecorators } from "~/types/users"
import type { Division, Sex, MeetType } from "~/types/union-types"

type GetMeetsAndResultsAndAthletesOptions = {
  meetIds?: number[]
  vpfIds?: string[]
  division?: Division
  weightClass?: number
  sex?: Sex
  meetType?: MeetType[]
  minYear?: number
  maxYear?: number
  sort?: SortKey
  hidden?: boolean
  legacy?: boolean
  includeNameDecorators?: boolean
}

export async function getMeetsAndResultsAndAthletes(
  options: GetMeetsAndResultsAndAthletesOptions = {}
): Promise<{
  meets: MeetPublic[]
  results: Result[]
  athletes: UserPublicWithDecorators[]
}> {
  const {
    meetIds: optionMeetIds,
    vpfIds,
    division,
    weightClass,
    sex,
    meetType,
    minYear,
    maxYear,
    sort,
    hidden,
    legacy,
    includeNameDecorators,
  } = options

  // When only vpfIds is provided (e.g. athlete profile), derive meetIds from results for performance
  let meetIds = optionMeetIds
  if ((!meetIds || meetIds.length === 0) && vpfIds && vpfIds.length > 0) {
    const vpfIdCondition = vpfIds.length === 1 ? eq(meetResults.vpfId, vpfIds[0]) : inArray(meetResults.vpfId, vpfIds)
    const legacyVpfCondition = vpfIds.length === 1 ? eq(legacyMeetResults.vpfId, vpfIds[0]) : inArray(legacyMeetResults.vpfId, vpfIds)
    const [modernRows, legacyRows] = await Promise.all([
      db.select({ meetId: meetResults.meetId }).from(meetResults).where(vpfIdCondition),
      db.select({ meetId: legacyMeetResults.meetId }).from(legacyMeetResults).where(legacyVpfCondition),
    ])
    const allMeetIds = [...new Set([...modernRows.map((r) => r.meetId), ...legacyRows.map((r) => r.meetId)])]
    if (allMeetIds.length === 0) {
      return { meets: [], results: [], athletes: [] }
    }
    if (hidden !== undefined) {
      const visible = await db
        .select({ meetId: meets.meetId })
        .from(meets)
        .where(and(inArray(meets.meetId, allMeetIds), eq(meets.hidden, hidden)))
      meetIds = visible.map((m) => m.meetId)
      if (meetIds.length === 0) {
        return { meets: [], results: [], athletes: [] }
      }
    } else {
      meetIds = allMeetIds
    }
  }

  // Build meet filter conditions
  const meetConditions = []
  
  if (meetIds && meetIds.length > 0) {
    meetConditions.push(inArray(meets.meetId, meetIds))
  }
  
  if (meetType && meetType.length > 0) {
    if (meetType.length === 1) {
      meetConditions.push(eq(meets.type, meetType[0]))
    } else {
      meetConditions.push(inArray(meets.type, meetType))
    }
  }
  
  if (minYear !== undefined) {
    meetConditions.push(gte(meets.systemYear, minYear))
  }
  
  if (maxYear !== undefined) {
    meetConditions.push(lte(meets.systemYear, maxYear))
  }
  
  if (hidden !== undefined) {
    meetConditions.push(eq(meets.hidden, hidden))
  }
  
  if (legacy !== undefined) {
    meetConditions.push(eq(meets.legacy, legacy))
  }

  // First, query meets that match the criteria
  const returnedMeets = meetConditions.length > 0
    ? await db
      .select()
      .from(meets)
      .where(and(...meetConditions))
    : await db.select().from(meets)

  if (returnedMeets.length === 0) {
    return {
      meets: [],
      results: [],
      athletes: [],
    }
  }

  const legacyMeetIds = returnedMeets.filter(m => m.legacy === true).map(m => m.meetId)
  const nonLegacyMeetIds = returnedMeets.filter(m => m.legacy === false).map(m => m.meetId)

  // Build result filter conditions
  const buildResultConditions = (table: typeof meetResults | typeof legacyMeetResults) => {
    const conditions = []
    
    if (table === meetResults && nonLegacyMeetIds.length > 0) {
      conditions.push(inArray(table.meetId, nonLegacyMeetIds))
    } else if (table === legacyMeetResults && legacyMeetIds.length > 0) {
      conditions.push(inArray(table.meetId, legacyMeetIds))
    } else {
      // If no meets of this type, return condition that will never match
      return [eq(table.meetId, -1)]
    }
    
    if (vpfIds && vpfIds.length > 0) {
      if (vpfIds.length === 1) {
        conditions.push(eq(table.vpfId, vpfIds[0]))
      } else {
        conditions.push(inArray(table.vpfId, vpfIds))
      }
    }
    
    if (division) {
      conditions.push(eq(table.division, division))
    }
    
    if (weightClass !== undefined) {
      conditions.push(eq(table.weightClass, weightClass))
    }
    
    if (sex) {
      conditions.push(eq(table.sex, sex))
    }
    
    return conditions
  }

  // Query non-legacy results with joins
  const nonLegacyResultsWithUsers = nonLegacyMeetIds.length > 0
    ? await db
      .select({
        meet: meets,
        result: meetResults,
        user: userPublicSelect,
      })
      .from(meetResults)
      .innerJoin(meets, eq(meetResults.meetId, meets.meetId))
      .innerJoin(users, eq(meetResults.vpfId, users.vpfId))
      .where(and(...buildResultConditions(meetResults)))
    : []

  // Query legacy results with joins
  const legacyResultsWithUsers = legacyMeetIds.length > 0
    ? await db
      .select({
        meet: meets,
        result: legacyMeetResults,
        user: userPublicSelect,
      })
      .from(legacyMeetResults)
      .innerJoin(meets, eq(legacyMeetResults.meetId, meets.meetId))
      .innerJoin(users, eq(legacyMeetResults.vpfId, users.vpfId))
      .where(and(...buildResultConditions(legacyMeetResults)))
    : []

  // Extract and transform results
  const nonLegacyResults: ResultRaw[] = nonLegacyResultsWithUsers.map(r => r.result)
  const legacyResults: LegacyResultRaw[] = legacyResultsWithUsers.map(r => r.result)
  const allRawResults: (ResultRaw | LegacyResultRaw)[] = [...nonLegacyResults, ...legacyResults]
  let transformedResults = addMetadataToMeetResults(allRawResults)

  // Apply sorting if specified
  if (sort) {
    transformedResults = sortResultsByKey(transformedResults, sort)
  }

  // Extract unique athletes
  const athletesMap = new Map<string, UserPublicWithDecorators>()
  for (const { user } of [...nonLegacyResultsWithUsers, ...legacyResultsWithUsers]) {
    athletesMap.set(user.vpfId, user)
  }

  if (includeNameDecorators && athletesMap.size > 0) {
    const vpfIds = Array.from(athletesMap.keys())
    const vipMembershipActive = or(
      isNull(users.vipMembershipExpiresAt),
      gte(users.vipMembershipExpiresAt, sql`CURRENT_DATE`),
    )
    const decorators = await db
      .select({
        vpfId: vipBenefits.vpfId,
        decorator1: vipBenefits.decorator1,
        decorator2: vipBenefits.decorator2,
      })
      .from(vipBenefits)
      .innerJoin(users, eq(vipBenefits.vpfId, users.vpfId))
      .where(and(vipMembershipActive, inArray(vipBenefits.vpfId, vpfIds)))
    const decoratorMap = new Map(decorators.map(d => [d.vpfId, { decorator1: d.decorator1, decorator2: d.decorator2 }]))
    for (const [vpfId, athlete] of athletesMap) {
      const dec = decoratorMap.get(vpfId)
      if (dec) athletesMap.set(vpfId, { ...athlete, ...dec })
    }
  }

  return {
    meets: returnedMeets,
    results: transformedResults,
    athletes: Array.from(athletesMap.values()),
  }
}