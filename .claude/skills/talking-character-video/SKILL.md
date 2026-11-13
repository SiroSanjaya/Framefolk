---
name: talking-character-video
description: Implement and produce Indonesian talking-character videos for Project 1M in 36 Months. Use when building an episode, improving the Framefolk video workflow, or fixing its visuals, captions, voice, or Remotion output.
---

# Talking-character video implementation

## Mission

Turn the user's request into a working implementation or video, not a vague concept, moodboard, or list of ideas. Reply in casual Indonesian, keep updates short, and be honest about what was actually tested or generated.

First determine which task the user asked for:

- **Improve Framefolk:** work in the existing application and preserve its architecture and existing user changes. Do not create a separate demo or replace the app with a generic Remotion project.
- **Create an episode:** use the existing project and provided assets. Do not change unrelated application code.

Inspect the relevant code, assets, scripts, and tests before choosing an implementation. Identify the smallest concrete change that delivers the request. Ask a question only if a missing choice blocks implementation or materially changes the result; otherwise make a reasonable, explicit assumption and proceed.

## Project 1M series defaults

- Indonesian daily FYP series: **Project 1M in 36 Months**, aiming for Rp1 billion before 2030.
- Vertical 1080x1920, 30 fps. Episodes are usually 60-120 seconds.
- Keep the day sequence and facts consistent with the user's current direction. Do not invent progress, reuse stale episode details, or jump topics.
- Preferred visual style: a curiosity/conflict hook, then a polished dark blueprint/HUD language with terminal windows, wireframe browser elements, callouts, grids, and visuals that explain the spoken line. Use a light kinetic-typography hook where appropriate.
- No music or backing track unless requested. Sound effects are allowed.
- Do not claim photorealistic video generation when the pipeline only creates still images and animates/assembles them.

## Framefolk implementation contract

When modifying the existing Framefolk app, follow its current stack and component patterns. At the time this skill was written, the intended provider roles are:

- Claude/Anthropic: story and script generation when configured.
- Gemini Image: a separate AI still image for each scene that needs one.
- ElevenLabs: voice-over generation.
- Remotion: scene timing, camera/motion treatment, subtitles, and final video assembly.

Do not describe the result as fully AI-generated footage: AI still images plus Remotion animation are not generated video clips. Do not silently substitute animated backgrounds or title movement for requested scene imagery.

### Commercial target and launch gates

The requested product direction is a hosted, multi-customer SaaS for Indonesian users, using Supabase Auth/Postgres/Storage, a server-side Node render worker, Pexels for free stock discovery, Runway for optional paid AI video, and an Indonesian payment gateway selected after checking its current official documentation. The target Runway allowance is at most Rp100,000 per customer per billing month.

The current browser-local/Vite-middleware architecture is a development prototype, not a hosted SaaS. Do not call it sale-ready until the following are implemented and tested:

- Authenticated accounts and server-verified identity on every private API.
- Tenant-scoped project and asset storage, tested row-level security, migrations, backup/export, and account deletion.
- Server-only provider credentials; never ship Supabase service-role, Pexels, Runway, payment, Anthropic, Gemini, or ElevenLabs secrets to the browser.
- A durable per-customer usage ledger and atomic reservation before paid work. A browser counter, process memory, or localStorage is not a real spend limit.
- A queue/worker for long-running AI video and Remotion renders, with progress, cancellation, idempotency, retries that cannot duplicate paid work, private output URLs, expiry, and cleanup.
- Payment checkout and verified, idempotent webhooks before selling subscriptions. Do not enable live payments until the merchant account and product/pricing configuration are supplied by the owner.
- Deployment, observability, rate limits, privacy/terms, support and recovery procedures, and a tested release build.

Do not fabricate provider credentials or deploy against the user's accounts. Build configuration and migrations with placeholders, then stop at the setup step that requires the owner to provision a service. Never ask the owner to paste secrets into chat.

### Automatic stock discovery and rights

Use the official Pexels API for the approved free-stock workflow; do not scrape stock sites or bypass their APIs. Search from each scene's concrete visual description, present relevant results in context, and make applying/replacing a scene image a reversible user action. Do not make a user hunt for or paste asset URLs.

