export const CONFERENCE = {
  name: "SOMUN",
  edition: "'26",
  tagline: "Three days of charged debate, negotiation and diplomacy.",
  dates: "OCTOBER 16 — 18, 2026",
  venue: "Hyderabad International Convention Centre",
  city: "Hyderabad, India",
  email: "secretariat@somun.in",
  phone: "+91 98480 22123",
  countdownTarget: new Date("2026-10-16T09:00:00+05:30"),
};

export type Difficulty = "Beginner" | "Intermediate" | "Advanced";

export interface Committee {
  slug: string;
  acronym: string;
  name: string;
  difficulty: Difficulty;
  delegates: number;
  agendas: string[];
  description: string;
}

export const COMMITTEES: Committee[] = [
  {
    slug: "unsc",
    acronym: "UNSC",
    name: "United Nations Security Council",
    difficulty: "Advanced",
    delegates: 15,
    agendas: [
      "De-escalation of the Red Sea Maritime Crisis",
      "Reforming counter-terrorism sanctions regimes",
    ],
    description:
      "The most powerful chamber in the world. Fifteen delegations negotiating binding resolutions under Chapter VII — speed, leverage and veto politics decide everything.",
  },
  {
    slug: "disec",
    acronym: "DISEC",
    name: "UNGA First Committee — Disarmament & International Security",
    difficulty: "Intermediate",
    delegates: 60,
    agendas: [
      "Regulating lethal autonomous weapons systems",
      "Preventing an arms race in outer space",
    ],
    description:
      "The First Committee of the General Assembly tackles the weapons of tomorrow. Expect fierce bloc politics as delegates chart the future of global disarmament.",
  },
  {
    slug: "unhrc",
    acronym: "UNHRC",
    name: "United Nations Human Rights Council",
    difficulty: "Intermediate",
    delegates: 47,
    agendas: [
      "Human rights in active conflict zones",
      "Protecting digital privacy and freedom of expression",
    ],
    description:
      "Geneva's conscience arrives in Hyderabad. The Council examines state accountability where it is most contested — inside conflicts and across the open internet.",
  },
  {
    slug: "who",
    acronym: "WHO",
    name: "World Health Organization",
    difficulty: "Beginner",
    delegates: 50,
    agendas: [
      "A global pandemic preparedness and response treaty",
      "Mental health in the age of hyperconnectivity",
    ],
    description:
      "Post-pandemic diplomacy at its sharpest. Delegates balance sovereignty, science and funding to write the next chapter of global health governance.",
  },
  {
    slug: "unesco",
    acronym: "UNESCO",
    name: "UN Educational, Scientific & Cultural Organization",
    difficulty: "Beginner",
    delegates: 38,
    agendas: [
      "Ethics of artificial intelligence in education",
      "Preserving world heritage sites in conflict regions",
    ],
    description:
      "Where classrooms meet code and cathedrals meet cannons. UNESCO asks how humanity protects what it teaches and treasures when both are under threat.",
  },
  {
    slug: "uncsw",
    acronym: "UNCSW",
    name: "Commission on the Status of Women",
    difficulty: "Intermediate",
    delegates: 45,
    agendas: [
      "Advancing the Women, Peace and Security agenda",
      "Closing the gender digital divide",
    ],
    description:
      "Since 1946 the Commission has driven the fight for equality. This session confronts the newest frontiers — conflict mediation and access to the digital economy.",
  },
  {
    slug: "unicef",
    acronym: "UNICEF",
    name: "United Nations Children's Fund",
    difficulty: "Beginner",
    delegates: 40,
    agendas: [
      "Protection of children in armed conflict",
      "Universal access to early childhood education",
    ],
    description:
      "Advocacy for the youngest voices in the room. UNICEF drafts practical frameworks that protect children caught between frontlines and forgotten school systems.",
  },
  {
    slug: "aippm",
    acronym: "AIPPM",
    name: "All India Political Parties Meet",
    difficulty: "Advanced",
    delegates: 32,
    agendas: [
      "Simultaneous elections — 'One Nation, One Poll'",
      "Deliberation on comprehensive electoral reforms",
    ],
    description:
      "India's loudest political theatre, distilled. Party leaders cross the floor in a raucous hunt for consensus on the republic's most contested reform questions.",
  },
  {
    slug: "ip",
    acronym: "IP",
    name: "International Press — Journalism · Caricature · Photography",
    difficulty: "Intermediate",
    delegates: 24,
    agendas: [
      "Live coverage and critique of committee proceedings",
      "Editorial board meeting — the SOMUN Charter",
    ],
    description:
      "Delegates who hold the diplomats accountable. Reporters, caricaturists and photojournalists publish daily bulletins that shape — and shake — every committee.",
  },
];

/* Curated artwork for the committees deck — photography from the
   secretariat archive + commissioned pieces, one plate per chamber. */
export interface CommitteeArt {
  photo: string;
  figure?: string;
  credit: string;
}

