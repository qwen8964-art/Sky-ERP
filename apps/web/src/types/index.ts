// Tipos globales del sistema SKYNET ERP

export interface Usuario {
  id: number
  username: string
  nombre: string
  email: string
  idMiEmpresa: number
  idSede: number
  idAlmacen: number
  permisos: Permiso[]
}

export interface Permiso {
  id: number
  idUsuario: number
  idArbol: number
  ver: boolean
  crear: boolean
  editar: boolean
  eliminar: boolean
  aprobar: boolean
}

export interface Empresa {
  id: number
  ruc: string
  razonSocial: string
  nombreComercial: string
  direccion: string
  telefono: string
  email: string
  igv: number
  activo: boolean
}

export interface Sede {
  id: number
  idMiEmpresa: number
  nombre: string
  direccion: string
  telefono: string
  activo: boolean
  empresa?: Empresa
}

export interface Almacen {
  id: number
  idMiEmpresa: number
  idSede: number
  nombre: string
  direccion: string
  tipo: string
  activo: boolean
  sede?: Sede
}

export interface Moneda {
  id: number
  codigo: string
  nombre: string
  simbolo: string
  tipoCambio: number
  activo: boolean
}

export interface TipoCambio {
  id: number
  fecha: string
  compra: number
  venta: number
  fuente: string
}

export interface Persona {
  id: number
  tipoDocumento: string
  numeroDocumento: string
  nombres: string
  apellidos: string
  razonSocial?: string
  email: string
  telefono: string
  direccion: string
  tipo: 'CLIENTE' | 'PROVEEDOR' | 'VENDEDOR' | 'TRABAJADOR'
  activo: boolean
}

export interface Cliente {
  id: number
  idPersona: number
  tipoCliente: string
  limiteCredito: number
  diasCredito: number
  descuento: number
  persona?: Persona
  activo: boolean
}

export interface Proveedor {
  id: number
  idPersona: number
  tipoProveedor: string
  condicionIgv: string
  persona?: Persona
  activo: boolean
}

export interface Vendedor {
  id: number
  idPersona: number
  codigo: string
  comision: number
  meta: number
  persona?: Persona
  activo: boolean
}

export interface FamiliaGrupo {
  id: number
  idPadre: number | null
  codigo: string
  nombre: string
  tipo: 'FAMILIA' | 'GRUPO'
  nivel: number
  hijos?: FamiliaGrupo[]
  activo: boolean
}

export interface Producto {
  id: number
  codigo: string
  nombre: string
  descripcion: string
  idFamiliaGrupo: number
  unidadMedida: string
  precioCompra: number
  precioVenta: number
  stockMinimo: number
  stockMaximo: number
  impuesto: boolean
  tipo: string
  activo: boolean
  familiaGrupo?: FamiliaGrupo
}

export interface ListaPrecio {
  id: number
  idMiEmpresa: number
  idSede: number
  nombre: string
  moneda: string
  tipo: string
  activo: boolean
}

export interface Stock {
  id: number
  idProducto: number
  idAlmacen: number
  cantidad: number
  producto?: Producto
  almacen?: Almacen
}

export interface Kardex {
  id: number
  fecha: string
  tipoMovimiento: string
  idDocumento: number
  tipoDocumento: string
  idProducto: number
  idAlmacen: number
  entrada: number
  salida: number
  saldo: number
  precioUnitario: number
  producto?: Producto
  almacen?: Almacen
}

export interface Cotizacion {
  id: number
  serie: string
  correlativo: number
  fecha: string
  idCliente: number
  idVendedor: number
  idSede: number
  idAlmacen: number
  moneda: string
  tipoCambio: number
  subTotal: number
  igv: number
  total: number
  estado: 'BORRADOR' | 'APROBADO' | 'ANULADO'
  observacion: string
  cliente?: Cliente
  vendedor?: Vendedor
  detalles: CotizacionDetalle[]
}

