# Prism Desk · 棱镜

<img src="src/assets/prism-icon.svg" width="80" height="80" alt="Prism Desk">

[English](README.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [العربية](README.ar.md)

Creado por [Shixi Lin](https://shixilin.com/).

Prism Desk es un espacio de trabajo para Windows que permite usar CLI con suscripción. Cuando una cuenta agota su cuota, puedes transferir la tarea a otra sin reconstruir a mano la conversación y las notas de progreso. La carpeta del proyecto sigue siendo la misma.

### Versiones y descargas

**[Última versión](https://github.com/shixi-11/prism-desk/releases/latest)** · **[Guía de instalación](#install)**

Actualmente, Prism se distribuye mediante una **instalación desde el código fuente para Windows**. No se publica ningún instalador independiente `.exe` o `.msi`. Las descargas «Source code» de GitHub contienen archivos de código fuente; sigue la guía de instalación para compilar e iniciar la aplicación de escritorio. Cada versión estable tiene una única etiqueta de versión y una única página con las notas de cambios completas en inglés y chino simplificado.

### Qué puedes hacer

| Función | En la práctica |
| --- | --- |
| Continuar la misma tarea | Mantén juntos la solicitud original, la conversación, las notas de progreso y los resultados de herramientas registrados al transferir el trabajo a otra cuenta. |
| Elegir una cuenta de ejecución | Selecciona un perfil de CLI de Codex, Claude o Grok configurado. Cada uno usa su propio directorio de inicio de sesión. Elimina las cuentas que no uses desde el panel de cuentas; se conservan el historial de tareas y las carpetas locales de inicio de sesión. |
| Cambiar el modelo y el razonamiento | Ajusta cualquiera de estos parámetros durante una tarea. Los cambios se aplican a la siguiente ejecución y se guardan por cuenta dentro de esa tarea. |
| Consultar la cuota | Consulta los porcentajes disponibles, los periodos de cuota y las horas de restablecimiento que comunique el proveedor. Los créditos de restablecimiento de Codex incluyen sus respectivas fechas de caducidad cuando se proporcionan. |
| Transferir al agotarse la cuota | Activa la transferencia automática o selecciona tú mismo la siguiente cuenta. Prism espera a que termine la ejecución anterior antes de continuar. |
| Usar habilidades y herramientas locales | Indica a Prism las instrucciones del asistente, una carpeta de habilidades y las aplicaciones instaladas. Comprueba los puntos de entrada detectados y las operaciones que admiten las aplicaciones. |
| Conservar tu trabajo localmente | Elige una carpeta permanente para almacenar las tareas, añade notas de progreso y exporta un registro de la conversación en Markdown. |
| Trabajar en tu idioma | Elige uno de los nueve idiomas de la interfaz, incluido el árabe de derecha a izquierda, y alterna entre los temas de desierto claro y oscuro. |

<a id="install"></a>

### Instalación

Estos comandos instalan la versión estable **v0.1.10**. Consulta la [última versión publicada](https://github.com/shixi-11/prism-desk/releases/latest) para conocer su número y leer las notas de cambios bilingües.

Necesitarás Windows, Git, Node.js 22.12 o posterior, npm y las CLI oficiales de los proveedores que elijas. Inicia sesión en cada CLI por separado.

```powershell
git clone --branch v0.1.10 https://github.com/shixi-11/prism-desk.git
cd prism-desk
npm install
npm run build
npm run build:desktop
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build-host.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start.ps1
```

El script compila el host de procesos de Windows que se usa para detener conjuntamente los subprocesos de las CLI. Utiliza el compilador de .NET Framework incluido en Windows.

### Antes de tu primera tarea

Instala la CLI oficial de cada proveedor que quieras usar y, después, inicia sesión a través de ella. Iniciar sesión únicamente en un sitio web o en una aplicación de escritorio no configura Prism.

- **Codex:** sigue la [guía de instalación de la CLI](https://developers.openai.com/codex/cli/) e inicia sesión con tu cuenta de ChatGPT.
- **Claude:** instala [Claude Code](https://code.claude.com/docs/en/setup) y, después, [inicia sesión](https://code.claude.com/docs/en/authentication) con una suscripción de Claude compatible. Prism comprueba el inicio de sesión con suscripción y la configuración de uso adicional antes de ejecutar; el uso adicional debe estar desactivado.
- **Grok:** instala la CLI oficial de Grok e inicia sesión con tu cuenta de suscripción.

Abre **Cuentas → Conectar cuenta**, elige Codex, Claude o Grok y asigna un nombre a la cuenta. **Guardar y continuar → Obtener enlace de inicio de sesión → Copiar enlace de inicio de sesión** inicia el proceso de autorización de la CLI oficial. Pega el enlace en la barra de direcciones del navegador. Si Claude muestra un código de autorización, pega el código completo en **Código de autorización** y elige **Enviar código**. El código se envía únicamente a la CLI oficial que está esperando y, después, se borra del campo de entrada. Tras tu autorización, Prism verifica el inicio de sesión con suscripción y habilita la cuenta sin reiniciar. La página también permite comprobar un inicio de sesión existente, cancelar la autorización o volver a copiar el enlace, cambiar el nombre de los perfiles y desactivar o activar cuentas. Al desactivar una cuenta, se conservan las tareas anteriores y las credenciales. La configuración avanzada permite seleccionar el ejecutable de la CLI oficial o importar un directorio de inicio de sesión independiente existente; los directorios de cuenta y las identidades de plataforma ya establecidos no se pueden cambiar. Si falta una CLI, se ofrecen enlaces a las instrucciones oficiales de instalación. Las futuras plataformas necesitarán sus propios adaptadores de proveedor y de ejecución.

### Una tarea habitual

1. Haz clic en **Nueva tarea** y asígnale un nombre. La carpeta del proyecto es opcional; si la dejas en blanco, se crea un espacio de trabajo separado y persistente para la tarea.
2. Selecciona una cuenta de ejecución, un modelo y el esfuerzo de razonamiento. Usa **Solo lectura** para revisar o **Editar el proyecto** para realizar modificaciones.
3. Escribe tu solicitud y envíala con **Ctrl + Enter**. Sigue la conversación y el registro de ejecución a medida que avanza el trabajo.
4. Añade las decisiones importantes o el trabajo pendiente a las notas de progreso. Para cambiar de cuenta, selecciona la siguiente y usa el control de transferencia; detén primero la ejecución actual cuando sea necesario.
5. Cambia el nombre de una tarea con su botón de lápiz, haciendo doble clic o con **F2**. Pulsa **Enter** para guardar o **Esc** para cancelar.
6. Continúa en la misma tarea. Exporta su registro cuando necesites una copia en Markdown o abre la carpeta de almacenamiento de tareas para encontrar los archivos locales.

La siguiente cuenta recibe la conversación guardada, las notas de progreso y los registros de herramientas. El estado interno del modelo de un proveedor no se transfiere.

### Mensajes, ajustes y vistas previas

#### Objetivos y planes

La **barra de objetivo** compacta situada sobre el cuadro de redacción muestra el objetivo guardado, el estado de ejecución y el tiempo de ejecución acumulado. Edita, pausa, reanuda o elimina el objetivo desde la barra; expándela para ver el objetivo completo, el plan editable y los detalles de ejecución. Al pausar, se detiene la ejecución actual y se retienen los mensajes en cola. Al eliminar, se espera a que la ejecución se detenga, se elimina el objetivo y se retienen los mensajes pendientes para revisarlos; los registros de conversación y los archivos del espacio de trabajo siguen disponibles. El temporizador excluye las pausas, el tiempo de inactividad y el tiempo durante el que la aplicación está cerrada. El agotamiento de la cuota comunicado oficialmente se muestra por separado de los fallos de red o de inicio de sesión.

Codex puede guardar objetivos mediante las herramientas nativas de Prism cuando le pides que establezca o cambie uno. Otros puntos de entrada pueden proponer un objetivo para que lo adoptes en la interfaz. Un texto del chat que afirme que se ha guardado un objetivo nunca cambia por sí solo el objetivo real. **Planificar primero** se ejecuta con permisos de solo lectura y devuelve un borrador para su revisión. El cuadro de redacción indica explícitamente cuándo los mensajes solo sirven para debatir un plan pendiente; **Confirmar plan y ejecutar** inicia la implementación con los permisos configurados para la tarea. Los objetivos y los planes persisten entre sesiones y permanecen en el registro de transferencia.

#### Modelos y transferencia

Los cambios de modelo se pueden aplicar dentro de la misma cuenta mediante **Cambiar y continuar**. Una ejecución confirmada registra su cuenta, modelo y nivel de razonamiento; una selección guardada por sí sola no se muestra como un cambio completado. **Preferencias de relevo automático** abre una lista de cuentas que puedes reordenar arrastrándolas, con ajustes del modelo y del nivel de razonamiento para cada cuenta. Los cambios se guardan automáticamente para la tarea actual. La lista señala las cuentas que no pueden satisfacer los requisitos de acceso de escritura de la tarea; la transferencia también respeta la compatibilidad con imágenes.

#### Cuentas y ventanas

Cada tarjeta de cuenta tiene un **Alias** editable con un botón de lápiz. Esto cambia el nombre que se muestra, no la identidad de inicio de sesión. Las preguntas nativas de Codex y los mensajes compatibles de pregunta con lista ofrecen opciones en las que puedes hacer clic y una respuesta personalizada. Al hacer clic en **×** en la barra de título de Windows, Prism se oculta en el área de notificación; usa **Salir de Prism** en el menú del icono de la bandeja para detener el trabajo activo y salir.

#### Organización de tareas

Haz clic con el botón derecho en una tarea para cambiarle el nombre, fijarla, marcarla como no leída, archivarla, agruparla por proyecto o sección, compartirla, copiarla, crear una tarea derivada, abrir su carpeta o conversación, abrir otra ventana o eliminarla. **Archivadas y eliminadas** en la barra lateral permite restaurar las tareas ocultas. Al eliminar una tarea, se conservan su espacio de trabajo y sus archivos de conversación. La selección del proyecto cambia dónde se ejecutará el trabajo futuro; los archivos existentes permanecen en su carpeta original. Al crear una tarea derivada, se inician nuevas sesiones de CLI y se copian los adjuntos de la conversación; la opción de espacio de trabajo separado comienza con una carpeta vacía. Compartir muestra una vista previa de un documento Markdown local para copiarlo o guardarlo; no crea un enlace público alojado. Los cambios de las tareas se sincronizan entre las ventanas abiertas.

#### Vistas y cuota

La barra superior contiene ajustes de visualización y controles para mostrar u ocultar el registro de ejecución inferior y la barra lateral de cuentas. Su estado se guarda localmente. En Cuentas, **Consultar todas las cuentas** consulta cada perfil configurado y muestra la cuota disponible, las horas de restablecimiento, los créditos de restablecimiento de Codex y sus fechas de caducidad. Si una consulta falla, no se detiene la comprobación de las demás cuentas.

#### Imágenes

Pega capturas de pantalla, arrastra imágenes al cuadro de redacción o usa el botón de imagen (hasta cinco imágenes de 10 MB cada una). Codex recibe imágenes locales; Claude recibe contenido de imagen nativo cuando supera las comprobaciones de suscripción. La ejecución con imágenes en Claude aún no se ha verificado con una cuenta que haya iniciado sesión. Grok usa contenido de imagen directo cuando la CLI anuncia que lo admite; de lo contrario, su herramienta nativa Read abre las imágenes adjuntas. Esta vía se ha verificado con una cuenta de suscripción que ha iniciado sesión.

#### Mensajes y borradores

Envía más mensajes mientras se ejecuta el trabajo: esperan en orden y se pueden cancelar. Los ajustes permiten elegir Enter o Ctrl/⌘+Enter, así como entre la cola y las indicaciones en directo. Las indicaciones en directo usan el turno activo de Codex; los demás proveedores recurren a la cola. Los envíos fallidos o interrumpidos retienen los mensajes posteriores para su revisión. Los borradores se conservan al cambiar de tarea mientras la aplicación permanece abierta.

#### Vistas previas de archivos

Abre el panel de vista previa o haz clic en un enlace de archivo para ver imágenes, PDF, Markdown, código y texto. Los archivos de texto se pueden editar y guardar; antes de guardar, se comprueba si hay cambios externos. Las vistas previas de HTML muestran páginas independientes; los proyectos interactivos pueden usar la dirección HTTP en la que se estén ejecutando. Algunos sitios web bloquean la inserción en otras páginas. El panel de actividad muestra los resúmenes de razonamiento, los planes y el estado de ejecución que proporciona la CLI cuando están disponibles.

### Actualizaciones automáticas

1. **Buscar actualizaciones** informa «Actualización disponible» o «Ya está actualizado». No descarga nada ni reinicia la aplicación.
2. **Descargar y preparar** informa «La actualización está lista» cuando termina la preparación. Puedes seguir usando la versión actual.
3. **Actualizar y reiniciar** solo reinicia después de que hagas clic. Una vez que la nueva versión se inicia correctamente, aparece «Actualizado a vX.X.X» una sola vez. Los inicios normales y las reversiones a una versión anterior no muestran este mensaje de éxito.

**Buscar actualizaciones** en la barra lateral sigue las versiones estables publicadas en [GitHub Releases](https://github.com/shixi-11/prism-desk/releases). Muestra la versión instalada, la versión disponible y las notas de cambios antes de descargar. Elige **Más tarde** para seguir usando tu versión actual. Los commits normales de la rama principal no generan avisos de actualización. La búsqueda automática está activada de forma predeterminada: Prism comprueba si hay actualizaciones después del inicio y cada cuatro horas. Un punto azul fijo junto a Buscar actualizaciones y un icono de actualización en la barra superior indican que hay una versión disponible. La comprobación no descarga, instala ni reinicia la aplicación. Elige **Descargar y preparar** y, después, **Actualizar y reiniciar** cuando te convenga. El punto permanece hasta que la revisión instalada esté al día. Los borradores de cada ventana se guardan antes de reiniciar; las tareas, los mensajes en cola, las operaciones de cuentas, los diálogos de edición y las vistas previas bloquean el reinicio hasta que terminen o se cierren.

Las actualizaciones conservan la misma configuración de cuentas, el mismo almacenamiento de tareas y el mismo directorio de datos de usuario. La copia de trabajo original y la instalación anterior siguen disponibles. Si la descarga o la compilación fallan, la versión en ejecución permanece intacta; si la nueva aplicación no termina de iniciarse, volver a abrir Prism restaura la versión anterior. Los cambios locales en el código fuente bloquean las actualizaciones y la preparación requiere al menos 2 GB libres. Git debe permanecer instalado; la compilación de escritorio incluye el entorno de ejecución de Node y npm necesarios para futuras compilaciones. Las instalaciones anteriores a este sistema de actualización requieren, una sola vez, obtener manualmente los cambios y volver a compilar con los comandos de instalación anteriores.

### Día y noche

Alterna entre los temas claro y oscuro desde la barra superior.

| Día | Noche |
| --- | --- |
| ![Ilustración del tema diurno](src/assets/desert-day.jpg) | ![Ilustración del tema nocturno](src/assets/desert-night.jpg) |

*Ilustraciones de los temas utilizadas por la aplicación.*

### Configuración

La mayoría de los usuarios pueden conectar sus cuentas en **Cuentas → Conectar cuenta**. El archivo de configuración siguiente es una alternativa avanzada. Haz una copia de seguridad del archivo existente antes de copiar el ejemplo.

```powershell
New-Item -ItemType Directory -Force .local
Copy-Item config.example.json .local/config.json
```

Edita `.local/config.json` para adaptarlo a tu equipo. También puedes establecer `PRISM_CONFIG` en una ruta absoluta a un archivo de configuración.

Una configuración de una sola cuenta tiene este aspecto. Sustituye el directorio de inicio de sesión del ejemplo por el tuyo y elige un modelo disponible para tu cuenta. Al añadir más entradas a `profiles`, se añaden más cuentas de ejecución.

```json
{
  "profiles": [
    {
      "id": "codex-personal-1",
      "provider": "Codex",
      "name": "Personal 1",
      "home": "C:/PrismAccounts/codex-personal-1",
      "executable": "codex.exe",
      "model": "gpt-5.6-sol",
      "write": true
    }
  ]
}
```

| Campo | Finalidad |
| --- | --- |
| `profiles` | Cuentas de ejecución: ID, proveedor, nombre mostrado, directorio de inicio de sesión, ejecutable, modelo y permiso de escritura |
| `storageRoot` | Ubicación permanente de los registros de tareas |
| `assistant.path` | Directorio opcional del asistente que contiene `SKILL.md` |
| `assistant.instructions` | Instrucciones opcionales compartidas entre tareas |
| `skillsPath` | Directorio compartido de habilidades |
| `apps` | Nombres de aplicaciones asociados a rutas de ejecutables o archivos de entrada |

Usa rutas absolutas para los recursos locales y un directorio de inicio de sesión separado para cada cuenta. Mantén estables los ID de los perfiles: las tareas existentes los usan para identificar las cuentas. La estructura predeterminada de los perfiles se define en [electron/config.cjs](electron/config.cjs).

Las tareas se almacenan en el directorio de datos de usuario de la aplicación, salvo que se establezca `storageRoot`. Las credenciales de inicio de sesión permanecen en el directorio propio del proveedor. La configuración local, los registros de tareas y los logs se excluyen de Git.

### Permisos de archivos y comandos

Elige **Solo lectura**, **Editar el proyecto** o **Acceso completo** en el cuadro de redacción. Acceso completo está disponible para Codex, Claude y Grok: permite acceder a archivos fuera del proyecto y aprueba automáticamente la ejecución de herramientas, dentro de los permisos del sistema operativo. Los cambios realizados durante una ejecución quedan en cola para la siguiente. Las instalaciones nuevas usan Editar proyecto de forma predeterminada para las cuentas compatibles. Elige **Usar como permiso predeterminado para nuevas tareas** para guardar una preferencia; las tareas existentes conservan sus propios permisos. Los adaptadores de solo lectura siguen siendo de solo lectura.

### Cuentas y herramientas locales

Los adaptadores de Codex, Claude y Grok admiten tareas de edición de archivos. Grok respeta los permisos seleccionados para la tarea: Solo lectura desactiva las herramientas de edición y de shell; Editar proyecto usa el perfil de espacio de trabajo de la CLI y las confirmaciones de operaciones; Acceso completo permite ejecutar herramientas. Los perfiles existentes con `write: false` siguen siendo de solo lectura hasta que se habilite explícitamente la escritura. Los modelos disponibles dependen de la CLI instalada y de la cuenta seleccionada.

El panel de cuota muestra la información que devuelve el proveedor. En los periodos unificados válidos de Grok, los valores omitidos de uso nulo se interpretan como en el cliente oficial; las respuestas vacías, mal formadas o caducadas siguen considerándose desconocidas. Las consultas de Claude se reintentan una vez tras un fallo transitorio de conexión o la ausencia de una respuesta de uso, pero nunca después de un fallo de autenticación. Los errores de autenticación o de red no provocan un cambio de cuenta como si la cuota se hubiera agotado. La transferencia automática requiere una respuesta reconocida de agotamiento de cuota y que la ejecución anterior haya terminado.

Las direcciones de correo de las cuentas se ocultan parcialmente de forma predeterminada; usa el botón con forma de ojo para mostrarlas u ocultarlas. El historial de consultas permanece en este dispositivo. Después de reiniciar, los registros conservan su fecha y hora originales y se marcan para actualizarse. Las lecturas históricas nunca autorizan la ejecución ni el uso de créditos de restablecimiento.

Prism no recurre a la facturación mediante claves API ni compra créditos. La ejecución con Grok requiere confirmar que la facturación adicional está desactivada. Usar un crédito de restablecimiento de Codex existente requiere una confirmación independiente para la cuenta seleccionada. Puedes usar un crédito de restablecimiento mientras se ejecuta una tarea; la tarea continúa. Se mantienen la confirmación y la protección contra solicitudes duplicadas. Un turno que ya haya finalizado no se reinicia automáticamente. Una tarea inactiva puede seleccionar su cuenta, modelo y nivel de razonamiento mientras se ejecuta otra. Cambiar y continuar utiliza la cola existente sin interrumpir la tarea en ejecución. El uso adicional de Claude es informativo y no bloquea la ejecución en Prism. Su disponibilidad y facturación dependen de la configuración de la cuenta u organización de Claude; puede consumir créditos del equipo o generar cargos adicionales.

Los archivos del asistente y las habilidades se pueden compartir entre cuentas. Los permisos MCP y las conexiones con aplicaciones deben configurarse para cada entorno de ejecución. La detección de aplicaciones enumera los puntos de entrada instalados; la acción de verificación comprueba por separado las operaciones admitidas.

En **Capacidades compartidas**, la opción **Comprobar capacidades compartidas → Sincronizar fuentes locales** compara los archivos de entrada de las habilidades locales y sus rutas con la última sincronización. Las habilidades del sistema y las carpetas añadidas se incorporan al índice compartido al sincronizar. En **Fuentes y conexiones**, selecciona **Conectar referencias de habilidades** para cada plugin que quieras consultar. El siguiente turno de la tarea recibe el índice de referencias; los archivos originales permanecen en su ubicación.

La lista de plugins muestra la versión reconocida más reciente de cada caché local, que puede incluir paquetes desinstalados. Esto no confirma que sea la última versión publicada en línea ni que las herramientas estén autorizadas. Actualiza los plugins en su aplicación de origen y vuelve a comprobarlos. Las conexiones MCP de Codex requieren configuración y verificación independientes en la CLI de cada cuenta. Los canales de ejecución actuales de Claude, Grok y Gemini no habilitan MCP externos; conectar las referencias de habilidades no modifica esta limitación.

### Desarrollo

```powershell
npm test
npm run build
npm run build:desktop
```

Las pruebas unitarias usan datos de prueba de cuentas aislados. Las comprobaciones opcionales de escritorio y de CLI en condiciones reales se describen en [scripts/README.md](scripts/README.md); las comprobaciones en condiciones reales requieren cuentas de prueba y pueden consumir cuota de la suscripción.

Para informar de un problema, incluye las versiones de la aplicación y de la CLI, los pasos para reproducirlo y un mensaje de error sin información sensible. Elimina las credenciales, los datos de las cuentas y el contenido privado de las conversaciones antes de publicar.

### Reglas de publicación para colaboradores

Antes de publicar, lee [AGENTS.md](AGENTS.md) y [RELEASING.md](RELEASING.md). Cada publicación del software necesita una nueva versión, una única etiqueta inmutable y notas completas en inglés y chino simplificado. Ejecuta `npm run release:check` y las comprobaciones necesarias para el cambio. Las modificaciones que solo afectan a la documentación no requieren una nueva publicación del software.

### Licencia

[MIT](LICENSE). Prism Desk es un proyecto independiente. Los nombres y las marcas de los proveedores pertenecen a sus respectivos propietarios.
