using Microsoft.EntityFrameworkCore;
using InvernaderosAPI.Models;

namespace InvernaderosAPI.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        // Tablas
        public DbSet<Invernadero> Invernaderos { get; set; }
        public DbSet<Usuario> Usuarios { get; set; }
        public DbSet<Sensor> Sensores { get; set; }
        public DbSet<Lectura> Lecturas { get; set; }
        public DbSet<Alerta> Alertas { get; set; }
        public DbSet<ConfiguracionUmbral> ConfiguracionesUmbral { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // ── Invernadero ───────────────────────────────────────
            modelBuilder.Entity<Invernadero>(entity =>
            {
                entity.ToTable("Invernadero");
                entity.HasKey(e => e.IdInvernadero);
                entity.Property(e => e.Nombre).IsRequired().HasMaxLength(100);
                entity.Property(e => e.Municipio).IsRequired().HasMaxLength(100);
                entity.Property(e => e.Departamento).HasMaxLength(100).HasDefaultValue("Cundinamarca");
                entity.Property(e => e.AreaHectareas).HasColumnType("decimal(8,2)");
                entity.Property(e => e.Latitud).HasColumnType("decimal(10,6)");
                entity.Property(e => e.Longitud).HasColumnType("decimal(10,6)");
            });

            // ── Usuario ───────────────────────────────────────────
            modelBuilder.Entity<Usuario>(entity =>
            {
                entity.ToTable("Usuario");
                entity.HasKey(e => e.IdUsuario);
                entity.HasIndex(e => e.Email).IsUnique();
                entity.Property(e => e.NombreCompleto).IsRequired().HasMaxLength(100);
                entity.Property(e => e.Email).IsRequired().HasMaxLength(120);
                entity.Property(e => e.PasswordHash).IsRequired().HasMaxLength(256);
                entity.Property(e => e.Rol).IsRequired().HasMaxLength(20);
                entity.HasOne(e => e.Invernadero)
                      .WithMany()
                      .HasForeignKey(e => e.IdInvernadero)
                      .IsRequired(false);
            });

            // ── Sensor ────────────────────────────────────────────
            modelBuilder.Entity<Sensor>(entity =>
            {
                entity.ToTable("Sensor");
                entity.HasKey(e => e.IdSensor);
                entity.HasIndex(e => e.Codigo).IsUnique();
                entity.Property(e => e.Codigo).IsRequired().HasMaxLength(30);
                entity.Property(e => e.TipoDispositivo).IsRequired().HasMaxLength(50);
                entity.Property(e => e.VariableMedida).IsRequired().HasMaxLength(50);
                entity.Property(e => e.UnidadMedida).IsRequired().HasMaxLength(20);
                entity.HasOne(e => e.Invernadero)
                      .WithMany(i => i.Sensores)
                      .HasForeignKey(e => e.IdInvernadero);
            });

            // ── Lectura ───────────────────────────────────────────
            modelBuilder.Entity<Lectura>(entity =>
            {
                entity.ToTable("Lectura");
                entity.HasKey(e => e.IdLectura);
                entity.Property(e => e.Temperatura).HasColumnType("decimal(5,2)");
                entity.Property(e => e.Humedad).HasColumnType("decimal(5,2)");
                entity.Property(e => e.Luminosidad).HasColumnType("decimal(10,2)");
                entity.Property(e => e.CalidadAire).HasColumnType("decimal(10,2)");
                entity.Property(e => e.HumedadSuelo).HasColumnType("decimal(5,2)");
                entity.HasOne(e => e.Sensor)
                      .WithMany(s => s.Lecturas)
                      .HasForeignKey(e => e.IdSensor);
                entity.HasOne(e => e.Invernadero)
                      .WithMany(i => i.Lecturas)
                      .HasForeignKey(e => e.IdInvernadero);
            });

            // ── Alerta ────────────────────────────────────────────
            modelBuilder.Entity<Alerta>(entity =>
            {
                entity.ToTable("Alerta");
                entity.HasKey(e => e.IdAlerta);
                entity.Property(e => e.TipoAlerta).IsRequired().HasMaxLength(30);
                entity.Property(e => e.Mensaje).IsRequired().HasMaxLength(200);
                entity.Property(e => e.ValorDetectado).HasColumnType("decimal(10,4)");
                entity.HasOne(e => e.Lectura)
                      .WithMany(l => l.Alertas)
                      .HasForeignKey(e => e.IdLectura);
                entity.HasOne(e => e.Invernadero)
                      .WithMany(i => i.Alertas)
                      .HasForeignKey(e => e.IdInvernadero);
            });

            // ── ConfiguracionUmbral ───────────────────────────────
            modelBuilder.Entity<ConfiguracionUmbral>(entity =>
            {
                entity.ToTable("ConfiguracionUmbral");
                entity.HasKey(e => e.IdUmbral);
                entity.Property(e => e.Variable).IsRequired().HasMaxLength(30);
                entity.Property(e => e.ValorMinimo).HasColumnType("decimal(10,4)");
                entity.Property(e => e.ValorMaximo).HasColumnType("decimal(10,4)");
                entity.HasIndex(e => new { e.IdInvernadero, e.Variable }).IsUnique();
                entity.HasOne(e => e.Invernadero)
                      .WithMany()
                      .HasForeignKey(e => e.IdInvernadero);
            });
        }
    }
} 