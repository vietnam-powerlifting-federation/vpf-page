import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { describe, it, expect } from "vitest"
import {
  bestOf,
  crossCheckBestLifts,
  parseBirthYear,
  parseCsvText,
  parseLiftingCastCsv,
} from "~/lib/utils/liftingcast-csv"
import type { AttemptSet, ReportedTotals } from "~/types/attempts"

const fixture = readFileSync(
  fileURLToPath(new URL("../fixtures/liftingcast/awards-results.csv", import.meta.url)),
  "utf8",
)

function attempts(overrides: Partial<AttemptSet> = {}): AttemptSet {
  return {
    squat1: null, squat2: null, squat3: null,
    bench1: null, bench2: null, bench3: null,
    deadlift1: null, deadlift2: null, deadlift3: null,
    ...overrides,
  }
}

function reported(overrides: Partial<ReportedTotals> = {}): ReportedTotals {
  return { bestSquat: null, bestBench: null, bestDeadlift: null, subtotal: null, total: null, place: null, ...overrides }
}

const codes = (row: { issues: { code: string }[] }) => row.issues.map((issue) => issue.code)

describe("parseCsvText", () => {
  it("handles quoted fields, doubled quotes and CRLF", () => {
    const table = parseCsvText("\"a\",\"b,c\"\r\n\"say \"\"hi\"\"\",2\r\n")
    expect(table).toEqual([["a", "b,c"], ["say \"hi\"", "2"]])
  })

  it("strips a UTF-8 BOM so the first header name is not poisoned", () => {
    expect(parseCsvText("﻿Name,Gender\nA,MALE\n")[0][0]).toBe("Name")
  })

  it("drops trailing blank lines", () => {
    expect(parseCsvText("a,b\n1,2\n\n\n")).toHaveLength(2)
  })
})

describe("parseBirthYear", () => {
  it("reads LiftingCast's DD/MM/YYYY and ISO alike", () => {
    // users.dob is a smallint year, so only the year is ever usable (§6.4).
    expect(parseBirthYear("17/09/2003")).toBe(2003)
    expect(parseBirthYear("2003-09-17")).toBe(2003)
    expect(parseBirthYear("2003")).toBe(2003)
    expect(parseBirthYear("")).toBeNull()
    expect(parseBirthYear("not a date")).toBeNull()
  })
})

describe("bestOf", () => {
  it("is max(attempts, 0), and null only when nothing was attempted", () => {
    expect(bestOf([100, 105, 110])).toBe(110)
    expect(bestOf([100, -105, null])).toBe(100)
    expect(bestOf([-50, -50, -50])).toBe(0)
    expect(bestOf([null, null, null])).toBeNull()
  })
})

describe("crossCheckBestLifts", () => {
  // This is the check that settles §12.1 — whether a failed attempt is a negative
  // weight or a null. It is a blocking error, not a warning: a mis-signed import
  // turns successful lifts into disqualifications across a whole meet.
  it("passes when negatives are failures", () => {
    const issues = crossCheckBestLifts(
      attempts({ squat1: 197.5, squat2: 212.5, squat3: -225 }),
      reported({ bestSquat: 212.5 }),
    )
    expect(issues).toHaveLength(0)
  })

  it("treats a blank Best as 0 when every attempt failed", () => {
    const issues = crossCheckBestLifts(
      attempts({ bench1: -122.5, bench2: -122.5, bench3: -122.5 }),
      reported({ bestBench: null }),
    )
    expect(issues).toHaveLength(0)
  })

  it("blocks when the attempts and the reported best disagree", () => {
    const issues = crossCheckBestLifts(
      attempts({ squat1: -200, squat2: -200, squat3: -200 }),
      reported({ bestSquat: 200 }),
    )
    expect(issues).toHaveLength(1)
    expect(issues[0].severity).toBe("error")
    expect(issues[0].code).toBe("attempts.best_mismatch")
  })
})

describe("parseLiftingCastCsv", () => {
  const { rows, issues } = parseLiftingCastCsv(fixture)

  it("accepts a real LiftingCast export shape", () => {
    expect(issues).toHaveLength(0)
    expect(rows).toHaveLength(8)
  })

  it("rejects a file that is not a results export", () => {
    const result = parseLiftingCastCsv("Name,Nickname\nA,B\n")
    expect(result.rows).toHaveLength(0)
    expect(result.issues[0].code).toBe("file.missing_columns")
    expect(result.issues[0].message.en).toContain("Gender")
  })

  it("maps a clean row with no issues", () => {
    const row = rows[0]
    expect(row.name).toBe("Test Athlete One")
    expect(row.sex).toBe("male")
    expect(row.division).toBe("open")
    expect(row.weightClass).toBe(83)
    expect(row.bodyWeight).toBe(82.5)
    expect(row.memberNumber).toBe("VPF000901")
    expect(row.birthYear).toBe(1995)
    expect(row.attempts.squat3).toBe(110)
    expect(codes(row)).toHaveLength(0)
  })

  it("keeps failed attempts negative and blank attempts null", () => {
    const row = rows[1]
    expect(row.attempts.squat3).toBe(-90)
    expect(row.attempts.bench1).toBe(-50)
    expect(row.attempts.deadlift3).toBeNull()
    expect(codes(row)).toHaveLength(0)
  })

  it("blocks an unmapped division and names the exact string", () => {
    const row = rows[2]
    expect(row.division).toBeNull()
    expect(codes(row)).toContain("division.unmapped")
    expect(row.issues[0].message.en).toContain("Police & Fire")
  })

  it("blocks a non-raw row rather than merging it into the raw rankings", () => {
    // There is no equipment column anywhere in the schema (§3.1, §12.2).
    expect(codes(rows[3])).toContain("equipment.unsupported")
  })

  it("parses the bodyweight trap without complaint — the DQ is derived, not a parse error", () => {
    const row = rows[4]
    expect(row.bodyWeight).toBe(74.5)
    expect(row.weightClass).toBe(74)
    expect(codes(row)).toHaveLength(0)
  })

  it("maps the unlimited class to the 999 sentinel", () => {
    expect(rows[5].weightClass).toBe(999)
    expect(rows[5].division).toBe("mas1")
  })

  it("reads a guest row and a blank member number", () => {
    expect(rows[6].division).toBe("guest")
    expect(rows[6].memberNumber).toBeNull()
  })

  it("blocks a row whose attempts contradict LiftingCast's own best lift", () => {
    expect(codes(rows[7])).toContain("attempts.best_mismatch")
  })

  it("takes none of the points columns", () => {
    // None of the CSV's points columns are GL points: importing IPF Points (the
    // older formula) or Glossbrenner (a different coefficient set) into a GL
    // field would silently corrupt every ranking.
    const parsed = JSON.stringify(rows[0])
    expect(parsed).not.toContain("Wilks")
    expect(parsed).not.toContain("Glossbrenner")
    expect(parsed).not.toContain("gl")
  })
})
