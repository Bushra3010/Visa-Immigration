import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date");
const name = z.string().trim().min(1, "Required").max(60).regex(/^[A-Za-z .'-]+$/, "Use letters only, as on passport");

export const travellerSchema = z.object({
  type: z.enum(["adult", "child", "infant"]),
  title: z.enum(["Mr", "Ms", "Mrs", "Mstr", "Miss"]),
  firstName: name,
  lastName: name,
  gender: z.enum(["male", "female", "other"]),
  dateOfBirth: isoDate,
  nationality: z.string().trim().min(2, "Required").max(60),
  passportNumber: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{6,12}$/, "Enter a valid passport number").optional().or(z.literal("")),
  passportExpiry: isoDate.optional().or(z.literal("")),
  passportCountry: z.string().trim().max(60).optional().or(z.literal("")),
});

export const contactSchema = z.object({
  email: z.email("Enter a valid email"),
  mobile: z.string().trim().regex(/^\+?[0-9\s()-]{7,20}$/, "Enter a valid mobile number"),
});

const AGE_LIMITS = { adult: [12, 120], child: [2, 12], infant: [0, 2] } as const;

function ageOn(dob: string, on: string) {
  return (new Date(on).getTime() - new Date(dob).getTime()) / (365.25 * 86_400_000);
}

/** Validates travellers against the offer (counts, ages, passport rules). */
export function validateTravellers(
  travellers: unknown,
  opts: { passengers: { adults: number; children: number; infants: number }; travelDate: string; lastTravelDate: string; international: boolean },
) {
  const parsed = z.array(travellerSchema).safeParse(travellers);
  if (!parsed.success) return parsed;
  const list = parsed.data;
  const issues: z.core.$ZodIssue[] = [];
  const count = (t: string) => list.filter((x) => x.type === t).length;
  if (count("adult") !== opts.passengers.adults || count("child") !== opts.passengers.children || count("infant") !== opts.passengers.infants) {
    issues.push({ code: "custom", path: [], message: "Traveller count does not match the selected fare", input: travellers });
  }
  list.forEach((t, i) => {
    const age = ageOn(t.dateOfBirth, opts.travelDate);
    const [min, max] = AGE_LIMITS[t.type];
    if (age < min || age >= max) issues.push({ code: "custom", path: [i, "dateOfBirth"], message: `Age must be ${min}–${max - 1} on travel date for ${t.type}`, input: t.dateOfBirth });
    if (opts.international) {
      if (!t.passportNumber) issues.push({ code: "custom", path: [i, "passportNumber"], message: "Passport number is required for international travel", input: "" });
      if (!t.passportExpiry) issues.push({ code: "custom", path: [i, "passportExpiry"], message: "Passport expiry is required", input: "" });
      else if (t.passportExpiry <= opts.lastTravelDate) issues.push({ code: "custom", path: [i, "passportExpiry"], message: "Passport must be valid beyond your travel dates", input: t.passportExpiry });
      if (!t.passportCountry) issues.push({ code: "custom", path: [i, "passportCountry"], message: "Issuing country is required", input: "" });
    }
  });
  return issues.length ? { success: false as const, error: new z.ZodError(issues) } : { success: true as const, data: list };
}

/** Hotel-only bookings need just the lead guest's name. */
export const guestSchema = z.object({
  title: z.enum(["Mr", "Ms", "Mrs", "Mstr", "Miss"]),
  firstName: name,
  lastName: name,
});
