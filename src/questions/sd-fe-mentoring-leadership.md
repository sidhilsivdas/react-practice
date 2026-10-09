## What the JD says

> "**Mentor team members and provide technical guidance**" · "**guide the frontend team**" · "Lead the React frontend development"

---

## What it means

**An architect leads mostly through influence, not authority:**

- **Mentoring:** helping individuals grow (skills, confidence, career).
- **Technical guidance:** helping the team make good decisions (architecture, standards, unblocking).
- **Technical leadership:** setting direction, making trade-off calls, owning quality, and representing the front end to stakeholders and clients.

**At Accenture there's often a client too.** You'll explain technical decisions to client stakeholders, manage expectations, and sometimes lead mixed or distributed teams across time zones.

**Analogy: a sports coach** 🏏 The coach doesn't play every match, but makes every player better, picks the strategy, and takes responsibility for results.

---

## What they expect

- **Real examples (STAR stories)** of mentoring, leading, resolving conflict, and influencing decisions.
- **A mentoring approach:** not "I tell them the answer", but growing independence.
- **Decision-making:** how you decide under uncertainty, and how you handle disagreement.
- **Delegation:** giving ownership while keeping quality.
- **Communication:** explaining technical ideas to non-technical people.
- **Ownership:** production incidents, deadlines, quality. You're accountable.

---

## How to mentor

### Situational approach: adapt to the person

| Person | Approach |
|---|---|
| **New joiner / junior** | Clear onboarding, small well-defined tasks, pair programming, frequent check-ins, explain the **why** |
| **Mid-level** | Bigger ownership (a feature end to end), coach with questions ("what options did you consider?"), design reviews |
| **Senior** | Delegate whole areas, ask them to write RFCs/ADRs and mentor others, sponsor them for visible work |
| **Struggling member** | Find the root cause (skills, clarity, workload, personal), set small achievable goals, give regular kind and specific feedback |

### Practical techniques

- **Pair programming** and **mob sessions** on tricky features.
- **Coaching questions** instead of answers: "What would happen if this API is slow?" "How would you test this?"
- **Code reviews as teaching:** explain the reasoning, link to docs, and praise good work specifically.
- **Onboarding guide:** architecture overview, local setup in under 30 minutes, "your first PR" task, a buddy.
- **Knowledge sharing:** weekly tech talks or brown-bag sessions, internal docs, recorded walkthroughs.
- **Growth plans:** agree 1–2 skills per quarter (e.g. "own the Playwright setup", "learn Next.js caching"), with stretch tasks and follow-up.
- **Psychological safety:** it's OK to ask questions and make mistakes; blameless post-mortems.

### Feedback model (SBI)

**S**ituation → **B**ehaviour → **I**mpact, then agree the next step.

> "In yesterday's PR (situation), the cart logic was added directly in the component without tests (behaviour). That made the bug in checkout harder to find, and it'll be hard to reuse (impact). Could we move it into a `useCart` hook with tests? Happy to pair on it."

---

## Technical guidance

- **Make decisions transparent:** options, trade-offs, a recommendation, documented in an ADR.
- **Unblock fast:** be reachable, hold office hours, and make it safe to ask.
- **Guardrails, not gatekeeping:** templates, lint rules, generators and examples, so the team moves fast **and** safely.
- **Delegate with clarity:** what outcome, what constraints, when to check in, and who decides what.
- **Tech debt management:** keep a visible debt register, reserve capacity each sprint (e.g. 15–20%), and explain the business impact to product.
- **Stay hands-on:** build spikes and proofs of concept, do critical reviews, and occasionally take on the hardest problems, without becoming the bottleneck.

---

## Stakeholders & clients

- **Translate:** "Moving to server components will cut product page load time by about 1s on mobile, which typically improves conversion. It costs about 3 sprints, done incrementally."
- **Estimate honestly**, with ranges and risks. Push back on unrealistic deadlines with options (reduce scope, add people, move the date).
- **Visibility:** demos, progress updates, risk logs.
- **Disagree and commit:** argue with data, then fully support the decision once it's made.

---

## Handling conflict

