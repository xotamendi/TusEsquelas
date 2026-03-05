const express = require('express');
const { pool } = require('../db');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET /api/esquelas — public, only approved
router.get('/', async (req, res) => {
  const { nombre, ciudad, desde, hasta, page = 1, limit = 12 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const conditions = ["estado = 'aprobada'"];
  const params = [];

  if (nombre) { params.push(`%${nombre}%`); conditions.push(`nombre ILIKE $${params.length}`); }
  if (ciudad) { params.push(ciudad); conditions.push(`ciudad = $${params.length}`); }
  if (desde)  { params.push(desde);  conditions.push(`fecha_fallecimiento >= $${params.length}`); }
  if (hasta)  { params.push(hasta);  conditions.push(`fecha_fallecimiento <= $${params.length}`); }

  const where = conditions.join(' AND ');
  try {
    const total = await pool.query(`SELECT COUNT(*) FROM esquelas WHERE ${where}`, params);
    params.push(parseInt(limit)); params.push(offset);
    const result = await pool.query(
      `SELECT * FROM esquelas WHERE ${where} ORDER BY creado_en DESC LIMIT $${params.length-1} OFFSET $${params.length}`,
      params
    );
    res.json({ esquelas: result.rows, total: parseInt(total.rows[0].count), page: parseInt(page), limit: parseInt(limit) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// GET /api/esquelas/ciudades
router.get('/ciudades', async (req, res) => {
  const result = await pool.query("SELECT DISTINCT ciudad FROM esquelas WHERE estado='aprobada' ORDER BY ciudad");
  res.json(result.rows.map(r => r.ciudad));
});

// GET /api/esquelas/:id
router.get('/:id', async (req, res) => {
  const result = await pool.query("SELECT * FROM esquelas WHERE id=$1 AND estado='aprobada'", [req.params.id]);
  if (!result.rows.length) return res.status(404).json({ error: 'No encontrada' });
  res.json(result.rows[0]);
});

// POST /api/esquelas — authenticated users
router.post('/', authMiddleware, async (req, res) => {
  const { nombre, nacimiento, fallecimiento, fecha_fallecimiento, ciudad, texto, familia, funeral, entierro } = req.body;
  if (!nombre || !nacimiento || !fallecimiento || !ciudad || !texto)
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  try {
    const result = await pool.query(
      `INSERT INTO esquelas (nombre,nacimiento,fallecimiento,fecha_fallecimiento,ciudad,texto,familia,funeral,entierro,usuario_id,estado)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'pendiente') RETURNING *`,
      [nombre, nacimiento, fallecimiento, fecha_fallecimiento || null, ciudad, texto, familia, funeral, entierro, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// ── ADMIN ROUTES ──────────────────────────────────────────────────────────

// GET /api/esquelas/admin/all
router.get('/admin/all', adminMiddleware, async (req, res) => {
  const { estado, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page)-1) * parseInt(limit);
  const params = [];
  let where = '';
  if (estado) { params.push(estado); where = `WHERE estado = $1`; }
  params.push(parseInt(limit)); params.push(offset);
  const result = await pool.query(
    `SELECT e.*, u.nombre as autor FROM esquelas e LEFT JOIN usuarios u ON e.usuario_id=u.id ${where} ORDER BY e.creado_en DESC LIMIT $${params.length-1} OFFSET $${params.length}`,
    params
  );
  const total = await pool.query(`SELECT COUNT(*) FROM esquelas ${where}`, estado ? [estado] : []);
  res.json({ esquelas: result.rows, total: parseInt(total.rows[0].count) });
});

// PATCH /api/esquelas/admin/:id/estado
router.patch('/admin/:id/estado', adminMiddleware, async (req, res) => {
  const { estado } = req.body;
  if (!['aprobada','rechazada','pendiente'].includes(estado))
    return res.status(400).json({ error: 'Estado inválido' });
  const result = await pool.query('UPDATE esquelas SET estado=$1 WHERE id=$2 RETURNING *', [estado, req.params.id]);
  if (!result.rows.length) return res.status(404).json({ error: 'No encontrada' });
  res.json(result.rows[0]);
});

// DELETE /api/esquelas/admin/:id
router.delete('/admin/:id', adminMiddleware, async (req, res) => {
  await pool.query('DELETE FROM esquelas WHERE id=$1', [req.params.id]);
  res.json({ ok: true });
});

// GET /api/esquelas/admin/stats
router.get('/admin/stats', adminMiddleware, async (req, res) => {
  const stats = await pool.query(`
    SELECT
      COUNT(*) FILTER (WHERE estado='aprobada') AS aprobadas,
      COUNT(*) FILTER (WHERE estado='pendiente') AS pendientes,
      COUNT(*) FILTER (WHERE estado='rechazada') AS rechazadas,
      COUNT(*) AS total
    FROM esquelas
  `);
  const usuarios = await pool.query('SELECT COUNT(*) AS total FROM usuarios');
  res.json({ ...stats.rows[0], usuarios: usuarios.rows[0].total });
});

module.exports = router;
