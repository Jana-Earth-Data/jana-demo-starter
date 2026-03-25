export type RegionKey = "nepal" | "kathmandu";

export type RegionConfig = {
  key: RegionKey;
  label: string;
  countryCode: string;
  countryName: string;
  coordinates?: string; // "lon,lat"
  radius?: number; // km
};

export const REGIONS: Record<RegionKey, RegionConfig> = {
  nepal: {
    key: "nepal",
    label: "All Nepal",
    countryCode: "NPL",
    countryName: "Nepal",
  },
  kathmandu: {
    key: "kathmandu",
    label: "Kathmandu Valley",
    countryCode: "NPL",
    countryName: "Nepal",
    coordinates: "85.324,27.717",
    radius: 15,
  },
};
