// At-a-glance resource cards for teachers and parents.
// Content is drawn from the CHOLIS Classroom Support Guide and the Ministry of
// Education Catch Up (Teaching at the Right Level) Teacher's Guides, and has
// been approved by CHOLIS.

export interface ResourceCard {
  cat: string;
  title: string;
  summary: string;
  tips: string[];
  more?: string[];
  help: string;
  source: string;
}

export const REVIEW_STATUS = 'Approved by CHOLIS';

const GUIDE = 'CHOLIS Classroom Support Guide';

export const TEACHER_RESOURCES: ResourceCard[] = [
  {
    cat: 'Behaviour',
    title: 'Positive classroom behaviour',
    summary: 'Good behaviour is mostly taught and prevented, not punished. Physical and humiliating punishment is prohibited under the Children\'s Code Act 2022.',
    tips: [
      'Ask yourself what might be behind it: hunger, tiredness, or work that is too hard.',
      'Show learners exactly what listening and taking turns look like, then praise it when you see it.',
      'Use specific praise, a quiet word or moving closer before any bigger reaction.',
      'Name the behaviour, not the child: "Talking now stops others learning."',
      'Offer a limited choice and follow through calmly with a fair consequence explained in advance.',
    ],
    more: [
      'Be consistent: rules work best when every teacher applies them the same way.',
      'Later, talk briefly with the learner about what happened and what to try next time.',
    ],
    help: 'If the behaviour continues for about two weeks, puts anyone at risk or seems linked to distress, ask your School Counsellor for support.',
    source: `${GUIDE} (based on Education Endowment Foundation guidance)`,
  },
  {
    cat: 'Behaviour',
    title: 'Classroom routines',
    summary: 'Predictable routines reduce confusion, especially in large classes. Teach them like a lesson: explain, model, practise, praise, repeat.',
    tips: [
      'Set a few core routines: starting work, getting attention, handing out books, moving into groups, packing up.',
      'For a learner who struggles: seat them near you with a helpful peer nearby.',
      'Give one instruction at a time and ask them to repeat it back.',
      'Give a quiet signal before changes: "In two minutes we pack up."',
      'Give small active jobs and praise each small success straight away.',
    ],
    more: ['Re-teach routines after holidays and whenever the class seems unsettled.'],
    help: 'If a learner still cannot follow routines after several weeks, ask your School Counsellor for support.',
    source: GUIDE,
  },
  {
    cat: 'Learning',
    title: 'Enhancing foundational learning: reading',
    summary: 'Many learners fall behind because the work is above their reading level. A few minutes of daily practice at the right level builds confident readers.',
    tips: [
      'Find out where each learner really is: listen to them read a few letters, words or a short sentence.',
      'For part of the lesson, group learners by what they can do, not by age or grade.',
      'Practise letter sounds and blending sounds into words for a few minutes every day.',
      'Read aloud to the class daily and ask questions: who, what, why, what happens next?',
      'Pair a confident reader with a learner who needs support, and let them take turns.',
    ],
    more: [
      'Let learners talk, retell stories and describe pictures in a familiar language before reading.',
      'Move a learner to the next level as soon as they are ready. Never hold them back.',
      'Ready-made activities: use the Catch Up / Teaching at the Right Level (TaRL) bundle in the Ministry of Education Catch Up Literacy Teacher\'s Guide, such as Informal Chat, Storytelling, Picture Reading, Syllabic Chart Reading and Simple Paragraph Reading. The guide\'s short one-to-one check helps you place each learner at the right level.',
    ],
    help: 'If a learner makes little progress after several weeks of practice at their level, ask your Learner Support Coordinator for ideas.',
    source: `${GUIDE}; Ministry of Education Catch Up Literacy Teacher's Guide (TaRL)`,
  },
  {
    cat: 'Learning',
    title: 'Enhancing foundational learning: numbers',
    summary: 'Learners understand numbers best when they handle real objects before moving to written numbers and sums.',
    tips: [
      'Start with objects: count bottle tops, stones or sticks before writing numbers.',
      'Use bundles of ten sticks to show tens and ones.',
      'Do five minutes of quick mental maths with the whole class every day.',
      'Ask learners to explain how they got an answer, not just the answer.',
      'Group learners by what they can do, and give each group a task at its level.',
    ],
    more: [
      'Use local examples learners know: prices at the market, sharing food, counting days.',
      'Ready-made activities: use the Catch Up / Teaching at the Right Level (TaRL) bundle in the Ministry of Education Catch Up Numeracy Teacher\'s Guide, such as number chart reading and number recognition games. The guide groups learners from Beginner up to 4-digit numbers and shows how to move them up.',
    ],
    help: 'If a learner still struggles with basic counting after several weeks of practice at their level, ask your Learner Support Coordinator for ideas.',
    source: `${GUIDE}; Ministry of Education Catch Up Numeracy Teacher's Guide (TaRL)`,
  },
  {
    cat: 'Wellbeing',
    title: 'When a learner seems upset or withdrawn',
    summary: 'Teachers often notice first. You do not need to solve the problem. A kind, steady classroom and a quick word with your School Counsellor go a long way.',
    tips: [
      'Notice changes: a learner who is suddenly quiet, tearful, angry, often absent or falling behind.',
      'Greet them by name and check in briefly and privately: "I noticed you seem tired. Are you okay?"',
      'Keep routines steady and lower the pressure for a few days, such as shorter tasks or a helpful partner.',
      'Offer a calm moment: a short breathing break or a quiet job like handing out books.',
      'Write down what you notice and when, so you can share it with your School Counsellor.',
    ],
    more: ['Do not question the learner closely or try to find out what happened. That is for trained staff.'],
    help: 'If the changes last about two weeks, tell your School Counsellor. If you think a learner may be harmed or unsafe, see the Safeguarding card now.',
    source: `${GUIDE} (based on WHO and UNICEF Psychological First Aid)`,
  },
  {
    cat: 'Wellbeing',
    title: 'Five-minute calming activities',
    summary: 'Short activities used often work better than long lessons used rarely. Tie them to a routine: after break, before a test, end of day.',
    tips: [
      'Belly Breathing (Ubuntu SEL Curriculum, Activity 09).',
      'The Cooldown Corner (Ubuntu SEL, Activity 10) for a learner who needs a moment.',
      'Stretch! or Mindful Moments (Ubuntu SEL) for the whole class.',
      'A Brain Game from Ubuntu Brain Games for focus and self-control.',
      'Repeat the same activity often — practice builds the skill.',
    ],
    help: 'Ask your School Counsellor for the Ubuntu activity sheets and printable materials.',
    source: 'CHOLI-S Ubuntu SEL Curriculum and Ubuntu Brain Games',
  },
  {
    cat: 'Wellbeing',
    title: 'Friendships and bullying',
    summary: 'Bullying is repeated, deliberate hurting of someone who finds it hard to defend themselves. It can be physical, verbal, social or online.',
    tips: [
      'Agree simple respect rules with the class and refer to them often.',
      'Mix seating and groups so no learner is always alone.',
      'Supervise toilets, corridors and the playground at break.',
      'When you see it: stop it calmly, make sure the targeted learner is safe, and remind the class of the respect rules.',
      'Pair a lonely learner with a kind classmate and praise positive interactions.',
    ],
    help: 'If bullying keeps happening, involves a group or leaves a learner very upset, tell your School Counsellor. Serious violence is a safeguarding matter.',
    source: `${GUIDE} (based on UNESCO guidance)`,
  },
  {
    cat: 'Learning',
    title: 'Attendance',
    summary: 'Find out why a particular learner is missing school and respond to that reason. Personal, respectful contact with families shows the most promise.',
    tips: [
      'Take the register accurately and notice patterns early, such as repeated Mondays or market days.',
      'Welcome returning learners warmly; never shame them in front of the class.',
      'Ask the learner privately and kindly if anything is making it hard to come to school.',
      'Contact the family respectfully, following school procedure.',
      'Help the learner catch up on missed work.',
    ],
    help: 'If absence continues after contact with the family, tell your Learner Support Coordinator. Suspected child labour, early marriage or neglect is a safeguarding concern.',
    source: `${GUIDE} (based on Education Endowment Foundation evidence)`,
  },
  {
    cat: 'Learning',
    title: 'Inclusive teaching in large classes',
    summary: 'Every learner has the right to learn in a classroom that adapts to them. Adjust the challenge, how you present, and how learners show learning.',
    tips: [
      'Give three versions of the same exercise: basic, standard and extension.',
      'Say it, write it large on the board, and show it with an object or gesture.',
      'Let learners answer orally, by drawing, pointing or demonstrating.',
      'Seat learners who have difficulty seeing or hearing at the front.',
      'Use local materials such as bottle tops, stones and sticks for counting.',
    ],
    more: ['Use respectful, person-first language and never label a learner in front of others.'],
    help: 'If a learner is not progressing despite these adjustments, ask your Learner Support Coordinator for support. Only qualified professionals can assess special educational needs.',
    source: `${GUIDE}; Ministry of Education inclusive education guidelines`,
  },
  {
    cat: 'Safeguarding',
    title: 'Safeguarding: if a learner may be in danger',
    summary: 'Abuse, neglect, violence, self-harm, exploitation, child labour or early marriage: act the same day. Do not use the support request form for this.',
    tips: [
      'Make sure the learner is safe right now.',
      'Listen calmly; do not ask leading questions or investigate.',
      'Do not promise to keep it secret. Say: "You did the right thing telling me. It is not your fault."',
      'Write down what was said, in the learner\'s words, with the date and time.',
      'Report today to your school\'s Child Protection Focal Person (CPF).',
    ],
    help: 'If the child is in immediate danger, contact the police straight away. Childline Zambia 116 and Lifeline Zambia 933 are free, 24 hours.',
    source: `${GUIDE}; CHOLI-S Ubuntu Safe & Strong`,
  },
  {
    cat: 'Getting help',
    title: 'Who to contact in your school',
    summary: 'Your school\'s Counselling and Learner Support Department is your first stop. The department contacts CHOLIS when extra help is needed.',
    tips: [
      'Behaviour, emotional wellbeing, friendships and bullying: School Counsellor.',
      'Learning difficulties, reading and numeracy, attendance and inclusion: Learner Support Coordinator.',
      'Any safeguarding concern: Child Protection Focal Person (CPF), the same day.',
      'In School360 requests, use the learner reference ID only — never a name.',
      'Describe what you saw and heard, how often, and what you have already tried.',
    ],
    help: 'Request support when a concern has lasted about two weeks despite classroom strategies, is getting worse, or you are unsure what to do.',
    source: GUIDE,
  },
];

