# Screensaver Video Production Workflow v2.0

**Last Updated:** 2026-02-28  
**Status:** AUTONOMOUS - NO PASSIVE CHECKPOINTS

**CRITICAL CHANGE:** Agents run autonomously without waiting for Alfred approval. Alfred monitors proactively and verifies at completion.

---

## Roles & Responsibilities

| Role | Responsibilities |
|------|-----------------|
| **Alfred (Main)** | Proactive monitoring, final verification, assessment, documentation |
| **Image Agent** | Generate + upscale autonomously, report milestones, deliver |
| **Video Agent** | Build all 8 steps autonomously, verify each step, deliver |

---

## Complete Workflow

### Phase 1: Image Generation (AUTONOMOUS)

1. **Create project structure:**
   ```
   /screensavers/{theme}/{raw,approved,segments,output}
   ```

2. **Generate 10 images at 1280x720:**
   - Batch mode, no per-image approval
   - Report at img_03, img_06, img_10
   - **Does NOT wait for Alfred verification**

3. **Auto-upscale to 1920x1080:**
   - ffmpeg lanczos scaling (fast, reliable)
   - Verify file >1.5MB each

4. **Move to approved/ and report complete**

**Alfred Action:** Run quality check DURING generation (proactive, not blocking)
   - Alfred checks resolution with ffprobe
   - Confirm: 1920x1080
   - **Alfred explicitly approves before video build**

6. **Move to approved/ and report complete**

---

### Phase 2: Video Build (Video Agent)

**INCREMENTAL BUILD - Never skip steps**

1. **Step 1: Create 10 segments (30s each)**
   ```bash
   ffmpeg -loop 1 -framerate 25 -t 30 -i img_##.png -c:v libx264 seg_##.mp4
   ```
   - Verify: each 30.0s duration
   - **🛑 CHECKPOINT 3: Alfred spot-checks 2-3 segments**

2. **Step 2: Create 5 pairs (xfade at offset 27)**
   ```bash
   ffmpeg -i seg_01.mp4 -i seg_02.mp4 \
     -filter_complex "[0:v][1:v]xfade=transition=fade:duration=3:offset=27" pair_01.mp4
   ```
   - Verify: each ~57s, >5MB
   - Continue (no checkpoint needed)

3. **Step 3: Create 2 quads (xfade at offset 54)**
   ```bash
   ffmpeg -i pair_01.mp4 -i pair_02.mp4 \
     -filter_complex "[0:v][1:v]xfade=transition=fade:duration=3:offset=54" quad_01.mp4
   ```
   - Verify: each ~111s, >15MB
   - **🛑 CHECKPOINT 4: Alfred verifies duration**

4. **Step 4: Create octet (xfade at offset 108)**
   - Combine quad_01 + quad_02
   - Verify: ~219s, >30MB
   - Continue

5. **Step 5: Create cycle (xfade at offset 216 with pair_05)**
   - Combine octet + pair_05
   - Verify: ~273s
   - **🛑 CHECKPOINT 5: Alfred verifies**

6. **Step 6: Add 10→1 transition (xfade at offset 270)**
   ```bash
   ffmpeg -i cycle.mp4 -i seg_01.mp4 \
     -filter_complex "[0:v][1:v]xfade=transition=fade:duration=3:offset=270" cycle_seamless.mp4
   ```
   - Verify: ~300s (5 min with transition)
   - **🛑 CHECKPOINT 6: Alfred confirms 10→1 crossfade exists**

7. **Step 7: Loop to 60 minutes**
   ```bash
   for i in $(seq 1 12); do echo "file 'cycle_seamless.mp4'" >> loops.txt; done
   ffmpeg -f concat -safe 0 -i loops.txt -c copy temp.mp4
   ffmpeg -t 3600 -i temp.mp4 -c copy {theme}_60min.mp4
   ```
   - Verify: exactly 3600s
   - Deliver to /mnt/openclaw/workspace/screensavers/{theme}/

8. **Step 8: Copy images to network**
   ```bash
   cp approved/*.png /mnt/openclaw/workspace/screensavers/{theme}/
   ```
   - Verify: 11 files (10 images + 1 video)

---

