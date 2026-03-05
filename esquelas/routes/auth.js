const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');

const router = express.Router();
const SECRET = process.env.JWT_SECRET || 'secretkey_dev';

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { nombre, email, password } = req.body;
  if (!nombre || !email || !password)
    return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  if (password.length < 6)
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
  try {
    const exists = await pool.query('SELECT id FROM usuarios WHERE email=$1', [email]);
    if (exists.rows.length) return res.status(400).json({ error: 'El email ya está registrado' });
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO usuarios (nombre,email,password_hash) VALUES ($1,$2,$3) RETURNING id,nombre,email,rol',
      [nombre, email, hash]
    );
    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, nombre: user.nombre, email: user.email, rol: user.rol }, SECRET, { expiresIn: '7d' });
    res.json({ token, user });
  } catch (e) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email y contraseña requeridos' });
  try {
    const result = await pool.query('SELECT * FROM usuarios WHERE email=$1', [email]);
    if (!result.rows.length) return res.status(401).json({ error: 'Credenciales incorrectas' });
    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Credenciales incorrectas' });
    const token = jwt.sign({ id: user.id, nombre: user.nombre, email: user.email, rol: user.rol }, SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol } });
  } catch (e) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

module.exports = router;
