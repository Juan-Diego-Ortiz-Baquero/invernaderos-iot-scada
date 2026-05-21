namespace InvernaderosAPI.Models
{
    public class Alerta
    {
        public int IdAlerta { get; set; }
        public long IdLectura { get; set; }
        public int IdInvernadero { get; set; }
        public string TipoAlerta { get; set; } = string.Empty;
        public string Mensaje { get; set; } = string.Empty;
        public decimal ValorDetectado { get; set; }
        public DateTime FechaHora { get; set; } = DateTime.Now;
        public bool Resuelta { get; set; } = false;

        // Navegación
        public Lectura? Lectura { get; set; }
        public Invernadero? Invernadero { get; set; }
    }
}