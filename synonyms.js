// Full list of items with possible typos and local variants
const synonyms = {
  // Kirana
  egg: ["egg", "eggs", "anda", "ande", "eg", "eggses"],
  bread: ["bread", "bread packet", "loaf", "packet bread", "bred", "bred packet"],
  rice: ["rice", "chawal", "raice", "rachal"],
  sugar: ["sugar", "chini", "shugar", "sugur"],
  atta: ["atta", "flour", "aata", "attaa"],
  milk: ["milk", "doodh", "milc"],
  oil: ["oil", "cooking oil", "tel", "oill"],
  salt: ["salt", "namak", "sault"],
  curd: ["curd", "dahi", "yogurt", "curdd"],
  paneer: ["paneer", "cottage cheese", "panneer", "panir"],
  butter: ["butter", "makhan", "buttr"],

  // Fastfood
  maggi: ["maggi", "noodle", "noodles", "maggie"],
  chips: ["chips", "chip", "crisps", "chipss", "chippes"],
  biscuit: ["biscuit", "cookies", "biskut", "biskitt"],
  cold_drink: ["cold drink", "coke", "pepsi", "soft drink", "drink", "cok", "coak"],
  panipuri: ["panipuri", "golgappa", "phuchka", "pani puri", "pani-poori", "panipoori", "pani purri"],
  samosa: ["samosa", "samosas", "sumosa", "samossa"],
  burger: ["burger", "burgers", "hamburger", "burgerr"],
  pizza: ["pizza", "pizzas", "piza", "pizaa"],
  vadapav: ["vadapav", "vada pav", "vada-pav", "vada", "vada pavv"]
};

// ---------- fuzzy match function ----------
function normalizeItemName(name) {
  name = name.toLowerCase().replace(/[^a-z\s]/g, "").trim(); // remove special chars

  // Exact match or synonyms
  for (const [key, values] of Object.entries(synonyms)) {
    if (values.some(v => name.includes(v))) return key;
  }

  // Fuzzy match (Levenshtein distance)
  let bestMatch = null;
  let highestScore = 0;

  for (const [key, values] of Object.entries(synonyms)) {
    for (const val of values) {
      const score = similarity(name, val);
      if (score > highestScore) {
        highestScore = score;
        bestMatch = key;
      }
    }
  }

  if (highestScore >= 0.6) return bestMatch; // threshold 60%
  return name;
}

// ---------- simple similarity ----------
function similarity(s1, s2) {
  let longer = s1;
  let shorter = s2;
  if (s1.length < s2.length) {
    longer = s2;
    shorter = s1;
  }
  const longerLength = longer.length;
  if (longerLength === 0) return 1.0;
  return (longerLength - editDistance(longer, shorter)) / longerLength;
}

// ---------- Levenshtein distance ----------
function editDistance(s1, s2) {
  s1 = s1.toLowerCase();
  s2 = s2.toLowerCase();

  const costs = [];
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) costs[j] = j;
      else if (j > 0) {
        let newValue = costs[j - 1];
        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[s2.length] = lastValue;
  }
  return costs[s2.length];
}

module.exports = normalizeItemName;