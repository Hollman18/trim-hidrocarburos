#!/bin/zsh
# Validación de punta a punta del modelo de datos en un cluster temporal de
# PostgreSQL 16: crea el cluster, corre esquema.sql, carga ejemplos.sql, prueba
# que las restricciones muerden, comprueba los cuadres, arma y compara
# tablas.json, mira si hay TimescaleDB, y al final detiene el cluster y borra su
# carpeta. Todo lo que pasa va a validacion.log; un error detiene la corrida.
# Uso: herramientas/validar.sh <raiz del proyecto>
set -e
setopt pipefail
RAIZ=${1:?falta la raíz del proyecto}
M=${0:A:h:h}                     # la carpeta del modelo (docs/backend/sql)
S=$(mktemp -d -t trim-modelo)    # el cluster vive fuera del repositorio y se borra al final
PGD=$S/pg
LOG=$M/validacion.log
# Los binarios de PostgreSQL 16: los del PATH, o PG_BIN si se indica.
BIN=${PG_BIN:-${$(command -v psql):h}}
[[ -x $BIN/initdb && -x $BIN/pg_ctl ]] || { echo "no encuentro initdb y pg_ctl en $BIN (indique PG_BIN)"; exit 1 }
P=($BIN/psql -h 127.0.0.1 -p 5440 -U postgres -v ON_ERROR_STOP=1)

{
echo "# Validación del modelo de datos · $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo "$($BIN/initdb --version) · $($BIN/psql --version) · node $(node --version)"
echo
echo "## 1. Cluster temporal"
[[ -e $PGD ]] && { echo "ya existe $PGD: se detiene"; exit 1 }
$BIN/initdb -D $PGD -U postgres --no-locale -E UTF8 > $S/initdb.log
echo "initdb -D <temporal>/pg -U postgres --no-locale -E UTF8: bien"
echo "El cluster escucha por TCP en 127.0.0.1:5440, sin socket Unix (-k ''): la ruta del socket en una carpeta temporal puede pasar el máximo de 103 caracteres de macOS."
$BIN/pg_ctl -D $PGD -o "-p 5440 -k '' -c listen_addresses=127.0.0.1 -c timezone=UTC" -l $S/pg.log -w start
$P -q -c "create database trim_prueba" -c "create database trim_vacia"

echo
echo "## 2. esquema.sql (psql -v ON_ERROR_STOP=1 -f esquema.sql)"
$P -d trim_prueba -q -f $M/esquema.sql
$P -d trim_vacia -q -f $M/esquema.sql > /dev/null
$P -d trim_prueba -At -c "select format('%s tablas (sin contar %s particiones de lectura), %s vistas, %s funciones, %s triggers, %s índices, %s restricciones (%s PK, %s FK, %s únicas, %s check)',
  count(*) filter (where relkind in ('r','p') and not relispartition), count(*) filter (where relispartition), count(*) filter (where relkind = 'v'),
  (select count(*) from pg_proc where pronamespace = 'trim'::regnamespace),
  (select count(*) from pg_trigger t join pg_class c on c.oid = t.tgrelid where c.relnamespace = 'trim'::regnamespace and not t.tgisinternal and not c.relispartition),
  (select count(*) from pg_class where relnamespace = 'trim'::regnamespace and relkind in ('i','I')),
  (select count(*) from pg_constraint where connamespace = 'trim'::regnamespace and conrelid in (select oid from pg_class where not relispartition)),
  (select count(*) from pg_constraint where connamespace = 'trim'::regnamespace and contype = 'p' and conrelid in (select oid from pg_class where not relispartition)),
  (select count(*) from pg_constraint where connamespace = 'trim'::regnamespace and contype = 'f' and conrelid in (select oid from pg_class where not relispartition)),
  (select count(*) from pg_constraint where connamespace = 'trim'::regnamespace and contype = 'u' and conrelid in (select oid from pg_class where not relispartition)),
  (select count(*) from pg_constraint where connamespace = 'trim'::regnamespace and contype = 'c' and conrelid in (select oid from pg_class where not relispartition)))
  from pg_class where relnamespace = 'trim'::regnamespace"

echo
echo "## 3. ejemplos.sql (filas reales del demo)"
# El volcado del motor corre dentro del proyecto (los imports «bare» solo resuelven ahí) y se borra siempre.
cp $M/herramientas/motor-a-json.mjs $RAIZ/scripts/.doc-E-filas.mjs
{ (cd $RAIZ && node scripts/.doc-E-filas.mjs $M/herramientas/motor.json) } always { rm -f $RAIZ/scripts/.doc-E-filas.mjs }
node $M/herramientas/generar-ejemplos.mjs $RAIZ $M/ejemplos.sql
$P -d trim_prueba -q -f $M/ejemplos.sql
$P -d trim_prueba -At -c "analyze" -c "select 'filas por tabla: ' || string_agg(format('%s %s', c.relname, c.reltuples::bigint), ' · ' order by c.relname) from pg_class c where c.relnamespace = 'trim'::regnamespace and c.relkind = 'r' and c.reltuples > 0 and not c.relispartition"
$P -d trim_prueba -At -c "select 'lectura (por partición): ' || string_agg(format('%s %s', c.relname, c.reltuples::bigint), ' · ' order by c.relname) from pg_class c where c.relnamespace = 'trim'::regnamespace and c.relispartition and c.relkind = 'r' and c.reltuples > 0"

echo
echo "## 4. Las restricciones muerden (pruebas.sql)"
$P -d trim_prueba -q -f $M/pruebas.sql 2>&1 | grep -v '^$' | grep -v 'truncate cascades' | sed -E 's/^psql:[^ ]+ //'
echo "$(grep -c '^select pg_temp.muerde(' $M/pruebas.sql) rechazos esperados y $(grep -c '^select pg_temp.pasa(' $M/pruebas.sql) aceptaciones esperadas: todas como se esperaba (una sola que no, y la corrida se habría detenido)."

echo
echo "## 5. Cuadres de los datos cargados (cuadres.sql)"
$P -d trim_prueba -q -f $M/cuadres.sql 2>&1 | grep -v '^$' | sed -E 's/^psql:[^ ]+ //'

echo
echo "## 6. tablas.json contra esquema.sql"
node $M/herramientas/armar-tablas.mjs trim_prueba $M/tablas.json
node $M/herramientas/comprobar-tablas.mjs trim_vacia $M/tablas.json

echo
echo "## 7. TimescaleDB"
if [[ "$($P -d trim_prueba -At -c "select count(*) from pg_available_extensions where name = 'timescaledb'")" == 0 ]]; then
  echo "TimescaleDB NO está instalado en este PostgreSQL (pg_available_extensions no la trae): no se instaló."
  echo "timescale.sql queda revisado a mano y SIN ejecutar; la base funciona con las particiones nativas mensuales de lectura."
else
  $P -d trim_prueba -f $M/timescale.sql
  echo "timescale.sql corrió bien."
fi

echo
echo "## 8. Cierre"
$BIN/pg_ctl -D $PGD -m fast -w stop
rm -rf $PGD
rm -rf $S
[[ ! -e $PGD ]] && echo "cluster detenido y su carpeta temporal borrada."
echo "VALIDACIÓN TERMINADA SIN ERRORES"
} 2>&1 | tee $LOG
