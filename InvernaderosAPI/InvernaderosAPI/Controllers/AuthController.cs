using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using InvernaderosAPI.Data;
using InvernaderosAPI.DTOs;

namespace InvernaderosAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly IConfiguration _config;

        public AuthController(AppDbContext db, IConfiguration config)
        {
            _db = db;
            _config = config;
        }

        // LOGIN
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginDto dto)
        {
            // Buscar usuario por email
            var usuario = await _db.Usuarios
                .FirstOrDefaultAsync(u => u.Email == dto.Email && u.Activo);

            if (usuario == null)
                return Unauthorized(new
                {
                    mensaje = "Credenciales incorrectas"
                });

            // Verificar contraseña con BCrypt
            bool passwordValida = BCrypt.Net.BCrypt.Verify(
                dto.Password,
                usuario.PasswordHash
            );

            if (!passwordValida)
                return Unauthorized(new
                {
                    mensaje = "Credenciales incorrectas"
                });

            // Generar token JWT
            var token = GenerarToken(
                usuario.IdUsuario,
                usuario.Email,
                usuario.Rol,
                usuario.IdInvernadero
            );

            return Ok(new LoginResponseDto
            {
                Token = token,
                NombreCompleto = usuario.NombreCompleto,
                Rol = usuario.Rol,
                IdInvernadero = usuario.IdInvernadero
            });
        }

        // GENERAR TOKEN JWT
        private string GenerarToken(
            int idUsuario,
            string email,
            string rol,
            int? idInvernadero
        )
        {
            var key = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(_config["Jwt:Key"]!)
            );

            var creds = new SigningCredentials(
                key,
                SecurityAlgorithms.HmacSha256
            );

            var expira = DateTime.Now.AddHours(
                int.Parse(_config["Jwt:ExpirationHours"]!)
            );

            var claims = new[]
            {
                new Claim(
                    ClaimTypes.NameIdentifier,
                    idUsuario.ToString()
                ),

                new Claim(
                    ClaimTypes.Email,
                    email
                ),

                new Claim(
                    ClaimTypes.Role,
                    rol
                ),

                new Claim(
                    "IdInvernadero",
                    idInvernadero?.ToString() ?? ""
                )
            };

            var token = new JwtSecurityToken(
                issuer: _config["Jwt:Issuer"],
                audience: _config["Jwt:Audience"],
                claims: claims,
                expires: expira,
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler()
                .WriteToken(token);
        }
    }
}