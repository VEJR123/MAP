// frontend/src/config.ts

// 🛑 TADY UPRAV: Vlož sem svou adresu z Railway (bez lomítka na konci!)
const RAILWAY_URL = "map-map.up.railway.app"; 

// Tohle zajistí, že na localhostu to pojede postaru, a na Vercelu přes Railway
export const API_BASE_URL = import.meta.env.PROD 
  ? RAILWAY_URL 
  : "/api";