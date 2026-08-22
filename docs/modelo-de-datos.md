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

## Enums

- `GlobalRole`: `ADMIN` · `STAFF` · `MIEMBRO`
- `AreaRole`: `JEFE_DE_AREA` · `TESORERO` · `MIEMBRO`
- `MemberStatus`: `ASPIRANTE` · `ACTIVO` · `INACTIVO` · `BAJA`
- `CourseKind`: `CIM` · `TECNICO` · `CERTIFICACION` · `TALLER`
- `EditionStatus`: `BORRADOR` · `INSCRIPCIONES_ABIERTAS` · `EN_CURSO` · `CONCLUIDA` · `CANCELADA`
- `EnrollmentStatus`: `PREINSCRITO` · `INSCRITO` · `ACREDITADO` · `NO_ACREDITADO` · `BAJA`
- `PaymentStatus`: `PENDIENTE` · `PARCIAL` · `PAGADO` · `EXENTO`

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
