# Modelo de datos

## Las decisiones que importan

**Un miembro pertenece a varias áreas, con un rol distinto en cada una.**
`AreaMembership` es la tabla puente y ahí vive el rol. Alguien puede ser jefe de Escalada y
simplemente miembro en Espeleología. El rol *global* (`User.role`) es otra cosa: gobierna el acceso
al panel, no la jerarquía dentro de un área.

**Curso y edición están separados.**
`Course` es la definición ("Curso Introductorio al Montañismo"). `CourseEdition` es una impartición
concreta ("CIM 2026-1", 7–8 de marzo, cupo 40, $350). El CIM tiene tres o cuatro ediciones por año;
sin esa separación habría que duplicar la definición cada vez.

**Un miembro puede tener uno o más cursos.**
`Enrollment` une miembro con edición y guarda el estado académico y el de pago por separado, porque
en la práctica avanzan a ritmos distintos: alguien puede estar acreditado y deber la cuota.

**El CIM lleva una salida por área.**
`EditionActivity` modela cada salida dentro de una edición, con su `areaId`. Es lo que hace que el
CIM funcione como muestrario de las ocho disciplinas. `POST /editions/:id/activities/generar-cim`
las crea todas de un golpe.

**Las solicitudes de ingreso no son miembros todavía.**
`MembershipApplication` recibe lo que llega del formulario público. Solo al aceptarla se crea el
`Member` real. Así el padrón no se contamina con curiosos y queda registro de quién revisó qué.

**Las bajas son lógicas, no borrados.**
Dar de baja a un miembro lo pasa a `status: BAJA` y desactiva su usuario, pero conserva su historial
de cursos. Lo mismo con áreas y cursos (`activa` / `activo`).

**Un evento no es una edición de curso.**
`CourseEdition` lleva inscripciones, pagos y acreditación; es el expediente académico.
`Event` es difusión: anuncia un taller, una salida o una junta, con su lugar o su liga de
videoconferencia. Separarlos evita que anunciar una plática obligue a abrir un curso con roster.

**La modalidad decide qué datos de ubicación son obligatorios.**
Un evento `PRESENCIAL` exige `lugar`; uno `EN_LINEA` exige `urlVideoconferencia`; uno
`HIBRIDA` exige ambos. Lo valida la API, no solo el formulario, así que no se puede publicar
un taller en línea sin liga.

**Los códigos se editan en el panel.**
El de cada área en *Actividad → Áreas*; el de cada curso al darlo de alta o editarlo en
*Actividad → Cursos*. El del curso encabeza la clave de sus ediciones: `CBER` produce
`CBER_2026A`, `CBER_2026B`… La clave se escribe en la edición cuando se crea, así que
**cambiar el código después no reescribe las claves ya emitidas**, y el histórico se conserva.

**Solo el curso base de un área da la membresía.**
Quien se registra declara los cursos que tomó (`CourseClaim`: curso + año + letra) y el jefe del
área los confirma. Aprobar el curso de `kind: AREA` crea la `AreaMembership` que abre esa área;
aprobar un `TALLER` lo deja en el historial pero **no da acceso**, porque un taller es formación
complementaria y no acredita la disciplina.

Nadie se acredita a sí mismo, y un jefe no puede ver ni resolver lo de un área que no encabeza.

**El correo se confirma antes de poder entrar.**
`EmailVerification` guarda el *hash* de la liga y del código, nunca el valor: quien lea la base
no puede activar cuentas ajenas. Las cuentas que crea un administrador desde el panel nacen
verificadas, porque ahí es él quien responde por la identidad de la persona.

**Las alergias son una lista, no un párrafo.**
`Member.alergias` es `String[]`. En campo se consultan de un vistazo, y una cadena suelta obliga
a leerla entera para encontrar lo importante. El tipo de sangre se valida contra un catálogo de
ocho valores y se guarda tal como se lee (`"O+"`), que es el mismo texto que va impreso en una
lista de salida.

Las sugerencias de alergia son un atajo, no una lista cerrada: se acepta texto libre, porque en un
expediente médico la alergia rara es justo la que hay que anotar.

**Borrar una edición y cancelarla no son lo mismo.**
Se borra la que nunca arrancó: se abrió, no hubo interesados y desaparece con su programa. Solo se
permite si nadie se inscribió. Se cancela la que sí tuvo gente: conserva inscripciones, programa y
calificaciones, con el motivo y quién la canceló. Borrar una edición con gente dentro falsearía el
historial de esas personas.

