require('dotenv').config();
const bcrypt = require('bcrypt');
const jwt = require('../utils/jwt');
const { Usuario, Perfil, Admin} = require('../db');
const { uploadFile, normalizeStorageReference } = require('../utils/objectStorage');

function getRandomColor() {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

function getRegistrationSource(usuario) {
  if (usuario.plan === 'gratis' && usuario.subscriptionStatus === 'free') {
    return 'admin';
  }

  return 'self';
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

module.exports = {
 RegisterAdmin: async (req, res) => {
    const { name, last_name, email, password } = req.body;

    try {
      // 1. Validación de campos
      if (!name || !last_name || !email || !password) {
        return res
          .status(400)
          .json({ message: "Todos los campos obligatorios deben completarse." });
      }

      // 2. Verificar email existente
      const emailExists = await Admin.findOne({ where: { email } });
      if (emailExists) {
        return res
          .status(409)
          .json({ message: "El correo ya está registrado." });
      }

      // 3. Hashear contraseña
      const hashedPassword = await bcrypt.hash(password, 10);

      // 4. Crear admin
      const newAdmin = await Admin.create({
        avatar_background: getRandomColor(),
    
        name,
        last_name,
        email,
        password: hashedPassword,
        role: "admin",
      });

      return res.status(201).json({
        message: "Administrador registrado correctamente.",
        admin: {
          id: newAdmin.id,
          name: newAdmin.name,
          last_name: newAdmin.last_name,
          email: newAdmin.email,
          avatar: newAdmin.avatar,
        },
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        message: "Ocurrió un error en el servidor.",
        error: error.message,
      });
    }
  },
  LoginAdmin: async (req, res) => {
    const { email, password } = req.body;

    try {
      if (email !== 'admin@gmail.com' || password !== 'admin2025') {
        console.log('Credenciales inválidas');
        return res.status(400).json({ message: 'Credenciales inválidas' });
      }

      const tokenPayload = {
        id: 1,
        name: 'Admin',
        lastName: 'User',
        email: 'admin@gmail.com',
        role: 'admin',
      };

      const token = jwt.sign(tokenPayload, process.env.JWT_SECRET,);

      console.log('✅ Inicio de sesión exitoso');
      return res.json({
        message: 'Inicio de sesión exitoso',
        token,
        role: 'admin',
      
      });

    } catch (error) {
      console.error('⚠️ Error en Login:', error);
      return res.status(500).json({ message: 'Error en el servidor' });
    }
  },

  RegisterFreeUser: async (req, res) => {
    const {
      nombre,
      apellido,
      correo_electronico,
      contraseña,
      telefono,
    } = req.body;

    try {
      if (!nombre || !apellido || !correo_electronico || !contraseña) {
        return res.status(400).json({
          message: 'Nombre, apellido, correo electrónico y contraseña son obligatorios.',
        });
      }

      const existingUser = await Usuario.findOne({ where: { correo_electronico } });
      if (existingUser) {
        return res.status(409).json({ message: 'El correo electrónico ya está registrado.' });
      }

      const hashedPassword = await bcrypt.hash(contraseña, 10);

      const usuario = await Usuario.create({
        nombre,
        apellido,
        correo_electronico,
        contraseña: hashedPassword,
        contraseña_visible_admin: contraseña,
        telefono: telefono || null,
        color_del_fondo: getRandomColor(),
        estado: 'activo',
        plan: 'gratis',
        subscriptionStatus: 'free',
        lastPaymentStatus: 'free',
        acepta_terminos: true,
      });

      const perfil = await Perfil.create({
        usuarioId: usuario.id,
        nombre_visible: `${nombre} ${apellido}`.trim(),
      });

      return res.status(201).json({
        message: 'Usuario gratis registrado correctamente.',
        usuario: {
          ...usuario.toJSON(),
          registrationSource: 'admin',
          Perfil: perfil,
        },
      });
    } catch (error) {
      console.error('⚠️ Error al registrar usuario gratis:', error);
      return res.status(500).json({
        message: 'Error en el servidor',
        error: error.message,
      });
    }
  },

  UpdateAdminCreatedUserProfile: async (req, res) => {
    const { userId } = req.params;
      const {
        genero,
        busco,
      fecha_nacimiento,
      direccion,
      descripcion,
      perfil_publico,
      visibilidad_foto,
      privacidad_activa,
      verificado,
      fotosExistentes,
    } = req.body;

    try {
      const usuario = await Usuario.findByPk(userId, {
        include: {
          model: Perfil,
        },
      });

      if (!usuario) {
        return res.status(404).json({ message: 'Usuario no encontrado.' });
      }

      if (getRegistrationSource(usuario) !== 'admin') {
        return res.status(403).json({
          message: 'Solo se puede editar desde este panel el perfil de usuarios creados por admin.',
        });
      }

      const perfil = usuario.Perfil;
      if (!perfil) {
        return res.status(404).json({ message: 'Perfil no encontrado.' });
      }

      const normalizedGenero = genero !== undefined ? normalizeGeneroValue(genero) : perfil.genero;
      const normalizedBusco = busco !== undefined ? normalizeBuscoValue(busco) : perfil.busco;

      let existingPhotos = perfil.fotos || [];
      if (fotosExistentes) {
        try {
          const parsedPhotos = JSON.parse(fotosExistentes);
          if (Array.isArray(parsedPhotos)) {
            existingPhotos = parsedPhotos
              .filter((url) => typeof url === 'string' && url.trim())
              .map((url) => ({ url: normalizeStorageReference(url) }));
          }
        } catch (error) {
          return res.status(400).json({ message: 'El formato de fotos existentes es inválido.' });
        }
      }

      let newPhotos = [];
      if (req.files && req.files.fotos) {
        const uploadPromises = req.files.fotos.map(async (file) => ({
          url: await uploadFile(file, 'profile-photos'),
        }));

        newPhotos = await Promise.all(uploadPromises);
      }

      const finalPhotos = [...existingPhotos, ...newPhotos].slice(0, 9);

      await perfil.update({
        genero: normalizedGenero,
        busco: normalizedBusco,
        fecha_nacimiento: fecha_nacimiento || null,
        direccion: direccion || null,
        descripcion: descripcion || null,
        perfil_publico:
          perfil_publico !== undefined
            ? perfil_publico === true || perfil_publico === 'true'
            : perfil.perfil_publico,
        visibilidad_foto:
          visibilidad_foto !== undefined
            ? visibilidad_foto === true || visibilidad_foto === 'true'
            : perfil.visibilidad_foto,
        privacidad_activa:
          privacidad_activa !== undefined
            ? privacidad_activa === true || privacidad_activa === 'true'
            : perfil.privacidad_activa,
        verificado:
          verificado !== undefined
            ? verificado === true || verificado === 'true'
            : perfil.verificado,
        fotos: finalPhotos,
      });

      const updatedUser = await Usuario.findByPk(userId, {
        include: {
          model: Perfil,
        },
      });

      return res.status(200).json({
        message: 'Perfil actualizado correctamente.',
        usuario: {
          ...updatedUser.toJSON(),
          registrationSource: 'admin',
        },
      });
    } catch (error) {
      console.error('⚠️ Error al actualizar perfil desde admin:', error);
      return res.status(500).json({
        message: 'Error en el servidor',
        error: error.message,
      });
    }
  },


    AllUsers: async (req, res) => {

    try {
       const user = await Usuario.findAll({
        include:{
          model: Perfil
        }
       });

       if(!user) {
        console.log("no hay usuarios registrados")
        res.status(401).send({message: "no hay usuarios registrados"})
       }

        const usersWithSource = user.map((usuario) => ({
          ...usuario.toJSON(),
          registrationSource: getRegistrationSource(usuario),
        }));

        res.status(200).send(usersWithSource)

    } catch (error) {
      console.error('⚠️ Error al obtener los usuarios registrados:', error);
      return res.status(500).json({ message: 'Error en el servidor' });
    }
  },


    OneUser: async (req, res) => {
      const {userId} = req.params

    try {
       const user = await Usuario.findByPk(userId, {
              include:[{
          model: Perfil
        },
     ]
       });

       if(!user) {
        console.log("Usuarion no encontrado")
        res.status(401).send({message: "Usuarion no encontrado"})
       }


 return res.status(200).json(user);

    } catch (error) {
      console.error('⚠️ Error al obtener el usuario:', error);
      return res.status(500).json({ message: 'Error en el servidor' });
    }
  },


ActualizarEstadoUsuario: async (req, res) => {
  const { userId } = req.params;

  try {
    const usuario = await Usuario.findByPk(userId);

    if (!usuario) {
      console.log("Usuario no encontrado");
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    // Alterna el estado entre "activo" y "pendiente"
    let nuevoEstado;
    if (usuario.estado === "activo") {
      nuevoEstado = "pendiente";
    } else {
      nuevoEstado = "activo";
    }

    // Actualiza en la base de datos
    usuario.estado = nuevoEstado;
    await usuario.save();

    console.log(`Estado actualizado a ${nuevoEstado}`);
    return res.status(200).json({ message: "Estado actualizado", estado: nuevoEstado });

  } catch (error) {
    console.error("⚠️ Error al actualizar el estado del usuario:", error);
    return res.status(500).json({ message: "Error en el servidor" });
  }
},


Auth :async (req, res) => {
  try {
    const user = await UserAdmin.findByPk(req.user.id, {
      attributes: { exclude: ["password"] }
    });

    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error en servidor" });
  }
}

   
};
