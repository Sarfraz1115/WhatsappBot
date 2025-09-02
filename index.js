require("dotenv").config();
const express = require("express");
const axios = require("axios");
const { shops, userSessions } = require("./data");
const normalizeItemName = require("./synonyms");

const WEBHOOK_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || "verify-token-sarfraz";
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const DELIVERY_BOY_NUMBER = process.env.DELIVERY_BOY_NUMBER;

const app = express();
app.use(express.json());

// ---------- Webhook verification ----------
app.get("/", (req, res) => res.send("QuickKirana WhatsApp Bot running..."));

app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (mode && token === WEBHOOK_VERIFY_TOKEN) res.status(200).send(challenge);
  else res.sendStatus(403);
});

// ---------- Webhook message handler ----------
app.post("/webhook", async (req, res) => {
  console.log("📩 Incoming Webhook:", JSON.stringify(req.body, null, 2)); // <-- yaha log
  const entry = req.body.entry?.[0];
  const messages = entry?.changes?.[0]?.value?.messages?.[0];
  if (!messages) return res.sendStatus(200);

  const from = messages.from;
  const text = messages.text?.body?.trim();
  const lower = text?.toLowerCase();
  const session = userSessions.get(from);

  // --- Greeting ---
  if (text && (lower === "hi" || lower === "hello")) {
    await sendCategoryButtons(from);
    return res.sendStatus(200);
  }

  // --- Awaiting items ---
  if (session && session.step === "awaiting_items" && text) {
    const summary = parseOrder(text, shops[session.shopCode].items);
    session.summary = summary;
    session.step = "awaiting_address";
    await sendMessage(from, `${summary.items.join("\n")}\n\nTotal = ₹${summary.total}\n\n📍 Now please send your *delivery address*`);
    return res.sendStatus(200);
  }

  // --- Awaiting address ---
  if (session && session.step === "awaiting_address" && text) {
    session.address = text;
    session.step = "awaiting_confirmation";
    await sendOrderSummary(from, session.summary);
    return res.sendStatus(200);
  }

  // --- Awaiting confirmation ---
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

  // --- Interactive buttons ---
  if (messages.type === "interactive") {
    const interactive = messages.interactive;
    const id = interactive?.button_reply?.id || interactive?.list_reply?.id;

    if (["kirana", "fastfood", "dairy"].includes(id)) {
      userSessions.set(from, { shopCode: id, step: "choose_method" });
      await sendOrderMethodButtons(from, id);
    }

    // Manual entry
    else if (id && id.startsWith("manual_")) {
      const shopCode = id.replace("manual_", "");
      userSessions.set(from, { shopCode, step: "awaiting_items" });
      await sendMessage(from, `📝 Please type your order list (e.g. 1kg rice, 2 eggs, 1 packet bread).`);
    }

    // Catalog
    else if (id && id.startsWith("catalog_")) {
      const shopCode = id.replace("catalog_", "");
      const catalogLinks = {
        kirana: "https://wa.me/c/917666765090",
        fastfood: "https://wa.me/c/917666765090",
        dairy: "https://wa.me/c/917666765090"
      };
      await sendMessage(from, `🛍️ View ${shops[shopCode].name} catalog here:\n${catalogLinks[shopCode]}`);
    }

    // Accept / Reject / Call Delivery
    else if (id === "accept" && session?.summary) {
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

  res.sendStatus(200);
});

// ---------- Helpers ----------

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

async function sendCategoryButtons(to) {
  try {
    await axios.post(
      `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to,
        type: "interactive",
        interactive: {
          type: "button",
          body: { text: "Welcome 👋 Please select a category to order:" },
          action: {
            buttons: [
              { type: "reply", reply: { id: "kirana", title: "🏪 Kirana" } },
              { type: "reply", reply: { id: "fastfood", title: "🍔 Fastfoods" } },
              { type: "reply", reply: { id: "dairy", title: "🥛 Dairy & Drinks" } }
            ]
          }
        }
      },
      { headers: { Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}` } }
    );
  } catch (err) { console.error("Category buttons error:", err.response?.data || err.message); }
}

async function sendOrderMethodButtons(to, shopCode) {
  await axios.post(
    `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`,
    {
      messaging_product: "whatsapp",
      to,
      type: "interactive",
      interactive: {
        type: "button",
        body: { text: `You selected *${shops[shopCode].name}*.\n\nChoose how you want to order 👇` },
        action: {
          buttons: [
            { type: "reply", reply: { id: `manual_${shopCode}`, title: "📝 Type your list" } },
            { type: "reply", reply: { id: `catalog_${shopCode}`, title: "📖 View in Catalog" } }
          ]
        }
      }
    },
    { headers: { Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}` } }
  );
}

function parseOrder(orderText, shopItems) {
  let items = [];
  let total = 0;
  const lines = orderText.split(/[,|\n]/).map(l => l.trim()).filter(Boolean);

  for (let line of lines) {
    let match = line.match(/(\d+)\s*(kg|gm|g|liter|ltr|l|piece|pcs|plate|packet)?\s*(.+)/i);
    if (!match) { items.push(`${line} - ❌ Samajh nahi aaya`); continue; }

    let qty = parseFloat(match[1]) || 1;
    let unit = (match[2] || "").toLowerCase();
    let rawName = match[3].toLowerCase().trim();

    if (unit.includes("gm") || unit === "gram" || unit === "g") qty = qty / 1000;
    if (unit.includes("liter") || unit === "ltr" || unit === "litre" || unit === "l") unit = "liter";
    if (unit.includes("piece") || unit.includes("pcs") || rawName.includes("egg")) unit = "piece";
    if (unit.includes("plate")) unit = "plate";
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
}

function generateOrderId() { return Math.floor(1000 + Math.random() * 9000); }

async function sendSuccessMessage(to, orderId) {
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
          buttons: [{ type: "reply", reply: { id: "call_delivery", title: "📞 Call Delivery Boy" } }]
        }
      }
    },
    { headers: { Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}` } }
  );
}

async function forwardOrder(session) {
  if (!session.summary || !session.address) return console.error("❌ Order forwarding failed");

  const shop = shops[session.shopCode];
  const orderDetails = `
🛒 New Order from ${shop.name}

📋 Items:
${session.summary.items.join("\n")}

💰 Total: ₹${session.summary.total}

📍 Delivery Address:
${session.address}

🆔 Order ID: #${session.orderId}
`;

  try {
    // await sendMessage(SHOP_OWNER_NUMBER, orderDetails); // Optional
    await sendMessage(DELIVERY_BOY_NUMBER, orderDetails);
    console.log("✅ Order forwarded to delivery boy");
  } catch (err) {
    console.error("❌ Forwarding error:", err.response?.data || err.message);
  }
}


// ---------- Start server ----------
app.listen(3000, () => console.log("🚀 Bot running on port 3000"));