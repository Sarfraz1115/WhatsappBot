const shops = {
  kirana: {
    code: "kirana",
    name: "🛒 Kirana Store",
    items: {
      rice: { name: "Rice", price: 60, unit: "kg" },
      atta: { name: "Atta", price: 50, unit: "kg" },
      sugar: { name: "Sugar", price: 45, unit: "kg" },
      oil: { name: "Cooking Oil", price: 120, unit: "liter" },
      salt: { name: "Salt", price: 20, unit: "kg" }
    }
  },
  fastfood: {
    code: "fastfood",
    name: "🍔 Fastfood Shop",
    items: {
      maggi: { name: "Maggi Packet", price: 15, unit: "packet" },
      chips: { name: "Chips Packet", price: 20, unit: "packet" },
      bread: { name: "Bread", price: 30, unit: "packet" },
      biscuit: { name: "Biscuit Packet", price: 10, unit: "packet" },
      cold_drink: { name: "Cold Drink", price: 40, unit: "bottle" },
      panipuri: { name: "Panipuri", price: 20, unit: "plate" },
      samosa: { name: "Samosa", price: 15, unit: "piece" },
      burger: { name: "Burger", price: 50, unit: "piece" },
      pizza: { name: "Pizza", price: 200, unit: "piece" },
      vadapav: { name: "Vada Pav", price: 20, unit: "piece" }
    }
  },
  dairy: {
    code: "dairy",
    name: "🥛 Dairy & Drinks",
    items: {
      milk: { name: "Milk", price: 30, unit: "liter" },
      curd: { name: "Curd", price: 40, unit: "kg" },
      paneer: { name: "Paneer", price: 300, unit: "kg" },
      butter: { name: "Butter", price: 50, unit: "packet" },
      egg: { name: "Egg", price: 6, unit: "piece" }
    }
  }
};

// active user sessions
const userSessions = new Map();

module.exports = { shops, userSessions };