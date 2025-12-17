const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();

// Middlewares
app.use(express.json());
app.use(cors()); // Essencial para permitir que seu app local fale com o Render

// Variáveis de Ambiente (Configure-as no painel do Render)
const PORT = process.env.PORT || 3000;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'videcode';
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN; 
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

// 1. Rota de Verificação (GET) - Para o Facebook aprovar seu Webhook
app.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log("✅ Webhook verificado com sucesso pelo Facebook!");
    return res.status(200).send(challenge);
  }
  res.status(403).send('Token de verificação inválido.');
});

// 2. Rota de Envio de Mensagem (POST) - O seu Front-end chama aqui
app.post('/', async (req, res) => {
  const { to, template } = req.body;
  const clientVerifyToken = req.headers['x-verify-token'];

  console.log(`🚀 Recebida tentativa de envio para: ${to}`);

  // Validação básica de segurança entre seu Front e seu Back
  if (clientVerifyToken !== VERIFY_TOKEN) {
    return res.status(401).json({ error: "Não autorizado: Token inválido." });
  }

  try {
    // Chamada Oficial para a Graph API da Meta
    const response = await axios({
      method: 'POST',
      url: `https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`,
      headers: {
        'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json'
      },
      data: {
        messaging_product: "whatsapp",
        to: to,
        type: "template",
        template: {
          name: template,
          language: { code: "en_US" } // Mude para pt_BR se seu template for em português
        }
      }
    });

    console.log("✅ Mensagem disparada com sucesso via Meta API!");
    res.status(200).json(response.data);

  } catch (error) {
    const errorData = error.response?.data || error.message;
    console.error("❌ Erro ao enviar para o WhatsApp:", JSON.stringify(errorData));
    
    res.status(error.response?.status || 500).json({
      error: "Falha ao enviar mensagem",
      details: errorData
    });
  }
});

app.listen(PORT, () => {
  console.log(`🛰️ Backend rodando na porta ${PORT}`);
});
