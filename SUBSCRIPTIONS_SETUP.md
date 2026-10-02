# Swingers World subscriptions

The mobile app uses RevenueCat with the `premium` entitlement. App Store and Google Play remain the source of truth for pricing, trial eligibility, renewals, cancellations, and refunds.

## Products

On Google Play, create one auto-renewable subscription with three base plans:

- `com.swingers.world.premium:monthly`
- `com.swingers.world.premium:six-months`
- `com.swingers.world.premium:annual`

For the App Store, create the equivalent monthly, six-month, and annual products using store-compatible identifiers.

Attach all three products to the RevenueCat entitlement named `premium`, add them to the current Offering, and configure a RevenueCat Paywall containing all three packages.

Configure a seven-day free introductory trial for each product in App Store Connect and Google Play Console. Store eligibility rules ensure that one customer cannot repeatedly claim the trial within the same subscription group.

## App environment

Copy the public SDK keys from RevenueCat into the app environment:

```env
EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=appl_...
EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=goog_...
EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID=premium
```

## Railway environment

Generate a long random webhook authorization value and add it as:

```env
REVENUECAT_WEBHOOK_SECRET=...
```

In RevenueCat, create a webhook pointing to:

```text
https://swingers-world-production.up.railway.app/api/revenuecat/webhook
```

Set its Authorization header to `Bearer <REVENUECAT_WEBHOOK_SECRET>`.

## Testing

Expo Go runs without blocking access when the RevenueCat public key is absent in development. Real store purchases require a development build and sandbox/test accounts:

```powershell
eas build --platform android --profile development
eas build --platform ios --profile development
```
