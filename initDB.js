const pool = require("./db");
const fs = require("fs");
const path = require("path");

async function initDatabase() {
  const client = await pool.connect();
  try {
    const sql = fs.readFileSync(
      path.join(__dirname, "schema_clean.sql"),
      "utf8"
    );

    // Supprime les commentaires et sépare les commandes
    const commands = sql
      .split(";")
      .map((cmd) => cmd.trim())
      .filter((cmd) => cmd.length > 0 && !cmd.startsWith("--"));

    for (const cmd of commands) {
      try {
        await client.query(cmd);
      } catch (err) {
        console.error(
          `Erreur sur la commande: ${cmd.substring(0, 50)}...`,
          err
        );
        throw err;
      }
    }

    console.log("Base de données initialisée avec succès");
  } catch (err) {
    console.error("Erreur détaillée:", {
      message: err.message,
      code: err.code,
      position: err.position,
      stack: err.stack,
    });
  } finally {
    client.release();
    await pool.end();
  }
}

initDatabase();