- Keep the Pexels API key on the server and honor API rate limits.
- Show the required prominent Pexels link and photographer credit/link where the API guidelines request it.
- Store provider, photo ID, photo page, photographer, and attribution with each imported asset. Preserve attribution when exporting or rendering; do not discard it when an asset is copied or transformed.
- Check current provider/API terms and license details before launch. "Free" does not mean unrestricted, and do not claim a particular asset is cleared for every commercial use without checking its source and applicable terms.
- Never send a user's private uploaded assets to a stock provider. Send only the minimal search text needed for a user-triggered query.

### Paid AI video and budget enforcement

Runway is optional and must be initiated by an explicit user action. Before starting a paid generation:

1. Show the selected model, clip duration, resolution, prompt, and estimated charge in IDR. Use current official provider pricing and a server-maintained FX/tax policy; do not guess or silently use a stale exchange rate.
2. Atomically reserve the estimate against the authenticated customer's current billing-month budget in the durable database. The default ceiling is Rp100,000 per customer per month.
3. Reject the generation before contacting Runway if pricing/FX is unknown, the reservation fails, or the ceiling would be crossed. Never top up automatically.
4. Persist the provider task ID and idempotency key before polling or retrying. Reconcile actual provider charges, release unused reservations, and retain failed/unknown charges until reconciled.
5. Report usage and remaining budget to that customer. Do not imply the budget is globally enforced until cross-instance and concurrent-request tests prove it.

Actual video clips and Remotion motion graphics are separate choices. Generated clips may consume credits; use the existing still-image/Remotion path when the user declines paid video or the account cannot reserve the cost.

For AI-image workflow changes:

1. Make the action explicit and user-triggered; never silently generate images or auto-retry a failed request.
2. Make it clear that each missing scene can make a separate Gemini Image request. The app cannot reliably pre-check Gemini's remaining quota; disclose that before generation and do not claim Gemini overages are prevented.
3. Keep generated scene images attached to the scene they illustrate. Do not replace unrelated assets or alter the character/background without a scene-specific reason.

For ElevenLabs workflow changes:

1. Never inspect, print, or expose API keys. Never make a live generation request unless the user explicitly initiates it.
2. Use the account's live subscription usage as the quota source; do not guess the remaining limit from a plan name or a hard-coded free-tier allowance.
3. Check quota before generation and enforce the remaining-character limit on the server immediately before each speech request. Fail closed if usage cannot be read or validated.
4. Serialize local speech requests so simultaneous tabs cannot spend the same locally observed remaining quota. Explain that other apps using the same API key are outside this lock.
5. Never top up, purchase credits, or silently switch to a paid voice/provider. If the account has no permitted voice or quota, explain the blocker and preserve work already completed.

## Episode inputs

Use what the user has provided. Ask only for essential missing material:

- Voice-over MP3, if the episode must use a recording that already exists.
- Exact script text as recorded, for accurate caption alignment.
- Character pose images with a consistent head position and scale, preferably high resolution.
- Optional style/reference image or video the user has rights to use.

Do not claim to have read a YouTube, TikTok, or Reels link if the media was not actually accessible. Ask for an uploaded reference or screenshots instead. Do not upscale character art with AI; request a better source if resolution is insufficient. Never draw a vector mouth over the face.

## Voice, captions, and character

- Never rewrite, synthesize over, or otherwise alter the user's supplied voice-over unless requested.
- Align captions to the actual spoken audio when possible. Use exact recorded text; never invent words to fill a timing gap.
- If a line's speaking rate is over about 19 characters/second and the exact spoken wording is unknown, ask for that line's transcript instead of guessing its captions.
- Preserve punctuation and meaningful Indonesian wording. Check that captions appear at the matching spoken moment and fit within the safe area.
- The character must visibly talk. Prefer matching mouth poses from the same character artwork; keep the eye/nose alignment stable and inspect close-ups at several speech moments.
- If suitable mouth poses or voice material are missing, state the limitation and implement the best supported fallback without pretending it is equivalent.

## Visual direction and motion

Every scene must illustrate its narration at that moment. Before coding, map each spoken beat to a concrete visual subject/action. Prefer specific objects, interfaces, diagrams, and scene imagery over decorative swaps.

