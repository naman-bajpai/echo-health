// Browserbase Integration
// Web scraping for provider directory searches

const BROWSERBASE_API_KEY = Deno.env.get("BROWSERBASE_API_KEY") ?? "";
const BROWSERBASE_API_URL = "https://www.browserbase.com/v1";

import type { Provider } from "./types.ts";

interface BrowserbaseSession {
  id: string;
  status: string;
  connectUrl: string;
}

/**
 * Create a new Browserbase session
 */
async function createSession(): Promise<BrowserbaseSession> {
  if (!BROWSERBASE_API_KEY) {
    throw new Error("BROWSERBASE_API_KEY not configured");
  }

  const response = await fetch(`${BROWSERBASE_API_URL}/sessions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-bb-api-key": BROWSERBASE_API_KEY,
    },
    body: JSON.stringify({
      projectId: "default",
    }),
  });

  if (!response.ok) {
    throw new Error(`Browserbase session creation failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Search for healthcare providers
 * Uses Browserbase to scrape provider directories
 */
export async function searchProviders(
  specialty: string,
  location?: string
): Promise<Provider[]> {
  // For hackathon: return mock data if Browserbase not configured
  if (!BROWSERBASE_API_KEY) {
    console.warn("Browserbase not configured, returning mock providers");
    return getMockProviders(specialty, location);
  }

  try {
    const _session = await createSession();

    // In a full implementation, you would:
    // 1. Connect to the session via CDP
    // 2. Navigate to provider directory (e.g., Healthgrades, Zocdoc)
    // 3. Search for specialty + location
    // 4. Extract provider information
    // 5. Return structured data

    // For hackathon demo, return mock data
    return getMockProviders(specialty, location);
  } catch (error) {
    console.error("Browserbase search error:", error);
    return getMockProviders(specialty, location);
  }
}

/**
 * Mock provider data for demo purposes
 */
function getMockProviders(specialty: string, location?: string): Provider[] {
  const mockProviders: Provider[] = [
    {
      id: "prov-001",
      name: "Dr. Sarah Johnson",
      specialty: specialty,
      address: `123 Medical Center Dr, ${location || "San Francisco"}, CA 94102`,
      phone: "(415) 555-0101",
      distance: "0.5 miles",
      accepting_new_patients: true,
    },
    {
      id: "prov-002",
      name: "Dr. Michael Chen",
      specialty: specialty,
      address: `456 Health Plaza, ${location || "San Francisco"}, CA 94103`,
      phone: "(415) 555-0102",
      distance: "1.2 miles",
      accepting_new_patients: true,
    },
    {
      id: "prov-003",
      name: "Dr. Emily Williams",
      specialty: specialty,
      address: `789 Wellness Blvd, ${location || "San Francisco"}, CA 94104`,
      phone: "(415) 555-0103",
      distance: "2.0 miles",
      accepting_new_patients: false,
    },
    {
      id: "prov-004",
      name: "Dr. James Rodriguez",
      specialty: specialty,
      address: `321 Care Ave, ${location || "San Francisco"}, CA 94105`,
      phone: "(415) 555-0104",
      distance: "2.5 miles",
      accepting_new_patients: true,
    },
  ];

  return mockProviders;
}

/**
 * Generate hash for caching provider queries
 */
export function generateQueryHash(specialty: string, location?: string): string {
  const query = `${specialty.toLowerCase()}-${(location || "default").toLowerCase()}`;
  return btoa(query).replace(/[^a-zA-Z0-9]/g, "");
}

export default searchProviders;
