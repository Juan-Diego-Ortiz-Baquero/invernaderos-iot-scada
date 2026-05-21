namespace InvernaderosAPI.Models
{
    public class ConfiguracionUmbral
    {
        public int IdUmbral { get; set; }
        public int IdInvernadero { get; set; }
        public string Variable { get; set; } = string.Empty;
        public decimal ValorMinimo { get; set; }
        public decimal ValorMaximo { get; set; }
        public int CreadoPor { get; set; }
        public DateTime FechaActualizacion { get; set; } = DateTime.Now;

        // Navegación
        public Invernadero? Invernadero { get; set; }
    }
}