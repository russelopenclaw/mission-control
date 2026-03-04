# AdMob Integration Guide

## Overview
Google Mobile Ads has been successfully integrated into the Dinner Roulette app with banner ads displayed at the bottom of both the Search Screen and Results Screen.

## Features Implemented

### 1. **AdMob Service** (`lib/services/admob_service.dart`)
- Centralized service for managing ads
- Automatic test ad unit IDs in debug mode
- Production ad unit IDs from `.env` file
- Platform detection (Android/iOS)
- Banner ad factory method

### 2. **Reusable Banner Ad Widget** (`lib/components/banner_ad_widget.dart`)
- Self-contained stateful widget
- Automatic ad loading and disposal
- Error handling
- Platform-aware (only shows on Android/iOS)
- Standard banner size (320x50)

### 3. **Optimized Layout Integration**
Both screens use an optimized layout pattern:
```dart
Column(
  children: [
    Expanded(
      child: SingleChildScrollView(
        // Main content here
      ),
    ),
    SafeArea(
      child: BannerAdWidget(),
    ),
  ],
)
```

This ensures:
- ✅ Banner ad stays fixed at the bottom
- ✅ Main content is fully scrollable
- ✅ No content is hidden behind the ad
- ✅ SafeArea respects device notches/navigation bars
- ✅ App remains fully functional

## Testing

### Debug Mode (Current State)
The app automatically uses **Google's test ad unit IDs** in debug mode:
- **Android Test Banner**: `ca-app-pub-3940256099942544/6300978111`
- **iOS Test Banner**: `ca-app-pub-3940256099942544/2934735716`

You can test the ads immediately without any additional configuration.

### Running the App
```bash
# Android
flutter run -d android

# iOS
flutter run -d ios

# Web (ads won't show - not supported)
flutter run -d chrome
```

## Production Setup

### Step 1: Create AdMob Account
1. Go to https://apps.admob.com
2. Sign in with your Google account
3. Click "Apps" → "Add App"
4. Follow the setup wizard for your app

### Step 2: Create Ad Units
1. In AdMob console, select your app
2. Click "Ad units" → "Add ad unit"
3. Select "Banner"
4. Configure settings and create
5. Copy the Ad Unit ID (format: `ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY`)
6. Repeat for both Android and iOS platforms

### Step 3: Update `.env` File
Replace the placeholder values in `.env`:
```env
ADMOB_ANDROID_BANNER_ID=ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY
ADMOB_IOS_BANNER_ID=ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY
```

### Step 4: Update Platform Configuration

#### Android (`android/app/src/main/AndroidManifest.xml`)
Add your AdMob App ID inside the `<application>` tag:
```xml
<meta-data
    android:name="com.google.android.gms.ads.APPLICATION_ID"
    android:value="ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY"/>
```

#### iOS (`ios/Runner/Info.plist`)
Add your AdMob App ID:
```xml
<key>GADApplicationIdentifier</key>
<string>ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY</string>
```

### Step 5: Build Release Version
```bash
# Android
flutter build apk --release
# or
flutter build appbundle --release

# iOS
flutter build ios --release
```

## Architecture Benefits

### 1. **Separation of Concerns**
- `AdMobService`: Business logic for ad management
- `BannerAdWidget`: UI component for displaying ads
- Screens: Just consume the widget

### 2. **Maintainability**
- Single source of truth for ad configuration
- Easy to add more ad types (interstitial, rewarded)
- Centralized error handling

### 3. **User Experience**
- Non-intrusive banner placement
- Doesn't block content
- Respects safe areas
- Graceful fallback if ads fail to load

### 4. **Developer Experience**
- Test ads work out of the box
- Easy production configuration
- Platform-aware (no crashes on web/desktop)

## Troubleshooting

### Ads Not Showing?
1. **Check platform**: Ads only work on Android/iOS
2. **Check logs**: Look for "AdMob SDK initialized" and ad loading messages
3. **Network**: Ensure device has internet connection
4. **Test ads**: In debug mode, test ads should always work
5. **Production**: New ad units may take hours to serve first ad

### Common Issues

**"Ad failed to load"**
- Normal behavior for new ad units (can take 1-2 hours)
- Check internet connection
- Verify ad unit IDs are correct

**"Invalid ad unit ID"**
- Ensure format is correct: `ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY`
- Check for typos in `.env` file
- Verify you're using banner ad unit IDs (not app ID)

**Ads showing in debug but not release**
- Add AdMob App ID to AndroidManifest.xml / Info.plist
- Ensure `.env` file is included in release build
- Check AdMob account is fully set up

## Best Practices

1. **Always test with test ad unit IDs first**
2. **Never click your own ads in production** (can get account banned)
3. **Monitor ad performance** in AdMob console
4. **Respect user experience** - don't overload with ads
5. **Follow AdMob policies** - https://support.google.com/admob/answer/6128543

## Additional Ad Types (Future Enhancement)

The current architecture makes it easy to add:
- **Interstitial Ads**: Full-screen ads between screens
- **Rewarded Ads**: Users watch video for in-app reward
- **Native Ads**: Ads that match your app's design

Example service method for interstitial:
```dart
static InterstitialAd createInterstitialAd({
  required Function(Ad ad) onAdLoaded,
  required Function(Ad ad, LoadAdError error) onAdFailedToLoad,
}) {
  return InterstitialAd.load(
    adUnitId: interstitialAdUnitId,
    request: const AdRequest(),
    adLoadCallback: InterstitialAdLoadCallback(
      onAdLoaded: onAdLoaded,
      onAdFailedToLoad: onAdFailedToLoad,
    ),
  );
}
```

## Resources

- [Google Mobile Ads Flutter Plugin](https://pub.dev/packages/google_mobile_ads)
- [AdMob Documentation](https://developers.google.com/admob)
- [Flutter AdMob Codelab](https://codelabs.developers.google.com/codelabs/admob-ads-in-flutter)
- [AdMob Policy Center](https://support.google.com/admob/answer/6128543)

## Support

For issues related to:
- **App implementation**: Check this guide and code comments
- **AdMob account/policies**: Contact AdMob support
- **Flutter plugin**: Check [GitHub issues](https://github.com/googleads/googleads-mobile-flutter/issues)
