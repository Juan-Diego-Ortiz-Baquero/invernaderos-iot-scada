using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using InvernaderosAPI.Data;
using InvernaderosAPI.DTOs;

namespace InvernaderosAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class AsistenteController : ControllerBase
    {
        private readonly AppDbContext _db;

        private static readonly Dictionary<string, string> VariableLabels = new(StringComparer.OrdinalIgnoreCase)
        {
            ["temperature"] = "temperatura",
            ["humidity"] = "humedad del aire",
            ["soil"] = "humedad del suelo",
            ["light"] = "luminosidad",
            ["air"] = "calidad del aire"
        };

        public AsistenteController(AppDbContext db)
        {
            _db = db;
        }

        [HttpPost("{idInvernadero}/consultar")]
        public async Task<ActionResult<AsistenteRespuestaDto>> Consultar(int idInvernadero, [FromBody] AsistenteConsultaDto dto)
        {
            var hasta = dto.Hasta ?? DateTime.Now;
            var desde = dto.Desde ?? hasta.AddHours(-24);

            if (desde >= hasta)
                return BadRequest(new { mensaje = "La fecha desde debe ser menor que la fecha hasta." });

            var invernadero = await _db.Invernaderos
                .AsNoTracking()
                .Where(i => i.IdInvernadero == idInvernadero)
                .Select(i => new
                {
                    i.IdInvernadero,
                    i.Nombre,
                    i.Municipio,
                    i.Departamento,
                    i.Latitud,
                    i.Longitud
                })
                .FirstOrDefaultAsync();

            if (invernadero == null)
                return NotFound(new { mensaje = "Invernadero no encontrado." });

            var lecturas = await _db.Lecturas
                .AsNoTracking()
                .Where(l => l.IdInvernadero == idInvernadero && l.FechaHora >= desde && l.FechaHora <= hasta)
                .OrderBy(l => l.FechaHora)
                .ToListAsync();

            var alertas = await _db.Alertas
                .AsNoTracking()
                .Where(a => a.IdInvernadero == idInvernadero && a.FechaHora >= desde && a.FechaHora <= hasta)
                .OrderByDescending(a => a.FechaHora)
                .ToListAsync();

            var umbrales = await _db.ConfiguracionesUmbral
                .AsNoTracking()
                .Where(u => u.IdInvernadero == idInvernadero)
                .Select(u => new
                {
                    u.Variable,
                    u.ValorMinimo,
                    u.ValorMaximo
                })
                .ToListAsync();

            var respuesta = Analizar(dto.Pregunta, dto.Variable, desde, hasta, invernadero, lecturas, alertas, umbrales);
            return Ok(respuesta);
        }

        private static AsistenteRespuestaDto Analizar(
            string pregunta,
            string? variable,
            DateTime desde,
            DateTime hasta,
            object invernadero,
            List<Models.Lectura> lecturas,
            List<Models.Alerta> alertas,
            IEnumerable<object> umbrales)
        {
            var preguntaNormalizada = (pregunta ?? string.Empty).Trim().ToLowerInvariant();
            var hallazgos = new List<string>();
            var acciones = new List<string>();
            var limitaciones = new List<string>();
            var prioridad = "normal";

            if (!lecturas.Any())
            {
                return new AsistenteRespuestaDto
                {
                    Prioridad = "sin-datos",
                    Resumen = "No hay lecturas disponibles para el rango consultado.",
                    Limitaciones = new List<string> { "Amplia el rango temporal o verifica que el ESP32 este enviando datos." },
                    Contexto = new { desde, hasta, totalLecturas = 0, totalAlertas = alertas.Count }
                };
            }

            var primera = lecturas.First();
            var ultima = lecturas.Last();
            var alertasPendientes = alertas.Count(a => !a.Resuelta);
            var totalAlertas = alertas.Count;

            var temperatura = CalcularSerie(lecturas, l => l.Temperatura);
            var humedad = CalcularSerie(lecturas, l => l.Humedad);
            var suelo = CalcularSerieNullable(lecturas, l => l.HumedadSuelo);
            var luz = CalcularSerieNullable(lecturas, l => l.Luminosidad);
            var aire = CalcularSerieNullable(lecturas, l => l.CalidadAire);

            if (totalAlertas > 0)
            {
                prioridad = alertasPendientes > 0 ? "alta" : "media";
                var tipos = alertas
                    .GroupBy(a => a.TipoAlerta)
                    .OrderByDescending(g => g.Count())
                    .Take(3)
                    .Select(g => $"{g.Key.Replace("_", " ").ToLowerInvariant()} ({g.Count()})");
                hallazgos.Add($"Se registraron {totalAlertas} alertas en el rango; {alertasPendientes} siguen pendientes. Tipos principales: {string.Join(", ", tipos)}.");
                acciones.Add("Revisar primero las alertas pendientes y confirmar condicion fisica del cultivo antes de ajustar actuadores.");
            }
            else
            {
                hallazgos.Add("No se registran alertas en el rango consultado.");
            }

            hallazgos.Add($"Temperatura promedio {temperatura.Promedio:0.0} °C, rango {temperatura.Minimo:0.0} - {temperatura.Maximo:0.0} °C.");
            hallazgos.Add($"Humedad promedio {humedad.Promedio:0.0} %, rango {humedad.Minimo:0.0} - {humedad.Maximo:0.0} %.");

            if (suelo.TieneDatos)
                hallazgos.Add($"Humedad del suelo promedio {suelo.Promedio:0.0} %, con minimo {suelo.Minimo:0.0} %.");

            if (luz.TieneDatos)
                hallazgos.Add($"Luminosidad promedio {luz.Promedio:0.0} lx, maximo {luz.Maximo:0.0} lx.");

            var tendenciaTemp = ultima.Temperatura - primera.Temperatura;
            var tendenciaHum = ultima.Humedad - primera.Humedad;

            if (Math.Abs(tendenciaTemp) >= 1)
                hallazgos.Add($"La temperatura {(tendenciaTemp > 0 ? "subio" : "bajo")} {Math.Abs(tendenciaTemp):0.0} °C entre la primera y la ultima lectura del rango.");

            if (Math.Abs(tendenciaHum) >= 3)
                hallazgos.Add($"La humedad {(tendenciaHum > 0 ? "subio" : "bajo")} {Math.Abs(tendenciaHum):0.0} puntos porcentuales en el rango.");

            if (preguntaNormalizada.Contains("accion") || preguntaNormalizada.Contains("recom") || preguntaNormalizada.Contains("que hago"))
            {
                acciones.Add("Validar sensores con lectura extrema antes de intervenir, especialmente si el valor es 0 o cambia abruptamente.");
                acciones.Add("Si la humedad del suelo permanece baja, hacer prueba fisica del sustrato y revisar cableado/calibracion del sensor.");
                acciones.Add("Si la temperatura cae o sube de forma sostenida, revisar ventilacion, calefaccion o apertura del invernadero.");
            }

            if (preguntaNormalizada.Contains("graf") || preguntaNormalizada.Contains("tendencia") || preguntaNormalizada.Contains("temperatura"))
            {
                acciones.Add("Usar la vista Analitica para comparar el segundo tramo del periodo contra el primero y confirmar si el cambio es sostenido.");
            }

            if (!string.IsNullOrWhiteSpace(variable) && VariableLabels.TryGetValue(variable, out var variableLabel))
                hallazgos.Insert(0, $"Consulta enfocada en {variableLabel}. Los demas valores se usan como contexto operativo.");

            if (lecturas.Count < 5)
                limitaciones.Add("Hay pocas lecturas en el rango; las conclusiones pueden ser inestables.");

            var resumen = totalAlertas > 0
                ? $"El sistema requiere atencion: hay {totalAlertas} alertas en el rango y {lecturas.Count} lecturas analizadas."
                : $"El sistema se mantiene estable en el rango consultado con {lecturas.Count} lecturas analizadas.";

            return new AsistenteRespuestaDto
            {
                Resumen = resumen,
                Prioridad = prioridad,
                Hallazgos = hallazgos.Take(7).ToList(),
                Acciones = acciones.Distinct().Take(5).ToList(),
                Limitaciones = limitaciones,
                Contexto = new
                {
                    invernadero,
                    desde,
                    hasta,
                    totalLecturas = lecturas.Count,
                    totalAlertas,
                    alertasPendientes,
                    ultimaLectura = ultima.FechaHora,
                    promedios = new
                    {
                        temperatura = temperatura.Promedio,
                        humedad = humedad.Promedio,
                        humedadSuelo = suelo.Promedio,
                        luminosidad = luz.Promedio,
                        calidadAire = aire.Promedio
                    },
                    umbrales
                }
            };
        }

        private static SerieResumen CalcularSerie(List<Models.Lectura> lecturas, Func<Models.Lectura, decimal> selector)
        {
            var valores = lecturas.Select(selector).ToList();
            return new SerieResumen(true, valores.Average(), valores.Min(), valores.Max());
        }

        private static SerieResumen CalcularSerieNullable(List<Models.Lectura> lecturas, Func<Models.Lectura, decimal?> selector)
        {
            var valores = lecturas.Select(selector).Where(v => v.HasValue).Select(v => v!.Value).ToList();
            return valores.Any()
                ? new SerieResumen(true, valores.Average(), valores.Min(), valores.Max())
                : new SerieResumen(false, null, null, null);
        }

        private record SerieResumen(bool TieneDatos, decimal? Promedio, decimal? Minimo, decimal? Maximo);
    }
}
