import { z } from "zod";

// Atom ids are either legacy 4-digit zero-padded strings or 6-char lowercase
// base32 (ndr:0144) — both must be quoted. An unquoted `id: 0128` parses as the
// number 128 and is rejected. Keep in lockstep with ATOM_ID_PATTERN in atom.ts.
const AtomIdString = z
  .string()
  .regex(
    /^(?:\d{4}|[0-9a-z]{6})$/,
    "id must be a 4-digit zero-padded string (legacy) or 6-char lowercase base32",
  );

const IsoDate = z.union([
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "decision_date must be ISO YYYY-MM-DD"),
  z.date(),
]);

export const StatusSchema = z.enum(["current", "superseded", "retracted"]);

// How strongly the decision is held — sets the bar a supersession proposal
// must clear. Required with no default: a default invites never thinking
// about it (same rationale as supersedes-presence).
export const ConvictionSchema = z.enum(["strong", "tentative", "arbitrary"]);

// `.strict()` so removed legacy fields (area, topic, tags, aliases, impacts,
// reversibility, revisit_triggers) are rejected rather than silently carried —
// an un-migrated atom must surface as schema_invalid, not pass with baggage.
export const FrontmatterSchema = z
  .object({
    id: AtomIdString,
    title: z.string().min(1),
    status: StatusSchema,
    decision_date: IsoDate,
    author: z.string().min(1),
    conviction: ConvictionSchema,

    // Plain string, never the pre-migration wikilink form. Rejected rather
    // than stripped: source data gets fixed, the schema does not coerce
    // (ndr:0139). `ndr migrate` strips the brackets on the migration path.
    project: z
      .string()
      .min(1)
      .refine((v) => !/^\[\[.*\]\]$/.test(v), {
        message: "project must be a plain string, not a wikilink — write `ndr`, not `[[ndr]]`",
      }),

    labels: z.array(z.string().min(1)).min(1).max(4),
    binds: z.array(z.string().min(1)).default([]),

    supersedes: z.array(AtomIdString),
    superseded_by: z.array(AtomIdString).default([]),
    derived_from: z.array(z.string()).default([]),
    informed_by: z.array(AtomIdString).default([]),
  })
  .strict();

export type Frontmatter = z.infer<typeof FrontmatterSchema>;
