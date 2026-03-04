# Screensaver Gallery - here.now Publish Info ✅

## Live URL
**https://sonic-island-h49d.here.now/**

## Publish Details
- **Slug**: sonic-island-h49d
- **Version ID**: 01KJQSTKXCKG8138HMC3JX01YA
- **Status**: ✅ Permanent (authenticated publish)
- **Published**: 2026-03-02 11:35 AM CST

## What's Included
- ✅ HTML gallery page with all 10 screensavers
- ✅ 105 PNG thumbnail images (all frames for each video)
- ✅ Download links for all videos

## What's NOT Included
- ⚠️ Video files themselves (5.9GB - exceeds single publish limits)
  - Videos remain at: `/mnt/openclaw/workspace/screensavers/`
  - Download links in gallery point to local paths

## Options for Video Hosting
1. **Second publish** - Upload videos in a separate here.now publish (may need to split into 2-3 batches due to 5GB limit)
2. **Local network** - Update gallery to stream from `http://192.168.1.56/screensavers/`
3. **Hybrid** - Keep gallery as-is for viewing thumbnails, download videos from network share

## To Update This Publish
```bash
cd /home/kevin/.openclaw/workspace/screensaver-gallery
# Make changes, then:
curl -X PUT https://here.now/api/v1/publish/sonic-island-h49d \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d @new-manifest.json
```

## API Key Location
`~/.herenow/credentials`
