export const DISQUALIFIED = 99

export const WEIGHT_CLASS_MALE = [53, 59, 66, 74, 83, 93, 105, 120, 999]
export const WEIGHT_CLASS_FEMALE = [43, 47, 52, 57, 63, 69, 76, 84, 999]

export const DIVISION = ["subjr", "jr", "open", "mas1", "mas2", "mas3", "mas4", "guest"]

export const SEX = ["male", "female"]

export const RECORD_CAT_NAME = ["squat", "bench", "deadlift", "total"]

export const RECPRD_DIVISION_OVERRIDE = {
  open: ["open"],
  jr: ["jr", "open"],
  subjr: ["subjr", "jr", "open"],

  mas1: ["mas1", "open"],
  mas2: ["mas2", "mas1", "open"],
  mas3: ["mas3", "mas2", "mas1", "open"],
  mas4: ["mas4", "mas3", "mas2", "mas1", "open"],
}
