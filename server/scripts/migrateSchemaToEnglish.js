require('dotenv').config();
const { conn } = require('../src/db');

const tableRenames = [
  ['Usuarios', 'Users'],
  ['Perfiles', 'Profiles'],
  ['notificaciones', 'Notifications'],
  ['SolicitudFotos', 'PhotoRequests'],
  ['user_admin', 'Admins'],
];

const constraintRenames = [
  ['Likes', 'Likes_usuarioId_fkey', 'Likes_userId_fkey'],
  ['Likes', 'Likes_usuarioId_not_null', 'Likes_userId_not_null'],
  ['Messages', 'Messages_emisorId_fkey', 'Messages_senderId_fkey'],
  ['Messages', 'Messages_emisorId_not_null', 'Messages_senderId_not_null'],
  ['Messages', 'Messages_receptorId_fkey', 'Messages_receiverId_fkey'],
  ['Messages', 'Messages_receptorId_not_null', 'Messages_receiverId_not_null'],
  ['Profiles', 'Perfiles_createdAt_not_null', 'Profiles_createdAt_not_null'],
  ['Profiles', 'Perfiles_id_not_null', 'Profiles_id_not_null'],
  ['Profiles', 'Perfiles_pkey', 'Profiles_pkey'],
  ['Profiles', 'Perfiles_radio_not_null', 'Profiles_radius_not_null'],
  ['Profiles', 'Perfiles_updatedAt_not_null', 'Profiles_updatedAt_not_null'],
  ['Profiles', 'Perfiles_usuarioId_fkey', 'Profiles_userId_fkey'],
  ['Profiles', 'Perfiles_usuarioId_key', 'Profiles_userId_key'],
  ['Profiles', 'Perfiles_usuarioId_not_null', 'Profiles_userId_not_null'],
  ['PhotoRequests', 'SolicitudFotos_createdAt_not_null', 'PhotoRequests_createdAt_not_null'],
  ['PhotoRequests', 'SolicitudFotos_id_not_null', 'PhotoRequests_id_not_null'],
  ['PhotoRequests', 'SolicitudFotos_objetivoId_fkey', 'PhotoRequests_targetUserId_fkey'],
  ['PhotoRequests', 'SolicitudFotos_objetivoId_not_null', 'PhotoRequests_targetUserId_not_null'],
  ['PhotoRequests', 'SolicitudFotos_pkey', 'PhotoRequests_pkey'],
  ['PhotoRequests', 'SolicitudFotos_solicitanteId_fkey', 'PhotoRequests_requesterId_fkey'],
  ['PhotoRequests', 'SolicitudFotos_solicitanteId_not_null', 'PhotoRequests_requesterId_not_null'],
  ['PhotoRequests', 'SolicitudFotos_updatedAt_not_null', 'PhotoRequests_updatedAt_not_null'],
  ['Users', 'Usuarios_acepta_terminos_not_null', 'Users_acceptedTerms_not_null'],
  ['Users', 'Usuarios_apellido_not_null', 'Users_lastName_not_null'],
  ['Users', 'Usuarios_contraseña_not_null', 'Users_passwordHash_not_null'],
  ['Users', 'Usuarios_correo_electronico_key', 'Users_email_key'],
  ['Users', 'Usuarios_correo_electronico_not_null', 'Users_email_not_null'],
  ['Users', 'Usuarios_createdAt_not_null', 'Users_createdAt_not_null'],
  ['Users', 'Usuarios_estado_not_null', 'Users_status_not_null'],
  ['Users', 'Usuarios_id_not_null', 'Users_id_not_null'],
  ['Users', 'Usuarios_nombre_not_null', 'Users_firstName_not_null'],
  ['Users', 'Usuarios_pkey', 'Users_pkey'],
  ['Users', 'Usuarios_updatedAt_not_null', 'Users_updatedAt_not_null'],
  ['Notifications', 'notificaciones_createdAt_not_null', 'Notifications_createdAt_not_null'],
  ['Notifications', 'notificaciones_id_not_null', 'Notifications_id_not_null'],
  ['Notifications', 'notificaciones_pkey', 'Notifications_pkey'],
  ['Notifications', 'notificaciones_tipo_not_null', 'Notifications_type_not_null'],
  ['Notifications', 'notificaciones_updatedAt_not_null', 'Notifications_updatedAt_not_null'],
  ['Notifications', 'notificaciones_usuarioId_fkey', 'Notifications_userId_fkey'],
  ['Notifications', 'notificaciones_usuarioId_not_null', 'Notifications_userId_not_null'],
];

async function tableExists(tableName, transaction) {
  const [rows] = await conn.query(
    'SELECT to_regclass(:tableName) AS name',
    { replacements: { tableName: `"${tableName}"` }, transaction },
  );
  return Boolean(rows[0]?.name);
}

async function renameLegacyTables(transaction) {
  const queryInterface = conn.getQueryInterface();

  for (const [legacyName, englishName] of tableRenames) {
    const legacyExists = await tableExists(legacyName, transaction);
    const englishExists = await tableExists(englishName, transaction);
    if (legacyExists && !englishExists) {
      await queryInterface.renameTable(legacyName, englishName, { transaction });
      console.log(`Renamed table ${legacyName} to ${englishName}.`);
    }
  }
}

