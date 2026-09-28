require('dotenv').config();
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');
const jwt = require('../utils/jwt');
const { Op } = require('sequelize');
const { Usuario, Perfil, Like, Message, SolicitudFoto, Notificacion, PushToken, ContentReport, UserBlock } = require('../db'); // Asegúrate de tener bien asociadas las relaciones
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { findObjectionableMatch } = require('../utils/safety');
const { getBlockedUserIdsForUser, areUsersBlocked } = require('../utils/blocks');
const { uploadFile, deleteStoredObject, normalizeStorageReference } = require('../utils/objectStorage');
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
function getRandomColor() {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}
const planPriceIds = {
  mensual: 'price_1ScFJdEe7RTtR8KatM8j0aRc',  // reemplaza con tus Price IDs de Stripe
  '6meses': 'price_1ScFPtEe7RTtR8KaNYEc9CJT',
  '12meses': 'price_1ScFRCEe7RTtR8KaSyN44OoN',
};

async function crearPerfilBase(usuarioId, nombre, apellido) {
  const perfilExistente = await Perfil.findOne({ where: { usuarioId } });
  if (perfilExistente) {
    return perfilExistente;
  }

  return Perfil.create({
    usuarioId,
    nombre_visible: `${nombre} ${apellido.charAt(0)}.`,
    descripcion: null,
    visibilidad_foto: true,
    privacidad_activa: false,
    perfil_publico: true,
    verificado: false,
  });
}

function mapRevenueCatProductToPlan(productIdentifier) {
  const productMap = {
    'com.swingers.vip.monthly': 'mensual',
    'com.swingers.vip.6months': '6meses',
    'com.swingers.vip.annual': '12meses',
  };

  return productMap[productIdentifier] || null;
}

function getAuthenticatedUserId(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    const error = new Error('Token no proporcionado o inválido.');
    error.status = 401;
    throw error;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded.id;
  } catch (err) {
    const error = new Error('Token inválido o expirado.');
    error.status = 401;
    throw error;
  }
}

async function notifyModerationTeam({ type, reporter, reportedUser, reason, details, source }) {
  const moderationEmail = process.env.MODERATION_EMAIL || process.env.EMAIL || 'infoswingersvip@gmail.com';

  if (!moderationEmail) {
    return;
  }

  const reporterName = reporter ? `${reporter.nombre} ${reporter.apellido}`.trim() : 'Unknown user';
  const reportedName = reportedUser ? `${reportedUser.nombre} ${reportedUser.apellido}`.trim() : 'Unknown user';

  try {
    await transporter.sendMail({
      from: process.env.EMAIL,
      to: moderationEmail,
      subject: `[SW VIP] ${type === 'block' ? 'User blocked' : 'User reported'} - ${reason}`,
      html: `
        <h2>Moderation event received</h2>
        <p><strong>Type:</strong> ${type}</p>
        <p><strong>Source:</strong> ${source || 'profile'}</p>
        <p><strong>Reason:</strong> ${reason}</p>
        <p><strong>Reporter:</strong> ${reporterName} (${reporter?.correo_electronico || 'no-email'})</p>
        <p><strong>Reported user:</strong> ${reportedName} (${reportedUser?.correo_electronico || 'no-email'})</p>
        <p><strong>Details:</strong> ${details || 'No additional details provided.'}</p>
        <p>Please review and act within 24 hours according to App Review requirements.</p>
      `,
    });
  } catch (error) {
    console.error('⚠️ Error enviando email de moderación:', error.message);
  }
}

function normalizeGeneroValue(value) {
  if (!value) return null;

  const normalized = String(value).trim().toLowerCase();

  if (['male', 'masculino', 'hombre', 'man'].includes(normalized)) {
    return 'Male';
  }

  if (['female', 'femenino', 'mujer', 'woman'].includes(normalized)) {
    return 'Female';
  }

  return null;
}

function normalizeBuscoValue(value) {
  if (!value) return null;

  const normalized = String(value).trim().toLowerCase();

  if (['men', 'hombres', 'hombre', 'male', 'man'].includes(normalized)) {
    return 'Men';
  }

  if (['women', 'mujeres', 'mujer', 'female', 'woman'].includes(normalized)) {
    return 'Women';
  }

  if (['both', 'ambos', 'ambas', 'todos', 'todas'].includes(normalized)) {
    return 'Both';
  }

  return null;
}

function getDesiredGenders(busco) {
  if (busco === 'Women') {
    return ['Female'];
  }

  if (busco === 'Men') {
    return ['Male'];
  }

  if (busco === 'Both') {
    return ['Male', 'Female'];
  }

  return [];
}