Use Remotion motion to support the imagery, not replace it:

- Give scene imagery deliberate, scene-specific movement (for example, a direction-aware push/pan with easing, restrained parallax, or a licensed/generated video clip when approved). Avoid cycling the same generic movement on every scene.
- Keep scene images visible and legible; overlays must support text contrast without washing out or hiding the actual subject.
- Use character blinks, gaze shifts, pose changes, subtle nods, or emphasis only where they support the delivery.
- Reserve impact shake and large kinetic type for meaningful emphasis.
- Keep one clear idea per beat, legible type, safe margins, and no overlapping elements at the busiest frame.
- Check that light/dark text contrast follows the actual background. Do not animate a title as the only meaningful visual change in a scene; verify that the scene's primary image/footage visibly moves too.
- Do not add a new visual effect just to make the output appear more complex; it must clarify or reinforce the narration.
- Do not promise "perfect" motion. Define and test quality criteria on a representative preview: movement matches the action, no distracting jitter, stable composition, readable captions, and a clear visual change between beats.

## Timing and implementation workflow

For a new code change:

1. Inspect the existing project structure, the relevant components and provider calls, and the available test/build commands.
2. Write down the concrete behavior to change and the files directly involved; keep scope to that behavior.
3. Implement in the existing architecture. Reuse existing helpers and dependencies; do not add packages or unrelated abstractions without need.
4. Add or update focused tests for new behavior, especially quota refusal, error states, scene-to-image assignment, and caption timing where applicable.
5. Run the smallest relevant tests, then the project build/type checks needed to verify the change. Fix regressions caused by the change.
6. Report what changed, what checks passed, and any remaining limitation. Do not say something works unless it was verified.

For an episode:

1. Confirm the script and scene beats before building. If script changes are requested, keep the user's message and series direction intact.
2. Establish sentence/word timing from the actual voice track. Silence detection may help find pauses, but it is not speech recognition and cannot establish the spoken words.
3. Build the scene-specific visuals and character motion in the existing composition.
4. Preview representative frames and talking close-ups before any full render.
5. Render or consume provider quota only when the user explicitly asks for that action. Do not start a full render by default.
6. Report the actual output location and disclose any unverified timing, audio, or visual details.

Use the repository's existing package scripts, operating-system conventions, and Remotion version. Do not copy generic shell commands that could terminate unrelated processes or assume a different OS. Aim for one full render per requested episode, not repeated expensive renders.

## Audio and sound effects

- No backing music unless the user asks.
- Keep the voice intelligible and avoid clipping. Do not apply a fixed gain blindly; inspect/measure the source and final peak.
- Use effects such as pops, ticks, whooshes, typing, or impacts sparingly and cue them to actual visual events or word timings.
- Verify the final audio mix and peak when rendering or muxing. Preserve the supplied voice track unless asked to change it.

## Episode layout defaults

Adapt to the existing composition rather than forcing these coordinates onto a different canvas:

- For 1080x1920, keep key visuals in the upper/middle area, the character's face clear, captions in a consistent lower safe area, and a compact day/HUD indicator near the top.
- Dark blueprint scenes use readable light text; light scenes use dark text. Highlight color can use warm yellow, with a contrasting active-word color.
- Use large type only for key words; keep supporting labels comfortably readable on a phone.
- Check the densest frame for overlap, clipping, subtitle/face collisions, and safe-area violations.

## Quality gate

Before calling an implementation or episode complete, verify:

- Each scene's visual actually matches its narration; images are not merely swapped without changing the scene meaning.
- Captions match the spoken content and are readable at the intended aspect ratio.
- The character's mouth/pose motion looks intentional and does not show obvious patches or alignment drift.
- Voice and effects are audible without clipping; no unrequested music was added.
- The requested code tests/build or episode preview/render was actually run.

If a quality gate fails, fix the concrete issue or clearly state why it could not be fixed. Do not hide a limitation behind a confident summary.

## Final response

Give a short Indonesian summary of what was implemented or produced, the exact checks completed, and the next step only if one is needed. Distinguish clearly between:

- AI-generated still images,
- Remotion animation/assembly,
- generated or supplied voice-over,
- anything that was not generated or verified.
