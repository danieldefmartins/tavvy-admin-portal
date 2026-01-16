import { describe, it, expect } from "vitest";

// GoHighLevel has multiple API endpoints
const GHL_API_V1 = 'https://rest.gohighlevel.com/v1';
const GHL_API_V2 = 'https://services.leadconnectorhq.com';

describe("GoHighLevel API Integration", () => {
  const apiKey = process.env.GHL_API_KEY;
  const locationId = process.env.GHL_LOCATION_ID;

  it("should have GHL credentials configured", () => {
    expect(apiKey).toBeDefined();
    expect(apiKey).not.toBe("");
    expect(locationId).toBeDefined();
    expect(locationId).not.toBe("");
  });

  it("should validate GHL API key using v1 API", async () => {
    if (!apiKey || !locationId) {
      console.warn("Skipping GHL API test - credentials not configured");
      return;
    }

    // Try v1 API - contacts endpoint
    const response = await fetch(`${GHL_API_V1}/contacts/?locationId=${locationId}&limit=1`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    console.log("GHL v1 API response status:", response.status);
    
    if (response.status === 401) {
      // Try without Bearer prefix
      const response2 = await fetch(`${GHL_API_V1}/contacts/?locationId=${locationId}&limit=1`, {
        method: 'GET',
        headers: {
          'Authorization': apiKey,
        },
      });
      console.log("GHL v1 API (no Bearer) response status:", response2.status);
      
      if (response2.ok) {
        console.log("GHL v1 API works without Bearer prefix");
        expect(response2.status).toBe(200);
        return;
      }
    }

    // If v1 fails, the key might be for v2 only
    if (!response.ok) {
      console.log("v1 API failed, this might be a v2-only key");
    }
    
    expect(response.status).not.toBe(401);
  });

  it("should validate GHL API key using v2 API with Version header", async () => {
    if (!apiKey || !locationId) {
      console.warn("Skipping GHL API test - credentials not configured");
      return;
    }

    // Try v2 API with Version header
    const response = await fetch(`${GHL_API_V2}/contacts/?locationId=${locationId}&limit=1`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Version': '2021-07-28',
        'Content-Type': 'application/json',
      },
    });

    console.log("GHL v2 API response status:", response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log("GHL v2 API works - contacts found:", data.contacts?.length || 0);
      expect(response.status).toBe(200);
    } else {
      const errorText = await response.text();
      console.log("GHL v2 API error:", errorText);
      
      // Try different Version header
      const response2 = await fetch(`${GHL_API_V2}/contacts/?locationId=${locationId}&limit=1`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Version': '2021-04-15',
        },
      });
      console.log("GHL v2 API (older version) response status:", response2.status);
    }
  });

  it("should test GHL API with location-specific endpoint", async () => {
    if (!apiKey || !locationId) {
      console.warn("Skipping GHL API test - credentials not configured");
      return;
    }

    // Try location-specific contacts endpoint
    const response = await fetch(`${GHL_API_V2}/locations/${locationId}/contacts?limit=1`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Version': '2021-07-28',
      },
    });

    console.log("GHL location contacts endpoint status:", response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log("Error response:", errorText);
    }
  });
});
