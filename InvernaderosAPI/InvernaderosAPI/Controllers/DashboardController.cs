using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using InvernaderosAPI.Data;
using InvernaderosAPI.DTOs;

namespace InvernaderosAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class DashboardController : ControllerBase
    {
        private readonly AppDbContext _db;

        public DashboardController(AppDbContext db)
        {
            _db = db;
        }

        // ── GET /api/dashboard/{idInvernadero} ────────────────
        // Resumen general para las tarjetas del dashboard
        [HttpGet("{idInvernadero}")]
        public async Task<IActionResult> ObtenerResumen(int idInvernadero)
        {
            var hoy = DateTime.Today;

            // Última lectura
            var ultima = await _db.Lecturas
                .Where(l => l.IdInvernadero == idInvernadero)
                .OrderByDescending(l => l.FechaHora)
                .FirstOrDefaultAsync();

            if (ultima == null)
                return NotFound(new { mensaje = "No hay lecturas para este invernadero" });

            // Total alertas hoy
            var alertasHoy = await _db.Alertas
                .Where(a => a.IdInvernadero == idInvernadero
                         && a.FechaHora >= hoy)
                .CountAsync();

            // Total lecturas hoy
            var lecturasHoy = await _db.Lecturas
                .Where(l => l.IdInvernadero == idInvernadero
                         && l.FechaHora >= hoy)
                .CountAsync();

            // Sistema activo si hay lectura en los últimos 5 minutos
            var sistemaActivo = ultima.FechaHora >= DateTime.Now.AddMinutes(-5);

            return Ok(new DashboardDto
            {
                UltimaTemperatura = ultima.Temperatura,
                UltimaHumedad = ultima.Humedad,
                UltimaLuminosidad = ultima.Luminosidad,
                UltimaCalidadAire = ultima.CalidadAire,
                UltimaHumedadSuelo = ultima.HumedadSuelo,
                UltimaLectura = ultima.FechaHora,
                TotalAlertasHoy = alertasHoy,
                TotalLecturasHoy = lecturasHoy,
                SistemaActivo = sistemaActivo
            });
        }

        // ── GET /api/dashboard/{idInvernadero}/alertas ────────
        // Alertas del invernadero
        [HttpGet("{idInvernadero}/alertas")]
        public async Task<IActionResult> ObtenerAlertas(
            int idInvernadero,
            [FromQuery] int limite = 50,
            [FromQuery] bool soloPendientes = false)
        {
            var cantidad = Math.Clamp(limite, 1, 500);

            var consulta = _db.Alertas
                .Include(a => a.Invernadero)
                .Where(a => a.IdInvernadero == idInvernadero);

            if (soloPendientes)
                consulta = consulta.Where(a => !a.Resuelta);

            var alertas = await consulta
                .OrderByDescending(a => a.FechaHora)
                .Take(cantidad)
                .Select(a => new AlertaResponseDto
                {
                    IdAlerta = a.IdAlerta,
                    TipoAlerta = a.TipoAlerta,
                    Mensaje = a.Mensaje,
                    ValorDetectado = a.ValorDetectado,
                    FechaHora = a.FechaHora,
                    Resuelta = a.Resuelta,
                    NombreInvernadero = a.Invernadero!.Nombre
                })
                .ToListAsync();

            return Ok(alertas);
        }

        // ── PUT /api/dashboard/alertas/{idAlerta}/resolver ────
        // Marcar una alerta como resuelta
        [HttpPut("alertas/{idAlerta}/resolver")]
        public async Task<IActionResult> ResolverAlerta(int idAlerta)
        {
            var alerta = await _db.Alertas.FindAsync(idAlerta);

            if (alerta == null)
                return NotFound(new { mensaje = "Alerta no encontrada" });

            alerta.Resuelta = true;
            await _db.SaveChangesAsync();

            return Ok(new { mensaje = "Alerta marcada como resuelta" });
        }

        // ── PUT /api/dashboard/{idInvernadero}/alertas/resolver-pendientes
        [HttpPut("{idInvernadero}/alertas/resolver-pendientes")]
        public async Task<IActionResult> ResolverAlertasPendientes(int idInvernadero)
        {
            var alertasPendientes = await _db.Alertas
                .Where(a => a.IdInvernadero == idInvernadero && !a.Resuelta)
                .ToListAsync();

            foreach (var alerta in alertasPendientes)
            {
                alerta.Resuelta = true;
            }

            await _db.SaveChangesAsync();

            return Ok(new
            {
                mensaje = "Alertas pendientes marcadas como resueltas",
                totalResueltas = alertasPendientes.Count
            });
        }

        // ── GET /api/dashboard/{idInvernadero}/estadisticas ───
        // Promedios del día para gráficas
        [HttpGet("{idInvernadero}/estadisticas")]
        public async Task<IActionResult> ObtenerEstadisticas(int idInvernadero)
        {
            var hoy = DateTime.Today;

            var stats = await _db.Lecturas
                .Where(l => l.IdInvernadero == idInvernadero
                         && l.FechaHora >= hoy)
                .GroupBy(l => l.FechaHora.Hour)
                .Select(g => new
                {
                    Hora = g.Key,
                    TempPromedio = g.Average(l => l.Temperatura),
                    HumedadPromedio = g.Average(l => l.Humedad),
                    LuminosidadProm = g.Average(l => l.Luminosidad),
                    HumedadSueloProm = g.Average(l => l.HumedadSuelo),
                    TotalLecturas = g.Count()
                })
                .OrderBy(g => g.Hora)
                .ToListAsync();

            return Ok(stats);
        }
    }
}
