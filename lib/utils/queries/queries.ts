import { eq, and, inArray, gte, lte } from "drizzle-orm"
import { db } from "~/lib/external/drizzle/drizzle"
import { legacyMeetResults, meetResults, meets, users } from "~/lib/external/drizzle/migrations/schema"
import { addMetadataToMeetResults } from "~/lib/utils/meet-result"
import { userPublicSelect } from "~/lib/utils/queries/users"
import { sortResultsByKey, type SortKey } from "~/lib/utils/queries/results"
import type { MeetPublic } from "~/types/meets"
import type { Result, LegacyResultRaw, ResultRaw } from "~/types/results"
import type { UserPublic } from "~/types/users"
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
}

export async function getMeetsAndResultsAndAthletes(
  options: GetMeetsAndResultsAndAthletesOptions = {}
): Promise<{
  meets: MeetPublic[]
  results: Result[]
  athletes: UserPublic[]
}> {
  const {
    meetIds,
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
  } = options

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
  const athletesMap = new Map<string, UserPublic>()
  for (const { user } of [...nonLegacyResultsWithUsers, ...legacyResultsWithUsers]) {
    athletesMap.set(user.vpfId, user)
  }

  return {
    meets: returnedMeets,
    results: transformedResults,
    athletes: Array.from(athletesMap.values()),
  }
}