| Situation | Approach |
|---|---|
| Two developers disagree on an approach | Make the criteria explicit (performance, maintainability, time), compare options, prototype if needed, decide and record it in an ADR |
| A senior dev ignores the standards | One-to-one: understand why; maybe the standard is wrong; involve them in improving it; automate the rest |
| A designer wants something costly or inaccessible | Show the impact with data, propose alternatives that keep the intent, decide together |
| Backend changes an API without notice | Fix the immediate issue, then fix the process (contract tests, a change process), without blame |
| Missed deadline risk | Raise it early, offer options, re-plan the scope |

---

## Prepare STAR stories

**STAR = Situation, Task, Action, Result**, with numbers where possible. Prepare at least these.

> ⚠️ **The two stories below are examples of the format only.** Replace them with your own real situations and real numbers; interviewers ask follow-up questions.

**1. Mentoring (example):**

> *S:* A junior developer struggled with React state and their PRs had many bugs. *T:* Help them become independent within a quarter. *A:* Weekly pairing sessions, reviews explaining the "why", a small learning plan (hooks → TanStack Query → testing), and then ownership of the wishlist feature with my review. *R:* After 3 months their PRs needed ~70% fewer review changes, and they now mentor our newest joiner.

**2. Technical leadership (example):**

> *S:* Product pages had an LCP of 4.2s on mobile, hurting conversion. *T:* Lead the performance improvement without stopping feature work. *A:* Measured with RUM, created an ADR to move product pages to server components with cached data, prioritised the hero image, and added Lighthouse CI budgets; split the work across 3 developers with clear guidelines. *R:* LCP went to 1.9s at p75, and mobile conversion rose about 6% over the next month.

**3. Conflict:** a disagreement you resolved with data and an ADR.

**4. A failure:** what went wrong, what you learned, and what you changed (honest, with no blame).

**5. Influencing without authority:** getting another team to adopt contracts or tests.

---

## What to learn

- ✅ **Your STAR stories**: rehearse them out loud, 2 minutes each.
- ✅ **Mentoring techniques:** situational leadership, coaching questions, pairing, SBI feedback.
- ✅ **Decision-making tools:** ADRs, RFCs, trade-off matrices, "disagree and commit".
- ✅ **Delegation and ownership models.**
- ✅ **Tech debt strategy** and how to explain it to the business.
- ✅ **Estimation:** ranges, risks, scope negotiation.
- ✅ **Engineering metrics:** DORA, plus team health.
- ✅ **Client-facing communication** (important in consulting).

---

## Interview questions

**Q: How do you mentor junior developers?**
Adapt to the person: onboarding, pairing and small tasks first, then more ownership; coach with questions rather than answers; use code reviews to teach the why; agree growth goals and follow up.

**Q: How do you give difficult feedback?**
Privately, soon, and specifically with Situation–Behaviour–Impact; listen to their side; agree concrete next steps, and offer help.

**Q: How do you balance hands-on coding with leading?**
I stay hands-on in high-leverage areas (architecture spikes, critical reviews, hard problems) but avoid being on the critical path for features, so I don't block the team.

**Q: How do you handle tech debt?**
Make it visible in a register with its business impact, reserve regular capacity, tie debt work to feature work, and track improvement metrics.

**Q: Tell me about a time you disagreed with a stakeholder.**
(Use a STAR story with data, alternatives, the outcome, and the relationship preserved.)

---

## 🎯 Interview answer

> "I lead mostly through influence. For mentoring, I adapt to the person: juniors get structured onboarding, pairing and well-scoped tasks; mid-level developers get end-to-end ownership with coaching questions rather than answers; seniors get whole areas to own, RFCs to write and people to mentor. I use code reviews as teaching moments, explaining the why, give feedback early and specifically with the situation, behaviour and impact, and agree growth goals each quarter. For technical guidance, I make decisions transparent, with options and trade-offs written down in ADRs, set guardrails like templates, lint rules and examples so the team can move fast safely, stay reachable to unblock people, and keep a visible tech-debt register with regular capacity to address it. With stakeholders and clients, I translate technical choices into business impact and estimate honestly with options. For example, [short STAR story with a measurable result, like improving LCP from 4.2s to 1.9s while mentoring two developers through it]."
