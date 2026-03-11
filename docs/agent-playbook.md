> ⚠️ **DEPRECATED**: This document references old JSON files.
> PostgreSQL is now the source of truth. See AGENTS.md for current practices.

# Screensaver Video Agent - Complete Playbook

## Overview

This document defines the end-to-end process for creating AI-generated screensaver videos. A sub-agent should be able to follow this playbook autonomously from theme selection to final video delivery.

## Agent Identity

- **Name:** ScreensaverAgent
- **Role:** Autonomous screensaver video producer
- **Model:** minimax-m2.5:cloud (CRITICAL: qwen2.5:7b cannot execute exec commands properly)
- **Parent:** Alfred (reports completion/errors)

---

## Phase 1: Theme Selection

### Step 1.1: Choose Theme

**Sources:**
- Existing ideas in `screensavers/ideas.md`
- Exclude any theme marked "(completed)"

**Decision Process:**
- Read ideas.md
- Pick the best candidate (agent's judgment: what makes a great screensaver)
- No human approval needed — agent decides

**Output:**
- Theme name (e.g., "Northern Lights")
- Project folder: `/home/kevin/.openclaw/workspace/screensavers/<theme-slug>/`
- 10 distinct image concepts (vary: time of day, weather, angle, mood)

### Step 1.2: Initialize Project

**CRITICAL: Create the exact folder structure as specified!**

Create project folder structure:
```
screensavers/<theme-slug>/
├── raw/           # AI-generated images (before approval)
├── approved/      # Images that passed verification (COPY HERE AFTER VERIFICATION)
├── segments/      # Video segments (pairs, quads, clips)
└── output/        # Final compiled video
```

**DO NOT skip folders or put files in wrong locations!**

Log to `memory/YYYY-MM-DD.md` and update Alfred Hub task status.

---

## Phase 2: Image Generation

### Step 2.0: Log Generation Parameters (REQUIRED)

**Create a `generation_log.md` file in the raw/ folder BEFORE starting image generation.**

Log the following for EVERY image generation run:

```markdown
# Cherry Blossoms - Generation Log
Date: 2026-02-26
Time: 21:08:00

## Environment
- SD API: http://192.168.1.33:7860
- Model: juggernautXL_v9Rdphoto2Lightning.safetensors
- Resolution: 1280x720

## Image 1 - img_01.png
Timestamp: 21:08:15
Prompt: [full prompt used]
Negative Prompt: [if any]
Steps: 25
CFG Scale: 7
Seed: [if available]
Duration: [seconds]
Status: SUCCESS
Notes: [any observations]
```

**CRITICAL: Log model used BEFORE generating - don't assume it's still set!**

### Step 2.1: Generate Images

**⚠️ CRITICAL: Check and set the model BEFORE each generation session!**

The SD API may have been reset since last use. ALWAYS verify the model:

```bash
# Check current model
curl -s http://192.168.1.33:7860/sdapi/v1/options | jq -r '.sd_model_checkpoint'

# If not RealVisXL, switch it:
curl -s -X POST http://192.168.1.33:7860/sdapi/v1/options \
  -H "Content-Type: application/json" \
  -d '{"sd_model_checkpoint": "RealVisXL_V4.0.safetensors [912c9dc74f]"}'
```

**Available models on this instance:**
- `RealVisXL_V4.0.safetensors` - ✅ DEFAULT (produces more natural, less AI-looking images)
- `juggernautXL_v9Rdphoto2Lightning.safetensors` - Alternative (more detailed but can look artificial)

**Tool:** Stable Diffusion API ONLY at `http://192.168.1.33:7860/sdapi/v1/txt2img`

⚠️ **DO NOT use OpenAI Image API** — only Stable Diffusion

**CRITICAL: Resolution and Aspect Ratio**
- MUST use 16:9 aspect ratio
- Recommended: width=1280, height=720 (1.5x scale to 1920x1080 - clean upscale)
- Or: width=1024, height=576 (1.875x scale - acceptable but less clean)
- NEVER use square (512x512) — impossible to upscale cleanly to 16:9
- Generate at 1280x720 for best results when upscaled to HD

**Per-image spec:**
- Resolution: 1280x720 (preferred) or 1024x576
- Format: PNG

**Requirements per image:**
- Resolution: 1280x720 (preferred) or 1024x576 (16:9)
- Format: PNG
- Prompt: Unique per image (vary time of day, weather, angle)
- Quality: Add to prompt: "photorealistic, detailed textures, natural lighting, film grain"
- For more realistic images, include: "realistic, high detail, 8k, DSLR camera, film photography"
- Avoid over-smoothed look by NOT using: "smooth, perfect, clean, illustration, cartoon"

### Prompt Engineering for Photorealism

**Include in EVERY prompt:**
```
photorealistic, detailed textures, natural lighting, high detail, 8k, DSLR camera quality
```

**CRITICAL: Each of the 10 images MUST be different!**

Use these prompt variations - each gives a VERY different scene:

**Image 1:** "morning light, low angle, close to water, mist rising"
**Image 2:** "golden hour, side angle, wide shot, sun rays through trees"
**Image 3:** "overcast, soft diffused light, reflections on water"
**Image 4:** "afternoon, looking downstream, rocky foreground"
**Image 5:** "morning, looking up at canopy, dappled sunlight"
**Image 6:** "sunset, warm orange tones, silhouette trees"
**Image 7:** "cloudy day, moody, desaturated colors"
**Image 8:** "early morning, fog, mysterious atmosphere"
**Image 9:** "spring, lush green, flowers in frame"
**Image 10:** "dusk, blue hour, fireflies in air"

**AVOID these terms (cause smoothness/cartoonish look):**
```
smooth, perfect, clean, illustration, cartoon, anime, painting, artistic, overly saturated
```

**Example prompts (good):**
- "gentle forest stream in morning light, low angle close to water, mist rising, photorealistic, detailed textures, natural lighting, high detail, 8k, DSLR camera quality"
- "forest stream at golden hour, side angle wide shot, sun rays through trees, photorealistic, detailed textures, natural lighting, high detail, 8k, DSLR camera quality"
- Larger images take longer (5-15 minutes)
- Set timeout to 20 minutes per image
- Retry up to 3 times on failure

**Process:**
1. Generate images one at a time (due to long generation time)
2. Use curl with the SD API — NOT the image tool
3. Save to `raw/` folder with sequential naming: `img_01.png`, `img_02.png`, etc.
4. **LOG each generation** to generation_log.md (prompt, model, settings, duration)
5. Log each generation (prompt used, timestamp, duration)

**Guard Rails:**
- Timeout: 20 minutes per image max
- Retry: Up to 3 times if generation fails
- If 3 failures: log issue, continue to next image (don't stop entirely)

### Step 2.2: Image Verification

**⚠️ FULLY AUTOMATED — NO HUMAN INVOLVED**

The agent assesses each generated image and decides if it's good enough.

**Verification Criteria (agent evaluates):**
- [ ] No obvious artifacts, distortions, or glitches
- [ ] Appropriate resolution/quality for screensaver use
- [ ] Matches the theme and prompt intent
- [ ] Visually coherent (no corrupted areas, strange blurriness)
- [ ] Good candidate for video transitions (decent color/composition)

**CRITICAL: Diversity Check - Each image must be different!**

After generating all 10 images, compare them:
1. Check that each image has a different composition, time of day, or angle
2. If images are too similar (same rocks, same sun position, same angle), REGENERATE with different prompt
3. Compare prompts - each MUST have different descriptive keywords (morning vs sunset, low angle vs wide, mist vs fog, etc.)
4. Log comparison results - if >3 images are similar, regenerate those specific ones

**Process:**
1. After each image generates, assess it using the criteria above
2. If image fails verification:
   - Delete the failed image
   - Log the failure reason
   - Regenerate (up to 3 retries per image)
3. If 3 retries fail: note the issue, continue to next image
4. Keep generating until you have 10 verified images in `raw/`
5. Move all 10 to `approved/` folder

**Guard Rails:**
- DO NOT proceed to video compilation until you have exactly 10 verified images
- If an image consistently fails, note the issue and try a different prompt variation
- Log all decisions for debugging

---

## Phase 3: Video Compilation

### ⚠️ CRITICAL: Always Use xfade, NEVER concat!

When joining video segments at ANY stage, you MUST use the `xfade` filter:

- **CORRECT:** `ffmpeg ... -filter_complex "[0:v][1:v]xfade=transition=fade:duration=3:offset=27"`
- **WRONG:** Just concatenating files with `-c copy` or using concat demuxer

Using concat creates abrupt cuts between scenes. The xfade filter creates smooth crossfade transitions.

This applies to:
- Joining individual images into pairs
- Joining pairs into quads
- Joining quads into octets
- Joining octets into final video
- Creating the loop transition (last image → first image)

### Step 3.1: Prepare Approved Images

Ensure `approved/` folder contains:
- 10 images minimum for a full cycle
- Image 1 also saved as final image for loop closure (img_11.png = img_01.png)

### Step 3.2: Build Video Segments

Follow config.md timing rules:
- Image display: 27 seconds
- Transition (crossfade): 3 seconds
- Total per image: 30 seconds
- Per pair (2 images): 57 seconds
- Per quad (4 images): 111 seconds
- Full cycle (10 images): ~276 seconds

**CRITICAL: Use xfade for ALL transitions!**

⚠️ **NEVER use concat to join video segments - it creates abrupt cuts!**

The xfade filter must be used at EVERY stage of the video assembly:
1. Pair creation (seg01+seg02 with xfade)
2. Pair joining to quads (pair01+pair02 with xfade)
3. Quad joining to octet (quad01+quad02 with xfade)
4. Octet joining to final pair (octet+pair05 with xfade)
5. Loop transition (seg10 → seg01 with xfade)

**Offset calculation for xfade:**
- Pair offset: 27 (30s - 3s transition)
- Quad offset: 54 (57s - 3s transition)  
- Octet offset: 108 (111s - 3s transition)
- Final offset: 216 (219s - 3s transition)
- Loop offset: 27 (30s - 3s transition)

**Correct approach - xfade chain:**
```bash
# Step 1: Create 5 pairs (each pair has internal crossfade)
ffmpeg -y -loop 1 -framerate 25 -t 30 -i approved/img_01.png \
       -loop 1 -framerate 25 -t 30 -i approved/img_02.png \
  -filter_complex "[0:v][1:v]xfade=transition=fade:duration=3:offset=27,format=yuv420p" \
  -c:v libx264 -pix_fmt yuv420p -r 25 -preset ultrafast -crf 23 segments/pair_01.mp4

# Repeat for pairs 02-05

# Step 2: Join pairs to quads (MUST USE XFADE, not concat!)
ffmpeg -y -i segments/pair_01.mp4 -i segments/pair_02.mp4 \
  -filter_complex "[0:v][1:v]xfade=transition=fade:duration=3:offset=54,format=yuv420p" \
  -c:v libx264 -pix_fmt yuv420p -r 25 -preset ultrafast -crf 23 segments/quad_01.mp4

# Step 3: Join quads to octet (MUST USE XFADE!)
ffmpeg -y -i segments/quad_01.mp4 -i segments/quad_02.mp4 \
  -filter_complex "[0:v][1:v]xfade=transition=fade:duration=3:offset=108,format=yuv420p" \
  -c:v libx264 -pix_fmt yuv420p -r 25 -preset ultrafast -crf 23 segments/octet.mp4

# Step 4: Add final pair with xfade (MUST USE XFADE!)
ffmpeg -y -i segments/octet.mp4 -i segments/pair_05.mp4 \
  -filter_complex "[0:v][1:v]xfade=transition=fade:duration=3:offset=216,format=yuv420p" \
  -c:v libx264 -pix_fmt yuv420p -r 25 -preset ultrafast -crf 23 segments/cycle.mp4

# Step 5: Loop transition (img_10 → img_01) with xfade
# Create a transition segment from seg_10 to seg_01
ffmpeg -y -i segments/seg_10.mp4 -i segments/seg_01.mp4 \
  -filter_complex "[0:v][1:v]xfade=transition=fade:duration=3:offset=27,format=yuv420p" \
  -c:v libx264 -pix_fmt yuv420p segments/loop_transition.mp4

# Step 6: Add loop transition to end of base video
ffmpeg -y -i segments/cycle.mp4 -i segments/loop_transition.mp4 \
  -filter_complex "[0:v][1:v]xfade=transition=fade:duration=3:offset=273,format=yuv420p" \
  -c:v libx264 -pix_fmt yuv420p segments/cycle_loopable.mp4

# Step 7: Loop to 60+ minutes
# Create concat file listing base video multiple times
ffmpeg -y -f concat -safe 0 -i concat_list.txt -c copy output/final_video.mp4
```

**⚠️ NEVER use concat for joining video segments - it creates abrupt cuts! Always use xfade.**

**Guard Rails:**
- Verify each segment renders correctly before proceeding
- Check file sizes (should be reasonable: 100-500MB for 60 min)
- Test loop seamlessness

### Step 3.3: Final Verification

**Fully Automated:**
- Review the final video for any rendering artifacts
- Verify the loop point is seamless (img_10 → img_01 transitions smoothly)
- Check file size is reasonable for duration

**If issues found:**
- Note the problem
- Rebuild affected segment
- Re-verify

---

## Phase 4: Delivery & Archive

### Step 4.1: Move to Storage

**Locations:**
- Local: `/home/kevin/.openclaw/workspace/screensavers/<theme>/output/`
- Network: `/mnt/openclaw/workspace/screensavers/<theme>/`

**Process:**
1. Create network folder: `mkdir -p /mnt/openclaw/workspace/screensavers/<theme>/`
2. Copy final video: `cp /home/kevin/.openclaw/workspace/screensavers/<theme>/output/<theme>.mp4 /mnt/openclaw/workspace/screensavers/<theme>/`
3. Copy ALL images to network: `cp /home/kevin/.openclaw/workspace/screensavers/<theme>/approved/*.png /mnt/openclaw/workspace/screensavers/<theme>/`
4. Verify copy integrity (file size match)
5. Delete local raw/segments if desired (keep approved/ and output/)

### Step 4.2: Report Completion

**Task Updates Required:**
1. Create task for image generation: "ss-{theme}-images" in todo column
2. Create task for video compilation: "ss-{theme}-video" in todo column
3. Move image task to in-progress when starting generation
4. Move image task to complete, video task to in-progress when starting video
5. Move video task to complete when done

**Exact task JSON to add to tasks.json:**

```json
{
  "id": "ss-{theme}-images",
  "title": "Generate {Theme} Images",
  "description": "Generate 10 diverse, photorealistic 1280x720 images using Stable Diffusion",
  "status": "in-progress",
  "assignee": "screensaver",
  "priority": "medium",
  "type": "content",
  "theme": "{Theme}",
  "createdAt": "{ISO timestamp}",
  "startedAt": "{ISO timestamp}",
  "completedAt": null,
  "parent": "ss-{theme}"
},
{
  "id": "ss-{theme}-video",
  "title": "Compile {Theme} Video",
  "description": "Compile images into 60+ minute loopable video with crossfade transitions",
  "status": "todo",
  "assignee": "screensaver",
  "priority": "medium",
  "type": "video",
  "theme": "{Theme}",
  "createdAt": "{ISO timestamp}",
  "startedAt": null,
  "completedAt": null,
  "parent": "ss-{theme}"
}
```

**Update columns in tasks.json:**
- Start: images="in-progress", video="todo"
- After images complete: images="complete", video="in-progress"
- After video complete: video="complete"

**Post completion message with:**
- Theme name
- Video duration
- File location
- Any notes/issues

**Update Alfred Hub:**
- Mark both tasks complete
- Update agent status to idle

---

## Error Handling

| Error | Response |
|-------|----------|
| Image generation timeout | Retry 3x, then stop and report |
| Image rejected by user | Regenerate per feedback, re-present |
| FFmpeg error | Check logs, fix command, re-run |
| Disk space low | Stop, alert user, clean up before proceeding |
| Network storage unavailable | Keep local, alert user |

---

## Task Template

When starting a new screensaver project, create a task entry:

```json
{
  "id": "ss-{YYYY}-{###}",
  "title": "Create {Theme} Screensaver Video",
  "description": "End-to-end: theme → generate 10+ images → verify → compile → deliver",
  "status": "in-progress",
  "assignee": "screensaver-agent",
  "priority": "medium",
  "type": "content",
  "theme": "{Theme Name}",
  "createdAt": "{ISO timestamp}",
  "startedAt": "{ISO timestamp}",
  "completedAt": null,
  "phases": {
    "themeSelected": false,
    "folderStructureCreated": false,
    "imagesGenerated": false,
    "imagesVerified": false,
    "imagesCopiedToApproved": false,
    "videoCompiled": false,
    "copiedToNetwork": false,
    "delivered": false
  }
}
```

### Sub-tasks (REQUIRED for visibility):

Create TWO separate tasks in Alfred Hub:

1. **ss-{theme}-images** - Generate {Theme} Images
   - Status: "in-progress" when generating, "complete" when done
   - Type: content

2. **ss-{theme}-video** - Compile {Theme} Video
   - Status: "todo" initially, "in-progress" when starting video, "complete" when done
   - Type: video

### Update Alfred Hub at each milestone:
- Start: set images="in-progress", video="todo"
- After images complete: set images="complete", video="in-progress"
- After video complete: set video="complete"

### Phase Completion Checklist

- [ ] Phase 1: Theme Selected → mark in ideas.md
- [ ] Phase 2: Folder structure created (raw/, approved/, segments/, output/)
- [ ] Phase 3: Images generated in raw/
- [ ] Phase 4: Images verified → copy to approved/
- [ ] Phase 5: Video compiled in output/
- [ ] Phase 6: Copied to network (video + images)
- [ ] Phase 7: ideas.md updated to "(completed)"

---

## How to Call Stable Diffusion API

The agent must use `exec` with curl — NOT the `image` tool.

**CRITICAL: Must switch to juggernautXL model first!**

```bash
# Step 1: Switch to juggernautXL model (required for quality)
curl -s -X POST http://192.168.1.33:7860/sdapi/v1/options \
  -H "Content-Type: application/json" \
  -d '{"sd_model_checkpoint": "juggernautXL_v9Rdphoto2Lightning.safetensors [c8df560d29]"}'

# Step 2: Generate image
RESPONSE=$(curl -s -X POST http://192.168.1.33:7860/sdapi/v1/txt2img \
  -H "Content-Type: application/json" \
  -d '{"prompt": "your prompt here", "width": 1024, "height": 576, "steps": 25}')
echo "$RESPONSE" | jq -r '.images[0]' | base64 -d > /path/to/output.png
```

**Key points:**
- MUST switch to juggernautXL model first - RealVisXL produces bad quality
- Use `jq` to extract the base64 image from the JSON response
- Use `base64 -d` to decode and save as PNG
- width/height MUST be 16:9 (e.g., 1024x576, 1280x720)

---

## Parent Agent (Alfred) Oversight

When ScreensaverAgent is first learning:
- Alfred may check in periodically to review generated images
- If agent is inconsistent, Alfred provides guidance
- Once agent demonstrates consistent quality, it runs fully autonomous
- Alfred handles any errors the sub-agent can't recover from

---

## Dependencies

- **Image Generation:** Stable Diffusion API ONLY at `192.168.1.33:7860` (NO OpenAI)
- **Video Compilation:** FFmpeg with xfade filter
- **Storage:** Network share at /mnt/openclaw/workspace/screensavers/
- **Communication:** Discord/Telegram for progress reports to parent (Alfred)

---

## Notes

- Always vary prompts within a theme (different times of day, weather, angles)
- Get explicit approval before video compilation — don't assume
- Keep raw images until final delivery complete
- Log decisions and timestamps for debugging

---

## Project Tracking

When a theme is selected, update `screensavers/ideas.md`:
- Mark the chosen theme with "(in progress)"
- After video delivery, mark it "(completed)"
