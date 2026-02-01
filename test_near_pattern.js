// Test the updated "near" pattern
const query = "starbucks near Newark nj";

// Updated Pattern 1: Supports both comma and space
const nearPattern = /^(.+?)\s+(?:near|in|at)\s+(.+?)(?:(?:,\s*|\s+)([a-zA-Z]{2}))?$/i;
const match = query.match(nearPattern);

const US_STATES = new Set([
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
]);

console.log("Query:", query);
console.log("Pattern:", nearPattern);
console.log("Match:", match);

if (match) {
  const [_, placeName, cityPart, statePart] = match;
  console.log("✅ MATCH FOUND!");
  console.log("Place:", placeName);
  console.log("City:", cityPart);
  console.log("State (original):", statePart);
  
  if (statePart) {
    const stateUpper = statePart.toUpperCase();
    console.log("State (uppercase):", stateUpper);
    console.log("Valid US state?", US_STATES.has(stateUpper));
  }
} else {
  console.log("❌ NO MATCH");
}