export interface CotizacionDetalle {
  id: number
  idCotizacion: number
  idProducto: number
  cantidad: number
  precioUnitario: number
  descuento: number
  impuesto: boolean
  subtotal: number
  igv: number
  total: number
  producto?: Producto
}

export interface ComprobanteVenta {
  id: number
  tipoComprobante: 'FACTURA' | 'BOLETA' | 'NC' | 'ND'
  serie: string
  correlativo: number
  fecha: string
  fechaVencimiento?: string
  idCliente: number
  idVendedor: number
  idSede: number
  idAlmacen: number
  moneda: string
  tipoCambio: number
  subTotal: number
  igv: number
  total: number
  estado: 'BORRADOR' | 'APROBADO' | 'ANULADO'
  formaPago: string
  observacion: string
  guiaSalida?: Guia
  cliente?: Cliente
  vendedor?: Vendedor
  detalles: ComprobanteVentaDetalle[]
}

export interface ComprobanteVentaDetalle {
  id: number
  idComprobante: number
  idProducto: number
  cantidad: number
  precioUnitario: number
  descuento: number
  impuesto: boolean
  subtotal: number
  igv: number
  total: number
  producto?: Producto
}

export interface ComprobanteCompra {
  id: number
  tipoComprobante: 'FACTURA' | 'BOLETA' | 'NC' | 'ND'
  serie: string
  correlativo: string
  fecha: string
  idProveedor: number
  idSede: number
  idAlmacen: number
  moneda: string
  tipoCambio: number
  subTotal: number
  igv: number
  total: number
  estado: 'BORRADOR' | 'APROBADO' | 'ANULADO'
  percepcion: number
  retencion: number
  observacion: string
  guiaIngreso?: Guia
  proveedor?: Proveedor
  detalles: ComprobanteCompraDetalle[]
}

export interface ComprobanteCompraDetalle {
  id: number
  idComprobante: number
  idProducto: number
  cantidad: number
  precioUnitario: number
  descuento: number
  impuesto: boolean
  subtotal: number
  igv: number
  total: number
  producto?: Producto
}

export interface Guia {
  id: number
  tipoGuia: 'GI' | 'GS' | 'GR'
  serie: string
  correlativo: number
  fecha: string
  idMotivo: number
  idAlmacenOrigen: number
  idAlmacenDestino: number
  idTercero?: number
  placaVehiculo?: string
  rucTransportista?: string
  estado: 'BORRADOR' | 'APROBADO' | 'ANULADO'
  observacion: string
  motivo?: MotivoGuia
  detalles: GuiaDetalle[]
}

export interface GuiaDetalle {
  id: number
  idGuia: number
  idProducto: number
  cantidad: number
  producto?: Producto
}

export interface MotivoGuia {
  id: number
  codigo: string
  nombre: string
  tipo: 'INGRESO' | 'SALIDA'
  activo: boolean
}

export interface CtaCobrar {
  id: number
  idDocumento: number
  tipoDocumento: string
  idCliente: number
  fechaEmision: string
  fechaVencimiento: string
  montoOriginal: number
  montoPagado: number
  saldo: number
  moneda: string
  estado: 'PENDIENTE' | 'PARCIAL' | 'CANCELADO' | 'ANULADO'
  cliente?: Cliente
  amortizaciones: Amortizacion[]
}

export interface CtaPagar {
  id: number
  idDocumento: number
  tipoDocumento: string
  idProveedor: number
  fechaEmision: string
  fechaVencimiento: string
  montoOriginal: number
  montoPagado: number
  saldo: number
  moneda: string
  estado: 'PENDIENTE' | 'PARCIAL' | 'CANCELADO' | 'ANULADO'
  proveedor?: Proveedor
  amortizaciones: Amortizacion[]
}

export interface Amortizacion {
  id: number
  idCta: number
  tipoCta: 'COBRAR' | 'PAGAR'
  fecha: string
  monto: number
  idOperacion: number
  tipoOperacion: string
  observacion: string
}

export interface CajaBanco {
  id: number
  idMiEmpresa: number
  idSede: number
  tipo: 'CAJA' | 'BANCO'
  nombre: string
  numeroCuenta: string
  moneda: string
  saldo: number
  activo: boolean
}