module.exports = {

// ==========================
// Crear sesión de pago
// ==========================
crearSesionPago: async (req, res) => {
  try {
    const { nombre, apellido, correo_electronico, contraseña, telefono, pais, plan, isWeb } = req.body;

    // Verificar que el plan exista
    if (!planPriceIds[plan]) {
      return res.status(400).json({ message: `El plan "${plan}" no existe.` });
    }

    // 1️⃣ Revisar si el usuario ya existe
    const usuarioExistente = await Usuario.findOne({ where: { correo_electronico } });
    if (usuarioExistente) {
      return res.status(400).json({ message: "Ya existe un usuario con ese correo electrónico." });
    }

    // 2️⃣ Crear Stripe Customer
    // Guardamos todo en metadata para que el Webhook cree el usuario después
    const customer = await stripe.customers.create({
      email: correo_electronico,
      metadata: { nombre, apellido, correo_electronico, contraseña, telefono, pais, plan },
    });
    const customerId = customer.id;

    // 3️⃣ Crear suscripción inicial
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: planPriceIds[plan] }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
    });

    const paymentIntent = subscription.latest_invoice.payment_intent;

    // --- LÓGICA PARA WEB ---
    if (isWeb) {
      // En la web no necesitamos Ephemeral Key, solo el client_secret del intent
      return res.json({
        paymentIntent: paymentIntent.client_secret,
        subscriptionId: subscription.id,
        customer: customerId,
        isWeb: true
      });
    }

    // --- LÓGICA PARA MÓVIL (Mantenemos tu código original) ---
    const ephemeralKey = await stripe.ephemeralKeys.create(
      { customer: customerId },
      { apiVersion: '2022-11-15' }
    );

    res.json({
      paymentIntent: paymentIntent.client_secret,
      ephemeralKey: ephemeralKey.secret,
      customer: customerId,
    });

  } catch (error) {
    console.error('❌ Error creando sesión de pago:', error);
    res.status(500).json({ message: 'Error creando sesión de pago', error: error.message });
  }
},

// ==========================
// Webhook Stripe
// ==========================
webhookStripe: async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("❌ Error webhook:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log("✅ Evento recibido:", event.type);

  try {
    if (event.type === "invoice.payment_succeeded" || event.type === "invoice.paid") {
      const invoice = event.data.object;
      const customer = await stripe.customers.retrieve(invoice.customer);
      const metadata = customer.metadata || {};
      const { nombre, apellido, correo_electronico, telefono, pais, contraseña, plan } = metadata;

      // Buscar usuario existente
      let usuario = await Usuario.findOne({ where: { correo_electronico } });

      if (!usuario) {
        // Crear nuevo usuario
        const hashedPassword = await bcrypt.hash(contraseña, 10);

        usuario = await Usuario.create({
          nombre,
          apellido,
          correo_electronico,
          contraseña: hashedPassword,
          telefono,
          pais,
          color_del_fondo: getRandomColor(),
          estado: "activo",
          plan,
          stripeCustomerId: customer.id,
          stripeSubscriptionId: invoice.subscription,
          subscriptionStatus: invoice.status || "active",
          currentPeriodEnd: new Date(invoice.lines.data[0].period.end * 1000),
          lastPaymentStatus: "succeeded",
          acepta_terminos: true,
        });

        await Perfil.create({
          usuarioId: usuario.id,
          nombre_visible: `${nombre} ${apellido.charAt(0)}.`,
          descripcion: null,
          visibilidad_foto: true,
          privacidad_activa: false,
          perfil_publico: true,
          verificado: false,
        });

        // Enviar email de bienvenida
        await transporter.sendMail({
          from: process.env.EMAIL,
          to: correo_electronico,
          subject: 'Welcome to Swingers VIP!',
          html: `
<html>
  <body style="background-color: #f4f4f4; padding: 2em 0;">
    <table style="width: 100%; max-width: 600px; margin: 0 auto; background-color: #fff; border: 1px solid #ddd; border-radius: 10px; font-family: Arial, Helvetica, sans-serif; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);">
      
      <tr>
        <td style="
          background: linear-gradient(135deg, #363683, #d62874);
          text-align: center;
          padding: 1.5em;
          border-top-left-radius: 10px;
          border-top-right-radius: 10px;
        ">
          <h1 style="color: #fff; margin: 0;">SWINGERS WORLD</h1>
        </td>
      </tr>

      <tr>
        <td style="padding: 2em; color: #333;">
          <h2 style="color: #363683; margin-bottom: 0.5em;">Welcome to Swingers VIP, ${nombre} ${apellido}!</h2>
          
          <p style="color: #444; font-size: 15px;">
            Your account has been successfully created and you are now part of our exclusive community.
          </p>

          <p style="color: #444; font-size: 15px;">
            Explore profiles, connect with like-minded people, and experience new things in a safe, respectful, and completely private environment.
          </p>

          <div style="margin: 2em 0; text-align: center;">
            <a href="https://www.elaritech.com/" target="_blank" style="background-color: #d62874; color: #fff; padding: 0.9em 1.8em; border-radius: 5px; text-decoration: none; font-weight: bold;">
              Access the platform
            </a>
          </div>

          <p style="color: #555; font-size: 14px;">
            Do you have any questions or need assistance? <a href="mailto:info@elaritech.com" style="color: #363683;" target="_blank">Contact us here</a>. Our team is here to help you.
          </p>

          <p style="margin-top: 2.5em; color: #888; font-size: 12px;">
            This email was automatically generated. Please do not reply to this address.
          </p>

          <p style="color: #555; font-size: 13px;">
            — The team of <strong>Swingers VIP</strong>
          </p>
        </td>
      </tr>

    </table>
  </body>
</html>



      `
        });

        console.log("📧 Usuario creado y email enviado:", correo_electronico);
      } else {
        // Usuario ya existe, no hacer nada
        console.log("ℹ️ Usuario ya existe, no se crea de nuevo:", correo_electronico);
      }
    } 
    else if (event.type === "invoice.payment_failed" || event.type === "customer.subscription.deleted") {
      const subscription = event.data.object;
      const affectedUser = await Usuario.findOne({ where: { stripeSubscriptionId: subscription.id } });

      if (affectedUser) {
        await affectedUser.update({
          estado: "pendiente",
          subscriptionStatus: subscription.status || "canceled",
          lastPaymentStatus: "failed",
        });
        console.log("⚠️ Suscripción vencida o cancelada, usuario marcado como pendiente:", affectedUser.correo_electronico);
      }
    } 
    else {
      // Registrar eventos no manejados
      console.log("ℹ️ Evento Stripe no manejado:", event.type);
    }
  } catch (err) {
    console.error("❌ Error procesando evento:", err);
  }

  // Siempre respondemos con recibido para que Stripe no reintente
  res.json({ received: true });
},

