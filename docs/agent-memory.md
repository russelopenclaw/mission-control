# Screensaver Agent Memory

## Active Project
- Theme: Ocean Sunset (COMPLETED)
- Status: Done
- Duration: 69 min 18 sec
- File: /mnt/openclaw/workspace/screensavers/ocean-sunset/ocean_sunset.mp4

## Last Run
- Date: 2026-02-26
- Phase: All complete
- Notes: First fully autonomous run with minimax-m2.5:cloud model

## Completed Themes
- Ocean Sunset (2026-02-26)

## In Progress Themes
- (none)

## Lessons Learned

### Agent Model
- CRITICAL: qwen2.5:7b CANNOT execute exec commands - it stops immediately without running
- SOLUTION: Use minimax-m2.5:cloud for the agent - it properly executes shell commands

### SD Model
- RealVisXL (default) produces bad quality images with artifacts and banding
- juggernautXL produces much better quality - MUST switch before generating
- Command to switch: curl -X POST http://192.168.1.33:7860/sdapi/v1/options -d '{"sd_model_checkpoint": "juggernautXL_v9Rdphoto2Lightning.safetensors [c8df560d29]"}'

### Image Resolution
- 512x512 is too small - upscaling looks fuzzy
- 1024x576 (16:9) is good - enough detail, reasonable generation time
- NEVER use square images

### Video Compilation
- FFmpeg xfade works well
- Need to verify moov atom for valid MP4 (some intermediate files may be incomplete during writing)
- 60+ minute video takes time to concatenate

## Issues Log
- qwen2.5:7b failed to execute commands → use minimax-m2.5:cloud
- RealVisXL bad quality → switch to juggernautXL
- **UPDATE 2026-02-27: RealVisXL actually produces MORE natural, less AI-looking images**
- **juggernautXL looks more detailed but more artificial**
- **RealVisXL is now the DEFAULT model**
- 1024x576 too small → use 1280x720 (1.5x scale to 1080p, cleaner upscale)
- Agent skipped folder structure → updated playbook with STRONGER emphasis
- Agent didn't copy images to network → updated playbook with explicit copy commands
- Cartoonish smoothness → add photorealistic prompts + avoid "smooth/perfect/clean"
- **Images all identical** → Agent used same base prompt, must vary time/angle/weather per image - added specific prompt variations to playbook
- **No crossfades between pairs** → Agent used concat instead of xfade for joining segments - updated playbook with explicit xfade commands for ALL joins
- **Quality difference between runs** → Added generation_log.md requirement to log model, prompts, and settings for every image
