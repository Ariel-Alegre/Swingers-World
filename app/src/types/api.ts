export type Photo = { url: string };

export type Profile = {
  id: string;
  usuarioId: string;
  nombre_visible?: string | null;
  genero?: string | null;
  busco?: string | null;
  fecha_nacimiento?: string | null;
  direccion?: string | null;
  descripcion?: string | null;
  fotos?: Photo[] | null;
  visibilidad_foto?: boolean;
  perfil_publico?: boolean;
  privacidad_activa?: boolean;
  verificado?: boolean;
};

export type User = {
  id: string;
  nombre: string;
  apellido: string;
  correo_electronico?: string;
  telefono?: string | null;
  pais?: string | null;
  color_del_fondo?: string | null;
  estado?: string;
  plan?: string | null;
  Perfil?: Profile | null;
};

export type LoginResponse = { token: string; usuario: User };

export type PhotoRequest = {
  id: string;
  solicitanteId: string;
  objetivoId: string;
  estado: 'pendiente' | 'aceptada' | 'rechazada';
  permisoExpiraEn?: string | null;
  solicitante?: User;
};

export type Conversation = {
  interlocutorId: string;
  nombre: string;
  apellido: string;
  avatar?: string | null;
  ultimoMensaje?: string | null;
  fechaUltimoMensaje?: string;
  ultimoMensajeDeOtro?: boolean;
  leido?: boolean;
};

export type Message = {
  id: string;
  mensaje?: string | null;
  imagenUrl?: string | null;
  emisorId: string;
  receptorId: string;
  fecha: string;
  leido?: boolean;
  tipo?: 'texto' | 'imagen';
};