webhookRevenueCat: async (req, res) => {
  try {
    const authHeader = req.headers.authorization || '';
    const expectedSecret = process.env.REVENUECAT_WEBHOOK_SECRET;

    if (expectedSecret) {
      const expectedAuth = `Bearer ${expectedSecret}`;
      if (authHeader !== expectedAuth) {
        return res.status(401).json({ message: 'Webhook RevenueCat no autorizado.' });
      }
    }

    const event = req.body?.event;

    if (!event) {
      return res.status(400).json({ message: 'Payload inválido de RevenueCat.' });
    }

    const {
      type,
      app_user_id,
      original_app_user_id,
      product_id,
      expiration_at_ms,
    } = event;

    const possibleEmails = [app_user_id, original_app_user_id]
      .filter(Boolean)
      .map((value) => String(value).trim().toLowerCase());

    if (!possibleEmails.length) {
      return res.status(200).json({ received: true, ignored: true });
    }

    const usuario = await Usuario.findOne({
      where: {
        correo_electronico: {
          [Op.in]: possibleEmails,
        },
      },
    });

    if (!usuario) {
      return res.status(200).json({ received: true, ignored: true, reason: 'user_not_found' });
    }

    const plan = mapRevenueCatProductToPlan(product_id) || usuario.plan;
    const currentPeriodEnd = expiration_at_ms ? new Date(expiration_at_ms) : usuario.currentPeriodEnd;

    if (['INITIAL_PURCHASE', 'RENEWAL', 'PRODUCT_CHANGE', 'UNCANCELLATION', 'NON_RENEWING_PURCHASE'].includes(type)) {
      await usuario.update({
        estado: 'activo',
        plan,
        subscriptionStatus: 'active',
        currentPeriodEnd,
        lastPaymentStatus: 'succeeded',
        stripeCustomerId: usuario.stripeCustomerId || possibleEmails[0],
        stripeSubscriptionId: product_id || usuario.stripeSubscriptionId,
      });
    } else if (['CANCELLATION', 'BILLING_ISSUE', 'SUBSCRIPTION_PAUSED'].includes(type)) {
      await usuario.update({
        plan,
        subscriptionStatus: 'canceled',
        currentPeriodEnd,
        lastPaymentStatus: 'failed',
      });
    } else if (['EXPIRATION'].includes(type)) {
      await usuario.update({
        estado: 'pendiente',
        plan,
        subscriptionStatus: 'expired',
        currentPeriodEnd,
        lastPaymentStatus: 'failed',
      });
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('❌ Error procesando webhook RevenueCat:', error);
    return res.status(500).json({ message: 'Error procesando webhook RevenueCat', error: error.message });
  }
},


  Registrarse: async (req, res) => {
    try {
      const { nombre, apellido, correo_electronico, contraseña, telefono, pais, role } = req.body;

      const usuarioExistente = await Usuario.findOne({ where: { correo_electronico } });
      if (usuarioExistente) {
        return res.status(400).json({ message: 'Ya existe un usuario con ese correo electrónico.' });
      }

      const hashedPassword = await bcrypt.hash(contraseña, 10);

      const nuevoUsuario = await Usuario.create({
        nombre,
        apellido,
        correo_electronico,
        contraseña: hashedPassword,
        telefono,
        pais,
        role: role || 'usuario',
        color_del_fondo: getRandomColor(),
    
        estado: "activo"
      });

      const perfil = await Perfil.create({
        usuarioId: nuevoUsuario.id,
        nombre_visible: `${nombre} ${apellido.charAt(0)}.`,
        descripcion: null,
        visibilidad_foto: true,
        privacidad_activa: false,
        perfil_publico: true,
        verificado: false,
      });
/*       const emailContent = `
<html>
  <body style="background-color: #f4f4f4; padding: 2em 0;">
    <table style="width: 100%; max-width: 600px; margin: 0 auto; background-color: #fff; border: 1px solid #ddd; border-radius: 10px; font-family: Arial, Helvetica, sans-serif; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);">
      
      <tr>
        <td style="
          background: linear-gradient(135deg, #363683, #d62874);
          text-align: center;
          padding: 1.5em;
          border-top-left-radius: 10px;
          border-top-right-radius: 10px;
        ">
          <h1 style="color: #fff; margin: 0;">SWINGERS WORLD</h1>
        </td>
      </tr>

      <tr>
        <td style="padding: 2em; color: #333;">
          <h2 style="color: #363683; margin-bottom: 0.5em;">¡Bienvenido/a a Swingers VIP, ${nombre} ${apellido}!</h2>
          
          <p style="color: #444; font-size: 15px;">
            Tu cuenta ha sido creada con éxito y ya formas parte de nuestra exclusiva comunidad.
          </p>

          <p style="color: #444; font-size: 15px;">
            Explora perfiles, conecta con personas afines y viví nuevas experiencias dentro de un entorno seguro, respetuoso y totalmente privado.
          </p>

          <div style="margin: 2em 0; text-align: center;">
            <a href="https://www.elaritech.com/" target="_blank" style="background-color: #d62874; color: #fff; padding: 0.9em 1.8em; border-radius: 5px; text-decoration: none; font-weight: bold;">
              Ingresar a la plataforma
            </a>
          </div>

          <p style="color: #555; font-size: 14px;">
            ¿Tenés alguna pregunta o necesitás asistencia? <a href="https://swingersvip.com/contacto" style="color: #363683;" target="_blank">Contactanos aquí</a>. Nuestro equipo está para ayudarte.
          </p>

          <p style="margin-top: 2.5em; color: #888; font-size: 12px;">
            Este correo fue generado automáticamente. Por favor, no respondas a esta dirección.
          </p>

          <p style="color: #555; font-size: 13px;">
            — El equipo de <strong>Swingers VIP</strong>
          </p>
        </td>
      </tr>

    </table>
  </body>
</html>



      `;

      await transporter.sendMail({
        from: "info@elaritech.com",
        to: correo_electronico,
        subject: '¡Bienvenido/a a Swingers VIP!',

        html: emailContent,
      }); */

      return res.status(201).json({ usuario: nuevoUsuario, perfil });
    } catch (error) {
      console.error("❌ Error en el servidor:", error);
      return res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
  },

  RegistrarSuscripcionIOSRevenueCat: async (req, res) => {
    try {
      const {
        nombre,
        apellido,
        correo_electronico,
        contraseña,
        telefono,
        pais,
        plan,
        acepta_terminos,
        latestExpirationDate,
        revenueCatAppUserId,
        productIdentifier,
      } = req.body;

      if (!nombre || !apellido || !correo_electronico || !contraseña || !plan) {
        return res.status(400).json({ message: 'Faltan datos obligatorios para registrar la suscripción iOS.' });
      }

      const planesValidos = ['mensual', '6meses', '12meses'];
      if (!planesValidos.includes(plan)) {
        return res.status(400).json({ message: 'El plan indicado no es válido.' });
      }

      let usuario = await Usuario.findOne({ where: { correo_electronico } });

      if (!usuario) {
        const hashedPassword = await bcrypt.hash(contraseña, 10);

        usuario = await Usuario.create({
          nombre,
          apellido,
          correo_electronico,
          contraseña: hashedPassword,
          telefono,
          pais,
          role: 'usuario',
          color_del_fondo: getRandomColor(),
          estado: 'activo',
          plan,
          subscriptionStatus: 'active',
          currentPeriodEnd: latestExpirationDate ? new Date(latestExpirationDate) : null,
          lastPaymentStatus: 'succeeded',
          acepta_terminos: Boolean(acepta_terminos),
        });
      } else {
        const updatedFields = {
          nombre,
          apellido,
          telefono,
          pais,
          estado: 'activo',
          plan,
          subscriptionStatus: 'active',
          currentPeriodEnd: latestExpirationDate ? new Date(latestExpirationDate) : usuario.currentPeriodEnd,
          lastPaymentStatus: 'succeeded',
          acepta_terminos: Boolean(acepta_terminos),
        };

        if (revenueCatAppUserId && !usuario.stripeCustomerId) {
          updatedFields.stripeCustomerId = revenueCatAppUserId;
        }

        if (productIdentifier && !usuario.stripeSubscriptionId) {
          updatedFields.stripeSubscriptionId = productIdentifier;
        }

        await usuario.update(updatedFields);
      }

      const perfil = await crearPerfilBase(usuario.id, nombre, apellido);

      return res.status(201).json({
        usuario,
        perfil,
        message: 'Suscripción iOS registrada correctamente.',
      });
    } catch (error) {
      console.error('❌ Error registrando suscripción iOS con RevenueCat:', error);
      return res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
  },

  IniciarSesion: async (req, res) => {
    try {
      const { correo_electronico, contraseña } = req.body;

      const usuario = await Usuario.findOne({ where: { correo_electronico } });
      if (!usuario) {
        return res.status(404).json({ message: 'Usuario no encontrado.' });
      }

      if (!usuario.contraseña) {
        return res.status(500).json({ message: 'La contraseña del usuario es inválida o no está definida.' });
      }

      const match = await bcrypt.compare(contraseña, usuario.contraseña);
      if (!match) {
        return res.status(401).json({ message: 'Contraseña incorrecta.' });
      }

      const token = jwt.sign(
        { id: usuario.id, role: usuario.role },
        process.env.JWT_SECRET,
        { expiresIn: '15d' }
      );

      return res.status(200).json({ token, usuario });
    } catch (error) {
      console.error("❌ Error en el servidor:", error);
      return res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
  },

  DataPersonal: async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Token no proporcionado o inválido.' });
      }

      const token = authHeader.split(' ')[1];

      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
      } catch (err) {
        return res.status(401).json({ message: 'Token inválido o expirado.' });
      }

      const usuario = await Usuario.findByPk(decoded.id, {
        attributes: { exclude: ['contraseña'] },
        include: [{ model: Perfil }],
      });

      if (!usuario) {
        return res.status(404).json({ message: 'Usuario no encontrado.' });
      }
      return res.status(200).json(usuario);
    } catch (error) {
      console.error("❌ Error al obtener perfil con token:", error);
      return res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
  },

  Perfil: async (req, res) => {
    try {
      const { id } = req.params;

      const usuario = await Usuario.findByPk(id, {
        attributes: { exclude: ['contraseña'] },
        include: [{ model: Perfil }],
      });

      if (!usuario) {
        return res.status(404).json({ message: 'Perfil no encontrado.' });
      }

      return res.status(200).json(usuario);
    } catch (error) {
      console.error("❌ Error al obtener perfil:", error);
      return res.status(500).json({ error: error.message });
    }
  },

ActualizarPerfil: async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Token no proporcionado o inválido.' });
    }
    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ message: 'Token inválido o expirado.' });
    }

    const usuario = await Usuario.findByPk(decoded.id, {
      include: [{ model: Perfil }],
    });

    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }

    const {
      descripcion, direccion, fecha_nacimiento, genero, busco, pais,
      perfil_publico, visibilidad_foto, latitud, longitud, radio 
    } = req.body;

    const objectionableDescriptionMatch = findObjectionableMatch(descripcion);
    if (objectionableDescriptionMatch) {
      return res.status(400).json({
        message: 'La descripción contiene contenido no permitido y no pudo guardarse.',
        code: objectionableDescriptionMatch,
      });
    }

    const normalizedGenero = genero !== undefined ? normalizeGeneroValue(genero) : usuario.Perfil.genero;
    const normalizedBusco = busco !== undefined ? normalizeBuscoValue(busco) : usuario.Perfil.busco;

    // 1. Subir fotos nuevas al bucket privado de Railway
    let fotosNuevas = [];
    if (req.files && req.files['fotos']) {
      const uploadPromises = req.files['fotos'].map(async (file) => ({
        url: await uploadFile(file, 'profile-photos'),
      }));

      fotosNuevas = await Promise.all(uploadPromises);
    }

    // 2. LÓGICA DE FUSIÓN (Esto arregla el error en Next.js)
    // Obtenemos las fotos que ya están en la base de datos
    const fotosExistentes = usuario.Perfil.fotos || [];
    
    // Si hay fotos nuevas, las sumamos a las que ya existían
    // Si no hay nuevas, nos quedamos con las que estaban
    const arrayFinal = [...fotosExistentes, ...fotosNuevas].slice(0, 9);

    const lat = latitud !== undefined ? parseFloat(latitud) : null;
    const lon = longitud !== undefined ? parseFloat(longitud) : null;
    const radioNum = radio !== undefined ? parseFloat(radio) : null;

    if (pais !== undefined) {
      await usuario.update({
        pais: pais ? String(pais).trim() : null,
      });
    }

    // 3. Actualizar perfil
    await Perfil.update(
      {
        descripcion,
        direccion,
        latitud: lat,
        longitud: lon,
        fecha_nacimiento,
        genero: normalizedGenero,
        perfil_publico,
        visibilidad_foto,
        busco: normalizedBusco,
        radio: radioNum,
        // CLAVE: Siempre mandamos el array combinado si hubo subidas
        fotos: fotosNuevas.length > 0 ? arrayFinal : fotosExistentes,
      },
      { where: { id: usuario.Perfil.id } }
    );

    return res.status(200).json({ message: 'Perfil actualizado correctamente.' });
  } catch (error) {
    console.error('❌ Error al actualizar perfil:', error);
    return res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
},
  EliminarFotoPerfil: async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Token no proporcionado o inválido.' });
      }
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const usuario = await Usuario.findByPk(decoded.id, { include: [Perfil] });
      if (!usuario || !usuario.Perfil) {
        return res.status(404).json({ message: 'Perfil no encontrado.' });
      }

      const requestedUrl = req.query.url;
      if (!requestedUrl) {
        return res.status(400).json({ message: 'URL de la foto requerida.' });
      }

      const url = normalizeStorageReference(requestedUrl);
      await deleteStoredObject(url);

      // Eliminar del array de fotos
      const nuevasFotos = (usuario.Perfil.fotos || []).filter(f => f.url !== url);

      // Actualizar en DB
      await Perfil.update({ fotos: nuevasFotos }, { where: { id: usuario.Perfil.id } });

      return res.status(200).json({ message: 'Foto eliminada correctamente.' });
    } catch (error) {
      console.error('❌ Error al eliminar foto:', error);
      return res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
  },

  EliminarCuenta: async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Token no proporcionado o inválido.' });
      }

      const token = authHeader.split(' ')[1];
      let decoded;

      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
      } catch (err) {
        return res.status(401).json({ message: 'Token inválido o expirado.' });
      }

      const usuario = await Usuario.findByPk(decoded.id, {
        include: [{ model: Perfil }],
      });

      if (!usuario) {
        return res.status(404).json({ message: 'Usuario no encontrado.' });
      }

      const fotosPerfil = usuario.Perfil?.fotos || [];

      for (const foto of fotosPerfil) {
        try {
          const fotoUrl = normalizeStorageReference(foto?.url);
          if (!fotoUrl) continue;

          await deleteStoredObject(fotoUrl);
        } catch (storageError) {
          console.error('Error eliminando foto del bucket:', storageError.message);
        }
      }

      await Like.destroy({
        where: {
          [Op.or]: [
            { usuarioId: usuario.id },
            { likedUserId: usuario.id },
          ],
        },
      });

      await Message.destroy({
        where: {
          [Op.or]: [
            { emisorId: usuario.id },
            { receptorId: usuario.id },
          ],
        },
      });

      await SolicitudFoto.destroy({
        where: {
          [Op.or]: [
            { solicitanteId: usuario.id },
            { objetivoId: usuario.id },
          ],
        },
      });

      await Notificacion.destroy({
        where: { usuarioId: usuario.id },
      });

      await PushToken.destroy({
        where: { userId: usuario.id },
      });

      await UserBlock.destroy({
        where: {
          [Op.or]: [
            { blockerId: usuario.id },
            { blockedUserId: usuario.id },
          ],
        },
      });

      await ContentReport.destroy({
        where: {
          [Op.or]: [
            { reporterId: usuario.id },
            { reportedUserId: usuario.id },
          ],
        },
      });

      if (usuario.Perfil) {
        await usuario.Perfil.destroy();
      }

      await usuario.destroy();

      return res.status(200).json({ message: 'Cuenta eliminada correctamente.' });
    } catch (error) {
      console.error('❌ Error al eliminar cuenta:', error);
      return res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
  },



  Perfiles: async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Token no proporcionado o inválido.' });
      }

      const token = authHeader.split(' ')[1];
      let decoded;

      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
      } catch (err) {
        return res.status(401).json({ message: 'Token inválido o expirado.' });
      }

      const usuario = await Usuario.findByPk(decoded.id, {
        include: [{ model: Perfil }],
      });

      if (!usuario || !usuario.Perfil) {
        return res.status(404).json({ message: 'Usuario o perfil no encontrado.' });
      }

      const blockedUserIds = await getBlockedUserIdsForUser(usuario.id);
      const excludedIds = [usuario.id, ...blockedUserIds];

      const busco = normalizeBuscoValue(usuario.Perfil.busco);

      if (!busco) {
        return res.status(200).json([]);
      }

      const generoBuscado = getDesiredGenders(busco);

      if (!generoBuscado.length) {
        return res.status(200).json([]);
      }

      // Buscar con condiciones básicas
      const usuarios = await Usuario.findAll({
        where: {
          id: { [Op.notIn]: excludedIds },
        },
        include: [
          {
            model: Perfil,
            where: {
              perfil_publico: true,
              busco: { [Op.ne]: null },
              descripcion: { [Op.ne]: null },
            }
          }
        ],
        attributes: { exclude: ['contraseña'] },
      });

      // Filtro en JS para validar campos necesarios
      const filtrados = usuarios.filter(u => {
        const perfil = u.Perfil;
        const generoNormalizado = normalizeGeneroValue(perfil?.genero);

        const tieneFotos = Array.isArray(perfil?.fotos) && perfil.fotos.length > 0;
        const descripcionValida = perfil?.descripcion?.trim().length > 0;

        const fecha = perfil?.fecha_nacimiento;
        const fechaValida = !!fecha && !isNaN(new Date(fecha).getTime());

        return (
          !!generoNormalizado &&
          generoBuscado.includes(generoNormalizado) &&
          tieneFotos &&
          descripcionValida &&
          fechaValida
        );
      });
      for (let i = filtrados.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [filtrados[i], filtrados[j]] = [filtrados[j], filtrados[i]];
      }
      return res.status(200).json(filtrados);


    } catch (error) {
      console.error('❌ Error al obtener perfiles:', error);
      return res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
  },

  PerfilesIOSCommunity: async (req, res) => {
    try {
      const usuarioId = getAuthenticatedUserId(req);
      const usuario = await Usuario.findByPk(usuarioId);

      if (!usuario) {
        return res.status(404).json({ message: 'Usuario no encontrado.' });
      }

      const blockedUserIds = await getBlockedUserIdsForUser(usuarioId);
      const excludedIds = [usuarioId, ...blockedUserIds];
      const usuarios = await Usuario.findAll({
        where: { id: { [Op.notIn]: excludedIds } },
        include: [{
          model: Perfil,
          where: {
            perfil_publico: true,
            descripcion: { [Op.ne]: null },
            fecha_nacimiento: { [Op.ne]: null },
          },
        }],
        attributes: ['id', 'nombre', 'apellido', 'color_del_fondo'],
      });

      const adultCutoff = new Date();
      adultCutoff.setFullYear(adultCutoff.getFullYear() - 18);

      const miembros = usuarios
        .filter((entry) => {
          const perfil = entry.Perfil;
          const fechaNacimiento = new Date(perfil?.fecha_nacimiento);
          const tieneFotos = Array.isArray(perfil?.fotos) && perfil.fotos.length > 0;
          const descripcionValida = Boolean(perfil?.descripcion?.trim());
          const esAdulto = !Number.isNaN(fechaNacimiento.getTime()) && fechaNacimiento <= adultCutoff;
          return tieneFotos && descripcionValida && esAdulto;
        })
        .map((entry) => ({
          id: entry.id,
          nombre: entry.nombre,
          apellido: entry.apellido,
          color_del_fondo: entry.color_del_fondo,
          Perfil: {
            nombre_visible: entry.Perfil?.nombre_visible,
            fotos: entry.Perfil?.fotos || [],
            visibilidad_foto: entry.Perfil?.visibilidad_foto,
            verificado: entry.Perfil?.verificado,
          },
        }));

      for (let i = miembros.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [miembros[i], miembros[j]] = [miembros[j], miembros[i]];
      }

      return res.status(200).json(miembros);
    } catch (error) {
      console.error('Error al obtener la comunidad iOS:', error);
      const status = error.status || 500;
      return res.status(status).json({ message: error.message || 'Error en el servidor' });
    }
  },

  DetallePerfil: async (req, res) => {
    try {
      const { id } = req.params;
      let requesterId = null;

      try {
        requesterId = getAuthenticatedUserId(req);
      } catch (error) {
        requesterId = null;
      }

      if (requesterId) {
        const blocked = await areUsersBlocked(requesterId, id);
        if (blocked) {
          return res.status(404).json({ message: 'Usuario no encontrado o no disponible.' });
        }
      }

      const usuario = await Usuario.findByPk(id, {
        attributes: { exclude: ['contraseña'] },
        include: [{
          model: Perfil,
          where: {
            perfil_publico: true,
          },
          required: true,
        }],
      });

      if (!usuario) {
        return res.status(404).json({ message: 'Usuario no encontrado o perfil no público.' });
      }

      return res.status(200).json(usuario);
    } catch (error) {
      console.error('❌ Error al obtener detalle de usuario:', error);
      return res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
  },

  DarLike: async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Token no proporcionado o mal formado.' });
      }

      const token = authHeader.split(' ')[1];
      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
      } catch (err) {
        return res.status(401).json({ message: 'Token inválido o expirado.' });
      }

      const usuarioId = decoded.id;
      const { likedUserId } = req.body;

      if (!likedUserId) {
        return res.status(400).json({ message: 'Falta el ID del usuario al que das like.' });
      }

      if (usuarioId === likedUserId) {
        return res.status(400).json({ message: 'No puedes likearte a ti mismo.' });
      }

      const blocked = await areUsersBlocked(usuarioId, likedUserId);
      if (blocked) {
        return res.status(403).json({ message: 'No puedes interactuar con este usuario.' });
      }

      // Verificar si ambos usuarios existen
      const usuario = await Usuario.findByPk(usuarioId);
      const likedUser = await Usuario.findByPk(likedUserId);

      if (!usuario || !likedUser) {
        return res.status(404).json({ message: 'Uno o ambos usuarios no existen.' });
      }

      // Verificar si ya existe el like
      const yaExiste = await Like.findOne({ where: { usuarioId, likedUserId } });
      if (yaExiste) {
        return res.status(200).json({ message: 'Ya habías dado like a este perfil.' });
      }

      // Crear el nuevo like
      const nuevoLike = await Like.create({ usuarioId, likedUserId });
      return res.status(201).json({ message: 'Like registrado correctamente.', like: nuevoLike });

    } catch (error) {
      console.error('❌ Error al guardar like:', error);
      return res.status(500).json({ message: 'Error interno del servidor.', error: error.message });
    }
  },

  MisLikes: async (req, res) => {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) return res.status(401).json({ message: 'Token requerido.' });

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const usuarioId = decoded.id;

      const likes = await Like.findAll({
        where: { usuarioId },
        include: [{
          model: Usuario,
          as: 'likedUser',
          attributes: ['id', 'nombre', 'apellido', 'color_del_fondo'],
          include: ['Perfil'],
        }],
      });

      return res.status(200).json(likes.map(l => l.likedUser));
    } catch (error) {
      console.error('❌ Error al obtener likes:', error);
      return res.status(500).json({ message: 'Error del servidor', error: error.message });
    }
  },

  EliminarLikes: async (req, res) => {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) return res.status(401).json({ message: 'Token requerido.' });

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const usuarioId = decoded.id;
      const likedUserId = req.params.id;

      const eliminados = await Like.destroy({ where: { usuarioId, likedUserId } });

      if (!eliminados) {
        return res.status(404).json({ message: 'El perfil no estaba guardado en tu circulo.' });
      }

      return res.status(200).json({ message: 'Perfil eliminado de tu circulo.' });
    } catch (error) {
      console.error('❌ Error al eliminar likes:', error);
      return res.status(500).json({ message: 'Error del servidor', error: error.message });
    }
  },

  ReportarUsuario: async (req, res) => {
    try {
      const reporterId = getAuthenticatedUserId(req);
      const {
        reportedUserId,
        reason,
        details,
        source = 'profile',
      } = req.body;

      if (!reportedUserId || !reason) {
        return res.status(400).json({ message: 'Debes indicar el usuario reportado y el motivo.' });
      }

      if (reportedUserId === reporterId) {
        return res.status(400).json({ message: 'No puedes reportarte a ti mismo.' });
      }

      const [reporter, reportedUser] = await Promise.all([
        Usuario.findByPk(reporterId),
        Usuario.findByPk(reportedUserId),
      ]);

      if (!reporter || !reportedUser) {
        return res.status(404).json({ message: 'Usuario no encontrado.' });
      }

      const report = await ContentReport.create({
        reporterId,
        reportedUserId,
        source,
        reason,
        details: details ? String(details).trim() : null,
        status: 'pending',
        autoBlocked: false,
      });

      await notifyModerationTeam({
        type: 'report',
        reporter,
        reportedUser,
        reason,
        details,
        source,
      });

      return res.status(201).json({
        message: 'Reporte enviado correctamente. Nuestro equipo lo revisará dentro de 24 horas.',
        report,
      });
    } catch (error) {
      console.error('❌ Error al reportar usuario:', error);
      const status = error.status || 500;
      return res.status(status).json({ message: error.message || 'Error en el servidor' });
    }
  },

  BloquearUsuario: async (req, res) => {
    try {
      const blockerId = getAuthenticatedUserId(req);
      const {
        blockedUserId,
        reason = 'abusive_or_unwanted',
        details,
        source = 'profile',
      } = req.body;

      if (!blockedUserId) {
        return res.status(400).json({ message: 'Debes indicar el usuario a bloquear.' });
      }

      if (blockedUserId === blockerId) {
        return res.status(400).json({ message: 'No puedes bloquearte a ti mismo.' });
      }

      const [blocker, blockedUser] = await Promise.all([
        Usuario.findByPk(blockerId),
        Usuario.findByPk(blockedUserId),
      ]);

      if (!blocker || !blockedUser) {
        return res.status(404).json({ message: 'Usuario no encontrado.' });
      }

      const [block] = await UserBlock.findOrCreate({
        where: {
          blockerId,
          blockedUserId,
        },
        defaults: {
          reason,
          details: details ? String(details).trim() : null,
          status: 'active',
        },
      });

      if (block.status !== 'active') {
        await block.update({
          status: 'active',
          reason,
          details: details ? String(details).trim() : null,
        });
      }

      await ContentReport.create({
        reporterId: blockerId,
        reportedUserId: blockedUserId,
        source,
        reason,
        details: details ? String(details).trim() : null,
        status: 'pending',
        autoBlocked: true,
      });

      await notifyModerationTeam({
        type: 'block',
        reporter: blocker,
        reportedUser: blockedUser,
        reason,
        details,
        source,
      });

      return res.status(200).json({
        message: 'Usuario bloqueado correctamente y removido de tu feed.',
      });
    } catch (error) {
      console.error('❌ Error al bloquear usuario:', error);
      const status = error.status || 500;
      return res.status(status).json({ message: error.message || 'Error en el servidor' });
    }
  }



};