export interface Cheque {
  id: number
  numero: string
  idCajaBanco: number
  idTercero: number
  tipo: 'EMITIDO' | 'RECIBIDO'
  monto: number
  moneda: string
  fechaEmision: string
  fechaVencimiento: string
  estado: 'PENDIENTE' | 'COBRADO' | 'ANULADO'
  observacion: string
}

export interface Trabajador {
  id: number
  idPersona: number
  codigo: string
  cargo: string
  area: string
  fechaIngreso: string
  sueldoBasico: number
  tipoContrato: string
  activo: boolean
  persona?: Persona
}

export interface Contrato {
  id: number
  idTrabajador: number
  tipoContrato: string
  fechaInicio: string
  fechaFin?: string
  sueldo: number
  jornadaHoras: number
  estado: 'ACTIVO' | 'FINALIZADO'
  trabajador?: Trabajador
}

export interface Asistencia {
  id: number
  idTrabajador: number
  fecha: string
  horaEntrada: string
  horaSalida: string
  tardanza: number
  estado: 'PRESENTE' | 'TARDANZA' | 'FALTA'
  trabajador?: Trabajador
}

export interface FormulaProduccion {
  id: number
  codigo: string
  nombre: string
  idProductoFinal: number
  cantidadFinal: number
  unidadMedida: string
  costoEstimado: number
  activo: boolean
  productoFinal?: Producto
  detalles: FormulaDetalle[]
}

export interface FormulaDetalle {
  id: number
  idFormula: number
  idProducto: number
  cantidad: number
  unidadMedida: string
  costo: number
  producto?: Producto
}

export interface OrdenProduccion {
  id: number
  codigo: string
  idFormula: number
  cantidadProducir: number
  fechaInicio: string
  fechaFin?: string
  estado: 'PENDIENTE' | 'EN_PROCESO' | 'FINALIZADO' | 'ANULADO'
  formula?: FormulaProduccion
  partes: ParteProduccion[]
}

export interface ParteProduccion {
  id: number
  idOrden: number
  fecha: string
  cantidadProducida: number
  materialesUsados: MaterialUsado[]
  auxiliares: AuxiliarUsado[]
}

export interface MaterialUsado {
  id: number
  idParte: number
  idProducto: number
  cantidad: number
  producto?: Producto
}

export interface Curso {
  id: number
  codigo: string
  nombre: string
  descripcion: string
  duracion: number
  costo: number
  activo: boolean
}

export interface Matricula {
  id: number
  idCurso: number
  idAlumno: number
  fecha: string
  estado: 'ACTIVO' | 'FINALIZADO' | 'ANULADO'
  curso?: Curso
  calificaciones?: Calificacion[]
}

export interface Calificacion {
  id: number
  idMatricula: number
  evaluacion: string
  nota: number
  fecha: string
}

export interface PlanCuenta {
  id: number
  codigo: string
  nombre: string
  tipo: 'ACTIVO' | 'PASIVO' | 'PATRIMONIO' | 'INGRESO' | 'GASTO'
  nivel: number
  idPadre: number | null
  padre?: PlanCuenta
  hijos?: PlanCuenta[]
  activo: boolean
}

export interface AsientoContable {
  id: number
  numero: string
  fecha: string
  glosa: string
  idFuente: number
  tipoFuente: string
  detalles: AsientoDetalle[]
}

export interface AsientoDetalle {
  id: number
  idAsiento: number
  idCuenta: number
  debe: number
  haber: number
  centroCosto?: string
  cuenta?: PlanCuenta
}

export interface Alerta {
  id: number
  codigo: string
  nombre: string
  sql: string
  frecuencia: number
  ultimoCheck: string
  activo: boolean
}

export interface TreeNav {
  id: number
  idPadre: number | null
  codigo: string
  nombre: string
  modulo: string
  ruta: string
  icono: string
  orden: number
  visible: boolean
  hijos?: TreeNav[]
}
