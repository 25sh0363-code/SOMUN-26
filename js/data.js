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
  venue: "Silver Oaks International School, Bowrampet Campus",
  city: "Hyderabad, India",
  email: "somundelaffairs@gmail.com",
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
    agendas: [
      "Human rights in active conflict zones",
      "Protecting digital privacy and freedom of expression",
    ],
    description:
      "Geneva's conscience arrives in Hyderabad. The Council examines state accountability where it is most contested — inside conflicts and across the open internet.",
    photo: "images/committees/unhrc.jpg"
  },
  {
    slug: "disec",
    acronym: "DISEC",
    name: "Disarmament and International Security Committee",
    difficulty: "Intermediate",
    agendas: [
      "Regulating lethal autonomous weapons systems",
      "Preventing an arms race in outer space",
    ],
    description:
      "The First Committee of the General Assembly tackles the weapons of tomorrow. Expect fierce bloc politics as delegates chart the future of global disarmament.",
    photo: "images/committees/disec.jpg"
  },
  {
    slug: "unoosa",
    acronym: "UNOOSA",
    name: "United Nations Office on Outer Space Affairs",
    difficulty: "Beginner",
    agendas: [
      "Governance of satellite mega-constellations and orbital debris",
      "Who owns the Moon? — legal regimes for space resources",
    ],
    description:
      "The quiet office that governs the final frontier. UNOOSA asks who gets to orbit, who gets to land — and what happens when the junk above us multiplies faster than the law below.",
    photo: "images/committees/unoosa.jpg"
  },
  {
    slug: "uncsw",
    acronym: "UNCSW",
    name: "United Nations Commission on the Status of Women",
    difficulty: "Intermediate",
    agendas: [
      "Advancing the Women, Peace and Security agenda",
      "Closing the gender digital divide",
    ],
    description:
      "Since 1946 the Commission has driven the fight for equality. This session confronts the newest frontiers — conflict mediation and access to the digital economy.",
    photo: "images/committees/uncsw.jpg"
  },
  {
    slug: "unodc",
    acronym: "UNODC",
    name: "United Nations Office on Drugs and Crime",
    difficulty: "Intermediate",
    agendas: [
      "Dismantling transnational drug trafficking networks",
      "A global framework against cybercrime and the dark web",
    ],
    description:
      "Crime has gone borderless — narcotics routes, laundering pipelines and hacks that cross ten jurisdictions before breakfast. UNODC coordinates the response, one convention at a time.",
    photo: "images/committees/unodc.jpg"
  },
  {
    slug: "ecosoc",
    acronym: "ECOSOC",
    name: "Economic and Social Council",
    difficulty: "Beginner",
    agendas: [
      "Financing sustainable development in the Global South",
      "Closing the inequality gap within and among nations",
    ],
    description:
      "The UN's economic engine room. Fifty-four members, dozens of specialised agencies and one enormous question — how to fund a fair future for everyone, not just the fortunate.",
    photo: "images/committees/ecosoc.jpg"
  },
  {
    slug: "unctc",
    acronym: "UNCTC",
    name: "United Nations Counter Terrorism Committee",
    difficulty: "Advanced",
    agendas: [
      "Suppressing terrorist financing and online recruitment",
      "Border security, watchlists and the privacy trade-off",
    ],
    description:
      "Counter-terrorism at the sharp end. Delegates balance hard security against civil liberties while drafting binding obligations that states must actually live with.",
    photo: "images/committees/unctc.jpg"
  },
  {
    slug: "hcc-ccc",
    acronym: "HCC",
    name: "Historical Crisis Committee",
    difficulty: "Advanced",
    agendas: [
      "Closed agenda — crisis updates drop without notice",
      "Initiative under fire — arcs judged live by the board",
    ],
    description:
      "The gavel never rests here. The Historical Crisis Committee rewinds time to the moments history got wrong — and then refuses to pause at all. Fast, chaotic, unforgettable.",
    photo: "images/committees/hcc-ccc.jpg"
  },
  {
    slug: "ip",
    acronym: "IP",
    name: "International Press — Journalism and Photojournalism",
    difficulty: "Intermediate",
    agendas: [
      "Live coverage and critique of committee proceedings",
      "Editorial board meeting — the SOMUN Charter",
    ],
    description:
      "Delegates who hold the diplomats accountable. Reporters and photojournalists publish daily bulletins that shape — and shake — every committee.",
    photo: "images/committees/ip.jpg"
  },
  {
    slug: "aippm",
    acronym: "Lok Sabha",
    name: "Parliament of India — Lower House",
    difficulty: "Advanced",
    agendas: [
      "Simultaneous elections — 'One Nation, One Poll'",
      "Deliberation on comprehensive electoral reforms",
    ],
    description:
      "India's loudest political theatre, distilled. Party leaders cross the floor in a raucous hunt for consensus on the republic's most contested reform questions.",
    photo: "images/committees/aippm.jpg"
  },
  {
    slug: "icc",
    acronym: "ICC",
    name: "International Cricket Council",
    difficulty: "Beginner",
    agendas: [
      "The Future Tours Programme — calendars, formats and wallets",
      "Growing the global game — governance beyond the Big Three",
    ],
    description:
      "Diplomacy meets the gentleman's game. Delegates negotiate cricket's future — crowded calendars, new markets and a governance puzzle as tricky as any DRS review.",
    photo: "images/committees/icc.jpg"
  },
  {
    slug: "mcu",
    acronym: "MCU",
    name: "Marvel Cinematic Universe",
    difficulty: "Intermediate",
    agendas: [
      "The Sokovia Accords — superhuman registration and oversight",
      "Sovereignty vs. the Avengers — who polices the heroes?",
    ],
    description:
      "Fiction, weaponised. Delegates assume the roles of states and factions inside the Marvel Cinematic Universe, where every clause of the Accords is a plot twist waiting to happen.",
    photo: "images/committees/mcu.jpg"
  },
];

