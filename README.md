# 📊 Sistema de Control e Incidencias de Personal

Plataforma profesional para el procesamiento automatizado de asistencia de personal, cálculo dinámico de incidencias (bonos nocturnos, turnos especiales, domingos, feriados y ausencias), auditoría preventiva de nómina, persistencia relacional con base de datos e histórico, y exportación de reportes formateados en Excel.

---

## 🔒 Seguridad y Privacidad

*   **Sin exposición de datos sensibles**:
    *   Los archivos de bases de datos locales (`*.sqlite`, `*.db`, carpeta `data/`) y los libros Excel (`*.xlsx`, `*.xls`) están excluidos en `.gitignore`.
    *   No se versionan contraseñas ni cadenas de conexión hardcodeadas.
*   **Autenticación y Control de Acceso Basado en Roles (RBAC)**:
    *   API protegida mediante tokens JWT (`jsonwebtoken`) y cifrado seguro de contraseñas (`bcryptjs`).
    *   Roles diferenciados:
        *   `admin`: Control total, creación y eliminación de cortes, auditoría de usuarios y logs.
        *   `editor`: Carga de archivos, cálculo y guardado de cortes quincenales.
        *   `viewer`: Consulta y descarga de reportes históricos (solo lectura).
*   **Seguridad de API**:
    *   Cabeceras de protección HTTP con `helmet`.
    *   Protección contra fuerza bruta y DoS con `express-rate-limit`.
    *   Validación estricta de esquemas de datos entrantes con `zod`.
    *   CORS restringido configurable por variable de entorno `CORS_ORIGIN`.

> **⚠️ NOTA IMPORTANTE PARA EL HISTORIAL DE GIT REMOTO:**
> Si en commits anteriores se llegó a subir `database.sqlite` antes de la regla de ignorado y el repositorio estuvo publicado, ejecuta en tu terminal local la purga del historial con:
> ```bash
> git filter-repo --path database.sqlite --path test_actual_file.js --invert-paths
> git push origin --force --all
> ```

---

## 🚀 Características Principales

*   **Auditoría Preventiva y Protección contra Riesgos Económicos**:
    *   **Detección de celdas no interpretadas**: Notifica cualquier celda con texto no reconocido (ej. errores tipográficos como *"Prsente"*) con número de fila, columna y valor para evitar pérdida de bonos.
    *   **Sedes sin asignación ciega**: Si la sucursal no coincide con las configuradas, se marca explícitamente como *"Sin Asignar"* para confirmación del usuario, evitando mezclar sedes silenciosamente.
    *   **Detección de empleados duplicados**: Advierte si un mismo colaborador aparece en múltiples filas del archivo.
    *   **Valores de domingo unificados**: Un solo concepto consistente para domingos trabajados respetando el valor configurado.
*   **Persistencia Real Multi-Entorno**:
    *   En desarrollo y local: SQLite relacional en disco (`data/incidencias.db`).
    *   En Vercel Serverless / Producción Cloud: Compatible nativamente con **Turso / libSQL** (`TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`) y PostgreSQL mediante transacciones ACID (`BEGIN`/`COMMIT`).
*   **Exportación Consolidada a Excel con Hoja Resumen**:
    *   Genera un libro `.xlsx` con hojas estilizadas por sucursal más una hoja inicial de **Resumen General** con totales por empleado (bonos nocturnos, domingos, feriados y ausencias) lista para liquidación.
*   **Experiencia de Usuario Accesible y Fluida**:
    *   Asistente guiado de 4 pasos (Configurar → Cargar → Revisar → Exportar).
    *   Tabla optimizada con paginación, filtros por tipo de incidencia y ordenamiento dinámico por columna.
    *   Soporte completo de modo Claro / Oscuro con contraste verificado WCAG AA/AAA.
    *   Modales accesibles (`role="dialog"`, `aria-modal="true"`, cierre con `Escape` y captura de foco).

---

## ⚙️ Arquitectura Tecnológica

*   **Frontend**: React 19, Vite 8, Lucide React Icons.
*   **Backend**: Node.js, Express.js 5, libSQL / SQLite, JWT, Zod, Helmet, Rate Limit.
*   **Procesamiento de Datos**: `xlsx-js-style`.
*   **Testing y Calidad**: Vitest 3, Oxlint, GitHub Actions CI Pipeline.

---

## 🛠️ Instalación y Puesta en Marcha

1.  **Clonar e instalar dependencias**:
    ```bash
    npm install
    ```

2.  **Configurar Variables de Entorno (Opcional)**:
    Copia `.env.example` a `.env` si deseas personalizar puertos, secretos JWT o conexión a base de datos remota:
    ```env
    PORT=5000
    JWT_SECRET=tu_clave_secreta_jwt_aqui
    ADMIN_USER=admin
    ADMIN_PASSWORD=Admin1234!
    # TURSO_DATABASE_URL=libsql://tu-base-datos.turso.io
    # TURSO_AUTH_TOKEN=tu-token-turso
    ```

3.  **Iniciar Servidor Completo (API + Cliente)**:
    ```bash
    npm run build:start
    ```
    Accede a `http://localhost:5000`.

4.  **Modo Desarrollo**:
    ```bash
    npm run dev
    ```

5.  **Ejecutar Pruebas Automatizadas**:
    ```bash
    npm run test
    ```
    O para verificación de linter:
    ```bash
    npm run lint
    ```
