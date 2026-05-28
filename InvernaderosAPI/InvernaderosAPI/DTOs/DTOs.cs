namespace InvernaderosAPI.DTOs
{
    // ── LOGIN ─────────────────────────────────────────────────
    public class LoginDto
    {
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }

    public class LoginResponseDto
    {
        public string Token { get; set; } = string.Empty;
        public string NombreCompleto { get; set; } = string.Empty;
        public string Rol { get; set; } = string.Empty;
        public int? IdInvernadero { get; set; }
    }

    // ── LECTURA (lo que envía el ESP32) ───────────────────────
    public class LecturaDto
    {
        public int IdSensor { get; set; }
        public int IdInvernadero { get; set; }
        public decimal Temperatura { get; set; }
        public decimal Humedad { get; set; }
        public decimal? Luminosidad { get; set; }
        public decimal? CalidadAire { get; set; }
        public decimal? HumedadSuelo { get; set; }
    }

    public class LecturaResponseDto
    {
        public long IdLectura { get; set; }
        public int IdSensor { get; set; }
        public DateTime FechaHora { get; set; }
        public decimal Temperatura { get; set; }
        public decimal Humedad { get; set; }
        public decimal? Luminosidad { get; set; }
        public decimal? CalidadAire { get; set; }
        public decimal? HumedadSuelo { get; set; }
        public bool EsAlerta { get; set; }
        public string NombreInvernadero { get; set; } = string.Empty;
    }

    public class HistorialLecturaDto
    {
        public DateTime FechaInicio { get; set; }
        public DateTime FechaFin { get; set; }
        public int TotalLecturas { get; set; }
        public decimal? TemperaturaPromedio { get; set; }
        public decimal? TemperaturaMinima { get; set; }
        public decimal? TemperaturaMaxima { get; set; }
        public decimal? HumedadPromedio { get; set; }
        public decimal? HumedadMinima { get; set; }
        public decimal? HumedadMaxima { get; set; }
        public decimal? HumedadSueloPromedio { get; set; }
        public decimal? HumedadSueloMinima { get; set; }
        public decimal? HumedadSueloMaxima { get; set; }
        public decimal? LuminosidadPromedio { get; set; }
        public decimal? LuminosidadMinima { get; set; }
        public decimal? LuminosidadMaxima { get; set; }
        public decimal? CalidadAirePromedio { get; set; }
        public decimal? CalidadAireMinima { get; set; }
        public decimal? CalidadAireMaxima { get; set; }
        public bool TieneAlertas { get; set; }
    }

    // ── DASHBOARD ─────────────────────────────────────────────
    public class DashboardDto
    {
        public decimal UltimaTemperatura { get; set; }
        public decimal UltimaHumedad { get; set; }
        public decimal? UltimaLuminosidad { get; set; }
        public decimal? UltimaCalidadAire { get; set; }
        public decimal? UltimaHumedadSuelo { get; set; }
        public DateTime UltimaLectura { get; set; }
        public int TotalAlertasHoy { get; set; }
        public int TotalLecturasHoy { get; set; }
        public bool SistemaActivo { get; set; }
    }

    // ── ALERTA ────────────────────────────────────────────────
    public class AlertaResponseDto
    {
        public int IdAlerta { get; set; }
        public string TipoAlerta { get; set; } = string.Empty;
        public string Mensaje { get; set; } = string.Empty;
        public decimal ValorDetectado { get; set; }
        public DateTime FechaHora { get; set; }
        public bool Resuelta { get; set; }
        public string NombreInvernadero { get; set; } = string.Empty;
    }

    // ── UMBRAL ────────────────────────────────────────────────
    public class UmbralDto
    {
        public string Variable { get; set; } = string.Empty;
        public decimal ValorMinimo { get; set; }
        public decimal ValorMaximo { get; set; }
    }

    // ── ASISTENTE IA ──────────────────────────────────────────
    public class AsistenteConsultaDto
    {
        public string Pregunta { get; set; } = string.Empty;
        public DateTime? Desde { get; set; }
        public DateTime? Hasta { get; set; }
        public string? Variable { get; set; }
    }

    public class AsistenteRespuestaDto
    {
        public string Resumen { get; set; } = string.Empty;
        public string Prioridad { get; set; } = "normal";
        public List<string> Hallazgos { get; set; } = new();
        public List<string> Acciones { get; set; } = new();
        public List<string> Limitaciones { get; set; } = new();
        public object? Contexto { get; set; }
    }
}