/* ————— Registration fees (sidebar on the Register page) ————— */

export const FEES = [
  {
    label: "Delegate",
    early: "₹ XXXX",
    standard: "₹ XXXX",
    note: "To be disclosed — payment opens as soon as registrations do",
  },
  {
    label: "International Press",
    early: "₹ XXXX",
    standard: "₹ XXXX",
    note: "Same fee as delegates — to be disclosed",
  },
];

/* ————— Allocation matrix (viewer on the Register page) —————
   The "View the allocation matrix" modal on the registration form
   reads this BEFORE delegates lock their preferences. Fill each
   committee with its portfolio/country list — an array, or a plain
   string that will be split on commas. While a list is empty the
   modal shows "Releasing soon" for that chamber.
   e.g. unhrc: "India, France, Japan, Brazil, Kenya" */
export const ALLOCATION_MATRIX = {
  unhrc: [],
  disec: [],
  unoosa: [],
  uncsw: [],
  unodc: [],
  ecosoc: [],
  unctc: [],
  "hcc-ccc": [],
  ip: [],
  aippm: [],
  icc: [],
  mcu: [],
};

/* ————— Day-wise programme —————
   The public itinerary page currently shows "Releasing Soon".
   When the schedule is final, simply switch SHOW_ITINERARY to true. */

/* ————— The Core Seven ————————————————————————————————————————
   The top-7 of the Eighth Secretariat, in gavel order.
   HOW TO REVEAL A NAME: put it in `name` (and an optional one-line
   `note` — portfolio, school, anything). The seat renders it
   automatically in the pyramid — no other code changes needed.
   While `name` is empty the seat shows its ceremonial placeholder. */
export const CORE_SEVEN = [
  { seat: "I",   name: "", note: "" }, /* the gavel seat */
  { seat: "II",  name: "", note: "" },
  { seat: "III", name: "", note: "" },
  { seat: "IV",  name: "", note: "" },
  { seat: "V",   name: "", note: "" },
  { seat: "VI",  name: "", note: "" },
  { seat: "VII", name: "", note: "" },
];

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

/* ————— FAQs (PLACEHOLDER copy — edit freely, everything renders from here) ————— */
export const FAQS = [
  {
    q: "Who can attend SOMUN '26?",
    a: "Any student from grade VIII onward — school, undergraduate or postgraduate. Delegates register individually or as part of a school delegation; individual applicants are matched to balanced committees by the secretariat.",
  },
  {
    q: "Do I need prior MUN experience?",
    a: "No. First-timers are welcome and chambers are balanced across experience levels. Study guides release before the conference, and the dais briefs procedure on Day 01 before the first session gavels in.",
  },
  {
    q: "How do I choose my committee?",
    a: "You list three committee preferences and an optional preferred portfolio while registering. The secretariat matches portfolios to keep competition fair — use the allocation matrix on the form to see each chamber's portfolios before you choose. Allotments arrive by email once processing begins; dates releasing soon.",
  },
  {
    q: "What does the registration fee include?",
    a: "Every pass covers the delegate kit, all three days of meals, socials entry and certificates. Accommodation is not provided — outstation delegates can write to the secretariat for hotel suggestions near the venue.",
  },
  {
    q: "What should I bring on conference days?",
    a: "Your allotment email, a government or school ID, a laptop or printed research, and formal western or Indian business attire. Everything else — stationery, placards, water and coffee — is on us.",
  },
  {
    q: "Can requests for committee or portfolio changes be made later?",
    a: "Yes. Change requests open after allocations and the window closes soon — dates releasing soon. Write to the secretariat from your registered email and the dais will accommodate wherever the chamber balance allows.",
  },
];
