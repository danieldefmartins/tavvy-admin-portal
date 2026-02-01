// Test the updated case-insensitive parser
const query = "starbucks newark nj";

// Updated Pattern 2: Case-insensitive
const cityStatePattern = /^(.+?)\s+([a-zA-Z]+(?:\s+[a-zA-Z]+)?)\s+([a-zA-Z]{2})$/;
const match = query.match(cityStatePattern);

const US_STATES = new Set([
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
]);

console.log("Query:", query);
console.log("Pattern (case-insensitive):", cityStatePattern);
console.log("Match:", match);

if (match) {
  const [_, placeName, city, state] = match;
  const stateUpper = state.toUpperCase();
  console.log("✅ MATCH FOUND!");
  console.log("Place:", placeName);
  console.log("City:", city);
  console.log("State (original):", state);
  console.log("State (uppercase):", stateUpper);
  console.log("Valid US state?", US_STATES.has(stateUpper));
} else {
  console.log("❌ NO MATCH");
}
