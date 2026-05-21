namespace InvernaderosAPI.Models
{
    public class Lectura
    {
        public long IdLectura { get; set; }
        public int IdSensor { get; set; }
        public int IdInvernadero { get; set; }
        public DateTime FechaHora { get; set; } = DateTime.Now;
        public decimal Temperatura { get; set; }
        public decimal Humedad { get; set; }
        public decimal? Luminosidad { get; set; }
        public decimal? CalidadAire { get; set; }
        public decimal? HumedadSuelo { get; set; }
        public bool EsAlerta { get; set; } = false;

        // Navegación
        public Sensor? Sensor { get; set; }
        public Invernadero? Invernadero { get; set; }
        public ICollection<Alerta> Alertas { get; set; } = new List<Alerta>();
    }
}