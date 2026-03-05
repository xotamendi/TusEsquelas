const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const initDB = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id SERIAL PRIMARY KEY,
      nombre VARCHAR(100) NOT NULL,
      email VARCHAR(150) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      rol VARCHAR(20) DEFAULT 'usuario',
      creado_en TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS esquelas (
      id SERIAL PRIMARY KEY,
      nombre VARCHAR(200) NOT NULL,
      nacimiento VARCHAR(100) NOT NULL,
      fallecimiento VARCHAR(100) NOT NULL,
      fecha_fallecimiento DATE,
      ciudad VARCHAR(100) NOT NULL,
      texto TEXT NOT NULL,
      familia TEXT,
      funeral TEXT,
      entierro TEXT,
      estado VARCHAR(20) DEFAULT 'pendiente',
      usuario_id INTEGER REFERENCES usuarios(id),
      creado_en TIMESTAMP DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_esquelas_ciudad ON esquelas(ciudad);
    CREATE INDEX IF NOT EXISTS idx_esquelas_estado ON esquelas(estado);
    CREATE INDEX IF NOT EXISTS idx_esquelas_fecha ON esquelas(fecha_fallecimiento);
  `);

  // Seed admin user if not exists
  const bcrypt = require('bcryptjs');
  const existing = await pool.query("SELECT id FROM usuarios WHERE email = 'admin@ensumemoria.es'");
  if (existing.rows.length === 0) {
    const hash = await bcrypt.hash('admin1234', 10);
    await pool.query(
      "INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES ($1,$2,$3,$4)",
      ['Administrador', 'admin@ensumemoria.es', hash, 'admin']
    );
    console.log('✅ Admin creado: admin@ensumemoria.es / admin1234');
  }

  // Seed sample data
  const count = await pool.query("SELECT COUNT(*) FROM esquelas");
  if (parseInt(count.rows[0].count) === 0) {
    const samples = [
      ['María Concepción Uriarte Etxeberria','14 de marzo de 1938','2 de marzo de 2026','2026-03-02','Irun','Descansa en paz, querida madre y abuela. Tu amor y tu bondad vivirán siempre en nuestros corazones. Fuiste la luz de nuestra familia durante ochenta y siete años.','Su esposo Jesús; sus hijos Amaia, Jon e Itziar; sus nietos Ander, Leire, Mikel y Nora.','Martes 4 de marzo a las 11:00 h en la Parroquia de Nuestra Señora del Juncal, Irun.','Cementerio Municipal de Irun.'],
      ['Francisco Javier Aguirre Mendoza','7 de junio de 1945','28 de febrero de 2026','2026-02-28','Bilbao','Con profundo dolor comunicamos el fallecimiento de nuestro padre y abuelo. Vivió con dignidad, trabajo y amor a los suyos. Siempre en nuestro recuerdo.','Su esposa Carmen; sus hijos Roberto y Elena; sus nietos Ibai y Maia.','Lunes 3 de marzo a las 10:30 h en la Basílica de Santiago, Bilbao.','Cementerio de Derio, Bilbao.'],
      ['Rosario Pérez Domínguez','22 de enero de 1951','1 de marzo de 2026','2026-03-01','Sevilla','El cielo se ha ganado un ángel más. Rosario fue maestra, madre y amiga para quienes la conocieron. Su risa y su generosidad son ya parte de nuestra memoria.','Sus hijos Manuel, Dolores y Antonio; sus nietos Pablo, Carmen, Rocío y Luis.','Domingo 3 de marzo a las 12:00 h en la Parroquia de San Ildefonso, Sevilla.','Cementerio de San Fernando, Sevilla.'],
      ['Luis Montero Castellano','3 de septiembre de 1936','27 de febrero de 2026','2026-02-27','Madrid','Ingeniero, padre ejemplar y hombre de profundas convicciones. Nos deja un legado de honestidad y trabajo bien hecho. Descansa, papá.','Su esposa Pilar; su hijo único Carlos; su nuera Ana; sus nietos Sofía y Álvaro.','Sábado 1 de marzo a las 09:30 h en la Parroquia de Santa María la Real de la Almudena.','Cementerio de La Almudena, Madrid.'],
      ['Begoña Larrañaga Goikoetxea','11 de octubre de 1960','3 de marzo de 2026','2026-03-03','San Sebastián','Se ha ido demasiado pronto. Begoña llenó cada sala que pisó con su alegría. Enfermera vocacional durante treinta años, siempre al servicio de los demás.','Su marido Iñaki; sus hijos Aitor y Garazi; sus padres Juan y Petra.','Miércoles 5 de marzo a las 17:00 h en la Parroquia del Buen Pastor, San Sebastián.','Crematorio de Polloe, San Sebastián.'],
      ['Eusebio Fernández Ramos','18 de abril de 1929','25 de febrero de 2026','2026-02-25','Zaragoza','Agricultor toda su vida, hombre de tierra y de palabra. A sus noventa y seis años nos deja con el corazón lleno de gratitud por tanto amor dado.','Sus hijos María Pilar, José y Domingo; sus doce nietos y cuatro bisnietos.','Viernes 28 de febrero a las 11:00 h en la Iglesia de San Pablo, Zaragoza.','Cementerio de Torrero, Zaragoza.'],
      ['Ana María Vidal Torres','29 de julio de 1973','2 de marzo de 2026','2026-03-02','Barcelona','Madre coraje, artista del alma. Ana María nos enseñó que la vida se vive con intensidad y gratitud. Su obra permanece viva en cada uno de nosotros.','Su esposo Marc; sus hijos Júlia y Pau; sus padres Josep y Rosa.','Martes 4 de marzo a las 16:00 h en la Parroquia de la Sagrada Família, Barcelona.','Cementerio de Montjuïc, Barcelona.'],
      ['Antonio Ruiz Velázquez','5 de diciembre de 1942','1 de marzo de 2026','2026-03-01','Pamplona','Jubilado de la enseñanza, amante de la lectura y los paseos por el casco antiguo. Don Antonio dejó huella en cientos de alumnos que hoy lloran su partida.','Su esposa Maite; sus hijas Cristina y Marta; sus yernos y cuatro nietos.','Lunes 3 de marzo a las 10:00 h en la Catedral de Pamplona.','Cementerio Municipal de Pamplona.'],
    ];
    for (const s of samples) {
      await pool.query(
        `INSERT INTO esquelas (nombre,nacimiento,fallecimiento,fecha_fallecimiento,ciudad,texto,familia,funeral,entierro,estado)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'aprobada')`,
        s
      );
    }
    console.log('✅ Datos de ejemplo insertados');
  }

  console.log('✅ Base de datos lista');
};

module.exports = { pool, initDB };