### Phase 3: Alfred Verification (IMMEDIATE)

**Run immediately when video agent reports complete:**

1. **Resolution:** `ffprobe -select_streams v:0 -show_entries stream=width,height` (must be 1920,1080)
2. **Duration:** `ffprobe -show_entries format=duration` (must be 3600.0)
3. **Size:** `ls -lh` (expect 400-800MB)
4. **Assets:** `ls | grep -E "(img_|.mp4)" | wc -l` (must be 11)
5. **Update ideas.md:** Mark as "(completed - resolution, size)"
6. **Update kanban:** status: complete

---

### Phase 4: Post-Production Assessment (NEW - MANDATORY)

**Before marking fully complete, run assessment:**

1. Fill assessment template (see assessments/ folder)
2. Grade performance:
   - Image Agent (A-F)
   - Video Agent (A-F)
   - Alfred (A-F)
3. Document what worked/failed
4. Update workflow docs if needed
5. Give agent feedback
6. THEN mark complete

**Assessment location:** `/home/kevin/.openclaw/workspace/screensavers/assessments/{theme}-assessment.md`

---

## Key Principles

1. **No passive checkpoints** - Agents run autonomously
2. **Alfred monitors proactively** - Verify DURING, not after
3. **Fast verification** - ffprobe, not ffmpeg playback tests
4. **Document everything** - Assessment mandatory before completion
5. **Continuous improvement** - Update workflow based on lessons

---

## Key Lessons Learned

### What We Got Wrong (and Fixed)

1. **❌ Didn't verify images before approving**
   - **Fix:** Alfred MUST run `image` tool before upscaling

2. **❌ Didn't verify resolution before video build**
   - **Fix:** Alfred checks 1920x1080 with ffprobe

3. **❌ Image Agent didn't upscale**
   - **Fix:** Image Agent responsible for upscaling BEFORE video

4. **❌ Video Agent ran without checkpoints**
   - **Fix:** 6 explicit checkpoints where Alfred verifies

5. **❌ Didn't verify 10→1 transition**
   - **Fix:** cycle_seamless must be ~300s (not 273s)

6. **❌ Didn't copy images to network**
   - **Fix:** Step 8 mandatory, verify 11 files total

---

## Next Video Selection

**Remaining Ideas (pick next):**
- #12: Underwater Scene - Coral reef, gentle fish movement
- #13: Autumn Forest - Colorful fall leaves, dirt path
- #14: Starry Night Sky - Milky Way, shooting stars
- #15: Tropical Beach - Palm trees, turquoise water
- #16: Waterfall - Majestic, tropical/mountain
- #17: Lavender Fields - Purple fields, countryside
- #18: Snowy Village - European village, gentle snowfall
- #19: Bamboo Forest - Tall bamboo, filtered sunlight
- #20: Campfire - Crackling fire, stars above
- #21: Private Pool - Calm water, tropical, evening
- #22: Private Waterfall & Spa - Flowing water, lush greenery
- #23: Fireplace - Cozy indoor, crackling logs
- #24: Rainy Library - Old library, fireplace, rainy windows
- #25: Abstract Gradients - Smooth color transitions

**Recommendation:** Pick something visually distinct from previous videos (Mountain Lake, Rainy Café, Aurora, Cabin, etc.)

---

## File Locations

- **Skills:** `/home/kevin/.openclaw/workspace/skills/{image,video}-agent/SKILL.md`
- **Kanban:** `/home/kevin/.openclaw/workspace/alfred-hub/tasks.json`
- **Ideas:** `/home/kevin/.openclaw/workspace/screensavers/ideas.md`
- **Videos:** `/mnt/openclaw/workspace/screensavers/{theme}/`
- **Memory:** `/home/kevin/.openclaw/workspace/memory/{image,video}-agent.md`

---

## Ready to Proceed

This workflow is documented, verified, and ready for autonomous production. Alfred will:
1. Pick next theme
2. Spawn Image Agent with clear task
3. Verify at Checkpoints 1-2
4. Spawn Video Agent with clear steps
5. Verify at Checkpoints 3-6
6. Run final checklist
7. Mark complete and deliver

**No manual babysitting required.**
