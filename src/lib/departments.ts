import type { Department } from "./types";

/**
 * The eight desks a Coimbatore City Municipal Corporation ward office actually
 * splits complaints between. Anchors are written the way a complaint arrives,
 * not the way an org chart is written -- the prototype vector is the mean of
 * these, so they have to sit in the same region of embedding space as real text.
 */
export const DEPARTMENTS: Department[] = [
  {
    id: "roads",
    name: "Roads & Infrastructure",
    desk: "Assistant Engineer, Highways",
    anchors: [
      "there is a deep pothole in the middle of the road and two wheelers are skidding",
      "the road surface has broken up completely after the rain, only gravel is left",
      "footpath slabs are broken and cracked, people have to walk on the road",
      "a road cut made for a pipeline was never filled back and the tar is sunken",
      "speed breaker is unpainted and unmarked, vehicles hit it at night",
    ],
  },
  {
    id: "lighting",
    name: "Street Lighting",
    desk: "Assistant Engineer, Electrical",
    anchors: [
      "the street light in front of our house has not been working for weeks",
      "the whole lane is pitch dark at night, none of the lamps are switched on",
      "the street lamp keeps flickering on and off all night",
      "a high mast light at the junction is off and the crossing is unsafe after dark",
      "electric pole wires are hanging loose and sparking near the street lamp",
    ],
  },
  {
    id: "waste",
    name: "Solid Waste Management",
    desk: "Sanitary Inspector, SWM",
    anchors: [
      "the garbage bin is overflowing and waste is spilling onto the street",
      "the corporation lorry has not come to collect our door to door waste for days",
      "people are dumping construction debris and rubbish on the empty plot",
      "wet and dry waste is being mixed and left uncollected at the collection point",
      "garbage is burning in the open near the bin and the smoke is unbearable",
    ],
  },
  {
    id: "water",
    name: "Water Supply",
    desk: "Assistant Engineer, Water Supply",
    anchors: [
      "there has been no drinking water supply in our street for several days",
      "the water coming from the tap is muddy and smells bad, it is not drinkable",
      "the drinking water pipeline has burst and clean water is running down the road",
      "water pressure is so low that it does not reach the overhead tank at all",
      "the public tap and the street hand pump are not working",
    ],
  },
  {
    id: "sewerage",
    name: "Sewerage & Storm Drains",
    desk: "Assistant Engineer, Underground Drainage",
    anchors: [
      "sewage is overflowing from the manhole and flowing onto the road",
      "the manhole cover is missing and the hole is open in the middle of the road",
      "the storm water drain is blocked so the street floods whenever it rains",
      "the open drain has not been desilted, sullage is standing and stinking",
      "drainage water is entering our house compound through the back",
    ],
  },
  {
    id: "health",
    name: "Public Health & Sanitation",
    desk: "Sanitary Officer, Public Health",
    anchors: [
      "stagnant water has collected in the vacant plot and mosquitoes are breeding",
      "fogging and anti larval spraying has not been done in our area at all",
      "a dead animal is lying on the roadside and nobody has removed it",
      "stray dogs are roaming in packs and have bitten people in the street",
      "an eating place is operating in unhygienic conditions next to a drain",
    ],
  },
  {
    id: "planning",
    name: "Town Planning & Encroachment",
    desk: "Assistant Town Planning Officer",
    anchors: [
      "a shop has encroached on the footpath so pedestrians cannot walk",
      "an unauthorised building is coming up without any approved plan",
      "an illegal hoarding and banner has been put up blocking the junction view",
      "a building is being constructed without leaving the setback space",
      "vendors have permanently occupied the public road margin with sheds",
    ],
  },
  {
    id: "parks",
    name: "Parks & Green Cover",
    desk: "Horticulture Officer",
    anchors: [
      "a large tree has fallen across the road and is blocking traffic",
      "a dangerously leaning tree branch is about to fall on the power line",
      "the park play equipment is broken and rusted, children can get hurt",
      "the corporation park is not maintained, grass and weeds have taken over",
      "trees on the avenue have not been trimmed and hide the street light",
    ],
  },
];

export const DEPT_BY_ID = Object.fromEntries(
  DEPARTMENTS.map((d) => [d.id, d])
) as Record<string, Department>;

/**
 * Severity anchors. Urgency is scored by similarity to these, then nudged by a
 * small hazard lexicon -- deliberately not left to a language model, because a
 * priority number a supervisor is judged on should be reproducible.
 */
export const URGENCY_ANCHORS: Record<"P1" | "P2" | "P3", string[]> = {
  P1: [
    "there is an open manhole in the middle of the road with no cover and no barricade",
    "sewage is flowing across the road where people and children have to walk",
    "a tree has fallen and the road is completely blocked, an ambulance cannot pass",
    "there has been no drinking water at all in the whole street for four days",
    "the electric wire is hanging low and sparking where people pass",
    "someone already fell and was injured here, it will happen again today",
  ],
  P2: [
    "the street light has not been working for three weeks and the stretch is dark",
    "the bin has not been cleared for four days and rubbish is spilling out",
    "we get water for only ten minutes and the pressure does not reach the tap",
    "the drain has not been desilted for months and the sullage smells bad",
    "we have complained twice already and nothing has been attended to",
  ],
  P3: [
    "please repaint the faded markings on the speed breaker when convenient",
    "the park grass has not been cut and weeds have grown over the walking track",
    "request for one additional dustbin near the park entrance",
    "please trim the tree branches that have grown across the street lamp",
    "this is a request for improvement rather than a fault, no hurry",
  ],
};

/** Words that reliably raise or lower a priority in a municipal context. */
export const HAZARD_LEXICON: Array<{ re: RegExp; weight: number; label: string }> = [
  { re: /\b(child|children|school|kid|baby|infant)\b/i, weight: 0.06, label: "children exposed" },
  { re: /\b(accident|injur|fell|fall|skid|slip|hit|collid)/i, weight: 0.08, label: "injury reported" },
  { re: /\b(open manhole|manhole cover|uncovered|open hole|open pit)\b/i, weight: 0.1, label: "open hole" },
  { re: /\b(spark|live wire|electric shock|shock|current)\b/i, weight: 0.1, label: "electrical hazard" },
  { re: /\b(ambulance|fire engine|hospital|emergency)\b/i, weight: 0.08, label: "emergency access" },
  { re: /\b(sewage|sewerage|drainage water|faecal|contaminat|dengue|malaria|fever)\b/i, weight: 0.07, label: "health risk" },
  { re: /\b(elderly|old age|pregnant|disabled|wheelchair)\b/i, weight: 0.05, label: "vulnerable resident" },
  { re: /\b(no water|without water|water for \d+ days)\b/i, weight: 0.05, label: "supply outage" },
  { re: /\b(paint|beautif|garden|aesthetic|cosmetic|colour)\b/i, weight: -0.06, label: "cosmetic request" },
];
