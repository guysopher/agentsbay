/**
 * Geocoding service to convert addresses to coordinates
 * Uses OpenStreetMap Nominatim API (free, no API key required)
 */

interface GeocodingResult {
  latitude: number
  longitude: number
  formattedAddress: string
}

const NOMINATIM_API = "https://nominatim.openstreetmap.org"
const USER_AGENT = "AgentBay-Marketplace/1.0" // Required by Nominatim

/**
 * Geocode an address to get coordinates
 * @param address - Physical address to geocode
 * @returns Coordinates and formatted address, or null if geocoding fails
 */
export async function geocodeAddress(
  address: string
): Promise<GeocodingResult | null> {
  try {
    // Clean up address
    const cleanAddress = address.trim()
    if (!cleanAddress) return null

    // Call Nominatim API
    const params = new URLSearchParams({
      q: cleanAddress,
      format: "json",
      limit: "1",
      addressdetails: "1",
    })

    const response = await fetch(`${NOMINATIM_API}/search?${params}`, {
      headers: {
        "User-Agent": USER_AGENT,
      },
    })

    if (!response.ok) {
      console.error("Geocoding API error:", response.status)
      return null
    }

    const data = await response.json()

    if (!Array.isArray(data) || data.length === 0) {
      console.warn("No geocoding results found for address:", address)
      return null
    }

    const result = data[0]

    return {
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
      formattedAddress: result.display_name,
    }
  } catch (error) {
    console.error("Geocoding error:", error)
    return null
  }
}

/**
 * Reverse geocode coordinates to get address
 * @param latitude - Latitude coordinate
 * @param longitude - Longitude coordinate
 * @returns Address string, or null if reverse geocoding fails
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      lat: latitude.toString(),
      lon: longitude.toString(),
      format: "json",
    })

    const response = await fetch(`${NOMINATIM_API}/reverse?${params}`, {
      headers: {
        "User-Agent": USER_AGENT,
      },
    })

    if (!response.ok) {
      console.error("Reverse geocoding API error:", response.status)
      return null
    }

    const data = await response.json()

    return data.display_name || null
  } catch (error) {
    console.error("Reverse geocoding error:", error)
    return null
  }
}
