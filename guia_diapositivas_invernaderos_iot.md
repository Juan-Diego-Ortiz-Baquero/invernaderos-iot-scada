# Guía para diapositivas - Sistema para variables de microclima en invernaderos de flores en Cundinamarca

## 1. Introducción
El proyecto Sistema para variables de microclima en invernaderos de flores en Cundinamarca se enfoca en el monitoreo y análisis de condiciones ambientales para apoyar la producción agrícola de manera más eficiente. En un entorno donde la estabilidad del clima es clave para la calidad de las flores, el sistema permite capturar variables en tiempo real y convertirlas en información útil para la supervisión del cultivo.

La solución combina sensores, conectividad, almacenamiento centralizado y visualización web para que el seguimiento no dependa solo de inspecciones manuales. Con esto, se busca tener una lectura continua del estado del invernadero y actuar con más rapidez ante cambios críticos.

## 2. Problema
En el cultivo en invernadero, las variaciones de temperatura, humedad, humedad del suelo, luminosidad y calidad del aire pueden afectar el rendimiento, la calidad del producto y la salud de las plantas. En zonas de alta montaña como Cundinamarca, estas condiciones pueden cambiar rápidamente y no siempre son visibles para una inspección manual.

El problema central es que, sin un sistema automatizado y en tiempo real, la información queda dispersa o llega tarde. Eso reduce la capacidad de prevenir alertas, corregir condiciones desfavorables y sostener un control adecuado del microclima.

## 3. Justificación
Se necesita una solución que permita capturar, centralizar y visualizar datos ambientales de forma continua. El sistema propuesto reduce la dependencia del monitoreo manual, mejora la detección temprana de alertas y facilita el análisis histórico para tomar decisiones sobre riego, ventilación, iluminación y condiciones del cultivo.

Además, el proyecto es valioso porque no solo muestra los datos en pantalla, sino que también los almacena para análisis posterior. Esto permite revisar tendencias, comparar periodos y construir una base de información útil para decisiones operativas y para futuras mejoras del invernadero.

## 4. Objetivos
**Objetivo general:** Diseñar e implementar un sistema IoT para el monitoreo y análisis del microclima en un invernadero.

**Objetivos específicos:**
- Capturar variables ambientales con un prototipo basado en ESP32.
- Enviar las lecturas a una API para su almacenamiento y consulta.
- Visualizar métricas en un dashboard web con alertas y estados.
- Analizar el comportamiento histórico de las variables para apoyar la toma de decisiones.

En conjunto, estos objetivos conectan la adquisición de datos, el procesamiento en backend y la interpretación visual. Así, el sistema no se limita a registrar lecturas, sino que convierte esas lecturas en una herramienta de análisis.

## 5. Metodología CRISP-DM
**Comprensión del negocio:** Se identificó la necesidad de monitorear un invernadero en Cundinamarca para controlar el microclima.

**Comprensión de los datos:** Se trabajan lecturas de temperatura, humedad, humedad del suelo, luminosidad y calidad del aire.

**Preparación de datos:** Las lecturas se estructuran, limpian y organizan para análisis operativo e histórico.

**Modelado:** Se construyen un modelo relacional y un modelo multidimensional para el análisis analítico.

**Evaluación:** Se revisan alertas, tendencias, promedios y comportamiento por rango de tiempo.

**Despliegue:** Los resultados se exponen en un dashboard web conectado a la API.

La metodología CRISP-DM se adapta bien a este proyecto porque permite pasar de una necesidad real de monitoreo a una solución basada en datos. Primero se entiende el contexto agrícola, después se estructuran las lecturas del sensor, y finalmente se construyen vistas que ayudan a interpretar el comportamiento del invernadero.

## 6. Resultados
El sistema permite consultar lecturas recientes, visualizar alertas, revisar estadísticas diarias y analizar patrones históricos del invernadero. La solución integra hardware, backend, base de datos y frontend en un flujo completo de adquisición, almacenamiento, visualización y análisis.

Como resultado, el proyecto deja una plataforma funcional para observar el estado del microclima, identificar condiciones fuera de rango y revisar el comportamiento de las variables en diferentes momentos del día.

## 7. Diagrama de arquitectura del sistema
**Conceptos incluidos:** IoT, microservicio/API, base de datos, visualización web, analítica histórica y tablero de control.

**Herramientas utilizadas:**
- **Hardware:** ESP32 DevKit V1.
- **Sensores:** DHT22, YL-69, LDR y MQ-2.
- **Backend:** ASP.NET Core Web API con Entity Framework Core, autenticación JWT y Swagger.
- **Base de datos:** SQL Server.
- **Frontend:** React + Vite.
- **Despliegue:** Render.

**Flujo general:** El ESP32 captura datos ambientales, los envía a la API REST, la API los valida y almacena en SQL Server, y el frontend consume la información para mostrar dashboard y analítica.

Arquitectónicamente, el sistema separa claramente la capa física, la capa de servicios y la capa de presentación. Eso facilita el mantenimiento, el escalamiento y la posible incorporación de nuevos sensores o nuevas vistas analíticas en el futuro.

## 8. Análisis exploratorio de datos y prototipo de dispositivo
El análisis exploratorio parte de las lecturas generadas por el prototipo físico. Se revisan valores típicos, variaciones por hora, registros con alerta y cambios entre lecturas consecutivas. El prototipo integra un ESP32 con sensores de temperatura y humedad ambiental, humedad del suelo, luminosidad y calidad del aire, y envía los datos en formato JSON a la API del sistema.

