namespace InvernaderosAPI.Models
{
    public class Invernadero
    {
        public int IdInvernadero { get; set; }
        public string Nombre { get; set; } = string.Empty;
        public string Municipio { get; set; } = string.Empty;
        public string Departamento { get; set; } = "Cundinamarca";
        public decimal? AreaHectareas { get; set; }
        public decimal? Latitud { get; set; }
        public decimal? Longitud { get; set; }
        public bool Activo { get; set; } = true;
        public DateTime FechaCreacion { get; set; } = DateTime.Now;

        // Navegación
        public ICollection<Sensor> Sensores { get; set; } = new List<Sensor>();
        public ICollection<Lectura> Lecturas { get; set; } = new List<Lectura>();
        public ICollection<Alerta> Alertas { get; set; } = new List<Alerta>();
    }
}