## Entidades

| Modelo | Para qué |
|---|---|
| `User` | Acceso al panel. Ligado 1-a-1 a un `Member`. Guarda `passwordHash` (bcrypt, 12 rondas). |
| `Member` | La persona. Incluye datos que la logística de salidas necesita: tipo de sangre, alergias, contacto de emergencia. |
| `MembershipApplication` | Solicitud del formulario público, antes de ser miembro. |
| `Area` | Las ocho disciplinas. Lleva su propio texto informativo para el sitio público. |
| `AreaMembership` | Miembro ↔ área, con rol y vigencia. |
| `Course` | Definición del curso. `areaId` nulo = transversal (el CIM). |
| `CourseEdition` | Una impartición: fechas, cupo, costo, sede, estado. |
| `EditionActivity` | Una salida o sesión dentro de una edición, con su área y responsable. |
| `Enrollment` | Miembro ↔ edición: estado académico, estado de pago, calificación. |
| `Event` | Curso, taller, salida o reunión que se anuncia. Lleva modalidad, ubicación y visibilidad. |
| `MediaAsset` | Registro de cada imagen subida desde el panel. El archivo vive en `apps/api/uploads`. |
| `EmailVerification` | Liga y código de confirmación, guardados como hash y con vencimiento. |
| `CourseClaim` | Curso que alguien declara haber tomado, con año y letra, a la espera del visto bueno de su área. |

## Enums

- `GlobalRole`: `ADMIN` · `STAFF` · `MIEMBRO`
- `AreaRole`: `JEFE_DE_AREA` · `JEFE_INTERINO` · `TESORERO` · `MIEMBRO`
- `MemberStatus`: `ASPIRANTE` · `ACTIVO` · `INACTIVO` · `BAJA`
- `CourseKind`: `CIM` · `AREA` · `TALLER` · `CERTIFICACION`
- `EditionStatus`: `BORRADOR` · `INSCRIPCIONES_ABIERTAS` · `EN_CURSO` · `CONCLUIDA` · `CANCELADA`
- `EnrollmentStatus`: `PREINSCRITO` · `INSCRITO` · `ACREDITADO` (aprobó) · `NO_ACREDITADO` (reprobó) · `DESERTO` · `BAJA`

**Desertar no es reprobar.** Quien reprueba llegó al final y no acreditó; quien deserta abandonó a
media edición. Y ninguno de los dos es una `BAJA`, que es retirarse antes de empezar o quedarse sin
curso porque la edición se canceló. Son tres hechos distintos y el historial de una persona los
distingue.
- `PaymentStatus`: `PENDIENTE` · `PARCIAL` · `PAGADO` · `EXENTO`
- `EventKind`: `CURSO` · `TALLER` · `SALIDA` · `REUNION` · `CONVOCATORIA` · `OTRO`
- `EventMode`: `PRESENCIAL` · `EN_LINEA` · `HIBRIDA`
- `EventVisibility`: `PUBLICO` · `MIEMBROS` · `AREA`
- `ClaimStatus`: `PENDIENTE` · `APROBADA` · `RECHAZADA`

## Roles

| Rol | Alcance |
|---|---|
| `ADMIN` | Mesa directiva: todo. |
| `STAFF` | Apoyo administrativo: captura, no borra. |
| `JEFE_CIM` | Coordina el curso introductorio. Resuelve las declaraciones del CIM, pero **no ve las áreas** salvo que tenga sus cursos aprobados. |
| `MIEMBRO` | Tiene al menos un curso de área aprobado. Ve lo de sus áreas. |
| `CIM` | Se registró y confirmó su correo, sin cursos de área aprobados todavía. Solo ve lo del CIM. |

### Nombramientos

Ser jefe titular (`JEFE_DE_AREA`) **exige tener aprobado un curso de esa área**. El cargo aprueba
los cursos de los demás, y no tendría sentido que lo ejerza quien no acreditó el suyo. La API lo
comprueba; no es solo un aviso en la pantalla.

Cuando nadie califica todavía —un área que arranca— la salida es `JEFE_INTERINO`: manda igual,
pero **siempre lleva fecha de término**, tope de doce meses, y al vencer deja de dar permisos solo,
sin que nadie tenga que acordarse de retirarlo.