async function renameLegacyConstraints(transaction) {
  const queryInterface = conn.getQueryInterface();

  for (const [tableName, legacyName, englishName] of constraintRenames) {
    const [rows] = await conn.query(
      'SELECT 1 FROM pg_constraint WHERE connamespace = current_schema()::regnamespace AND conname = :legacyName',
      { replacements: { legacyName }, transaction },
    );
    if (!rows.length) continue;

    const quotedTable = queryInterface.quoteIdentifier(tableName);
    const quotedLegacyName = queryInterface.quoteIdentifier(legacyName);
    const quotedEnglishName = queryInterface.quoteIdentifier(englishName);
    await conn.query(
      `ALTER TABLE ${quotedTable} RENAME CONSTRAINT ${quotedLegacyName} TO ${quotedEnglishName}`,
      { transaction },
    );
    console.log(`Renamed constraint ${legacyName} to ${englishName}.`);
  }
}

async function migratePhotoRequestEnum(transaction) {
  await conn.query(`
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_SolicitudFotos_status')
         AND NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_PhotoRequests_status') THEN
        ALTER TYPE "enum_SolicitudFotos_status" RENAME TO "enum_PhotoRequests_status";
      END IF;
    END $$;
  `, { transaction });

  const valueRenames = [
    ['pendiente', 'pending'],
    ['aceptada', 'accepted'],
    ['rechazada', 'rejected'],
  ];

  for (const [legacyValue, englishValue] of valueRenames) {
    await conn.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_enum e
          JOIN pg_type t ON t.oid = e.enumtypid
          WHERE t.typname = 'enum_PhotoRequests_status' AND e.enumlabel = '${legacyValue}'
        ) AND NOT EXISTS (
          SELECT 1 FROM pg_enum e
          JOIN pg_type t ON t.oid = e.enumtypid
          WHERE t.typname = 'enum_PhotoRequests_status' AND e.enumlabel = '${englishValue}'
        ) THEN
          ALTER TYPE "enum_PhotoRequests_status" RENAME VALUE '${legacyValue}' TO '${englishValue}';
        END IF;
      END $$;
    `, { transaction });
  }
}

async function migrateStoredValues(transaction) {
  if (await tableExists('Users', transaction)) {
    await conn.query(`
      UPDATE "Users" SET "role" = CASE "role" WHEN 'usuario' THEN 'user' ELSE "role" END;
      UPDATE "Users" SET "status" = CASE "status"
        WHEN 'activo' THEN 'active' WHEN 'pendiente' THEN 'pending' ELSE "status" END;
      UPDATE "Users" SET "plan" = CASE "plan"
        WHEN 'mensual' THEN 'monthly' WHEN '6meses' THEN 'six_months'
        WHEN '12meses' THEN 'annual' WHEN 'gratis' THEN 'free' ELSE "plan" END;
    `, { transaction });
  }

  if (await tableExists('Messages', transaction)) {
    await conn.query(`
      UPDATE "Messages" SET "type" = CASE "type"
        WHEN 'texto' THEN 'text' WHEN 'imagen' THEN 'image' ELSE "type" END;
    `, { transaction });
  }

  if (await tableExists('Notifications', transaction)) {
    await conn.query(`
      UPDATE "Notifications" SET "type" = CASE "type"
        WHEN 'solicitud_foto' THEN 'photo_request'
        WHEN 'respuesta_foto' THEN 'photo_response' ELSE "type" END;
    `, { transaction });
  }
}

async function addLocationColumns(transaction) {
  if (!await tableExists('Profiles', transaction)) return;
  await conn.query(`
    ALTER TABLE "Profiles" ADD COLUMN IF NOT EXISTS "city" VARCHAR(255);
    ALTER TABLE "Profiles" ADD COLUMN IF NOT EXISTS "region" VARCHAR(255);
    ALTER TABLE "Profiles" ADD COLUMN IF NOT EXISTS "countryCode" VARCHAR(2);
    ALTER TABLE "Profiles" ADD COLUMN IF NOT EXISTS "timezone" VARCHAR(255);
    ALTER TABLE "Profiles" ADD COLUMN IF NOT EXISTS "locationTrackingEnabled" BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE "Profiles" ADD COLUMN IF NOT EXISTS "profileType" VARCHAR(255) NOT NULL DEFAULT 'single';
    ALTER TABLE "Profiles" ADD COLUMN IF NOT EXISTS "partnerFirstName" VARCHAR(255);
    ALTER TABLE "Profiles" ADD COLUMN IF NOT EXISTS "partnerLastName" VARCHAR(255);
    ALTER TABLE "Profiles" ADD COLUMN IF NOT EXISTS "coupleType" VARCHAR(255);
  `, { transaction });
}

async function main() {
  await conn.authenticate();
  await conn.transaction(async (transaction) => {
    await renameLegacyTables(transaction);
    await renameLegacyConstraints(transaction);
    await migratePhotoRequestEnum(transaction);
    await migrateStoredValues(transaction);
    await addLocationColumns(transaction);
  });
  console.log('English schema migration completed successfully.');
}

main()
  .catch((error) => {
    console.error('English schema migration failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await conn.close();
  });
