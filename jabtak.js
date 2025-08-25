require("dotenv").config();
const express = require("express");
const axios = require("axios");
const { shops, userSessions } = require("./data");

const WEBHOOK_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || "verify-token-sarfraz";
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const SHOP_OWNER_NUMBER = process.env.SHOP_OWNER_NUMBER; 
const DELIVERY_BOY_NUMBER = process.env.DELIVERY_BOY_NUMBER; 

const app = express();
app.use(express.json());

// synonyms mapping
const synonyms = {
  egg: ["egg", "eggs", "anda", "ande"],
  bread: ["bread", "bread packet", "loaf", "packet bread"],
  rice: ["rice", "chawal"],
  sugar: ["sugar", "chini"],
  atta: ["atta", "flour"],
  milk: ["milk", "doodh"]
};

function normalizeItemName(name) {
  name = name.toLowerCase();
  for (const [key, values] of Object.entries(synonyms)) {
    if (values.some(v => name.includes(v))) {
      return key;
    }
  }
  return name; 
}

// root
app.get("/", (req, res) => res.send("QuickKirana WhatsApp Bot running..."));

// webhook verification
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (mode && token === WEBHOOK_VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// webhook receive
app.post("/webhook", async (req, res) => {
  const entry = req.body.entry?.[0];
  const messages = entry?.changes?.[0]?.value?.messages?.[0];
  if (!messages) return res.sendStatus(200);

  const from = messages.from;
  const text = messages.text?.body?.trim();
  const lower = text?.toLowerCase();
  const session = userSessions.get(from);

  // greeting
  if (text && (lower === "hi" || lower === "hello")) {
    await sendShopList(from);
    return res.sendStatus(200);
  }

  // if user typed shop code
  if (text && shops[lower] && !session) {
    userSessions.set(from, { shopCode: lower, step: "awaiting_items" });
    await sendMessage(from, `You selected *${shops[lower].name}*.\n\n📝 Please type your grocery list (e.g. 1kg rice, 500gm sugar, 2 eggs).`);
    return res.sendStatus(200);
  }

  // awaiting items
  if (session && session.step === "awaiting_items" && text) {
    const summary = parseOrder(text, shops[session.shopCode].items);
    session.summary = summary;
    session.step = "awaiting_address";
    await sendMessage(from, `${summary.items.join("\n")}\n\nTotal = ₹${summary.total}\n\n📍 Now please send your *delivery address*`);
    return res.sendStatus(200);
  }

  // awaiting address
  if (session && session.step === "awaiting_address" && text) {
    session.address = text;
    session.step = "awaiting_confirmation";
    await sendOrderSummary(from, session.summary);
    return res.sendStatus(200);
  }

  // awaiting confirmation (text accept/reject)
  if (session && session.step === "awaiting_confirmation" && text) {
    if (lower.includes("accept")) {
      const orderId = generateOrderId();
      session.orderId = orderId;
      await forwardOrder(session);
      await sendSuccessMessage(from, orderId);
      userSessions.delete(from);
    } else if (lower.includes("reject")) {
      await sendMessage(from, "❌ Your order has been cancelled.");
      userSessions.delete(from);
    }
    return res.sendStatus(200);
  }

  // interactive
  if (messages.type === "interactive") {
    const interactive = messages.interactive;

    if (interactive.type === "list_reply") {
      const id = interactive.list_reply.id;
      if (shops[id]) {
        userSessions.set(from, { shopCode: id, step: "awaiting_items" });
        await sendMessage(from, `You selected *${shops[id].name}*.\n\n📝 Please type your grocery list (e.g. 1kg rice, 500gm sugar, 2 eggs).`);
      }
    }

    if (interactive.type === "button_reply") {
      const id = interactive.button_reply.id;
      if (id === "accept" && session?.summary) {
        const orderId = generateOrderId();
        session.orderId = orderId;
        await forwardOrder(session);
        await sendSuccessMessage(from, orderId);
        userSessions.delete(from);
      } else if (id === "reject") {
        await sendMessage(from, "❌ Your order has been cancelled.");
        userSessions.delete(from);
      } else if (id === "call_delivery") {
        await sendMessage(from, `📞 Delivery Boy Number: ${DELIVERY_BOY_NUMBER}`);
      }
    }
  }

  res.sendStatus(200);
});

// ---------- helpers ----------

async function sendMessage(to, body) {
  try {
    await axios.post(
      `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`,
      { messaging_product: "whatsapp", to, type: "text", text: { body } },
      { headers: { Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}` } }
    );
  } catch (err) {
    console.error("Send error:", err.response?.data || err.message);
  }
}

async function sendShopList(to) {
  const rows = Object.values(shops).map(s => ({
    id: s.code,
    title: s.name,
    description: "Click to order from this shop"
  }));
  try {
    await axios.post(
      `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to,
        type: "interactive",
        interactive: {
          type: "list",
          header: { type: "text", text: "Available Shops" },
          body: { text: "Choose a shop to order from" },
          action: { button: "View Shops", sections: [{ title: "Shops", rows }] }
        }
      },
      { headers: { Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}` } }
    );
  } catch (err) {
    console.error("Shop list error:", err.response?.data || err.message);
  }
}

function parseOrder(orderText, shopItems) {
  let items = [];
  let total = 0;
  const lines = orderText.split(/[,|\n]/).map(l => l.trim()).filter(Boolean);

  for (let line of lines) {
    let match = line.match(/(\d+)\s*(kg|gm|g|liter|ltr|l|piece|pcs|packet)?\s*(.+)/i);
    if (!match) {
      items.push(`${line} - ❌ Samajh nahi aaya`);
      continue;
    }

    let qty = parseFloat(match[1]) || 1;
    let unit = (match[2] || "").toLowerCase();
    let rawName = match[3].toLowerCase().trim();

    if (unit.includes("gm") || unit === "g") qty = qty / 1000;
    if (unit.includes("liter") || unit === "ltr" || unit === "l") unit = "liter";
    if (unit.includes("piece") || unit.includes("pcs") || rawName.includes("egg")) unit = "piece";
    if (unit.includes("packet")) unit = "packet";

    const key = normalizeItemName(rawName);

    if (shopItems[key]) {
      const item = shopItems[key];
      const price = qty * item.price;
      items.push(`${item.name} ${qty}${item.unit} - ₹${price}`);
      total += price;
    } else {
      items.push(`${line} - ❌ Samajh nahi aaya`);
    }
  }
  return { items, total };
}

async function sendOrderSummary(to, summary) {
  const body = `${summary.items.join("\n")}\n\nTotal = ₹${summary.total}`;
  try {
    await axios.post(
      `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to,
        type: "interactive",
        interactive: {
          type: "button",
          body: { text: body },
          action: {
            buttons: [
              { type: "reply", reply: { id: "accept", title: "✅ Accept" } },
              { type: "reply", reply: { id: "reject", title: "❌ Reject" } }
            ]
          }
        }
      },
      { headers: { Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}` } }
    );
  } catch (err) {
    console.error("Order summary error:", err.response?.data || err.message);
  }
}

function generateOrderId() {
  return Math.floor(1000 + Math.random() * 9000);
}

async function sendSuccessMessage(to, orderId) {
  try {
    await axios.post(
      `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to,
        type: "interactive",
        interactive: {
          type: "button",
          body: { text: `✅ Your order has been placed successfully!\n\n🆔 Order ID: #${orderId}` },
          action: {
            buttons: [
              { type: "reply", reply: { id: "call_delivery", title: "📞 Call Delivery Boy" } }
            ]
          }
        }
      },
      { headers: { Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}` } }
    );
  } catch (err) {
    console.error("Success msg error:", err.response?.data || err.message);
  }
}

async function forwardOrder(session) {
  const shop = shops[session.shopCode];
  const orderDetails =
`🛒 New Order from ${shop.name}

Items:
${session.summary.items.join("\n")}

Total: ₹${session.summary.total}

📍 Delivery Address:
${session.address}

🆔 Order ID: #${session.orderId}`;

  await sendMessage(SHOP_OWNER_NUMBER, orderDetails);
  await sendMessage(DELIVERY_BOY_NUMBER, orderDetails);
}

// start server
app.listen(3000, () => console.log("🚀 Bot running on port 3000"));