Este análisis permite ver si las lecturas son consistentes, si existen picos anómalos y en qué momentos del día cambian más las variables. También sirve para validar que el prototipo realmente representa el comportamiento del entorno del invernadero.

## 9. Modelo relacional
El modelo relacional del proyecto se organiza alrededor de estas entidades y tablas reales:

- **Invernadero:** información general del cultivo y su ubicación en Cundinamarca.
- **Sensor:** dispositivo instalado en cada invernadero.
- **Lectura:** registro temporal con las mediciones capturadas.
- **Alerta:** evento generado cuando una lectura supera un umbral.
- **Usuario:** acceso al sistema y autenticación.
- **ConfiguracionUmbral:** parámetros de referencia para alertas.

**Relaciones principales:**
- Un invernadero tiene muchos sensores.
- Un sensor genera muchas lecturas.
- Una lectura puede generar una o más alertas.
- Cada alerta pertenece a una lectura y a un invernadero.
- Un invernadero puede tener varios usuarios y varias configuraciones de umbral.

Este modelo permite guardar la información de forma estructurada y asegurar integridad entre los datos operativos. Por eso es adecuado para registrar tanto las lecturas del ESP32 como los eventos de alerta y las reglas de control.

## 10. Simulación de datos para Big Data
Para análisis a gran escala, se puede simular una gran cantidad de lecturas a partir del comportamiento real del prototipo. La simulación replica secuencias temporales de temperatura, humedad, luz, suelo y aire para ampliar el volumen de datos y probar procesos de almacenamiento, consulta y análisis.

**Propósito de la simulación:**
- Evaluar rendimiento con alto volumen de registros.
- Probar agregaciones por hora, día y rango de fechas.
- Reforzar la construcción del modelo dimensional.

En el contexto del proyecto, esta simulación serviría para ensayar escenarios en los que el sistema recibe muchos registros por minuto y necesita seguir respondiendo con rapidez en el dashboard y en los reportes históricos.

## 11. Modelo multidimensional
El modelo multidimensional puede representarse con una tabla de hechos y dimensiones para análisis de negocio y consulta histórica:

**Tabla de hechos:**
- Hecho_Lectura o Hecho_Microclima, con medidas como temperatura, humedad, humedad del suelo, luminosidad, calidad del aire y estado de alerta.

**Dimensiones:**
- **Tiempo:** fecha, hora, día, mes, trimestre.
- **Invernadero:** nombre, municipio, departamento, área, ubicación.
- **Sensor:** código, tipo de dispositivo, variable medida.
- **Variable ambiental:** temperatura, humedad, luz, suelo, aire.
- **Estado:** normal o alerta.

Este modelo permite analizar tendencias y comparar comportamientos por periodo, sensor o invernadero, además de identificar patrones de alerta por hora y por día. La ventaja del modelo dimensional es que organiza la información para análisis, no solo para almacenamiento.

## 12. ETL
**Extracción:** Se toman las lecturas desde el ESP32 y la API.

**Transformación:** Se limpian valores, se normalizan unidades y se agregan campos de análisis como fecha, hora, rango y estado.

**Carga:** Los datos se almacenan en SQL Server y también pueden alimentarse en una estructura analítica para el dashboard, las gráficas históricas y los reportes.

Este proceso ETL convierte datos técnicos del dispositivo en información lista para análisis. También asegura que los registros tengan un formato homogéneo para consultas posteriores y para la generación de métricas comparables.

## 13. Dashboard
El dashboard muestra:
- Última lectura del sistema.
- Total de lecturas del día.
- Alertas pendientes.
- Estado activo o inactivo del sistema.
- Gráficas históricas y comparativas por variable.
- Tabla de lecturas, alertas y tendencias.

En esta interfaz se combina monitoreo operativo en tiempo real con análisis histórico para facilitar la supervisión del invernadero y la detección de condiciones críticas. El panel funciona como la capa visible del sistema: ahí se resume el estado del invernadero, se observan señales de alerta y se interpreta rápidamente si el microclima está estable o requiere atención.

## 14. Resultados del análisis multidimensional a partir del dashboard
El dashboard permite observar tendencias por rango de tiempo, detectar picos de temperatura o humedad, identificar alertas recurrentes y comparar el comportamiento entre variables. A partir de estas vistas se pueden reconocer patrones como:
- Horas con mayor estrés térmico.
- Cambios en humedad del suelo que sugieren riego.
- Periodos con baja luminosidad.
- Alertas concentradas en ciertas franjas horarias.
- Variaciones del microclima entre lecturas normales y lecturas en alerta.

Estos resultados ayudan a convertir el tablero en una herramienta de decisión. No solo muestran datos, sino que permiten identificar relaciones entre variables y anticipar acciones de control dentro del invernadero.

## 15. Conclusiones
El proyecto demuestra que una solución IoT integrada con backend, dashboard y analítica puede mejorar el monitoreo de un invernadero de flores en Cundinamarca. El uso del ESP32 y los sensores ambientales permite capturar datos en tiempo real; la API centraliza la información en SQL Server; y el dashboard facilita la toma de decisiones basada en evidencia. Además, el análisis histórico y multidimensional agrega valor al convertir lecturas aisladas en información útil para la gestión del cultivo.

Como conclusión general, el sistema demuestra que es posible pasar de un monitoreo manual a una supervisión conectada, trazable y orientada al análisis. Eso abre la puerta a futuros módulos de automatización, predicción y escalamiento del sistema.

---

## Sugerencia para la presentación
Si quieres, puedes usar este mismo contenido como base y convertir cada sección en una diapositiva con:
- título corto,
- una idea clave,
- una imagen o diagrama,
- y una frase final de impacto.