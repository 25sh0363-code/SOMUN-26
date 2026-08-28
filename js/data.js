/* ————————————————————————————————————————————————————————————————
   SOMUN '26 — SITE DATA
   Everything you may want to edit lives in this one file:
   conference info, committees, fees, the (future) itinerary.
   No other file needs touching for routine updates.
   ———————————————————————————————————————————————————————— */

export const CONFERENCE = {
  name: "SOMUN",
  edition: "'26",
  tagline: "Three days of charged debate, negotiation and diplomacy.",
  dates: "OCTOBER 30 — NOVEMBER 1, 2026",
  venue: "Hyderabad International Convention Centre",
  city: "Hyderabad, India",
  email: "secretariat@somun.in",
  phone: "+91 98480 22123",
  countdownTarget: "2026-10-30T09:00:00+05:30",
};

/* ————— Difficulty stamps: "Beginner" | "Intermediate" | "Advanced" —————
   photo: "" → an empty, framed plate is shown (ready for artwork later).
   Once you have an image, drop it in images/committees/ and set
   photo: "images/committees/unhrc.jpg" — the plate fills automatically. */

export const COMMITTEES = [
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
    photo: "",
  },
  {
    slug: "disec",
    acronym: "DISEC",
    name: "Disarmament and International Security Committee",
    difficulty: "Intermediate",
    delegates: 60,
    agendas: [
      "Regulating lethal autonomous weapons systems",
      "Preventing an arms race in outer space",
    ],
    description:
      "The First Committee of the General Assembly tackles the weapons of tomorrow. Expect fierce bloc politics as delegates chart the future of global disarmament.",
    photo: "",
  },
  {
    slug: "unoosa",
    acronym: "UNOOSA",
    name: "United Nations Office on Outer Space Affairs",
    difficulty: "Beginner",
    delegates: 40,
    agendas: [
      "Governance of satellite mega-constellations and orbital debris",
      "Who owns the Moon? — legal regimes for space resources",
    ],
    description:
      "The quiet office that governs the final frontier. UNOOSA asks who gets to orbit, who gets to land — and what happens when the junk above us multiplies faster than the law below.",
    photo: "",
  },
  {
    slug: "uncsw",
    acronym: "UNCSW",
    name: "United Nations Commission on the Status of Women",
    difficulty: "Intermediate",
    delegates: 45,
    agendas: [
      "Advancing the Women, Peace and Security agenda",
      "Closing the gender digital divide",
    ],
    description:
      "Since 1946 the Commission has driven the fight for equality. This session confronts the newest frontiers — conflict mediation and access to the digital economy.",
    photo: "",
  },
  {
    slug: "unodc",
    acronym: "UNODC",
    name: "United Nations Office on Drugs and Crime",
    difficulty: "Intermediate",
    delegates: 40,
    agendas: [
      "Dismantling transnational drug trafficking networks",
      "A global framework against cybercrime and the dark web",
    ],
    description:
      "Crime has gone borderless — narcotics routes, laundering pipelines and hacks that cross ten jurisdictions before breakfast. UNODC coordinates the response, one convention at a time.",
    photo: "",
  },
  {
    slug: "ecosoc",
    acronym: "ECOSOC",
    name: "Economic and Social Council",
    difficulty: "Beginner",
    delegates: 54,
    agendas: [
      "Financing sustainable development in the Global South",
      "Closing the inequality gap within and among nations",
    ],
    description:
      "The UN's economic engine room. Fifty-four members, dozens of specialised agencies and one enormous question — how to fund a fair future for everyone, not just the fortunate.",
    photo: "",
  },
  {
    slug: "unctc",
    acronym: "UNCTC",
    name: "United Nations Counter Terrorism Committee",
    difficulty: "Advanced",
    delegates: 35,
    agendas: [
      "Suppressing terrorist financing and online recruitment",
      "Border security, watchlists and the privacy trade-off",
    ],
    description:
      "Counter-terrorism at the sharp end. Delegates balance hard security against civil liberties while drafting binding obligations that states must actually live with.",
    photo: "",
  },
  {
    slug: "hcc-ccc",
    acronym: "HCC/CCC",
    name: "Historical Crisis Committee · Continuous Crisis Committee",
    difficulty: "Advanced",
    delegates: 25,
    agendas: [
      "Closed agenda — crisis updates drop without notice",
      "Initiative under fire — arcs judged live by the board",
    ],
    description:
      "The gavel never rests here. The Historical Crisis Committee rewinds time to the moments history got wrong; the Continuous Crisis Committee refuses to pause at all. Fast, chaotic, unforgettable.",
    photo: "",
  },
  {
    slug: "ip",
    acronym: "IP",
    name: "International Press — Journalism and Photojournalism",
    difficulty: "Intermediate",
    delegates: 24,
    agendas: [
      "Live coverage and critique of committee proceedings",
      "Editorial board meeting — the SOMUN Charter",
    ],
    description:
      "Delegates who hold the diplomats accountable. Reporters and photojournalists publish daily bulletins that shape — and shake — every committee.",
    photo: "",
  },
  {
    slug: "aippm",
    acronym: "AIPPM",
    name: "Lok Sabha — All India Political Parties Meet",
    difficulty: "Advanced",
    delegates: 32,
    agendas: [
      "Simultaneous elections — 'One Nation, One Poll'",
      "Deliberation on comprehensive electoral reforms",
    ],
    description:
      "India's loudest political theatre, distilled. Party leaders cross the floor in a raucous hunt for consensus on the republic's most contested reform questions.",
    photo: "",
  },
  {
    slug: "icc",
    acronym: "ICC",
    name: "International Cricket Council",
    difficulty: "Beginner",
    delegates: 30,
    agendas: [
      "The Future Tours Programme — calendars, formats and wallets",
      "Growing the global game — governance beyond the Big Three",
    ],
    description:
      "Diplomacy meets the gentleman's game. Delegates negotiate cricket's future — crowded calendars, new markets and a governance puzzle as tricky as any DRS review.",
    photo: "",
  },
  {
    slug: "mcu",
    acronym: "MCU",
    name: "Marvel Cinematic Universe",
    difficulty: "Intermediate",
    delegates: 30,
    agendas: [
      "The Sokovia Accords — superhuman registration and oversight",
      "Sovereignty vs. the Avengers — who polices the heroes?",
    ],
    description:
      "Fiction, weaponised. Delegates assume the roles of states and factions inside the Marvel Cinematic Universe, where every clause of the Accords is a plot twist waiting to happen.",
    photo: "",
  },
];

