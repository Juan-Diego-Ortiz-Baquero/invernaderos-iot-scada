using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using InvernaderosAPI.Data;
using InvernaderosAPI.DTOs;
using InvernaderosAPI.Models;

namespace InvernaderosAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class LecturasController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly IConfiguration _config;
        private static readonly HashSet<string> ResolucionesPermitidas = new(StringComparer.OrdinalIgnoreCase)
        {
            "minuto",
            "hora",
            "dia",
            "semana",
            "mes",
            "anio"
        };

        public LecturasController(AppDbContext db, IConfiguration config)
        {
            _db = db;
            _config = config;
        }

        // ── POST /api/lecturas ────────────────────────────────
        [HttpPost]
        public async Task<IActionResult> RecibirLectura([FromBody] LecturaDto dto)
        {
            // 1. Crear la lectura
            var lectura = new Lectura
            {
                IdSensor = dto.IdSensor,
                IdInvernadero = dto.IdInvernadero,
                FechaHora = DateTime.Now,
                Temperatura = dto.Temperatura,
                Humedad = dto.Humedad,
                Luminosidad = dto.Luminosidad,
                CalidadAire = dto.CalidadAire,
                HumedadSuelo = dto.HumedadSuelo,
                EsAlerta = false
            };

            // 2. Obtener umbrales del invernadero
            var umbrales = await _db.ConfiguracionesUmbral
                .Where(u => u.IdInvernadero == dto.IdInvernadero)
                .ToListAsync();

            // 3. Verificar alertas automáticamente
            var alertasDetectadas = new List<Alerta>();

            foreach (var umbral in umbrales)
            {
                decimal valor = umbral.Variable switch
                {
                    "Temperatura" => dto.Temperatura,
                    "Humedad" => dto.Humedad,
                    _ => -1
                };

                if (valor < 0) continue;

                if (valor < umbral.ValorMinimo || valor > umbral.ValorMaximo)
                {
                    lectura.EsAlerta = true;

                    // Tipos exactos que acepta el CHECK constraint de Somee
                    string tipo = umbral.Variable switch
                    {
                        "Temperatura" => valor < umbral.ValorMinimo ? "TEMP_BAJA" : "TEMP_ALTA",
                        "Humedad" => valor < umbral.ValorMinimo ? "HUM_BAJA" : "HUM_ALTA",
                        _ => "TEMP_ALTA"
                    };

                    alertasDetectadas.Add(new Alerta
                    {
                        IdInvernadero = dto.IdInvernadero,
                        TipoAlerta = tipo,
                        Mensaje = $"{umbral.Variable} fuera de rango: {valor} " +
                                         $"(rango: {umbral.ValorMinimo} - {umbral.ValorMaximo})",
                        ValorDetectado = valor,
                        FechaHora = DateTime.Now,
                        Resuelta = false
                    });
                }
            }

            // 4. Guardar lectura
            _db.Lecturas.Add(lectura);
            await _db.SaveChangesAsync();

            // 5. Guardar alertas nuevas sin duplicar eventos recientes del mismo tipo
            var alertasGuardadas = 0;
            var cooldownMinutos = Math.Max(1, _config.GetValue("Alertas:CooldownMinutos", 10));
            var ventanaDuplicados = DateTime.Now.AddMinutes(-cooldownMinutos);

            foreach (var alerta in alertasDetectadas)
            {
                var existeAlertaReciente = await _db.Alertas.AnyAsync(a =>
                    a.IdInvernadero == dto.IdInvernadero &&
                    a.TipoAlerta == alerta.TipoAlerta &&
                    a.FechaHora >= ventanaDuplicados);

                if (existeAlertaReciente) continue;

                alerta.IdLectura = lectura.IdLectura;
                _db.Alertas.Add(alerta);
                alertasGuardadas++;
            }

            if (alertasGuardadas > 0)
                await _db.SaveChangesAsync();

            return Ok(new
            {
                mensaje = "Lectura guardada correctamente",
                idLectura = lectura.IdLectura,
                esAlerta = lectura.EsAlerta,
                alertas = alertasGuardadas
            });
        }

        // ── GET /api/lecturas/{idInvernadero} ─────────────────
        [HttpGet("{idInvernadero}")]
        [Authorize]
        public async Task<IActionResult> ObtenerLecturas(int idInvernadero)
        {
            var lecturas = await _db.Lecturas
                .Include(l => l.Invernadero)
                .Where(l => l.IdInvernadero == idInvernadero)
                .OrderByDescending(l => l.FechaHora)
                .Take(50)
                .Select(l => new LecturaResponseDto
                {
                    IdLectura = l.IdLectura,
                    IdSensor = l.IdSensor,
                    FechaHora = l.FechaHora,
                    Temperatura = l.Temperatura,
                    Humedad = l.Humedad,
                    Luminosidad = l.Luminosidad,
                    CalidadAire = l.CalidadAire,
                    HumedadSuelo = l.HumedadSuelo,
                    EsAlerta = l.EsAlerta,
                    NombreInvernadero = l.Invernadero!.Nombre
                })
                .ToListAsync();

            return Ok(lecturas);
        }

        // ── GET /api/lecturas/{idInvernadero}/ultima ──────────
        [HttpGet("{idInvernadero}/ultima")]
        [Authorize]
        public async Task<IActionResult> UltimaLectura(int idInvernadero)
        {
            var lectura = await _db.Lecturas
                .Include(l => l.Invernadero)
                .Where(l => l.IdInvernadero == idInvernadero)
                .OrderByDescending(l => l.FechaHora)
                .Select(l => new LecturaResponseDto
                {
                    IdLectura = l.IdLectura,
                    IdSensor = l.IdSensor,
                    FechaHora = l.FechaHora,
                    Temperatura = l.Temperatura,
                    Humedad = l.Humedad,
                    Luminosidad = l.Luminosidad,
                    CalidadAire = l.CalidadAire,
                    HumedadSuelo = l.HumedadSuelo,
                    EsAlerta = l.EsAlerta,
                    NombreInvernadero = l.Invernadero!.Nombre
                })
                .FirstOrDefaultAsync();

            if (lectura == null)
                return NotFound(new { mensaje = "No hay lecturas registradas" });

            return Ok(lectura);
        }

        // ── GET /api/lecturas/{idInvernadero}/consulta ───────
        [HttpGet("{idInvernadero}/consulta")]
        [Authorize]
        public async Task<IActionResult> ConsultarLecturas(
            int idInvernadero,
            [FromQuery] DateTime? desde,
            [FromQuery] DateTime? hasta,
            [FromQuery] int? idSensor,
            [FromQuery] bool? soloAlertas,
            [FromQuery] int pagina = 1,
            [FromQuery] int tamanoPagina = 50)
        {
            var paginaActual = Math.Max(1, pagina);
            var tamano = Math.Clamp(tamanoPagina, 10, 500);

            var consulta = _db.Lecturas
                .AsNoTracking()
                .Include(l => l.Invernadero)
                .Where(l => l.IdInvernadero == idInvernadero);

            if (desde.HasValue)
                consulta = consulta.Where(l => l.FechaHora >= desde.Value);

            if (hasta.HasValue)
                consulta = consulta.Where(l => l.FechaHora <= hasta.Value);

            if (idSensor.HasValue)
                consulta = consulta.Where(l => l.IdSensor == idSensor.Value);

            if (soloAlertas.HasValue)
                consulta = consulta.Where(l => l.EsAlerta == soloAlertas.Value);

            var totalRegistros = await consulta.CountAsync();
            var totalPaginas = (int)Math.Ceiling(totalRegistros / (double)tamano);

            var lecturas = await consulta
                .OrderByDescending(l => l.FechaHora)
                .Skip((paginaActual - 1) * tamano)
                .Take(tamano)
                .Select(l => new LecturaResponseDto
                {
                    IdLectura = l.IdLectura,
                    IdSensor = l.IdSensor,
                    FechaHora = l.FechaHora,
                    Temperatura = l.Temperatura,
                    Humedad = l.Humedad,
                    Luminosidad = l.Luminosidad,
                    CalidadAire = l.CalidadAire,
                    HumedadSuelo = l.HumedadSuelo,
                    EsAlerta = l.EsAlerta,
                    NombreInvernadero = l.Invernadero!.Nombre
                })
                .ToListAsync();

            return Ok(new
            {
                pagina = paginaActual,
                tamanoPagina = tamano,
                totalRegistros,
                totalPaginas,
                lecturas
            });
        }

        // ── GET /api/lecturas/{idInvernadero}/historial ───────
        [HttpGet("{idInvernadero}/historial")]
        [Authorize]
        public async Task<IActionResult> ObtenerHistorial(
            int idInvernadero,
            [FromQuery] DateTime? desde,
            [FromQuery] DateTime? hasta,
            [FromQuery] int? idSensor,
            [FromQuery] bool? soloAlertas,
            [FromQuery] string resolucion = "hora")
        {
            if (!ResolucionesPermitidas.Contains(resolucion))
            {
                return BadRequest(new
                {
                    mensaje = "Resolucion no valida. Use minuto, hora, dia, semana, mes o anio."
                });
            }

            var fechaFin = hasta ?? DateTime.Now;
            var fechaInicio = desde ?? fechaFin.AddHours(-24);

            if (fechaInicio >= fechaFin)
                return BadRequest(new { mensaje = "La fecha desde debe ser menor que la fecha hasta." });

            var rangoMaximoDias = Math.Max(1, _config.GetValue("Historiador:RangoMaximoDias", 1825));

            if (fechaFin - fechaInicio > TimeSpan.FromDays(rangoMaximoDias))
                return BadRequest(new { mensaje = $"El rango maximo permitido para el historiador es de {rangoMaximoDias} dias." });

            var baseAgrupacion = AlinearFecha(fechaInicio, resolucion);
            var consulta = _db.Lecturas
                .AsNoTracking()
                .Where(l => l.IdInvernadero == idInvernadero
                         && l.FechaHora >= fechaInicio
                         && l.FechaHora <= fechaFin);

            if (idSensor.HasValue)
                consulta = consulta.Where(l => l.IdSensor == idSensor.Value);

            if (soloAlertas.HasValue)
                consulta = consulta.Where(l => l.EsAlerta == soloAlertas.Value);

            var gruposQuery = resolucion.ToLowerInvariant() switch
            {
                "anio" => consulta.GroupBy(l => EF.Functions.DateDiffYear(baseAgrupacion, l.FechaHora)),
                "mes" => consulta.GroupBy(l => EF.Functions.DateDiffMonth(baseAgrupacion, l.FechaHora)),
                "semana" => consulta.GroupBy(l => EF.Functions.DateDiffDay(baseAgrupacion, l.FechaHora) / 7),
                "dia" => consulta.GroupBy(l => EF.Functions.DateDiffDay(baseAgrupacion, l.FechaHora)),
                "hora" => consulta.GroupBy(l => EF.Functions.DateDiffHour(baseAgrupacion, l.FechaHora)),
                _ => consulta.GroupBy(l => EF.Functions.DateDiffMinute(baseAgrupacion, l.FechaHora))
            };

            var grupos = await gruposQuery
                .Select(g => new
                {
                    Bucket = g.Key,
                    FechaFin = g.Max(l => l.FechaHora),
                    TotalLecturas = g.Count(),
                    TemperaturaPromedio = g.Average(l => (decimal?)l.Temperatura),
                    TemperaturaMinima = g.Min(l => (decimal?)l.Temperatura),
                    TemperaturaMaxima = g.Max(l => (decimal?)l.Temperatura),
                    HumedadPromedio = g.Average(l => (decimal?)l.Humedad),
                    HumedadMinima = g.Min(l => (decimal?)l.Humedad),
                    HumedadMaxima = g.Max(l => (decimal?)l.Humedad),
                    HumedadSueloPromedio = g.Average(l => l.HumedadSuelo),
                    HumedadSueloMinima = g.Min(l => l.HumedadSuelo),
                    HumedadSueloMaxima = g.Max(l => l.HumedadSuelo),
                    LuminosidadPromedio = g.Average(l => l.Luminosidad),
                    LuminosidadMinima = g.Min(l => l.Luminosidad),
                    LuminosidadMaxima = g.Max(l => l.Luminosidad),
                    CalidadAirePromedio = g.Average(l => l.CalidadAire),
                    CalidadAireMinima = g.Min(l => l.CalidadAire),
                    CalidadAireMaxima = g.Max(l => l.CalidadAire),
                    TieneAlertas = g.Any(l => l.EsAlerta)
                })
                .OrderBy(g => g.Bucket)
                .ToListAsync();

            var historial = grupos.Select(g => new HistorialLecturaDto
            {
                FechaInicio = ObtenerFechaInicioBucket(baseAgrupacion, g.Bucket, resolucion),
                FechaFin = g.FechaFin,
                TotalLecturas = g.TotalLecturas,
                TemperaturaPromedio = g.TemperaturaPromedio,
                TemperaturaMinima = g.TemperaturaMinima,
                TemperaturaMaxima = g.TemperaturaMaxima,
                HumedadPromedio = g.HumedadPromedio,
                HumedadMinima = g.HumedadMinima,
                HumedadMaxima = g.HumedadMaxima,
                HumedadSueloPromedio = g.HumedadSueloPromedio,
                HumedadSueloMinima = g.HumedadSueloMinima,
                HumedadSueloMaxima = g.HumedadSueloMaxima,
                LuminosidadPromedio = g.LuminosidadPromedio,
                LuminosidadMinima = g.LuminosidadMinima,
                LuminosidadMaxima = g.LuminosidadMaxima,
                CalidadAirePromedio = g.CalidadAirePromedio,
                CalidadAireMinima = g.CalidadAireMinima,
                CalidadAireMaxima = g.CalidadAireMaxima,
                TieneAlertas = g.TieneAlertas
            });

            return Ok(new
            {
                idInvernadero,
                desde = fechaInicio,
                hasta = fechaFin,
                resolucion,
                puntos = historial
            });
        }

        private static DateTime AlinearFecha(DateTime fecha, string resolucion)
        {
            return resolucion.ToLowerInvariant() switch
            {
                "anio" => new DateTime(fecha.Year, 1, 1),
                "mes" => new DateTime(fecha.Year, fecha.Month, 1),
                "semana" => fecha.Date.AddDays(-((7 + (int)fecha.DayOfWeek - (int)DayOfWeek.Monday) % 7)),
                "dia" => fecha.Date,
                "hora" => new DateTime(fecha.Year, fecha.Month, fecha.Day, fecha.Hour, 0, 0),
                _ => new DateTime(fecha.Year, fecha.Month, fecha.Day, fecha.Hour, fecha.Minute, 0)
            };
        }

        private static DateTime ObtenerFechaInicioBucket(DateTime baseAgrupacion, int bucket, string resolucion)
        {
            return resolucion.ToLowerInvariant() switch
            {
                "anio" => baseAgrupacion.AddYears(bucket),
                "mes" => baseAgrupacion.AddMonths(bucket),
                "semana" => baseAgrupacion.AddDays(bucket * 7),
                "dia" => baseAgrupacion.AddDays(bucket),
                "hora" => baseAgrupacion.AddHours(bucket),
                _ => baseAgrupacion.AddMinutes(bucket)
            };
        }
    }
}
