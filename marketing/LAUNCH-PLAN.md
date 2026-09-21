# Desktop World Clocks launch plan

Prepared: 2026-09-21

## Launch goal

Reach GNOME users who coordinate across time zones and turn that interest into installs from the official GNOME Extensions listing. The message should lead with the practical benefit: the relevant times stay visible without opening another application.

## Primary message

Desktop World Clocks places customizable world clocks directly on the GNOME desktop. It supports up to four independent groups and 40 clocks, uses the computer's existing synchronized system time, and makes no network requests of its own. The approved release supports GNOME Shell 49, 50, and 51.

## Audiences

- Remote workers, distributed teams, customer-facing teams, and open-source maintainers.
- People with family, friends, or travel commitments across time zones.
- GNOME users who want useful desktop information without a panel widget or a separate application.
- Fedora and Ubuntu desktop users running a supported GNOME Shell release.

## Canonical links and assets

- Install: https://extensions.gnome.org/extension/10916/desktop-world-clocks/
- Source and issues: https://github.com/infamous-pattern/gnome-desktop-world-clocks
- Primary screenshot: `docs/desktop-four-groups.png`
- Detail screenshot: `docs/desktop-detail.png`
- Preferences screenshot: `docs/preferences.png`

Always send installation traffic to the official GNOME Extensions listing. Use GitHub as the source, documentation, issue, and contributor destination.

## Launch sequence

### Day 1: owned channels

1. Publish a GitHub `v1.0.0` release from the reviewed launch commit.
2. Publish the LinkedIn launch post with `docs/desktop-four-groups.png`.
3. Publish the two-post Mastodon launch thread using the same screenshot.
4. Respond to every substantive question and record recurring questions for the README.

### Day 2: relevant communities and press

1. Submit the r/Linux post only if the account satisfies its current rule that no more than 10% of posts are self-promotional, and remain available to answer comments.
2. Send concise news tips to OMG! Ubuntu!, OMG! Linux, It's FOSS, and Linuxiac. Personalize the first sentence for each outlet and disclose the project's collaborative coding provenance.
3. Pitch a short Fedora Magazine how-to focused on solving a Fedora Workstation use case, subject to its editorial process.

### Days 4–7: useful follow-up

Publish one short configuration example: four corners for operations coverage, a compact single group for a remote team, or clocks without abbreviations for a clean desktop. Lead with the use case and link to the official listing once.

### Weeks 2–4: sustain interest

- Share a preferences walkthrough and invite specific usability feedback.
- Publish a short technical note about low-resource design, system time integration, and the absence of extension network traffic or telemetry.
- Thank contributors and publish fixes or compatibility updates when there is real release news.
- Report adoption numbers only after checking the live listing; label the date and do not imply causation from a particular post.

## Channel boundaries

- r/GNOME requires explicit disclosure that machine learning was used. A prior post was rejected because that disclosure was missing. Put the disclosure in the first paragraph, name OpenAI Codex, state its exact role, and state the maintainer’s direction, testing, JavaScript review, and ongoing responsibility. Resubmit only with that disclosure and accept the moderators’ decision.
- GNOME Discourse currently removes announcements for projects it considers entirely LLM-written. Do not cross-post there unless its moderators confirm this project is eligible.
- Treat r/Fedora as moderator-sensitive because its rules allow removal of low-effort or AI content. Ask moderators first if that channel becomes important.
- Do not use r/Ubuntu for launch promotion; its current rules require posts to be support questions.
- Follow r/Linux's current self-promotion limit and comment-participation requirement before posting.
- Do not ask for ratings, fabricate testimonials, or imply GNOME endorsement beyond approval and availability on the official extension website.

## Measures

Record these once per week for four weeks:

- GNOME Extensions downloads. Baseline: 2 on 2026-09-21.
- GitHub stars, forks, unique cloners/visitors if available, and issue quality.
- Social post views, meaningful replies, reshares, and link clicks where the platform provides them.
- Press responses and published coverage.

The best early signal is qualified engagement: installations, useful issue reports, and people describing a real multi-time-zone use case.
