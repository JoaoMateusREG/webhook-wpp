const express = require('express');
const axios = require('axios'); // Para enviar mensagens para a Meta
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

const port = process.env.PORT || 10000;
const verifyToken = process.env.VERIFY_TOKEN; // "videcode"
const whatsappToken = process.env.WHATSAPP_TOKEN;
const phoneNumberId = process.env.PHONE_NUMBER_ID;

// 1. Verificação GET (Facebook Webhook)
app.get('/', (req, res) => {
  const { 'hub.mode': mode, 'hub.challenge': challenge, 'hub.verify_token': token } = req.query;
  if (mode === 'subscribe' && token === verifyToken) {
    return res.status(200).send(challenge);
  }
  res.status(403).end();
});

// 2. Rota POST (Híbrida: Sistema Local + Facebook)
app.post('/', async (req, res) => {
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
  
  // A. SE VIER DO SEU SISTEMA (Para Enviar Mensagem)
  if (req.body.to && req.body.template) {
    const clientToken = req.headers['x-verify-token'];
    
    if (clientToken !== verifyToken) {
      return res.status(401).json({ error: "Token inválido" });
    }

    try {
      const response = await axios({
        method: "POST",
        url: `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
        headers: {
          Authorization: `Bearer ${whatsappToken}`,
          "Content-Type": "application/json",
        },
        data: {
          messaging_product: "whatsapp",
          to: req.body.to,
          type: "template",
          template: { name: req.body.template, language: { code: "en_US" } },
        },
      });
      console.log(`\n✅ [SISTEMA] Mensagem enviada para: ${req.body.to}`);
      return res.status(200).json(response.data);
    } catch (error) {
      console.error("❌ Erro ao enviar:", error.response?.data || error.message);
      return res.status(500).json(error.response?.data || { error: "Erro na API Meta" });
    }
  }

  // B. SE VIER DO FACEBOOK (Recebimento de Mensagens/Testes)
  if (req.body.entry) {
    const entry = req.body.entry[0];
    const changes = entry.changes[0];
    const value = changes.value;
    
    // Identifica o número de quem mandou no log
    const from = value?.messages?.[0]?.from || "Facebook Test";
    
    console.log(`\n📩 [WHATSAPP] Evento recebido de: ${from}`);
    console.log(JSON.stringify(req.body, null, 2)); // Mostra o JSON completo no log
    
    return res.status(200).send('EVENT_RECEIVED');
  }

  // C. PAYLOAD DESCONHECIDO
  console.log(`\n⚠️ Webhook recebeu dados desconhecidos às ${timestamp}`);
  res.status(200).end();
});

app.listen(port, () => console.log(`\n🚀 Servidor central na porta ${port}\n`));