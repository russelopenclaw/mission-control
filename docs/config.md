# Screensaver Video Config

## Video Settings
- Resolution: 1920x1080
- Image duration: 27 seconds display
- Transition: 3 second smooth crossfade to next image
- Total length: >60 minutes (14 cycles)

## Image Sequence (10 images)
- Images: cabin_01 through cabin_10 (1080p versions)
- Loopable: Add image 1 at end for seamless loop back

## Compilation Process (Step-by-Step)

### Step 1: Create 5 Pairs (each with internal crossfade)
```
pair01 = img01 + img02 (xfade at offset 27, duration 3) → 57s
pair02 = img03 + img04 (xfade at offset 27, duration 3) → 57s
pair03 = img05 + img06 (xfade at offset 27, duration 3) → 57s
pair04 = img07 + img08 (xfade at offset 27, duration 3) → 57s
pair05 = img09 + img10 (xfade at offset 27, duration 3) → 57s
```

### Step 2: Join Pairs with Crossfades
```
quad01 = pair01 + pair02 (xfade at offset 54, duration 3) → 111s
quad02 = pair03 + pair04 (xfade at offset 54, duration 3) → 111s
```

### Step 3: Combine Quads
```
octet = quad01 + quad02 (xfade at offset 108, duration 3) → 219s
```

### Step 4: Add Final Pair
```
cycle = octet + pair05 (xfade at offset 216, duration 3) → 273s
```

### Step 5: Make Loopable (add transition from img10 → img1)
```
# Add image 1 with crossfade from image 10
cycle_loopable = cycle + img01 (xfade at offset 270, duration 3) → 276s
```

### Step 6: Loop to >60 minutes
```
# 14 cycles × 276s = 3864s = 64.4 minutes
```

## FFmpeg Commands Reference

### Create Pair (2 images with crossfade)
```bash
ffmpeg -y -loop 1 -framerate 25 -t 30 -i img01.png \
       -loop 1 -framerate 25 -t 30 -i img02.png \
  -filter_complex "[0:v][1:v]xfade=transition=fade:duration=3:offset=27,format=yuv420p" \
  -c:v libx264 -pix_fmt yuv420p -r 25 -preset ultrafast -crf 23 pair.mp4
```

### Join Two Videos with Crossfade
```bash
ffmpeg -y -i video1.mp4 -i video2.mp4 \
  -filter_complex "[0:v][1:v]xfade=transition=fade:duration=3:offset=OFFSET,format=yuv420p" \
  -c:v libx264 -pix_fmt yuv420p -r 25 -preset ultrafast -crf 23 output.mp4
```
Where OFFSET = duration_of_video1 - 3

### Concatenate Videos (no transition)
```bash
ffmpeg -y -f concat -safe 0 -i <(printf "file '%s'\n" vid1.mp4 vid2.mp4 ...) -c copy output.mp4
```

## Timing Calculation
- Per image: 27s display + 3s transition = 30s
- Per pair (2 images): 30 + 30 - 3 = 57s
- Per quad (4 images): 57 + 57 - 3 = 111s
- Per octet (8 images): 111 + 111 - 3 = 219s
- Full cycle (10 images): 219 + 57 - 3 = 273s
- With loop transition (11 images): 273 + 30 - 3 = 300s? Actually ~276s

## File Locations
- Local workspace: /home/kevin/.openclaw/workspace/screensavers/<project>/
- Network storage: /mnt/openclaw/workspace/screensavers/<project>/

## Automation Notes
- Build pairs first (can run in parallel)
- Build quads (must be sequential)
- Build octet (sequential)
- Add final pair (sequential)
- Add loop transition (sequential)
- Loop final cycle (simple concat)
