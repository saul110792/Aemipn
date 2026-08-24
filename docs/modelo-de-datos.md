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

**El acceso a un área se gana con un curso aprobado.**
Quien se registra declara los cursos que tomó (`CourseClaim`: curso + año + letra). El jefe de
esa área lo confirma, y solo entonces se le crea la `AreaMembership` que le abre esa área. Nadie
se acredita a sí mismo, y un jefe no puede ver ni resolver lo de un área que no encabeza.

**El correo se confirma antes de poder entrar.**
`EmailVerification` guarda el *hash* de la liga y del código, nunca el valor: quien lea la base
no puede activar cuentas ajenas. Las cuentas que crea un administrador desde el panel nacen
verificadas, porque ahí es él quien responde por la identidad de la persona.

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
- `AreaRole`: `JEFE_DE_AREA` · `TESORERO` · `MIEMBRO`
- `MemberStatus`: `ASPIRANTE` · `ACTIVO` · `INACTIVO` · `BAJA`
- `CourseKind`: `CIM` · `TECNICO` · `CERTIFICACION` · `TALLER`
- `EditionStatus`: `BORRADOR` · `INSCRIPCIONES_ABIERTAS` · `EN_CURSO` · `CONCLUIDA` · `CANCELADA`
- `EnrollmentStatus`: `PREINSCRITO` · `INSCRITO` · `ACREDITADO` · `NO_ACREDITADO` · `BAJA`
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

Encabezar un área es un `AreaRole` (`JEFE_DE_AREA`, `TESORERO`), no un rol global: alguien puede
ser jefe de Escalada y miembro raso en Espeleología. **Un jefe no ve otra área a menos que tenga
el curso aprobado de ella** — el padrón, las declaraciones y los eventos privados se filtran por
las áreas a las que de verdad pertenece.

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
