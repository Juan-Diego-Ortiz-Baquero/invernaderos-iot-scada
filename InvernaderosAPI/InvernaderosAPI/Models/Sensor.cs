namespace InvernaderosAPI.Models
{
    public class Sensor
    {
        public int IdSensor { get; set; }
        public int IdInvernadero { get; set; }
        public string Codigo { get; set; } = string.Empty;
        public string TipoDispositivo { get; set; } = string.Empty;
        public string VariableMedida { get; set; } = string.Empty;
        public string UnidadMedida { get; set; } = string.Empty;
        public bool Activo { get; set; } = true;
        public DateTime FechaInstalacion { get; set; } = DateTime.Now;

        // Navegación
        public Invernadero? Invernadero { get; set; }
        public ICollection<Lectura> Lecturas { get; set; } = new List<Lectura>();
    }
}