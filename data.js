// Simple data storage for shops and their items
// This can be easily replaced with a database in the future

const shops = {
  shop1: {
    name: "Fresh Mart",
    code: "shop1",
    items: {
      "atta": { name: "Aashirvaad Atta", price: 45, unit: "kg" },
      "sugar": { name: "Madhur Sugar", price: 40, unit: "kg" },
      "rice": { name: "Basmati Rice", price: 80, unit: "kg" },
      "milk": { name: "Amul Milk", price: 25, unit: "liter" },
      "bread": { name: "Britannia Bread", price: 45, unit: "loaf" },
      "eggs": { name: "Farm Fresh Eggs", price: 6, unit: "piece" },
      "oil": { name: "Fortune Oil", price: 150, unit: "liter" },
      "salt": { name: "Tata Salt", price: 25, unit: "kg" }
    }
  },
  shop2: {
    name: "Quick Grocery",
    code: "shop2",
    items: {
      "atta": { name: "Pillsbury Atta", price: 42, unit: "kg" },
      "sugar": { name: "Dhampur Sugar", price: 38, unit: "kg" },
      "rice": { name: "Kolam Rice", price: 60, unit: "kg" },
      "milk": { name: "Mother Dairy Milk", price: 24, unit: "liter" },
      "bread": { name: "Modern Bread", price: 40, unit: "loaf" },
      "eggs": { name: "Country Eggs", price: 5, unit: "piece" },
      "oil": { name: "Saffola Oil", price: 145, unit: "liter" },
      "salt": { name: "Saffola Salt", price: 22, unit: "kg" }
    }
  },
  shop3: {
    name: "Daily Needs",
    code: "shop3",
    items: {
      "atta": { name: "Shakti Bhog Atta", price: 43, unit: "kg" },
      "sugar": { name: "Parry Sugar", price: 39, unit: "kg" },
      "rice": { name: "Sona Masoori Rice", price: 70, unit: "kg" },
      "milk": { name: "Nestle Milk", price: 26, unit: "liter" },
      "bread": { name: "Wibs Bread", price: 42, unit: "loaf" },
      "eggs": { name: "Brown Eggs", price: 7, unit: "piece" },
      "oil": { name: "Gemini Oil", price: 140, unit: "liter" },
      "salt": { name: "Annapurna Salt", price: 24, unit: "kg" }
    }
  }
};

// User session storage (in-memory for prototype)
const userSessions = new Map();

module.exports = {
  shops,
  userSessions
};
