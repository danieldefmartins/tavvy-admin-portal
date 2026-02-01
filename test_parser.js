// Test the smart query parser
const query = "starbucks newark nj";

// Pattern 2: "Place City State" (no preposition)
const cityStatePattern = /^(.+?)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+([A-Z]{2})$/;
const match = query.match(cityStatePattern);

console.log("Query:", query);
console.log("Pattern:", cityStatePattern);
console.log("Match:", match);

if (match) {
  console.log("Place:", match[1]);
  console.log("City:", match[2]);
  console.log("State:", match[3]);
} else {
  console.log("NO MATCH - Pattern requires capitalized City and State");
  console.log("Issue: 'starbucks newark nj' is all lowercase");
}
