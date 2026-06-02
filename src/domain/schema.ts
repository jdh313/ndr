import { z } from "zod";

const Wikilink = z.string();

// Atom ids must be quoted 4-digit zero-padded strings. An unquoted `id: 0128`
// parses as the number 128 and is rejected — atom files must quote the id.
const AtomIdString = z
  .string()
  .regex(/^\d{4}$/, "id must be a 4-digit zero-padded string");

const SlugString = z
  .string()
  .regex(/^[a-z0-9][a-z0-9-]*$/, "slug must be kebab-case");

const IsoDate = z.union([
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "decision_date must be ISO YYYY-MM-DD"),
  z.date(),
]);

export const StatusSchema = z.enum(["current", "superseded", "retracted"]);
export const ReversibilitySchema = z.enum(["easy", "medium", "hard"]);

export const FrontmatterSchema = z.object({
  id: AtomIdString,
  title: z.string().min(1),
  status: StatusSchema,
  decision_date: IsoDate,
  aliases: z.array(SlugString).default([]),

  project: Wikilink,

  derived_from: z.array(Wikilink).default([]),
  informed_by: z.array(Wikilink).default([]),
  supersedes: z.array(Wikilink),
  superseded_by: z.array(Wikilink).default([]),

  area: z.string().min(1),
  topic: z.string().min(1),
  impacts: z.array(Wikilink).default([]),

  revisit_triggers: z.array(z.string()).default([]),

  reversibility: ReversibilitySchema,
  tags: z.array(z.string()).default([]),
});

export type Frontmatter = z.infer<typeof FrontmatterSchema>;
