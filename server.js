const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

const MC = {
  CID: '406f483126542ecf0cd77b617b995414',
  CSE: 'U0kyPqJeupXjaJioNo5a7CLNTY5b-pHEI12dUeNQqbz5tQicUOblCE5wBuk04pTB',
  HOST: 'https://sandbox.moncashbutton.digicelgroup.com/Api',
  GW:   'https://sandbox.moncashbutton.digicelgroup.com/Moncash-middleware'
};

async function getToken() {
  const creds = Buffer.from(MC.CID + ':' + MC.CSE).toString('base64');
  const r = await fetch(MC.HOST + '/oauth/token?grant_type=client_credentials', {
    method: 'POST',
    headers: { 'Authorization': 'Basic ' + creds, 'Accept': 'application/json', 'Content-Type': 'application/json' }
  });
  if (!r.ok) throw new Error('Auth failed: ' + r.status);
  const d = await r.json();
  return d.access_token;
}

app.post('/api/create-payment', async (req, res) => {
  try {
    const { amount, orderId } = req.body;
    if (!amount || !orderId) return res.status(400).json({ error: 'amount et orderId requis' });
    const tok = await getToken();
    const r = await fetch(MC.HOST + '/v1/CreatePayment', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + tok, 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, orderId })
    });
    const d = await r.json();
    if (d.status === 202 && d.payment_token) {
      res.json({ success: true, token: d.payment_token.token, redirectUrl: MC.GW + '/Payment/Redirect?token=' + d.payment_token.token });
    } else {
      res.status(400).json({ success: false, error: d.message || 'Erreur création paiement', raw: d });
    }
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

app.post('/api/transfert', async (req, res) => {
  try {
    const { amount, receiver, desc, reference } = req.body;
    if (!amount || !receiver) return res.status(400).json({ error: 'amount et receiver requis' });
    const tok = await getToken();
    const r = await fetch(MC.HOST + '/v1/Transfert', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + tok, 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, receiver, desc: desc || 'JDP Multi-Service', reference })
    });
    const d = await r.json();
    if (d.status === 200 && d.transfer) {
      res.json({ success: true, transfer: d.transfer });
    } else {
      res.status(400).json({ success: false, error: d.message || 'Erreur transfert', raw: d });
    }
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

app.post('/api/customer-status', async (req, res) => {
  try {
    const { account } = req.body;
    const tok = await getToken();
    const r = await fetch(MC.HOST + '/v1/CustomerStatus', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + tok, 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ account })
    });
    const d = await r.json();
    res.json(d);
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

app.post('/api/retrieve-transaction', async (req, res) => {
  try {
    const { transactionId, orderId } = req.body;
    const tok = await getToken();
    const endpoint = transactionId ? '/v1/RetrieveTransactionPayment' : '/v1/RetrieveOrderPayment';
    const body = transactionId ? { transactionId } : { orderId };
    const r = await fetch(MC.HOST + endpoint, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + tok, 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const d = await r.json();
    res.json(d);
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

app.get('/api/balance', async (req, res) => {
  try {
    const tok = await getToken();
    const r = await fetch(MC.HOST + '/v1/PrefundedBalance', {
      method: 'GET',
      headers: { 'Authorization': 'Bearer ' + tok, 'Accept': 'application/json' }
    });
    const d = await r.json();
    res.json(d);
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('JDP MonCash Server on port ' + PORT));
