import express from "express";

const app = express();
app.use(express.json());

// Env vars set in Render
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "ocaso_verify_123";
const WABA_TOKEN = process.env.WABA_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

// Verify webhook (Meta calls this once)
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ Webhook verified");
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

// Simple menu text
const menu = () =>
  "Hola 👋 Bienvenido a Ocaso Campestre\n" +
  "Elige una opción:\n" +
  "1. Ver menú de comida\n" +
  "2. Ver paquetes\n" +
  "3. Hablar con un representante";

// Send a WhatsApp text reply
async function sendText(to, body) {
  const url = `https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`;
  const payload = { messaging_product: "whatsapp", to, text: { body } };
  const r = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${WABA_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  if (!r.ok) console.error("Send error:", r.status, await r.text());
}

// Receive WhatsApp messages
app.post("/webhook", async (req, res) => {
  const msg = req.body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  if (msg?.type === "text") {
    const from = msg.from;
    const body = msg.text.body.trim();

    let reply = "Escribe *menu* para ver opciones.";
    if (["menu", "hola", "hi", "start"].includes(body.toLowerCase())) reply = menu();
    else if (body === "1") reply = "🍽️ Menú de comida: Bandeja paisa, Arepas con queso, Limonada natural. Escribe *menu* para volver.";
    else if (body === "2") reply = "📦 Paquetes: Día de piscina, Evento familiar, Cumpleaños. Escribe *menu* para volver.";
    else if (body === "3") reply = "👤 En breve te atenderá un representante humano.";
    else reply = "No entendí esa opción. Escribe *menu* o envía *1*, *2* o *3*.";

    await sendText(from, reply);
  }
  res.sendStatus(200);
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log("Listening on port " + port));
