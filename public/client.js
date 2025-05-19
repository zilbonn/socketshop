let ws, token, user;

function login() {
  fetch('/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: document.getElementById('user').value,
      password: document.getElementById('pass').value
    })
  })
  .then(res => res.json())
  .then(data => {
    if (data.token) {
      token = data.token;
      connectWS();
      document.getElementById('login').style.display = 'none';
      document.getElementById('main').style.display = '';
    } else {
      alert('Login failed');
    }
  });
}

function connectWS() {
  ws = new WebSocket('ws://' + location.host + '/ws');
  ws.onopen = () => {
    ws.send(JSON.stringify({ type: 'auth', token }));
  };
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'auth' && data.ok) {
      user = data.user;
    }
    if (data.type === 'chat') {
      // VULN: XSS - innerHTML!
      const chat = document.getElementById('chat');
      if (chat) {
        chat.innerHTML += `
          <div>
            <span style="color:var(--accent2);font-weight:600">${data.user}:</span>
            <span>${data.msg}</span>
          </div>
        `;
        chat.scrollTop = chat.scrollHeight;
      }
    }
    if (data.type === 'cartUpdate') {
      const cart = document.getElementById('cart');
      if (cart && data.user === user.username) {
        cart.innerHTML = renderCart(data.cart);
      }
    }
    if (data.type === 'adminAlert') {
      const alerts = document.getElementById('alerts');
      if (alerts) {
        alerts.innerHTML += `<div><b>ALERT:</b> ${data.msg}</div>`;
        alerts.scrollTop = alerts.scrollHeight;
      }
    }
  };
}

function sendChat() {
  const msg = document.getElementById('msg').value;
  if (msg.trim() === "") return;
  ws.send(JSON.stringify({ type: 'chat', msg }));
  document.getElementById('msg').value = '';
}

function addCart() {
  const sku = Math.floor(Math.random() * 1000).toString();
  ws.send(JSON.stringify({ type: 'addCart', sku, qty: 1 }));
}

function renderCart(cart) {
  if (!cart || Object.keys(cart).length === 0) {
    return `<span style="color:var(--text-muted)">Your cart is empty.</span>`;
  }
  return `<ul style="padding-left:18px;margin:0;">` +
    Object.entries(cart).map(([sku, qty]) =>
      `<li><span style="color:var(--accent2)">SKU ${sku}</span> &times; <b>${qty}</b></li>`
    ).join('') +
    `</ul>`;
} 