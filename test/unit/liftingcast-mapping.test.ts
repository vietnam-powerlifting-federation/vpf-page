import { describe, it, expect } from "vitest"
import { division as divisionEnum, sexes } from "~/lib/external/drizzle/migrations/schema"
import { WEIGHT_CLASS_FEMALE, WEIGHT_CLASS_MALE } from "~/lib/constants/constants"
import {
  formatDivision,
  formatSex,
  formatWeightClass,
  normalizeDivisionName,
  parseDivision,
  parseSex,
  parseWeightClass,
} from "~/lib/utils/liftingcast-mapping"

describe("LiftingCast enum mapping", () => {
  describe("round trip", () => {
    // The reverse-mapping rule (§6.3): every export label must import back to the
    // value it came from. If the two directions drift, a meet exports as
    // "Masters 1", fails to import as `mas1`, and the failure only surfaces days
    // later with the results already in hand.
    it("every division survives export → import", () => {
      for (const value of divisionEnum.enumValues) {
        expect(parseDivision(formatDivision(value)), `division ${value}`).toBe(value)
      }
    })

    it("every sex survives export → import", () => {
      for (const value of sexes.enumValues) {
        expect(parseSex(formatSex(value)), `sex ${value}`).toBe(value)
      }
    })

    it("every weight class survives export → import", () => {
      for (const weightClass of WEIGHT_CLASS_MALE) {
        expect(parseWeightClass(formatWeightClass(weightClass, "male"), "male")).toBe(weightClass)
      }
      for (const weightClass of WEIGHT_CLASS_FEMALE) {
        expect(parseWeightClass(formatWeightClass(weightClass, "female"), "female")).toBe(weightClass)
      }
    })
  })

  describe("parseDivision", () => {
    it("strips the sex and equipment prefixes LiftingCast names carry", () => {
      expect(parseDivision("Men's Raw Junior")).toBe("jr")
      expect(parseDivision("Women's Raw Sub-Junior")).toBe("subjr")
      expect(parseDivision("Men's Raw Open")).toBe("open")
      expect(parseDivision("Mens Equipped Masters 2")).toBe("mas2")
    })

    it("accepts the bare names too", () => {
      expect(parseDivision("Open")).toBe("open")
      expect(parseDivision("sub junior")).toBe("subjr")
      expect(parseDivision("Masters III")).toBe("mas3")
    })

    it("returns null for anything unrecognised rather than guessing", () => {
      expect(parseDivision("Police & Fire")).toBeNull()
      expect(parseDivision("Teen 1")).toBeNull()
      expect(parseDivision("")).toBeNull()
      expect(parseDivision(null)).toBeNull()
    })

    it("keeps the last token when the whole name is a prefix word", () => {
      // "Men" alone must not strip down to nothing and then match something.
      expect(normalizeDivisionName("Men")).toBe("men")
      expect(parseDivision("Men")).toBeNull()
    })
  })

  describe("parseWeightClass", () => {
    it("handles the three renderings LiftingCast uses", () => {
      expect(parseWeightClass("74", "male")).toBe(74)
      expect(parseWeightClass("-74", "male")).toBe(74)
      expect(parseWeightClass("120+", "male")).toBe(999)
      expect(parseWeightClass("84+", "female")).toBe(999)
      expect(parseWeightClass("74kg", "male")).toBe(74)
    })

    it("rejects a class that is not valid for that sex", () => {
      // The DB check constraint ties weight class to sex; failing here is far
      // kinder than failing mid-transaction.
      expect(parseWeightClass("84", "male")).toBeNull()
      expect(parseWeightClass("93", "female")).toBeNull()
      expect(parseWeightClass("75", "male")).toBeNull()
      expect(parseWeightClass("", "male")).toBeNull()
    })
  })

  describe("parseSex", () => {
    it("accepts LiftingCast's uppercase export vocabulary", () => {
      expect(parseSex("MALE")).toBe("male")
      expect(parseSex("FEMALE")).toBe("female")
      expect(parseSex("f")).toBe("female")
    })

    it("returns null for anything else", () => {
      expect(parseSex("MX")).toBeNull()
      expect(parseSex("")).toBeNull()
    })
  })

  describe("formatWeightClass", () => {
    it("renders the 999 sentinel as the unlimited class", () => {
      expect(formatWeightClass(999, "male")).toBe("120+")
      expect(formatWeightClass(999, "female")).toBe("84+")
      expect(formatWeightClass(74, "male")).toBe("74")
    })
  })
})
