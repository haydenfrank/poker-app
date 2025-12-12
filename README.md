# Poker App

A TypeScript + React (Vite) poker table app with multiple tables (rooms), seat selection, admin tools, and real-time updates via Supabase.

## Prerequisites
- Node.js 18+
- A Supabase project (with URL and anon key in a `.env` file)

## Install
```bash
npm install
```
## Run (local development)
```bash
npm run dev
```

If you want the dev server accessible from other devices on your network:
```bash
npm run dev -- --host
# If needed:
# npm run dev -- --host 0.0.0.0
```

## Test on your phone via WSL2

1) In WSL: start Vite and get your WSL IP
```bash
# From your project directory in WSL
npm run dev -- --host 0.0.0.0

# In another WSL terminal, get the WSL IP (looks like 172.xx.yy.zz)
hostname -I
```

2) In Windows (PowerShell as Administrator): port-forward 5173 to your WSL IP and open the firewall
```powershell
# Replace 172.XX.YY.ZZ with your WSL IP from `hostname -I`
netsh interface portproxy add v4tov4 listenport=5173 listenaddress=0.0.0.0 connectport=5173 connectaddress=172.XX.YY.ZZ

netsh advfirewall firewall add rule name="Vite 5173" dir=in action=allow protocol=TCP localport=5173
```

3) Find your Windows LAN IP and open it on your phone
```powershell
ipconfig
# Use the IPv4 address for your active network adapter.
# On your phone’s browser, open: http://YOUR_WINDOWS_IPV4:5173
```

4) Cleanup (optional)
```powershell
netsh interface portproxy delete v4tov4 listenport=5173 listenaddress=0.0.0.0
netsh advfirewall firewall delete rule name="Vite 5173"
```

## Build and preview (production)
```bash
npm run build
npm run preview
```
