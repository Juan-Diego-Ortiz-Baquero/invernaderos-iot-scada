using System.Globalization;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using InvernaderosAPI.Data;
using InvernaderosAPI.DTOs;
using InvernaderosAPI.Models;

namespace InvernaderosAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class AsistenteController : ControllerBase
    {
        private readonly AppDbContext _db;

        private enum IntencionConsulta
        {
            Resumen,
            VariablesFueraDeRango,
            Acciones,
            TendenciaTemperatura,
            TendenciaGeneral,
            ComparacionPeriodos,
            ConteoLecturas
        }

        private static readonly Dictionary<string, VariableObjetivo> Variables = new(StringComparer.OrdinalIgnoreCase)
        {
            ["temperature"] = new("temperature", "temperatura", "C", new[]
            {
                "temperatura", "temp", "grados", "calor", "frio", "fria", "caliente"
            }),
            ["humidity"] = new("humidity", "humedad del aire", "%", new[]
            {
                "humedad", "humedad aire", "humedad del aire", "ambiente", "humedad ambiental", "hum"
            }),
            ["soil"] = new("soil", "humedad del suelo", "%", new[]
            {
                "suelo", "tierra", "sustrato", "maceta", "humedad suelo", "humedad del suelo", "sensor de suelo"
            }),
            ["light"] = new("light", "luminosidad", "lx", new[]
            {
                "luz", "luminosidad", "iluminacion", "lux", "lx", "radiacion"
            }),
            ["air"] = new("air", "calidad del aire", "ppm", new[]
            {
                "aire", "gas", "gases", "calidad aire", "calidad del aire", "ppm", "humo", "co2"
            })
        };

        public AsistenteController(AppDbContext db)
        {
            _db = db;
        }

        [HttpPost("{idInvernadero}/consultar")]
        public async Task<ActionResult<AsistenteRespuestaDto>> Consultar(int idInvernadero, [FromBody] AsistenteConsultaDto dto)
        {
            var preguntaNormalizada = Normalizar(dto.Pregunta);
            var rango = InterpretarRangoTemporal(preguntaNormalizada, dto.Desde, dto.Hasta);

            if (rango.Desde >= rango.Hasta)
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
                .Where(l => l.IdInvernadero == idInvernadero && l.FechaHora >= rango.Desde && l.FechaHora <= rango.Hasta)
                .OrderBy(l => l.FechaHora)
                .ToListAsync();

            var alertas = await _db.Alertas
                .AsNoTracking()
                .Where(a => a.IdInvernadero == idInvernadero && a.FechaHora >= rango.Desde && a.FechaHora <= rango.Hasta)
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

            var respuesta = Analizar(
                dto.Pregunta,
                preguntaNormalizada,
                dto.Variable,
                rango,
                invernadero,
                lecturas,
                alertas,
                umbrales);

            return Ok(respuesta);
        }

        private static AsistenteRespuestaDto Analizar(
            string preguntaOriginal,
            string preguntaNormalizada,
            string? variableSolicitada,
            RangoInterpretado rango,
            object invernadero,
            List<Lectura> lecturas,
            List<Alerta> alertas,
            IEnumerable<object> umbrales)
        {
            var intencion = DetectarIntencion(preguntaNormalizada);
            var variableObjetivo = DetectarVariableObjetivo(preguntaNormalizada, variableSolicitada);
            var hallazgos = new List<string>();
            var acciones = new List<string>();
            var limitaciones = new List<string>();
            var prioridad = "normal";

            if (!lecturas.Any())
            {
                return new AsistenteRespuestaDto
                {
                    Prioridad = "sin-datos",
                    Resumen = $"No hay lecturas disponibles para {rango.Etiqueta}.",
                    Limitaciones = new List<string>
                    {
                        "Amplia el rango temporal o verifica que el ESP32 este enviando datos."
                    },
                    Contexto = CrearContexto(invernadero, rango, intencion, variableObjetivo, lecturas.Count, alertas.Count, 0, null, umbrales)
                };
            }

            var primera = lecturas.First();
            var ultima = lecturas.Last();
            var totalAlertas = alertas.Count;
            var alertasPendientes = alertas.Count(a => !a.Resuelta);
            var alertasFiltradas = FiltrarAlertasPorVariable(alertas, variableObjetivo).ToList();
            var tiposAlerta = alertasFiltradas.Any() ? ResumirTiposAlerta(alertasFiltradas) : ResumirTiposAlerta(alertas);
            var series = CalcularSeries(lecturas);
            var serieObjetivo = variableObjetivo != null
                ? series.GetValueOrDefault(variableObjetivo.Key)
                : null;

            if (totalAlertas > 0)
                prioridad = alertasPendientes > 0 ? "alta" : "media";

            switch (intencion)
            {
                case IntencionConsulta.VariablesFueraDeRango:
                    AnalizarVariablesFueraDeRango(alertasFiltradas.Any() || variableObjetivo != null ? alertasFiltradas : alertas, variableObjetivo, hallazgos, acciones);
                    break;

                case IntencionConsulta.Acciones:
                    AnalizarAcciones(alertas, alertasPendientes, ultima, hallazgos, acciones);
                    prioridad = totalAlertas > 0 ? "alta" : "media";
                    break;

                case IntencionConsulta.TendenciaTemperatura:
                    AnalizarTendencia(lecturas, Variables["temperature"], series["temperature"], hallazgos, acciones);
                    break;

                case IntencionConsulta.TendenciaGeneral:
                    if (variableObjetivo != null && serieObjetivo != null)
                        AnalizarTendencia(lecturas, variableObjetivo, serieObjetivo, hallazgos, acciones);
                    else
                        AnalizarTendenciaGeneral(lecturas, series, totalAlertas, alertasPendientes, tiposAlerta, hallazgos, acciones);
                    break;

                case IntencionConsulta.ComparacionPeriodos:
                    AnalizarComparacion(lecturas, variableObjetivo, series, hallazgos, acciones, limitaciones);
                    break;

                case IntencionConsulta.ConteoLecturas:
                    hallazgos.Add($"Se encontraron {lecturas.Count} lecturas en {rango.Etiqueta}.");
                    hallazgos.Add($"La primera lectura fue a las {primera.FechaHora:dd/MM/yy HH:mm} y la ultima a las {ultima.FechaHora:dd/MM/yy HH:mm}.");
                    hallazgos.Add(totalAlertas > 0
                        ? $"En el mismo rango se registraron {totalAlertas} alertas, de las cuales {alertasPendientes} siguen pendientes."
                        : "En el mismo rango no se registraron alertas.");
                    break;

                default:
                    AnalizarResumen(lecturas, series, totalAlertas, alertasPendientes, tiposAlerta, variableObjetivo, hallazgos, acciones);
                    break;
            }

            if (lecturas.Count < 5)
                limitaciones.Add("Hay pocas lecturas en el rango; las conclusiones pueden ser inestables.");

            if (variableObjetivo != null && intencion is not IntencionConsulta.VariablesFueraDeRango and not IntencionConsulta.TendenciaTemperatura)
                hallazgos.Insert(0, $"Consulta enfocada en {variableObjetivo.Label}; las demas variables se usan solo como contexto.");

            var resumen = ConstruirResumen(intencion, variableObjetivo, rango, lecturas.Count, totalAlertas, alertasPendientes, hallazgos);

            return new AsistenteRespuestaDto
            {
                Resumen = resumen,
                Prioridad = prioridad,
                Hallazgos = hallazgos.Distinct().Take(8).ToList(),
                Acciones = acciones.Distinct().Take(6).ToList(),
                Limitaciones = limitaciones.Distinct().Take(4).ToList(),
                Contexto = CrearContexto(
                    invernadero,
                    rango,
                    intencion,
                    variableObjetivo,
                    lecturas.Count,
                    totalAlertas,
                    alertasPendientes,
                    ultima.FechaHora,
                    umbrales,
                    series)
            };
        }

        private static void AnalizarResumen(
            List<Lectura> lecturas,
            Dictionary<string, SerieResumen> series,
            int totalAlertas,
            int alertasPendientes,
            List<string> tiposAlerta,
            VariableObjetivo? variableObjetivo,
            List<string> hallazgos,
            List<string> acciones)
        {
            if (totalAlertas > 0)
                hallazgos.Add($"Se registraron {totalAlertas} alertas; {alertasPendientes} siguen pendientes. Tipos principales: {string.Join(", ", tiposAlerta)}.");
            else
                hallazgos.Add("No se registran alertas en el rango consultado.");

            if (variableObjetivo != null && series.TryGetValue(variableObjetivo.Key, out var serie))
            {
                hallazgos.Add(FormatearSerie(variableObjetivo, serie));
            }
            else
            {
                hallazgos.Add(FormatearSerie(Variables["temperature"], series["temperature"]));
                hallazgos.Add(FormatearSerie(Variables["humidity"], series["humidity"]));

                if (series["soil"].TieneDatos)
                    hallazgos.Add(FormatearSerie(Variables["soil"], series["soil"]));
            }

            var tendenciaTemperatura = CalcularVariacion(lecturas, Variables["temperature"]);
            if (Math.Abs(tendenciaTemperatura) >= 1)
                hallazgos.Add($"La temperatura {FormatearDireccion(tendenciaTemperatura)} {Math.Abs(tendenciaTemperatura):0.0} C entre la primera y la ultima lectura.");

            if (totalAlertas > 0)
                acciones.Add("Revisar primero las alertas pendientes y confirmar la condicion fisica del cultivo antes de ajustar actuadores.");
        }

        private static void AnalizarVariablesFueraDeRango(
            List<Alerta> alertas,
            VariableObjetivo? variableObjetivo,
            List<string> hallazgos,
            List<string> acciones)
        {
            if (!alertas.Any())
            {
                hallazgos.Add(variableObjetivo == null
                    ? "No se detectaron variables fuera de rango en el periodo consultado."
                    : $"No se detectaron alertas para {variableObjetivo.Label} en el periodo consultado.");
                return;
            }

            var pendientes = alertas.Count(a => !a.Resuelta);
            var grupos = alertas
                .GroupBy(a => a.TipoAlerta)
                .OrderByDescending(g => g.Count())
                .Select(g =>
                {
                    var ultima = g.OrderByDescending(a => a.FechaHora).First();
                    return $"{FormatearTipoAlerta(g.Key)}: {g.Count()} evento(s), ultimo valor {ultima.ValorDetectado:0.##} a las {ultima.FechaHora:dd/MM/yy HH:mm}";
                })
                .ToList();

            hallazgos.Add(variableObjetivo == null
                ? $"Se detectaron {alertas.Count} alertas fuera de rango; {pendientes} siguen pendientes."
                : $"Para {variableObjetivo.Label} se detectaron {alertas.Count} alertas; {pendientes} siguen pendientes.");
            hallazgos.AddRange(grupos);
            acciones.Add("Atender primero las alertas pendientes y verificar si el valor coincide con la condicion fisica real.");
            acciones.Add("Si el valor reportado es 0, revisar alimentacion, cableado y calibracion del sensor antes de tomar decisiones sobre el cultivo.");
        }

        private static void AnalizarAcciones(
            List<Alerta> alertas,
            int alertasPendientes,
            Lectura ultima,
            List<string> hallazgos,
            List<string> acciones)
        {
            if (!alertas.Any())
            {
                hallazgos.Add($"No hay alertas en el rango. Ultima lectura: {ultima.Temperatura:0.0} C, {ultima.Humedad:0.0} % de humedad del aire.");
                acciones.Add("Mantener monitoreo y revisar el historial si aparece una desviacion sostenida.");
                return;
            }

            hallazgos.Add($"Hay {alertas.Count} alertas en el rango y {alertasPendientes} pendientes por resolver.");

            if (alertas.Any(a => a.TipoAlerta.Contains("HUM", StringComparison.OrdinalIgnoreCase)))
                acciones.Add("Para humedad fuera de rango: confirmar humedad real del ambiente/sustrato, revisar riego y validar calibracion del sensor.");

            if (alertas.Any(a => a.TipoAlerta.Contains("TEMP", StringComparison.OrdinalIgnoreCase)))
                acciones.Add("Para temperatura fuera de rango: revisar ventilacion, apertura del invernadero y fuentes de calor/frio antes de modificar umbrales.");

            if (ultima.HumedadSuelo.HasValue && ultima.HumedadSuelo.Value <= 5)
                acciones.Add("La humedad del suelo esta cerca de 0; si no hay maceta conectada, registrar la lectura como prueba de sensor y no como riesgo real del cultivo.");

            acciones.Add("Resolver o documentar las alertas despues de confirmar causa fisica para que el historial no mezcle pruebas con incidentes reales.");
        }

        private static void AnalizarTendencia(
            List<Lectura> lecturas,
            VariableObjetivo variable,
            SerieResumen serie,
            List<string> hallazgos,
            List<string> acciones)
        {
            if (!serie.TieneDatos)
            {
                hallazgos.Add($"No hay suficientes datos de {variable.Label} para calcular tendencia.");
                return;
            }

            var variacion = CalcularVariacion(lecturas, variable);
            var direccion = Math.Abs(variacion) < 0.5m ? "estable" : variacion > 0 ? "al alza" : "a la baja";

            hallazgos.Add($"{variable.Label} estuvo {direccion}: promedio {serie.Promedio:0.0} {variable.Unidad}, minimo {serie.Minimo:0.0} y maximo {serie.Maximo:0.0}.");
            hallazgos.Add($"Entre la primera y la ultima lectura cambio {Math.Abs(variacion):0.0} {variable.Unidad}.");
            acciones.Add("Cruzar esta tendencia con alertas y con el estado fisico del invernadero antes de ajustar actuadores o umbrales.");
        }

        private static void AnalizarTendenciaGeneral(
            List<Lectura> lecturas,
            Dictionary<string, SerieResumen> series,
            int totalAlertas,
            int alertasPendientes,
            List<string> tiposAlerta,
            List<string> hallazgos,
            List<string> acciones)
        {
            hallazgos.Add(totalAlertas > 0
                ? $"La tendencia tiene {totalAlertas} alertas asociadas; {alertasPendientes} pendientes. Tipos principales: {string.Join(", ", tiposAlerta)}."
                : "La tendencia no tiene alertas registradas en el rango.");

            hallazgos.Add(FormatearSerie(Variables["temperature"], series["temperature"]));
            hallazgos.Add(FormatearSerie(Variables["humidity"], series["humidity"]));

            if (series["soil"].TieneDatos)
                hallazgos.Add(FormatearSerie(Variables["soil"], series["soil"]));

            if (series["light"].TieneDatos)
                hallazgos.Add(FormatearSerie(Variables["light"], series["light"]));

            var temp = CalcularVariacion(lecturas, Variables["temperature"]);
            var hum = CalcularVariacion(lecturas, Variables["humidity"]);
            hallazgos.Add($"Direccion general: temperatura {FormatearDireccionCorta(temp)} y humedad {FormatearDireccionCorta(hum)}.");
            acciones.Add("Usar el historiador para confirmar si el cambio se sostiene por varias horas o solo fue un pico puntual.");
        }

        private static void AnalizarComparacion(
            List<Lectura> lecturas,
            VariableObjetivo? variableObjetivo,
            Dictionary<string, SerieResumen> series,
            List<string> hallazgos,
            List<string> acciones,
            List<string> limitaciones)
        {
            var variable = variableObjetivo ?? Variables["temperature"];
            List<Lectura> primerTramo;
            List<Lectura> segundoTramo;
            var fechas = lecturas
                .Select(l => l.FechaHora.Date)
                .Distinct()
                .OrderBy(f => f)
                .ToList();

            if (fechas.Count >= 2)
            {
                primerTramo = lecturas.Where(l => l.FechaHora.Date == fechas[^2]).ToList();
                segundoTramo = lecturas.Where(l => l.FechaHora.Date == fechas[^1]).ToList();
            }
            else
            {
                var mitad = lecturas.Count / 2;
                primerTramo = lecturas.Take(mitad).ToList();
                segundoTramo = lecturas.Skip(mitad).ToList();
            }

            if (primerTramo.Count < 2 || segundoTramo.Count < 2)
            {
                limitaciones.Add("No hay suficientes lecturas para comparar dos periodos dentro del rango.");
                return;
            }

            var seriePrimera = CalcularSeriePorVariable(primerTramo, variable);
            var serieSegunda = CalcularSeriePorVariable(segundoTramo, variable);

            if (!seriePrimera.TieneDatos || !serieSegunda.TieneDatos)
            {
                hallazgos.Add($"No hay datos suficientes de {variable.Label} para comparar ambos tramos.");
                return;
            }

            var diferencia = (serieSegunda.Promedio ?? 0) - (seriePrimera.Promedio ?? 0);
            var etiquetaPrimera = fechas.Count >= 2 ? fechas[^2].ToString("dd/MM/yy") : "primer tramo";
            var etiquetaSegunda = fechas.Count >= 2 ? fechas[^1].ToString("dd/MM/yy") : "segundo tramo";
            hallazgos.Add($"Comparacion de {variable.Label}: {etiquetaPrimera} {seriePrimera.Promedio:0.0} {variable.Unidad}, {etiquetaSegunda} {serieSegunda.Promedio:0.0} {variable.Unidad}.");
            hallazgos.Add($"El segundo tramo quedo {FormatearDireccion(diferencia)} {Math.Abs(diferencia):0.0} {variable.Unidad} frente al primero.");

            if (variableObjetivo == null && series["humidity"].TieneDatos)
                hallazgos.Add(FormatearSerie(Variables["humidity"], series["humidity"]));

            acciones.Add("Si la diferencia coincide con cambios operativos, revisar riego, ventilacion o apertura del invernadero en ese horario.");
        }

        private static string ConstruirResumen(
            IntencionConsulta intencion,
            VariableObjetivo? variable,
            RangoInterpretado rango,
            int totalLecturas,
            int totalAlertas,
            int alertasPendientes,
            List<string> hallazgos)
        {
            return intencion switch
            {
                IntencionConsulta.VariablesFueraDeRango => totalAlertas > 0
                    ? $"Variables fuera de rango detectadas en {rango.Etiqueta}: {totalAlertas} alertas, {alertasPendientes} pendientes."
                    : $"No se detectaron variables fuera de rango en {rango.Etiqueta}.",
                IntencionConsulta.Acciones => totalAlertas > 0
                    ? $"Acciones recomendadas priorizadas por {totalAlertas} alertas en {rango.Etiqueta}."
                    : $"No hay alertas en {rango.Etiqueta}; las acciones son preventivas.",
                IntencionConsulta.TendenciaTemperatura => $"Tendencia de temperatura calculada con {totalLecturas} lecturas en {rango.Etiqueta}.",
                IntencionConsulta.TendenciaGeneral => variable == null
                    ? $"Tendencia general calculada con {totalLecturas} lecturas en {rango.Etiqueta}."
                    : $"Tendencia de {variable.Label} calculada con {totalLecturas} lecturas en {rango.Etiqueta}.",
                IntencionConsulta.ComparacionPeriodos => $"Comparacion entre tramos calculada con {totalLecturas} lecturas en {rango.Etiqueta}.",
                IntencionConsulta.ConteoLecturas => $"Se encontraron {totalLecturas} lecturas en {rango.Etiqueta}.",
                _ => totalAlertas > 0
                    ? $"Resumen operativo: {totalAlertas} alertas y {totalLecturas} lecturas en {rango.Etiqueta}."
                    : $"Resumen operativo estable: {totalLecturas} lecturas sin alertas en {rango.Etiqueta}."
            };
        }

        private static Dictionary<string, SerieResumen> CalcularSeries(List<Lectura> lecturas)
        {
            return Variables.ToDictionary(
                entry => entry.Key,
                entry => CalcularSeriePorVariable(lecturas, entry.Value),
                StringComparer.OrdinalIgnoreCase);
        }

        private static SerieResumen CalcularSeriePorVariable(List<Lectura> lecturas, VariableObjetivo variable)
        {
            var valores = lecturas
                .Select(l => ObtenerValorLectura(l, variable.Key))
                .Where(v => v.HasValue)
                .Select(v => v!.Value)
                .ToList();

            return valores.Any()
                ? new SerieResumen(true, valores.Average(), valores.Min(), valores.Max())
                : new SerieResumen(false, null, null, null);
        }

        private static decimal CalcularVariacion(List<Lectura> lecturas, VariableObjetivo variable)
        {
            var primera = lecturas.Select(l => ObtenerValorLectura(l, variable.Key)).FirstOrDefault(v => v.HasValue);
            var ultima = lecturas.Select(l => ObtenerValorLectura(l, variable.Key)).LastOrDefault(v => v.HasValue);

            if (!primera.HasValue || !ultima.HasValue)
                return 0;

            return ultima.Value - primera.Value;
        }

        private static decimal? ObtenerValorLectura(Lectura lectura, string variableKey)
        {
            return variableKey switch
            {
                "temperature" => lectura.Temperatura,
                "humidity" => lectura.Humedad,
                "soil" => lectura.HumedadSuelo,
                "light" => lectura.Luminosidad,
                "air" => lectura.CalidadAire,
                _ => null
            };
        }

        private static string FormatearSerie(VariableObjetivo variable, SerieResumen serie)
        {
            return serie.TieneDatos
                ? $"{variable.Label}: promedio {serie.Promedio:0.0} {variable.Unidad}, rango {serie.Minimo:0.0} - {serie.Maximo:0.0} {variable.Unidad}."
                : $"{variable.Label}: sin datos suficientes en el rango.";
        }

        private static List<string> ResumirTiposAlerta(List<Alerta> alertas)
        {
            return alertas
                .GroupBy(a => a.TipoAlerta)
                .OrderByDescending(g => g.Count())
                .Take(4)
                .Select(g => $"{FormatearTipoAlerta(g.Key)} ({g.Count()})")
                .ToList();
        }

        private static IEnumerable<Alerta> FiltrarAlertasPorVariable(List<Alerta> alertas, VariableObjetivo? variable)
        {
            if (variable == null)
                return alertas;

            return alertas.Where(a => AlertaCorrespondeVariable(a.TipoAlerta, variable.Key));
        }

        private static bool AlertaCorrespondeVariable(string tipoAlerta, string variableKey)
        {
            var tipo = Normalizar(tipoAlerta);
            return variableKey switch
            {
                "temperature" => tipo.Contains("temp"),
                "humidity" => tipo.Contains("hum") && !tipo.Contains("suelo"),
                "soil" => tipo.Contains("suelo") || tipo.Contains("sustrato"),
                "light" => tipo.Contains("luz") || tipo.Contains("lum"),
                "air" => tipo.Contains("aire") || tipo.Contains("gas"),
                _ => false
            };
        }

        private static IntencionConsulta DetectarIntencion(string pregunta)
        {
            if (ContieneAlguna(pregunta, "cuantas lecturas", "numero de lecturas", "total de lecturas", "lecturas tuvimos"))
                return IntencionConsulta.ConteoLecturas;

            if (ContieneAlguna(pregunta, "acciones", "accion", "recomiendas", "recomendacion", "que hago", "que deberia", "sugerencia"))
                return IntencionConsulta.Acciones;

            if (ContieneAlguna(pregunta, "fuera de rango", "fuera rango", "variables criticas", "variables estan mal", "alertas activas", "alertas criticas"))
                return IntencionConsulta.VariablesFueraDeRango;

            if (ContieneAlguna(pregunta, "compar", "contra", "versus", "vs", "diferencia entre"))
                return IntencionConsulta.ComparacionPeriodos;

            if (ContieneAlguna(pregunta, "temperatura", "temp") && ContieneAlguna(pregunta, "tendencia", "comport", "subio", "bajo", "evolucion"))
                return IntencionConsulta.TendenciaTemperatura;

            if (ContieneAlguna(pregunta, "tendencia", "grafica", "grafico", "evolucion", "comportamiento", "como va", "como estuvo"))
                return IntencionConsulta.TendenciaGeneral;

            return IntencionConsulta.Resumen;
        }

        private static VariableObjetivo? DetectarVariableObjetivo(string pregunta, string? variable)
        {
            if (!string.IsNullOrWhiteSpace(variable) && Variables.TryGetValue(variable, out var variableDesdeFiltro))
                return variableDesdeFiltro;

            return Variables.Values
                .SelectMany(v => v.Sinonimos.Select(s => new { Variable = v, Sinonimo = Normalizar(s) }))
                .Where(match => pregunta.Contains(match.Sinonimo))
                .OrderByDescending(match => match.Sinonimo.Length)
                .Select(match => match.Variable)
                .FirstOrDefault();
        }

        private static RangoInterpretado InterpretarRangoTemporal(string pregunta, DateTime? desdeDto, DateTime? hastaDto)
        {
            var ahora = ObtenerAhoraBogota();
            var hoy = ahora.Date;

            if (ContieneAlguna(pregunta, "compar", "contra", "versus", "vs") && pregunta.Contains("hoy") && pregunta.Contains("ayer"))
                return new RangoInterpretado(hoy.AddDays(-1), ahora, "hoy frente a ayer", true);

            if (pregunta.Contains("ayer"))
                return new RangoInterpretado(hoy.AddDays(-1), hoy.AddSeconds(-1), "ayer", true);

            var ultimasHoras = ExtraerUltimasHoras(pregunta);
            if (ultimasHoras.HasValue)
                return new RangoInterpretado(ahora.AddHours(-(double)ultimasHoras.Value), ahora, $"ultimas {ultimasHoras.Value:0.#} horas", true);

            if (ContieneAlguna(pregunta, "esta semana", "semana actual"))
            {
                var diferenciaLunes = ((int)hoy.DayOfWeek + 6) % 7;
                return new RangoInterpretado(hoy.AddDays(-diferenciaLunes), ahora, "esta semana", true);
            }

            if (ContieneAlguna(pregunta, "este mes", "mes actual"))
                return new RangoInterpretado(new DateTime(hoy.Year, hoy.Month, 1), ahora, "este mes", true);

            if (ContieneAlguna(pregunta, "manana", "mañana"))
                return CrearRangoDelDia(hoy, ahora, 6, 12, "la manana de hoy");

            if (pregunta.Contains("tarde"))
                return CrearRangoDelDia(hoy, ahora, 12, 18, "la tarde de hoy");

            if (pregunta.Contains("noche"))
                return CrearRangoDelDia(hoy, ahora, 18, 24, "la noche de hoy");

            if (pregunta.Contains("hoy"))
            {
                var desdeHora = ExtraerHoraDesde(pregunta);
                if (desdeHora.HasValue)
                    return new RangoInterpretado(hoy.AddHours(desdeHora.Value), ahora, $"hoy desde las {desdeHora.Value:00}:00", true);

                return new RangoInterpretado(hoy, ahora, "hoy", true);
            }

            if (desdeDto.HasValue && hastaDto.HasValue)
                return new RangoInterpretado(NormalizarFechaEntrada(desdeDto.Value), NormalizarFechaEntrada(hastaDto.Value), "rango seleccionado", false);

            return new RangoInterpretado(ahora.AddHours(-24), ahora, "ultimas 24 horas", false);
        }

        private static RangoInterpretado CrearRangoDelDia(DateTime dia, DateTime ahora, int horaInicio, int horaFin, string etiqueta)
        {
            var desde = dia.AddHours(horaInicio);
            var hasta = horaFin >= 24 ? dia.AddDays(1).AddSeconds(-1) : dia.AddHours(horaFin);

            if (hasta > ahora)
                hasta = ahora;

            if (desde >= hasta)
                desde = hasta.AddHours(-Math.Min(6, Math.Max(1, horaFin - horaInicio)));

            return new RangoInterpretado(desde, hasta, etiqueta, true);
        }

        private static decimal? ExtraerUltimasHoras(string pregunta)
        {
            var palabras = pregunta.Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

            for (var i = 0; i < palabras.Length; i++)
            {
                if (!decimal.TryParse(palabras[i], NumberStyles.Number, CultureInfo.InvariantCulture, out var numero))
                    continue;

                var siguiente = i + 1 < palabras.Length ? palabras[i + 1] : string.Empty;
                if (siguiente.StartsWith("hora", StringComparison.OrdinalIgnoreCase))
                    return Math.Clamp(numero, 1, 24 * 31);
            }

            if (ContieneAlguna(pregunta, "ultimas 24 horas", "ultima 24 horas"))
                return 24;

            return null;
        }

        private static int? ExtraerHoraDesde(string pregunta)
        {
            var indice = pregunta.IndexOf("desde", StringComparison.OrdinalIgnoreCase);
            if (indice < 0)
                return null;

            var fragmento = pregunta[indice..];
            var tokens = fragmento.Split(' ', ':', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            foreach (var token in tokens)
            {
                if (int.TryParse(token, out var hora) && hora is >= 0 and <= 23)
                    return hora;
            }

            return null;
        }

        private static DateTime NormalizarFechaEntrada(DateTime fecha)
        {
            return fecha.Kind == DateTimeKind.Utc ? fecha.ToLocalTime() : DateTime.SpecifyKind(fecha, DateTimeKind.Unspecified);
        }

        private static DateTime ObtenerAhoraBogota()
        {
            try
            {
                var zona = TimeZoneInfo.FindSystemTimeZoneById("America/Bogota");
                return TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, zona);
            }
            catch (TimeZoneNotFoundException)
            {
                var zona = TimeZoneInfo.FindSystemTimeZoneById("SA Pacific Standard Time");
                return TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, zona);
            }
        }

        private static string FormatearTipoAlerta(string tipoAlerta)
        {
            return tipoAlerta switch
            {
                "TEMP_BAJA" => "temperatura baja",
                "TEMP_ALTA" => "temperatura alta",
                "HUM_BAJA" => "humedad baja",
                "HUM_ALTA" => "humedad alta",
                _ => tipoAlerta.Replace("_", " ").ToLowerInvariant()
            };
        }

        private static string FormatearDireccion(decimal diferencia)
        {
            if (Math.Abs(diferencia) < 0.5m)
                return "sin cambio relevante";

            return diferencia > 0 ? "por encima en" : "por debajo en";
        }

        private static string FormatearDireccionCorta(decimal diferencia)
        {
            if (Math.Abs(diferencia) < 0.5m)
                return "estable";

            return diferencia > 0 ? "al alza" : "a la baja";
        }

        private static bool ContieneAlguna(string texto, params string[] opciones)
        {
            return opciones.Any(opcion => texto.Contains(Normalizar(opcion), StringComparison.OrdinalIgnoreCase));
        }

        private static string Normalizar(string texto)
        {
            if (string.IsNullOrWhiteSpace(texto))
                return string.Empty;

            var normalized = texto.Normalize(NormalizationForm.FormD);
            var builder = new StringBuilder(capacity: normalized.Length);

            foreach (var caracter in normalized)
            {
                if (CharUnicodeInfo.GetUnicodeCategory(caracter) != UnicodeCategory.NonSpacingMark)
                    builder.Append(char.ToLowerInvariant(caracter));
            }

            return builder.ToString().Normalize(NormalizationForm.FormC);
        }

        private static object CrearContexto(
            object invernadero,
            RangoInterpretado rango,
            IntencionConsulta intencion,
            VariableObjetivo? variable,
            int totalLecturas,
            int totalAlertas,
            int alertasPendientes,
            DateTime? ultimaLectura,
            IEnumerable<object> umbrales,
            Dictionary<string, SerieResumen>? series = null)
        {
            return new
            {
                invernadero,
                desde = rango.Desde,
                hasta = rango.Hasta,
                rango = rango.Etiqueta,
                rangoInferidoDesdePregunta = rango.InferidoDesdePregunta,
                intencion = intencion.ToString(),
                variable = variable?.Key,
                variableLabel = variable?.Label,
                totalLecturas,
                totalAlertas,
                alertasPendientes,
                ultimaLectura,
                promedios = series?.ToDictionary(entry => entry.Key, entry => entry.Value.Promedio),
                umbrales
            };
        }

        private record VariableObjetivo(string Key, string Label, string Unidad, string[] Sinonimos);

        private record RangoInterpretado(DateTime Desde, DateTime Hasta, string Etiqueta, bool InferidoDesdePregunta);

        private record SerieResumen(bool TieneDatos, decimal? Promedio, decimal? Minimo, decimal? Maximo);
    }
}