Un área puede tener **más de un jefe a la vez**: hay co-jefaturas, y un interino puede convivir con
un titular. Por eso nombrar a uno nuevo no releva al anterior. Relevar es una acción aparte, y deja
a la persona como **miembro del área**, no fuera de ella: el jefe saliente rara vez abandona la
disciplina, solo deja de mandar.

Cada nombramiento guarda **quién lo hizo y por qué** (`asignadoPor`, `motivo`), para poder
responder "¿desde cuándo es jefe y quién lo puso?".

## Pertenecer y encabezar son dos cosas

`AreaMembership` dice que alguien **pertenece** al área: lo da el curso base y no se pierde.
`Jefatura` dice que alguien la **encabeza**: es un periodo con `desde` y `hasta`, sin restricción
de unicidad.

Estuvieron juntas y estaba mal. Con el cargo como campo de la membresía —única por persona y
área— relevar a alguien y volver a nombrarlo **pisaba el registro anterior**, y la asociación se
quedaba sin memoria de quién dirigió qué y cuándo. La co-jefatura tampoco cabía: dos titulares
simultáneos no entran en una fila.

Separadas, las dos preguntas se responden solas: "¿es de Escalada?" mira la membresía; "¿quién
manda hoy?" mira las jefaturas sin `hasta` o con `hasta` futuro. Relevar no borra: pone fecha
de término, quién relevó y por qué. Eso es lo que convierte la tabla en historial.

Un cargo **siempre cuelga de una persona del padrón**, con su teléfono y su boleta. No existe
una "cuenta de jefe": se nombra a alguien que ya está en el área, y al relevarlo sigue ahí.

`CourseEdition.instructores` cierra la otra mitad de la pregunta —qué impartió cada quien—, y el
historial las cruza por fecha en vez de llevar una lista aparte, para que no haya dos verdades.

Encabezar un área es un `Cargo` (`JEFE_DE_AREA`, `JEFE_INTERINO`, `TESORERO`), no un rol global:
alguien puede ser jefe de Escalada y miembro raso en Espeleología. **Un jefe no ve otra área a menos que tenga
el curso aprobado de ella** — el padrón, las declaraciones y los eventos privados se filtran por
las áreas a las que de verdad pertenece.

**El CIM es la excepción deliberada.** Un jefe ve sus estadísticas encabece el área que encabece:
cuánta gente se apuntó, cuántos todavía no pertenecen a ninguna área y qué día le toca la salida
de su disciplina. Es la puerta de entrada a la asociación —ahí están sus futuros miembros— y cada
área pone una salida dentro del curso, así que ocultárselo sería esconderle su propio trabajo.
Lo que **no** ve es el padrón del CIM: cifras sí, datos personales de quien no es suyo todavía no.

## Requisitos entre cursos

Un curso puede exigir que otros estén acreditados antes (`Course.requiere`, autorrelación
muchos-a-muchos). Hoy solo **Alta Montaña** los tiene: exige el CIM y el Curso Básico de Media
Montaña, porque no se sube arriba de los 4,000 m sin haber caminado antes.

La regla vive en **datos, no en código**: el catálogo lo maneja la asociación, y si mañana
Espeleología pide lo mismo se marca en la pantalla de cursos sin tocar el programa. La mesa
directiva es la única que puede fijarlos, porque un requisito ata dos áreas y ningún jefe manda
sobre la otra.

Se comprueban al **inscribir**, y cuentan por igual la declaración histórica aprobada por el jefe
de área (para quien lo tomó antes de que existiera el sistema) y la inscripción acreditada aquí
dentro. Un administrador puede inscribir de todos modos con `omitirRequisitos`; la excepción
queda escrita en las notas de la inscripción, porque sin rastro sería invisible al siguiente que
revise.

## Relaciones

```
User 1──1 Member ──< AreaMembership >── Area
                │                        │
                │                        ├──< Course ──< CourseEdition
                │                        │                    │
                └──────< Enrollment >────┼────────────────────┘
                                         │
                              EditionActivity (salida de un área
                                              dentro de una edición)
```

## Nota sobre Boulder

El área quedó como una sola, `boulder`, cubriendo indoor y outdoor, ya que comparte mesa y padrón.
Si en la práctica funcionan como áreas separadas con jefe y tesorero propios, se dividen agregando
un segundo registro en `Area` — no requiere cambio de schema.
