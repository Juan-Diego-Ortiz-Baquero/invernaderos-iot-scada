# Despliegue en Render

Este proyecto se despliega como dos servicios:

- `invernaderos-api`: backend ASP.NET Core con Docker.
- `invernaderos-frontend`: frontend React/Vite como Static Site. Render no requiere plan explicito para este servicio.

## 1. Subir a GitHub

Desde la raiz del proyecto:

```powershell
git init
git add .
git commit -m "Prepare Render deployment"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/TU_REPO.git
git push -u origin main
```

## 2. Crear Blueprint en Render

Abre:

```txt
https://dashboard.render.com/blueprint/new
```

Selecciona el repositorio donde subiste el proyecto. Render detectara `render.yaml`.

## 3. Variables del backend

En `invernaderos-api`, configura:

```txt
ConnectionStrings__DefaultConnection=<cadena SQL Server>
Jwt__Key=<clave secreta JWT>
Jwt__Issuer=InvernaderosAPI
Jwt__Audience=InvernaderosApp
Jwt__ExpirationHours=8
Alertas__CooldownMinutos=10
Historiador__RangoMaximoDias=1825
```

## 4. Variable del frontend

Cuando Render cree el backend, copia su URL publica, por ejemplo:

```txt
https://invernaderos-api.onrender.com
```

En `invernaderos-frontend`, configura:

```txt
VITE_API_BASE_URL=https://invernaderos-api.onrender.com
VITE_DEFAULT_GREENHOUSE_ID=1
VITE_POLLING_INTERVAL_MS=3000
VITE_DEVICE_STALE_AFTER_SECONDS=10
```

Si cambias `VITE_API_BASE_URL`, redeploya el frontend para que Vite compile con la URL correcta.

## 5. ESP32

Cuando el backend este publicado, cambia la URL del ESP32 de `localhost` o red local a:

```txt
https://invernaderos-api.onrender.com/api/lecturas
```

## 6. Verificacion

Prueba:

```txt
https://invernaderos-api.onrender.com/swagger
```

Luego inicia sesion en el frontend publicado y verifica:

- Dashboard activo/apagado.
- Telemetria.
- Alertas.
- Historiador.