export const PARENT_RESOURCES: ResourceCard[] = [
  {
    cat: 'Learning at home',
    title: 'Helping your child read at home',
    summary: 'Children read more when reading is enjoyable and at the right level. A few minutes every day helps more than one long session.',
    tips: [
      'Read together for 10 minutes a day, in any language your child understands.',
      'Ask simple questions: "What do you think happens next?"',
      'Let your child read to you or to younger brothers and sisters.',
      'Use what you have: storybooks, newspapers, labels and signs in town.',
      'Praise effort, not only correct answers.',
    ],
    help: 'If your child is finding reading very hard, ask the school\'s Learner Support Coordinator what you can do at home.',
    source: GUIDE,
  },
  {
    cat: 'Feelings',
    title: 'Helping your child with big feelings',
    summary: 'Children who can name their feelings manage them better. Listen first, then help solve the problem.',
    tips: [
      'Name the feeling: "I can see you feel frustrated."',
      'Stay calm yourself; children learn by watching you.',
      'Try slow breathing together: breathe in slowly, breathe out slowly, three times.',
      'Talk about feelings at calm moments, such as at meals or bedtime.',
      'Notice changes such as sadness, anger or not wanting to go to school.',
    ],
    help: 'If worrying changes last two weeks or more, talk to the school\'s Counsellor.',
    source: GUIDE,
  },
  {
    cat: 'Behaviour',
    title: 'Positive discipline at home',
    summary: 'Clear expectations and calm follow-through work better than punishment. Physical punishment of children is prohibited in Zambia under the Children\'s Code Act 2022.',
    tips: [
      'Praise the specific good behaviour you want to see.',
      'Keep a few clear family rules and explain them.',
      'Offer simple choices: "Homework now or after you fetch water?"',
      'Use calm, fair consequences, such as losing play time, never hitting or shaming.',
      'Spend a little time each day just talking or playing together.',
    ],
    help: 'For ongoing behaviour worries, ask the school\'s Counsellor for support.',
    source: GUIDE,
  },
  {
    cat: 'School',
    title: 'Why every school day matters',
    summary: 'Missing school, even a few days a month, makes it hard for children to keep up. The school wants to help with any barriers.',
    tips: [
      'Make school attendance a daily family habit.',
      'If your child must miss school, tell the teacher why.',
      'Ask the teacher how your child can catch up on missed work.',
      'Talk to the school early about costs, transport or other difficulties.',
      'Watch for a child who suddenly does not want to go — it may signal a problem.',
    ],
    help: 'Talk to the school\'s Learner Support Coordinator about attendance worries. Vulnerable girls may qualify for Keeping Girls in School bursaries.',
    source: GUIDE,
  },
  {
    cat: 'School',
    title: 'Working with your child\'s teacher',
    summary: 'Children do best when home and school work together.',
    tips: [
      'Get to know your child\'s class teacher.',
      'Share anything at home that may affect learning, such as illness or a family change.',
      'Ask: "What can I do at home to help?"',
      'Attend parent meetings when you can.',
      'Celebrate progress together.',
    ],
    help: 'The school\'s Counselling and Learner Support Department can arrange a meeting with you.',
    source: GUIDE,
  },
  {
    cat: 'Growing up',
    title: 'Understanding teenagers',
    summary: 'Adolescence brings big changes in body, feelings and friendships. Teenagers need both independence and a close connection with you.',
    tips: [
      'Keep talking, even when your teen says little. Listen without lecturing.',
      'Agree clear house rules and the reasons for them.',
      'Know their friends and where they spend time.',
      'Talk openly about exam stress, alcohol and drugs, and staying safe.',
      'Girls who become pregnant can stay in school and return after giving birth (school re-entry policy).',
    ],
    help: 'If you are worried about your teenager\'s mood or safety, talk to the school\'s Counsellor.',
    source: GUIDE,
  },
  {
    cat: 'Getting help',
    title: 'Where to get help',
    summary: 'You are not alone. Your child\'s school and national services can help.',
    tips: [
      'Your child\'s school: the Counselling and Learner Support Department.',
      'Childline Zambia: 116 (free, 24 hours) — for children and anyone worried about a child.',
      'Lifeline Zambia: 933 (free, 24 hours) — counselling and support.',
      'Human Rights Commission: 8181 (toll-free) — children\'s rights.',
      'If a child is in immediate danger, contact the police straight away.',
    ],
    help: 'You can also send a general request using the "Request Consultation" tab. Please do not include your child\'s name or private details.',
    source: GUIDE,
  },
];
