# 📊 Sistema de Control e Incidencias de Personal

Plataforma profesional para el procesamiento automatizado de asistencia de personal, cálculo dinámico de incidencias (bonos nocturnos, turnos especiales, domingos, feriados y ausencias), almacenamiento persistente local y generación de reportes formateados en Excel.

Diseñado con un enfoque modular, seguro y altamente adaptable a cualquier estructura empresarial u operativa.

---

## 🚀 Características Principales

*   **Configuración Dinámica de Sucursales e Incidencias**:
    *   Permite definir nombres de sucursales o sedes de manera 100% personalizada.
    *   Asignación configurable de las incidencias a procesar y sus valores correspondientes (turnos de cierre, turnos regulares/presente, aperturas, redobles/asistencias especiales, domingos, feriados y ausencias).
    *   Adaptable a cualquier tipo de empresa sin dependencia de estructuras rígidas o nombres predefinidos.
*   **Gestión Inteligente de Días Feriados**:
    *   Permite registrar fechas de días feriados manualmente con validación automática del período quincenal seleccionado para evitar discrepancias.
*   **Detección Precisa de Ausencias**:
    *   Conteo riguroso y diferenciado de **Ausencias Justificadas** y **Ausencias Injustificadas** (incluyendo variantes como falta, inasistencia, permisos y nomenclaturas habituales como AI/AJ).
*   **Carga y Detección Automática de Archivos Excel**:
    *   Lectura de archivos consolidados de asistencia (`.xlsx`, `.xls`), detectando automáticamente encabezados de empleados, cédulas, cargos, sucursales y columnas de fechas.
*   **Diseño Profesional Supabase Design System**:
    *   Interfaz moderna, accesible y minimalista basada en la estética de Supabase (`Brand Green #3FCF8E`, paleta oscura neutra y soporte de modo claro/oscuro).
*   **Historial y Auditoría Local**:
    *   Almacenamiento y consulta de cortes procesados para revisión histórica, recálculo o auditoría.
*   **Exportación de Reportes Excel con Estilos**:
    *   Genera libros Excel listos para liquidación (`.xlsx`), con hojas separadas por sucursal, cabeceras estilizadas y anchos de columna automáticos.
*   **Privacidad y Seguridad Garantizadas**:
    *   Procesamiento local sin exposición de datos sensibles ni credenciales hardcodeadas.
    *   Configuración de exclusión en control de versiones para proteger información de colaboradores y registros de nómina.

---

## ⚙️ Arquitectura Tecnológica

*   **Frontend**: React 18, Vite, CSS con tokens semánticos (Supabase Design Tokens) y Lucide Icons.
*   **Backend**: Node.js, Express.js.
*   **Procesamiento de Datos**: `xlsx-js-style` para lectura y estilización de hojas de cálculo.

---

## 📋 Requisitos Previos

*   [Node.js](https://nodejs.org/) (versión 18 o superior recomendada).
*   Gestor de paquetes `npm` (incluido con Node.js).

---

## 🛠️ Instalación y Puesta en Marcha

1.  **Clonar e instalar dependencias**:
    ```bash
    npm install
    ```

2.  **Iniciar Servidor Backend y Aplicación**:
    ```bash
    npm run start
    ```
    La aplicación estará accesible en:
    ```
    http://localhost:5000
    ```

3.  **Modo Desarrollo**:
    Para desarrollo en vivo con Hot Module Replacement (HMR):
    ```bash
    npm run dev
    ```

4.  **Compilación para Producción**:
    Para compilar los activos optimizados del cliente:
    ```bash
    npm run build
    ```

5.  **Pruebas Automatizadas**:
    Para validar las reglas de cálculo e incidencias:
    ```bash
    node test_runner.js
    ```
