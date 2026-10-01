import { useEffect } from 'react';
import * as Location from 'expo-location';
import { getCalendars } from 'expo-localization';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

const UPDATE_DISTANCE_METERS = 5000;
const UPDATE_INTERVAL_MS = 15 * 60 * 1000;

function distanceInMeters(fromLatitude: number, fromLongitude: number, toLatitude: number, toLongitude: number) {
  const earthRadius = 6371000;
  const toRadians = (value: number) => value * Math.PI / 180;
  const latitudeDelta = toRadians(toLatitude - fromLatitude);
  const longitudeDelta = toRadians(toLongitude - fromLongitude);
  const a = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(toRadians(fromLatitude)) * Math.cos(toRadians(toLatitude)) * Math.sin(longitudeDelta / 2) ** 2;
  return 2 * earthRadius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function LocationSync() {
  const { user } = useAuth();
  const profile = user?.Profile;

  useEffect(() => {
    if (!user || !profile?.locationTrackingEnabled) return undefined;

    let cancelled = false;
    let subscription: Location.LocationSubscription | undefined;
    let lastLatitude = profile.latitude ?? null;
    let lastLongitude = profile.longitude ?? null;

    const synchronize = async (position: Location.LocationObject) => {
      if (cancelled) return;
      const latitude = Number(position.coords.latitude.toFixed(2));
      const longitude = Number(position.coords.longitude.toFixed(2));
      if (lastLatitude !== null && lastLongitude !== null
        && distanceInMeters(lastLatitude, lastLongitude, latitude, longitude) < UPDATE_DISTANCE_METERS) return;

      const [place] = await Location.reverseGeocodeAsync({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
      const city = place?.city || place?.district || place?.subregion;
      if (!city || cancelled) return;

      const address = [city, place.region, place.country]
        .filter((part, index, values): part is string => Boolean(part) && values.indexOf(part) === index)
        .join(', ');

      await api.patch('/profile', {
        address,
        city,
        region: place.region || '',
        countryCode: place.isoCountryCode || '',
        timezone: getCalendars()[0]?.timeZone || 'UTC',
        latitude,
        longitude,
        locationSource: 'automatic',
      });
      lastLatitude = latitude;
      lastLongitude = longitude;
    };

    void (async () => {
      const permission = await Location.getForegroundPermissionsAsync();
      if (permission.status !== 'granted' || cancelled) return;

      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      await synchronize(current);
      if (cancelled) return;

      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          distanceInterval: UPDATE_DISTANCE_METERS,
          timeInterval: UPDATE_INTERVAL_MS,
        },
        (position) => { void synchronize(position).catch(() => undefined); },
      );
    })().catch(() => undefined);

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [profile?.latitude, profile?.locationTrackingEnabled, profile?.longitude, user]);

  return null;
}