export const COMMITTEE_ART: Record<string, CommitteeArt> = {
  unsc: {
    photo: "/images/committees/unsc.png",
    figure: "/images/committees/justice.png",
    credit: "Plate I — The Horseshoe · with Lady Justice",
  },
  disec: {
    photo: "/images/committees/disec.png",
    figure: "/images/committees/relic.png",
    credit: "Plate II — The Podium · with the Ceremonial Blade",
  },
  unhrc: {
    photo: "/images/committees/unhrc-uprising.jpg",
    credit: "Plate III — The Uprising · oil on canvas",
  },
  who: {
    photo: "/images/committees/who.png",
    credit: "Plate IV — Panacea's Desk",
  },
  unesco: {
    photo: "/images/committees/unesco-art.jpg",
    credit: "Plate V — Untitled · Art Expo Tehran",
  },
  uncsw: {
    photo: "/images/committees/uncsw.png",
    credit: "Plate VI — Voice, Unmoved",
  },
  unicef: {
    photo: "/images/committees/unicef.png",
    credit: "Plate VII — A Small Desk, A Large World",
  },
  aippm: {
    photo: "/images/committees/aippm.png",
    credit: "Plate VIII — The House",
  },
  ip: {
    photo: "/images/committees/ip-collage.jpg",
    credit: "Plate IX — Torn Pages · Press Room Collage",
  },
};

export interface DaySchedule {
  day: string;
  date: string;
  weekday: string;
  events: { time: string; title: string; detail: string; type: "ceremony" | "session" | "break" | "social" }[];
}

export const ITINERARY: DaySchedule[] = [
  {
    day: "Day 01",
    date: "October 16",
    weekday: "Friday",
    events: [
      {
        time: "07:30",
        title: "Delegate Registration & Kit Collection",
        detail: "Foyer — Level 1 · Carry your college ID and payment receipt.",
        type: "ceremony",
      },
      {
        time: "09:00",
        title: "Opening Ceremony",
        detail: "Convention Hall A · Keynote by the Guest of Honour, secretariat address, gavel ceremony.",
        type: "ceremony",
      },
      {
        time: "10:15",
        title: "Committee Session I — Roll Call & Agenda Setting",
        detail: "Committee halls · Formal debate opens on the chosen agenda.",
        type: "session",
      },
      {
        time: "13:00",
        title: "Networking Lunch",
        detail: "Banquet Lawn · Executive boards host first-timer clinics.",
        type: "break",
      },
      {
        time: "14:00",
        title: "Committee Session II — Moderated Caucuses",
        detail: "Committee halls · Country blocs begin shaping working papers.",
        type: "session",
      },
      {
        time: "17:30",
        title: "High Tea & Delegation Photographs",
        detail: "Courtyard · portraits with your committee board.",
        type: "break",
      },
    ],
  },
  {
    day: "Day 02",
    date: "October 17",
    weekday: "Saturday",
    events: [
      {
        time: "09:00",
        title: "Committee Session III — Unmoderated Caucuses",
        detail: "Committee halls · Working paper negotiations reach full swing.",
        type: "session",
      },
      {
        time: "12:30",
        title: "Lunch",
        detail: "Food Court · Jain and halal counters available.",
        type: "break",
      },
      {
        time: "13:30",
        title: "Committee Session IV — Draft Resolution Debates",
        detail: "Committee halls · Amendments fly; blocks consolidate support.",
        type: "session",
      },
      {
        time: "16:45",
        title: "Press Briefing Circle",
        detail: "Media Room · IP bureau releases the day's verdicts.",
        type: "social",
      },
      {
        time: "19:30",
        title: "SOMUN Socials Night",
        detail: "Rooftop Pavilion · DJ, cultural showcase and awards teaser. Semi-formal attire.",
        type: "social",
      },
    ],
  },
  {
    day: "Day 03",
    date: "October 18",
    weekday: "Sunday",
    events: [
      {
        time: "09:30",
        title: "Committee Session V — Voting Procedures",
        detail: "Committee halls · Resolutions face the final count.",
        type: "session",
      },
      {
        time: "11:30",
        title: "Executive Board Deliberations",
        detail: "Committee halls · Boards adjourn to score citations and portfolio awards.",
        type: "session",
      },
      {
        time: "13:00",
        title: "Closing Ceremony",
        detail: "Convention Hall A · Best Delegate, Best Delegation and IP awards presented.",
        type: "ceremony",
      },
      {
        time: "15:30",
        title: "Farewell & Group Photographs",
        detail: "Grand Staircase · see you at SOMUN '27.",
        type: "break",
      },
    ],
  },
];

export const FEES = [
  {
    label: "Delegate",
    early: "₹1,500",
    standard: "₹1,800",
    note: "Early bird closes September 30, 2026",
  },
  {
    label: "International Press",
    early: "₹1,200",
    standard: "₹1,500",
    note: "Portfolio review may apply for caricature",
  },
  {
    label: "Faculty Observer",
    early: "₹900",
    standard: "₹900",
    note: "Includes all meals and ceremonies",
  },
];
