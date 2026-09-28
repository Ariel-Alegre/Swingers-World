require('dotenv').config();
const nodemailer = require('nodemailer');

// Configuración del transportador
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },

});

// Función para enviar correos
module.exports = {
  Test: async (req, res) => {
    const { name, email, phone, service, message } = req.body;

    try {
      // --- Correo al administrador ---
      const emailAdmin = `
        <html>
          <body style="background-color: #f4f4f4; padding: 2em 0;">
            <table style="width: 100%; max-width: 600px; margin: 0 auto; background-color: #fff; border: 1px solid #ddd; border-radius: 10px; font-family: Arial, Helvetica, sans-serif; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);">
              <tr>
                <td style="background-color: #1976d2; text-align: center; padding: 1em;">
                  <h1 style="color: #fff; margin: 0;">SWINGERS WORLD</h1>
                </td>
              </tr>
              <tr>
                <td style="padding: 2em; color: #333;">
                  <p style="color: black;">Detalles del servicio reservado:</p>
                  <ul>
                    <li>Cliente: ${name}</li>
                    <li>Teléfono: ${phone}</li>
                    <li>Correo electrónico: ${email}</li>
                    <li>Servicio que requiere: ${service}</li>
                    <li>Mensaje: ${message}</li>
                  </ul>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `;

      await transporter.sendMail({
        from: process.env.EMAIL,  // Debe coincidir con el usuario autenticado
        to: process.env.EMAIL,    // correo del admin
        subject: 'Petición de cotización',
        html: emailAdmin,
      });

      // --- Correo al cliente ---
      const emailCliente = `
        <html>
          <body style="background-color: #f4f4f4; padding: 2em 0;">
            <table style="width: 100%; max-width: 600px; margin: 0 auto; background-color: #fff; border: 1px solid #ddd; border-radius: 10px; font-family: Arial, Helvetica, sans-serif; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);">
              <tr>
                <td style="background-color: #1976d2; text-align: center; padding: 1em;">
                  <h1 style="color: #fff; margin: 0;">SWINGERS WORLD</h1>
                </td>
              </tr>
              <tr>
                <td style="padding: 2em; color: #333;">
                  <p style="color: black;">¡Hola ${name}!</p>
                  <p style="color: black;">Hemos recibido tu solicitud de cotización. Nuestro equipo se pondrá en contacto contigo en breve.</p>
                  <p style="color: black;">Si tienes alguna pregunta, no dudes en contactarnos. Estamos aquí para ayudarte.</p>
                  <p style="color: black;">Contáctanos: <a href="https://elaritech.com/contáctanos" style="color: #1976d2;" target="_blank">Haz clic aquí</a></p>
                  <p style="color: black;">El equipo de <strong>ELARITECH</strong>.</p>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `;

      await transporter.sendMail({
        from: process.env.EMAIL,  // Debe coincidir con el usuario autenticado
        to: email,                 // correo del cliente
        subject: 'Hemos recibido tu solicitud de cotización',
        html: emailCliente,
      });

      res.status(200).json({ message: 'Cotización creada y correos enviados exitosamente.' });

    } catch (error) {
      console.error('Error al enviar correo:', error.message);
      res.status(500).json({ message: 'Error en el servidor al enviar correo.' });
    }
  },
};