/* ————— Registration fees (sidebar on the Register page) ————— */

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
    note: "Portfolio review may apply for journalists",
  },
  {
    label: "Faculty Observer",
    early: "₹900",
    standard: "₹900",
    note: "Includes all meals and ceremonies",
  },
];

/* ————— Day-wise programme —————
   The public itinerary page currently shows "Releasing Soon".
   When the schedule is final, simply switch SHOW_ITINERARY to true. */

export const SHOW_ITINERARY = false;

export const ITINERARY = [
  {
    day: "Day 01",
    date: "October 30",
    weekday: "Friday",
    events: [
      { time: "07:30", title: "Delegate Registration & Kit Collection", detail: "Foyer — Level 1 · Carry your college ID and payment receipt.", type: "ceremony" },
      { time: "09:00", title: "Opening Ceremony", detail: "Convention Hall A · Keynote by the Guest of Honour, secretariat address, gavel ceremony.", type: "ceremony" },
      { time: "10:15", title: "Committee Session I — Roll Call & Agenda Setting", detail: "Committee halls · Formal debate opens on the chosen agenda.", type: "session" },
      { time: "13:00", title: "Networking Lunch", detail: "Banquet Lawn · Executive boards host first-timer clinics.", type: "break" },
      { time: "14:00", title: "Committee Session II — Moderated Caucuses", detail: "Committee halls · Country blocs begin shaping working papers.", type: "session" },
      { time: "17:30", title: "High Tea & Delegation Photographs", detail: "Courtyard · portraits with your committee board.", type: "break" },
    ],
  },
  {
    day: "Day 02",
    date: "October 31",
    weekday: "Saturday",
    events: [
      { time: "09:00", title: "Committee Session III — Unmoderated Caucuses", detail: "Committee halls · Working paper negotiations reach full swing.", type: "session" },
      { time: "12:30", title: "Lunch", detail: "Food Court · Jain and halal counters available.", type: "break" },
      { time: "13:30", title: "Committee Session IV — Draft Resolution Debates", detail: "Committee halls · Amendments fly; blocks consolidate support.", type: "session" },
      { time: "16:45", title: "Press Briefing Circle", detail: "Media Room · IP bureau releases the day's verdicts.", type: "social" },
      { time: "19:30", title: "SOMUN Socials Night", detail: "Rooftop Pavilion · DJ, cultural showcase and awards teaser. Semi-formal attire.", type: "social" },
    ],
  },
  {
    day: "Day 03",
    date: "November 1",
    weekday: "Sunday",
    events: [
      { time: "09:30", title: "Committee Session V — Voting Procedures", detail: "Committee halls · Resolutions face the final count.", type: "session" },
      { time: "11:30", title: "Executive Board Deliberations", detail: "Committee halls · Boards adjourn to score citations and portfolio awards.", type: "session" },
      { time: "13:00", title: "Closing Ceremony", detail: "Convention Hall A · Best Delegate, Best Delegation and IP awards presented.", type: "ceremony" },
      { time: "15:30", title: "Farewell & Group Photographs", detail: "Grand Staircase · see you at SOMUN '27.", type: "break" },
    ],
  },
];
