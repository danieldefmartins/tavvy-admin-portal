/**
 * GoHighLevel API Integration Service
 * 
 * This service handles contact management with GoHighLevel CRM.
 * Used to sync Pro signups and enable GHL automations (SMS, email, etc.)
 */

// GoHighLevel v1 API - works with location API keys
const GHL_API_URL = 'https://rest.gohighlevel.com/v1';

interface GHLContactData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  companyName?: string;
  address1?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  website?: string;
  tags?: string[];
  customField?: Record<string, string>;
}

interface GHLContactResponse {
  contact: {
    id: string;
    locationId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
}

/**
 * Create a new contact in GoHighLevel
 */
export async function createGHLContact(
  contactData: GHLContactData,
  apiKey: string,
  locationId: string
): Promise<{ success: boolean; contactId?: string; error?: string }> {
  try {
    const response = await fetch(`${GHL_API_URL}/contacts/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...contactData,
        locationId,
        source: 'Tavvy Pros Portal',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GHL API Error:', response.status, errorText);
      return { 
        success: false, 
        error: `GHL API Error: ${response.status}` 
      };
    }

    const data: GHLContactResponse = await response.json();
    return { 
      success: true, 
      contactId: data.contact.id 
    };
  } catch (error) {
    console.error('GHL Contact Creation Error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Update an existing contact in GoHighLevel
 */
export async function updateGHLContact(
  contactId: string,
  contactData: Partial<GHLContactData>,
  apiKey: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${GHL_API_URL}/contacts/${contactId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(contactData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GHL Update Error:', response.status, errorText);
      return { 
        success: false, 
        error: `GHL API Error: ${response.status}` 
      };
    }

    return { success: true };
  } catch (error) {
    console.error('GHL Contact Update Error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Search for a contact by email in GoHighLevel
 */
export async function findGHLContactByEmail(
  email: string,
  apiKey: string,
  locationId: string
): Promise<{ found: boolean; contactId?: string; error?: string }> {
  try {
    const response = await fetch(
      `${GHL_API_URL}/contacts/lookup?email=${encodeURIComponent(email)}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      }
    );

    if (!response.ok) {
      return { found: false };
    }

    const data = await response.json();
    if (data.contacts && data.contacts.length > 0) {
      return { found: true, contactId: data.contacts[0].id };
    }
    return { found: false };
  } catch (error) {
    console.error('GHL Contact Search Error:', error);
    return { 
      found: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Add tags to a contact in GoHighLevel
 */
export async function addGHLContactTags(
  contactId: string,
  tags: string[],
  apiKey: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${GHL_API_URL}/contacts/${contactId}/tags`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tags }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GHL Tags Error:', response.status, errorText);
      return { 
        success: false, 
        error: `GHL API Error: ${response.status}` 
      };
    }

    return { success: true };
  } catch (error) {
    console.error('GHL Add Tags Error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Sync a new Tavvy Pro to GoHighLevel
 * This is the main function to call after a Pro signs up
 */
export async function syncProToGHL(
  proData: {
    email: string;
    fullName: string;
    phone?: string;
    businessName?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    website?: string;
    services?: string[];
    yearsExperience?: number;
  },
  apiKey: string,
  locationId: string
): Promise<{ success: boolean; contactId?: string; error?: string }> {
  // Parse full name into first and last
  const nameParts = proData.fullName.trim().split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  // Check if contact already exists
  const existing = await findGHLContactByEmail(proData.email, apiKey, locationId);
  
  if (existing.found && existing.contactId) {
    // Update existing contact
    const updateResult = await updateGHLContact(
      existing.contactId,
      {
        firstName,
        lastName,
        phone: proData.phone,
        companyName: proData.businessName,
        city: proData.city,
        state: proData.state,
        postalCode: proData.zipCode,
        website: proData.website,
      },
      apiKey
    );

    if (updateResult.success) {
      // Add Pro tags
      await addGHLContactTags(
        existing.contactId,
        ['Tavvy Pro', 'Paid Member', ...(proData.services || [])],
        apiKey
      );
    }

    return { 
      success: updateResult.success, 
      contactId: existing.contactId,
      error: updateResult.error 
    };
  }

  // Create new contact
  const createResult = await createGHLContact(
    {
      firstName,
      lastName,
      email: proData.email,
      phone: proData.phone,
      companyName: proData.businessName,
      city: proData.city,
      state: proData.state,
      postalCode: proData.zipCode,
      website: proData.website,
      tags: ['Tavvy Pro', 'New Signup', ...(proData.services || [])],
      customField: proData.yearsExperience 
        ? { years_experience: String(proData.yearsExperience) }
        : undefined,
    },
    apiKey,
    locationId
  );

  return createResult;
}
