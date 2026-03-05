# En su Memoria — Portal de Esquelas

Aplicación web completa: esquelas, login, panel admin y base de datos.

## Stack
- Node.js + Express · PostgreSQL · JWT · HTML/CSS/JS

## Archivos importantes
```
server.js           ← Punto de entrada
db/index.js         ← Conexión BD + seed inicial
middleware/auth.js  ← JWT
routes/auth.js      ← Login / Registro
routes/esquelas.js  ← API completa
public/index.html   ← Frontend
```

## Variables de entorno (.env)
```
DATABASE_URL=postgresql://...
JWT_SECRET=clave_secreta_larga
NODE_ENV=production
```

## Despliegue en Render

1. Sube el proyecto a GitHub (sin node_modules ni .env)
2. Render → New → PostgreSQL (Free) → copia la Internal URL
3. Render → New → Web Service → conecta tu repo
   - Build Command: `npm install`
   - Start Command: `node server.js`
   - Env vars: DATABASE_URL, JWT_SECRET, NODE_ENV=production
4. ¡Listo! Tu app estará en https://tu-app.onrender.com

## Admin por defecto
Email: admin@ensumemoria.es
Password: admin1234
