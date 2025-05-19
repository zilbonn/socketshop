
---

## 🛠️ Setup & Run

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the server:**
   ```bash
   node server.js
   ```

3. **Open the app:**
   - User: [http://localhost:3000/](http://localhost:3000/)
   - Admin: [http://localhost:3000/admin.html](http://localhost:3000/admin.html)

   > **Default credentials:**  
   > - User: `user` / `user`  
   > - Admin: `admin` / `admin`

---

## 🧪 Vulnerabilities & How to Reproduce

### 1. Privilege Escalation (User can do Admin Actions)
- Login as a user.
- Open browser console and run:
  ```js
  ws.send(JSON.stringify({ type: "adminAlert", msg: "Fake admin alert from user!" }));
  ws.send(JSON.stringify({ type: "adminAction", action: "stockLow", sku: "999" }));
  ```
- All users see the "admin" alert.

### 2. Information Disclosure
- Login as user and admin in two tabs.
- As admin, send a promo or stock alert.
- User sees the admin alert.

### 3. No Per-Message Auth (JWT Replay)
- Login as user, copy the `token` from the console.
- Logout or close tab.
- In a new tab, set `token` to the old value and call `connectWS()`.
- You are still authenticated.

### 4. Cross-Site WebSocket Hijacking (CSWSH)
- From another site or port, open a WebSocket to `ws://localhost:3000/ws` and send any message.
- The server accepts it, no Origin check.

### 5. XSS via Chat
- Send `<img src=x onerror="alert('XSS!')">` in chat.
- All users see an alert.

### 6. DoS (Denial of Service)
- In the console, run:
  ```js
  while(true) ws.send("A".repeat(1024*1024));
  ```
- The server will slow down or crash.

---

## 🛡️ Disclaimer

> **This application is intentionally insecure and should NEVER be used in production.  
> It is for educational and demonstration purposes only.**

---

## 📚 Learn More

- [OWASP WebSocket Security](https://cheatsheetseries.owasp.org/cheatsheets/WebSocket_Security_Cheat_Sheet.html)
- [WebSocket Security Best Practices](https://portswigger.net/web-security/websockets)

---

## 📝 License

MIT License (see [LICENSE](LICENSE))