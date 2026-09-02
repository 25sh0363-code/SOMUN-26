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

/* ————— THE TWELVE CHAMBERS · MMXXVI —————
   Content source: secretariat committee pages document (content.pages).
   Order = dossier order Nº 01–12 (deck + pages). Fields:
     description · agendas        → dossier box in the scroll view + preview card
     cta                          → dossier box button · itemsLabel → page fact strip
     overview[] about willDo why  → the committee's own page sections
     focusLabel + focus[]         → focus chips section
     kicker                       → closing line (optional)
     tagline                      → sub-line under the acronym (optional)
     diffKey                      → Beginner | Intermediate | Advanced | Mixed */
export const COMMITTEES = [
  {
    slug: "disec",
    acronym: "DISEC",
    name: "Disarmament and International Security Committee",
    difficulty: "Beginner",
    diffKey: "Beginner",
    photo: "images/committees/disec.jpg",
    description:
      "Where diplomacy meets deterrence. DISEC confronts the weapons, technologies and strategic rivalries that shape the global security order. Every resolution is a negotiation between national interest and collective survival.",
    agendas: [
      "Nuclear proliferation and strategic stability",
      "Autonomous weapons and emerging warfare",
    ],
    itemsLabel: "2 agenda items",
    cta: "Explore the committee",
    overview: [
      "The First Committee of the United Nations General Assembly, DISEC addresses some of the most pressing challenges to international peace and security. From nuclear weapons and arms proliferation to emerging military technologies, the committee provides a platform for nations to debate how global security can be strengthened.",
    ],
    about:
      "DISEC brings together nations with diverse security interests and strategic priorities. Delegates must navigate competing national agendas, negotiate resolutions, build alliances and develop practical solutions to complex security challenges.",
    willDo:
      "Delegates will debate questions surrounding disarmament, weapons proliferation, international security and emerging threats while working towards consensus-driven solutions.",
    why: "DISEC is ideal for delegates who enjoy geopolitics, strategic negotiations, international relations and high-stakes diplomacy.",
    focusLabel: "Key focus areas",
    focus: [
      "Nuclear disarmament",
      "Arms proliferation",
      "Biological and chemical weapons",
      "Autonomous weapons and emerging military technologies",
      "International peace and security",
      "Illicit arms trafficking",
    ],
    kicker: "",
  },
  {
    slug: "ecosoc",
    acronym: "ECOSOC",
    name: "Economic and Social Council",
    difficulty: "Intermediate",
    diffKey: "Intermediate",
    photo: "images/committees/ecosoc.jpg",
    description:
      "The global economy has no borders. From inequality and sustainable development to access to essential resources, ECOSOC asks a difficult question: how can prosperity become a global reality rather than a national privilege?",
    agendas: [
      "Financing sustainable development",
      "Bridging global economic inequality",
    ],
    itemsLabel: "2 agenda items",
    cta: "Explore the committee",
    overview: [
      "Economic and social challenges rarely stop at national borders. ECOSOC brings countries together to address global issues ranging from sustainable development and economic inequality to access to education, healthcare and essential resources.",
    ],
    about:
      "Delegates must balance economic growth with social development while considering the vastly different circumstances of developed and developing nations. Successful diplomacy requires cooperation, compromise and an understanding of how international economic systems interact.",
    willDo:
      "Delegates will negotiate policies addressing development, poverty, inequality and international economic cooperation while attempting to create solutions that are both ambitious and achievable.",
    why: "A strong choice for delegates interested in economics, development, sustainability, international cooperation and global policy.",
    focusLabel: "Key focus areas",
    focus: [
      "Sustainable development",
      "Global inequality",
      "Poverty alleviation",
      "International economic cooperation",
      "Education and healthcare",
      "Food and resource security",
    ],
    kicker: "",
  },
  {
    slug: "unctc",
    acronym: "UNCTC",
    name: "United Nations Counter-Terrorism Committee",
    difficulty: "Intermediate",
    diffKey: "Intermediate",
    photo: "images/committees/unctc.jpg",
    description:
      "Security has a price, but so does the loss of freedom. UNCTC confronts the evolving architecture of international terrorism, forcing states to balance intelligence, prevention and security with sovereignty and fundamental rights.",
    agendas: [
      "Countering emerging terrorist threats",
      "Disrupting terrorist financing networks",
    ],
    itemsLabel: "2 agenda items",
    cta: "Explore the committee",
    overview: [
      "Terrorism presents a constantly evolving challenge to international peace and security. The UN Counter-Terrorism Committee works to strengthen international cooperation and improve national capabilities to prevent and respond to terrorist threats.",
    ],
    about:
      "Delegates must confront the difficult balance between national security and fundamental rights. Effective counter-terrorism requires cooperation across borders, intelligence sharing, financial controls and strategies that address the conditions that enable extremism.",
    willDo:
      "Delegates will develop international strategies to combat terrorism, strengthen cooperation between states and address emerging security threats.",
    why: "UNCTC is suited to delegates who enjoy security policy, counter-terrorism, intelligence, diplomacy and complex ethical debates.",
    focusLabel: "Key focus areas",
    focus: [
      "Counter-terrorism cooperation",
      "Terrorist financing",
      "Border security",
      "Cyberterrorism",
      "Intelligence sharing",
      "Preventing radicalisation",
    ],
    kicker: "",
  },
  {
    slug: "unoosa",
    acronym: "UNOOSA",
    name: "United Nations Office for Outer Space Affairs",
    difficulty: "Beginner",
    diffKey: "Beginner",
    photo: "images/committees/unoosa.jpg",
    description:
      "Humanity's next geopolitical frontier lies far beyond Earth. As nations and private actors race into orbit, UNOOSA faces the challenge of keeping space peaceful, accessible and sustainable before the final frontier becomes the next contested domain.",
    agendas: [
      "Managing the growing threat of space debris",
      "Ensuring peaceful and sustainable space exploration",
    ],
    itemsLabel: "2 agenda items",
    cta: "Explore the committee",
    overview: [
      "Space is no longer simply the final frontier. It has become an increasingly important domain for communication, navigation, scientific research, economic development and international security.",
      "UNOOSA promotes international cooperation in the peaceful exploration and use of outer space.",
    ],
    about:
      "Delegates must consider how humanity can ensure that space remains accessible, sustainable and peaceful. With more nations and private companies entering the space sector, international rules face new and complicated challenges.",
    willDo:
      "Delegates will address questions surrounding space governance, sustainability, exploration and international cooperation.",
    why: "Perfect for delegates fascinated by space, science, technology, international law and the future of humanity.",
    focusLabel: "Key focus areas",
    focus: [
      "Space sustainability",
      "Space debris",
      "Peaceful use of outer space",
      "Satellite technology",
      "Space exploration",
      "International space cooperation",
    ],
    kicker: "",
  },
  {
    slug: "uncsw",
    acronym: "UNCSW",
    name: "United Nations Commission on the Status of Women",
    difficulty: "Intermediate",
    diffKey: "Intermediate",
    photo: "images/committees/uncsw.jpg",
    description:
      "Equality on paper does not always become equality in practice. UNCSW examines the barriers that continue to shape the lives of women and girls, challenging delegates to transform international commitments into meaningful action.",
    agendas: [
      "Economic empowerment of women",
      "Expanding access to education and opportunity",
    ],
    itemsLabel: "2 agenda items",
    cta: "Explore the committee",
    overview: [
      "The Commission on the Status of Women works to promote gender equality and empower women and girls worldwide. Its discussions examine the political, economic, social and cultural barriers that continue to affect gender equality.",
    ],
    about:
      "Delegates must address deeply interconnected challenges while accounting for different cultural, economic and political contexts. Meaningful progress requires policies that are inclusive, practical and internationally achievable.",
    willDo:
      "Delegates will negotiate policies designed to strengthen women's rights, expand opportunities and address systemic barriers to equality.",
    why: "An excellent committee for delegates interested in human rights, social policy, equality, development and advocacy.",
    focusLabel: "Key focus areas",
    focus: [
      "Women's education",
      "Economic empowerment",
      "Political representation",
      "Gender-based discrimination",
      "Healthcare access",
      "Protection of women's rights",
    ],
    kicker: "",
  },
  {
    slug: "unodc",
    acronym: "UNODC",
    name: "United Nations Office on Drugs and Crime",
    difficulty: "Intermediate",
    diffKey: "Intermediate",
    photo: "images/committees/unodc.jpg",
    description:
      "Crime has learned to cross borders faster than laws can follow. UNODC confronts transnational criminal networks, illicit trafficking and corruption, demanding cooperation between states whose interests do not always align.",
    agendas: [
      "Combating transnational organised crime",
      "Tackling cybercrime and illicit trafficking",
    ],
    itemsLabel: "2 agenda items",
    cta: "Explore the committee",
    overview: [
      "Organised crime, illicit trafficking, corruption and drug-related crime represent challenges that increasingly operate across national borders. UNODC supports international cooperation against these threats while promoting justice, security and the rule of law.",
    ],
    about:
      "Delegates must tackle criminal networks that can operate across multiple jurisdictions. The committee requires nations to cooperate while respecting national sovereignty and differences in legal systems.",
    willDo:
      "Delegates will develop international strategies to combat transnational crime, corruption and illicit trafficking.",
    why: "Ideal for delegates interested in law, international security, organised crime, justice and investigative diplomacy.",
    focusLabel: "Key focus areas",
    focus: [
      "Transnational organised crime",
      "Drug trafficking",
      "Human trafficking",
      "Cybercrime",
      "Corruption",
      "Money laundering",
    ],
    kicker: "",
  },
  {
    slug: "mcu",
    acronym: "MCU",
    name: "Marvel Cinematic Universe Committee",
    difficulty: "Beginner",
    diffKey: "Beginner",
    photo: "images/committees/mcu.jpg",
    description:
      "The world has survived gods, invasions and the collapse of reality itself. Now the fate of the universe rests in your hands. Heroes, villains, governments and cosmic powers enter a crisis where one decision can rewrite everything.",
    agendas: [
      "The balance of power after a global crisis",
      "An emerging threat to the Marvel universe",
    ],
    itemsLabel: "2 crisis directives",
    cta: "Enter the universe",
    overview: [
      "The world knows the Avengers. But what happens when the fate of the Marvel universe rests in the hands of its most powerful figures?",
      "The MCU committee takes delegates beyond conventional diplomacy and places them inside a fictional universe where superheroes, governments, organisations and cosmic forces collide.",
    ],
    about:
      "Delegates assume the roles of characters and factions from the Marvel Cinematic Universe. Unlike a traditional MUN, the committee is driven by a dynamic crisis environment where decisions can rapidly reshape the storyline.",
    willDo:
      "Delegates will negotiate alliances, respond to crises, develop strategies and make decisions that could completely alter the course of the Marvel universe.",
    why: "For delegates who want creativity, strategy, character-based diplomacy and unpredictable crisis action, this is where conventional MUN rules meet superhero chaos.",
    focusLabel: "Expect",
    focus: [
      "Crisis updates",
      "Character-based diplomacy",
      "Rapid decision-making",
      "Alliances and rivalries",
      "Creative solutions",
      "An evolving storyline",
    ],
    kicker: "The universe is yours to change.",
  },
  {
    slug: "hcc-ccc",
    acronym: "HCC",
    name: "Historical Crisis Committee",
    tagline: "History. Reimagined.",
    difficulty: "Advanced",
    diffKey: "Advanced",
    photo: "images/committees/hcc-ccc.jpg",
    description:
      "History is written by those who survive it. But what happens when you are given the power to change it? The Historical Crisis Committee places delegates inside a defining moment, where information is scarce, decisions are immediate and the timeline is anything but fixed.",
    agendas: [
      "Political power and historical conflict",
      "Decisions that could reshape the timeline",
    ],
    itemsLabel: "2 crisis directives",
    cta: "Enter the crisis",
    overview: [
      "What if history had taken a different turn?",
      "The Historical Crisis Committee places delegates at pivotal moments in history and challenges them to make decisions with incomplete information, competing interests and rapidly changing circumstances.",
    ],
    about:
      "Delegates assume historical roles and attempt to navigate the political, military and social realities of their time. Every decision can create consequences that reshape the course of events.",
    willDo:
      "Rather than simply discussing history, delegates will make it. They will negotiate, strategise, respond to crises and attempt to achieve their objectives while adapting to an evolving historical timeline.",
    why: "Perfect for delegates who enjoy history, strategy, political intrigue, crisis committees and thinking on their feet.",
    focusLabel: "Expect",
    focus: [
      "Dynamic crises",
      "Historical characters",
      "Individual objectives",
      "Rapid developments",
      "Strategic decision-making",
      "Alternate-history possibilities",
    ],
    kicker: "Know the past. Change the future.",
  },
  {
    slug: "icc",
    acronym: "ICC",
    name: "International Cricket Council",
    difficulty: "Advanced",
    diffKey: "Advanced",
    photo: "images/committees/icc.jpg",
    description:
      "Cricket unites billions, but the game is governed by competing interests, national ambitions and an evolving global landscape. Inside the ICC, delegates must decide not only how cricket is played, but where the sport goes next.",
    agendas: [
      "The future of international cricket",
      "Governance, equity and global expansion",
    ],
    itemsLabel: "2 agenda items",
    cta: "Explore the committee",
    overview: [
      "Cricket is more than a sport. It is an institution connecting nations, cultures and millions of fans around the world.",
      "The International Cricket Council committee brings the politics, diplomacy and strategy of international cricket into the MUN environment.",
    ],
    about:
      "Delegates take on the roles of cricketing nations and stakeholders while confronting challenges affecting the international game. They must balance sporting interests with financial, political and diplomatic considerations.",
    willDo:
      "Delegates will negotiate policies, resolve disputes and make decisions that could influence the future of international cricket.",
    why: "A unique choice for delegates passionate about cricket, sports administration, diplomacy and strategic negotiation.",
    focusLabel: "Key focus areas",
    focus: [
      "International cricket governance",
      "Player welfare",
      "Globalisation of cricket",
      "Tournament structures",
      "Associate nations",
      "Cricket's financial ecosystem",
    ],
    kicker: "Bring your diplomacy. Bring your cricket knowledge.",
  },
  {
    slug: "unhrc",
    acronym: "UNHRC",
    name: "United Nations Human Rights Council",
    difficulty: "Intermediate",
    diffKey: "Intermediate",
    photo: "images/committees/unhrc.jpg",
    description:
      "Geneva's conscience arrives in Hyderabad. The Council examines state accountability where it is most contested, confronting human rights violations inside conflicts and across the open internet.",
    agendas: [
      "Human rights in active conflict zones",
      "Protecting digital privacy and freedom of expression",
    ],
    itemsLabel: "2 agenda items",
    cta: "Explore the committee",
    overview: [
      "Human rights form the foundation of a just and peaceful international system. The UN Human Rights Council addresses violations of fundamental rights and works towards strengthening their protection worldwide.",
    ],
    about:
      "Delegates must confront complex questions involving sovereignty, humanitarian intervention, freedom and accountability. Finding common ground can be particularly challenging when national interests collide with universal principles.",
    willDo:
      "Delegates will debate human rights challenges, investigate international concerns and negotiate measures aimed at strengthening global human rights protections.",
    why: "Ideal for delegates interested in human rights, international law, humanitarian affairs and diplomacy.",
    focusLabel: "Key focus areas",
    focus: [
      "Freedom of expression",
      "Refugee rights",
      "Rights of children",
      "Religious and cultural freedom",
      "Humanitarian crises",
      "Protection of vulnerable communities",
    ],
    kicker: "",
  },
  {
    slug: "aippm",
    acronym: "Lok Sabha",
    name: "The House of the People",
    difficulty: "Advanced",
    diffKey: "Advanced",
    photo: "images/committees/aippm.jpg",
    description:
      "India's political theatre moves from the campaign trail to the floor of the House. Behind every bill lies an argument, an alliance and a battle for consensus. Here, delegates do not represent countries. They represent political power.",
    agendas: [
      "Legislative reform and national policy",
      "Political negotiations and coalition dynamics",
    ],
    itemsLabel: "2 agenda items",
    cta: "Enter the house",
    overview: [
      "India's Parliament is where national priorities collide, policies are debated and the direction of the world's largest democracy is shaped.",
      "The Lok Sabha committee brings delegates into India's parliamentary environment, requiring them to argue, negotiate and legislate from the perspective of political representatives.",
    ],
    about:
      "Delegates take on the roles of Members of Parliament and engage directly with national political issues. The committee rewards strong argumentation, political strategy, negotiation and knowledge of India's governance system.",
    willDo:
      "Delegates will debate legislation, challenge opposing viewpoints, build political alliances and attempt to influence the outcome of parliamentary proceedings.",
    why: "Perfect for delegates interested in Indian politics, parliamentary procedure, public policy and persuasive debate.",
    focusLabel: "Expect",
    focus: [
      "Parliamentary debate",
      "Political negotiations",
      "Policy discussions",
      "Coalition building",
      "Bills and amendments",
      "High-energy floor debates",
    ],
    kicker: "The House is yours. Make your argument count.",
  },
  {
    slug: "ip",
    acronym: "IP",
    name: "International Press",
    tagline: "The Fourth Estate",
    difficulty: "Beginner / Intermediate",
    diffKey: "Mixed",
    photo: "images/committees/ip.jpg",
    description:
      "Every committee has a story. Few people get to decide how it is told. The International Press enters the conference as its eyes and ears, investigating developments, questioning delegates and turning hours of diplomacy into stories that shape the narrative.",
    agendas: [
      "Investigative reporting and committee coverage",
      "Interviews, photography and breaking stories",
    ],
    itemsLabel: "2 assignments",
    cta: "Find the story",
    overview: [
      "Diplomacy does not happen in a vacuum. The International Press brings the power of journalism into the MUN ecosystem, giving delegates the opportunity to observe, investigate and shape the narrative surrounding committee proceedings.",
    ],
    about:
      "Press delegates operate as journalists, photographers and media professionals covering the conference. Their role goes beyond reporting speeches. They identify stories, investigate developments, interview delegates and hold committees accountable.",
    willDo:
      "Members of the International Press will produce articles, conduct interviews, capture moments from the conference and document the evolving narratives within committees.",
    why: "A great choice for delegates interested in journalism, writing, photography, media, public relations and storytelling.",
    focusLabel: "Expect",
    focus: [
      "Committee coverage",
      "Interviews",
      "News reports",
      "Photography",
      "Breaking stories",
      "Editorial work",
    ],
    kicker: "You don't just report the story. You find it.",
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
    a: "No. First-timers are welcome and chambers are balanced across experience levels. Background guides release before the conference, and the dais briefs procedure on Day 01 before the first session gavels in.",
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
