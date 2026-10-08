#!/bin/zsh
# Recrea la base de prueba y carga esquema + ejemplos. Sale con error al primer fallo.
set -e
P=(/opt/homebrew/bin/psql -h 127.0.0.1 -p 5440 -U postgres)
D=${0:A:h:h}
$P -q -c "drop database if exists trim_prueba" -c "create database trim_prueba"
$P -d trim_prueba -v ON_ERROR_STOP=1 -q -f $D/esquema.sql
$P -d trim_prueba -v ON_ERROR_STOP=1 -q -f $D/ejemplos.sql
