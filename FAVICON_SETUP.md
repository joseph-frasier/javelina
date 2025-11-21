# Favicon Setup Guide

Your Javelina application is now configured to display favicons! 

## Required Files

Place the following files in the `/public` directory:

1. **favicon.ico** (16x16 or 32x32) - Main favicon for browser tabs
2. **favicon-16x16.png** - 16x16 PNG version
3. **favicon-32x32.png** - 32x32 PNG version  
4. **apple-touch-icon.png** - 180x180 PNG for iOS home screen

## How to Generate Favicons

### Option 1: Online Generator (Easiest)
1. Go to [favicon.io](https://favicon.io/) or [realfavicongenerator.net](https://realfavicongenerator.net/)
2. Upload your Javelina logo (recommend using the transparent background version from `/public`)
3. Download the generated favicon package
4. Copy the files listed above into your `/public` directory

### Option 2: Using Existing Logo
If you want to convert your existing Javelina logo:
1. Open your logo in an image editor (Photoshop, GIMP, etc.)
2. Create square versions at the required sizes
3. Export as PNG (or convert to ICO format for favicon.ico)
4. Save to `/public` directory

## Quick Setup with Your Existing Logo

You can use one of these online converters with your existing logo files:
- Upload `JAVELINA LOGO TRANSPARENT BACKGROUND.png` or 
- Upload `JAVELINA_WHITE_BLACK_BACKGROUND-REMOVED.png`

To these sites:
- https://favicon.io/favicon-converter/
- https://realfavicongenerator.net/

## Verify It Works

After adding the favicon files:
1. Restart your Next.js dev server (`npm run dev`)
2. Open your browser and navigate to your app
3. Check the browser tab - you should see your favicon!
4. Clear browser cache if needed (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)

## Current Configuration

The favicon configuration is set up in `/app/layout.tsx` using Next.js metadata API.

