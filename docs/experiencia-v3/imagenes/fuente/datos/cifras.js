// Generado por scripts/armar-cifras.mjs: cifras del motor del demo, leídas en http://localhost:5183. No editar a mano.
window.DEMO = {
 "_fuente": {
  "leido": [
   "2026-10-27T15:13:03.287Z",
   "2026-10-27T15:12:39.180Z",
   "2026-10-27T15:17:10.930Z",
   "2026-10-27T15:12:03.664Z"
  ],
  "como": [
   "pedirPlantaViva({campos, momento:\"durante\", desde: 1 de oct, hasta: ctx.ahora}) en http://localhost:5183",
   "pedirNivelEquipo('ceiba','P-201B', sesion().ctx, sesion().versiones) en http://localhost:5183",
   "pedirHoy({rol, campos:['ceiba']}, sesion()) en http://localhost:5183"
  ],
  "reloj": "demo: 2 de oct de 2026, datos de las 14:00"
 },
 "franja": {
  "portafolio": {
   "p1": 4,
   "p2": 8,
   "p3": 2,
   "sincom": 0
  },
  "ceiba": {
   "p1": 2,
   "p2": 2,
   "p3": 1,
   "sincom": 0
  },
  "_ruta": "#/ger/planta-viva/ceiba~portafolio/curso y …/ceiba/curso (texto-demo.json)"
 },
 "ger": {
  "ahora": 2650,
  "ahoraFrase": "se dejan de producir.",
  "explica": "Lo que más pesa: la bomba de agua P-201B, en La Ceiba. Hay 4 de 87 pozos parados.",
  "pozos": {
   "parados": 4,
   "total": 87
  },
  "filas": [
   {
    "campo": "La Ceiba",
    "bpd": 1966,
    "tramo": "planta",
    "equipo": "P-201B",
    "familia": "bomba de agua",
    "prioridad": 1,
    "linea": "alarma · en la planta, P-201B (bomba de agua)",
    "gas": false
   },
   {
    "campo": "Morichal Norte",
    "bpd": 684,
    "tramo": "pozo",
    "equipo": "MN-41",
    "familia": "electrosumergible",
    "prioridad": 1,
    "linea": "alarma · en los pozos, MN-41 (electrosumergible)",
    "gas": false
   },
   {
    "campo": "Guacamayo",
    "bpd": 0,
    "tramo": null,
    "equipo": null,
    "familia": null,
    "prioridad": 0,
    "linea": "produce sin paradas ahora",
    "gas": false
   },
   {
    "campo": "El Palmar",
    "bpd": 0,
    "tramo": null,
    "equipo": null,
    "familia": null,
    "prioridad": 0,
    "linea": "produce sin paradas ahora",
    "gas": false
   },
   {
    "campo": "La Zarza",
    "bpd": 0,
    "tramo": null,
    "equipo": null,
    "familia": null,
    "prioridad": 0,
    "linea": "campo de gas: su tubería todavía no está",
    "gas": true
   }
  ],
  "esteMes": {
   "bbl": 2376,
   "rango": [
    2132,
    2622
   ],
   "usd": 114,
   "nota": "MN-41, el 46 % · 355 sin causa"
  },
  "produccion": {
   "real": 40514,
   "meta": 40200,
   "bajoMeta": false
  },
  "mesAMes": {
   "maximo": 2300,
   "actual": 1501,
   "meses": [
    {
     "r": "OCT 2025",
     "t": 1534,
     "a": 836,
     "enCurso": false
    },
    {
     "r": "NOV",
     "t": 1070,
     "a": 683,
     "enCurso": false
    },
    {
     "r": "DIC",
     "t": 1557,
     "a": 779,
     "enCurso": false
    },
    {
     "r": "ENE 2026",
     "t": 591,
     "a": 221,
     "enCurso": false
    },
    {
     "r": "FEB",
     "t": 1146,
     "a": 1051,
     "enCurso": false
    },
    {
     "r": "MAR",
     "t": 1723,
     "a": 725,
     "enCurso": false
    },
    {
     "r": "ABR",
     "t": 865,
     "a": 582,
     "enCurso": false
    },
    {
     "r": "MAY",
     "t": 1844,
     "a": 557,
     "enCurso": false
    },
    {
     "r": "JUN",
     "t": 988,
     "a": 697,
     "enCurso": false
    },
    {
     "r": "JUL",
     "t": 1646,
     "a": 1204,
     "enCurso": false
    },
    {
     "r": "AGO",
     "t": 1735,
     "a": 1152,
     "enCurso": false
    },
    {
     "r": "SEP",
     "t": 1131,
     "a": 826,
     "enCurso": false
    },
    {
     "r": "OCT",
     "t": 1501,
     "a": 1054,
     "enCurso": true
    }
   ]
  },
  "bajando": [
   {
    "donde": "en la planta",
    "antes": 561,
    "ahora": 308,
    "pct": -45
   },
   {
    "donde": "en los pozos",
    "antes": 820,
    "ahora": 771,
    "pct": -6
   }
  ],
  "bajandoNota": "1 de sept, frente a jun a ago · muestra corta",
  "perdida": "Pérdida: nada registrado en octubre",
  "planes": "0 de 10 planes en marcha"
 },
 "ceiba": {
  "ahora": 1966,
  "sale": 9394,
  "meta": 10900,
  "tramos": [
   {
    "tramo": "reservorio",
    "nombre": "Yacimiento",
    "limita": false,
    "marcado": false,
    "cabe": null,
    "entero": 0,
    "linea": "la roca",
    "sinDato": true
   },
   {
    "tramo": "pozo",
    "nombre": "Pozos",
    "limita": true,
    "marcado": false,
    "cabe": 11857,
    "entero": 0,
    "linea": "15 de 18 en marcha",
    "sinDato": false
   },
   {
    "tramo": "planta",
    "nombre": "Planta",
    "limita": false,
    "marcado": true,
    "cabe": 13000,
    "entero": 1665,
    "linea": "no pasan 1.665 bbl/d",
    "sinDato": false
   },
   {
    "tramo": "exportacion",
    "nombre": "Salida",
    "limita": false,
    "marcado": false,
    "cabe": 14000,
    "entero": 0,
    "linea": "el oleoducto recibe",
    "sinDato": false
   }
  ],
  "pasa": 9394,
  "produccion": {
   "real": 10700,
   "meta": 10900
  }
 },
 "sup": {
  "porConfirmar": 4,
  "limite": "mañana antes de las 07:00",
  "frase": "Se dejan de producir 1.966 bbl/d. Le faltan 4 paradas por confirmar: el reporte sale mañana antes de las 07:00.",
  "ahora": 1966,
  "turnoBbl": 723,
  "turnoH": 12,
  "bloqueo": {
   "campoId": "ceiba",
   "equipos": [
    "P-201B",
    "LC-21"
   ],
   "texto": "No arrancar P-201B ni LC-21 hasta identificar qué se dañó",
   "sub": "Si arranca antes, queda como no conformidad."
  },
  "tareas": [
   {
    "id": "confirmar:ceiba|op-mantenimiento · planta · diferida · no-planeada · NP_PROC · NP_PROC/parada-estacion-bombeo-afecta-pozos",
    "tipo": "confirmar",
    "campoId": "ceiba",
    "capacidad": "anh:confirmar",
    "pide": true,
    "grupo": "hora",
    "limite": "2026-10-03T07:00:00-05:00",
    "bblAhora": 1665.1829227413677,
    "desde": "2026-10-02T10:43:00.000Z",
    "titulo": "Confirmar 2 paradas iguales",
    "donde": {
     "equipo": "P-201B",
     "marca": "alarma",
     "texto": "cerró LC-07 y LC-16 · 05:43",
     "corto": "cerró LC-07 y LC-16"
    },
    "porque": [
     "TRIM las dedujo: ",
     {
      "b": "en la planta, no planeada"
     },
     ". Falta su confirmación."
    ],
    "porqueCorto": [
     "TRIM las dedujo: ",
     {
      "b": "en la planta, no planeada"
     },
     "."
    ],
    "accion": {
     "tipo": "confirmar",
     "texto": "Confirmar las 2",
     "ids": [
      "EP-LC07-261002-79@2026-10-02#1",
      "EP-LC16-261002-78@2026-10-02#1"
     ],
     "cadena": "op-mantenimiento · planta · diferida · no-planeada · NP_PROC · NP_PROC/parada-estacion-bombeo-afecta-pozos",
     "pozos": [
      "LC-07",
      "LC-16"
     ]
    },
    "ver": {
     "texto": "Ver una por una",
     "destino": {
      "a": "paradas"
     }
    }
   },
   {
    "id": "conseguir-causa:ceiba",
    "tipo": "conseguir-causa",
    "campoId": "ceiba",
    "capacidad": "causa:declarar",
    "pide": true,
    "grupo": "barriles",
    "bblAhora": 300.8443255125371,
    "desde": "2026-10-01T23:20:00.000Z",
    "titulo": "Conseguir la causa de 2 paradas",
    "donde": {
     "equipo": "LC-21",
     "marca": "atencion",
     "texto": "lleva 19,7 h sin causa; se escaló a las 20:20",
     "corto": "lleva 19,7 h sin causa"
    },
    "porque": [
     {
      "b": "LC-08"
     },
     " arrancó a la 01:10 sin identificar",
     " · ",
     "Entre las 2: ",
     {
      "b": "219 bbl hoy"
     },
     " · 355 desde que pararon"
    ],
    "porqueCorto": [
     {
      "b": "LC-08"
     },
     " arrancó sin identificar",
     " · ",
     "Entre las 2: ",
     {
      "b": "219 bbl hoy"
     }
    ],
    "accion": {
     "tipo": "responder",
     "texto": "Responder yo"
    },
    "ver": {
     "texto": "Ver el chat",
     "destino": {
      "a": "paradas"
     }
    },
    "preguntas": [
     {
      "id": "libro:EP-LC21-261001-01",
      "via": "libro",
      "campoId": "ceiba",
      "equipo": "LC-21",
      "sobre": "pozo",
      "marca": "atencion",
      "contexto": "LC-21 · pozo · paró el 1 de oct a las 18:20, hace 19,7 h",
      "contextoCorto": "LC-21 · pozo · paró ayer en la tarde",
      "texto": "¿Por qué paró?",
      "opciones": [
       {
        "tipo": "texto",
        "texto": "Cierre para prueba o intervención del pozo",
        "valor": "Cierre para prueba o intervención del pozo"
       },
       {
        "tipo": "texto",
        "texto": "Fuga o daño en la línea de flujo",
        "valor": "Fuga o daño en la línea de flujo"
       },
       {
        "tipo": "texto",
        "texto": "Orden de producción",
        "dato": "nominación o restricción del comprador",
        "valor": "Orden de producción: nominación o restricción del comprador"
       },
       {
        "tipo": "texto",
        "texto": "Falla del controlador o de un instrumento del pozo",
        "valor": "Falla del controlador o de un instrumento del pozo"
       },
       {
        "tipo": "no-se",
        "texto": "Todavía no sé",
        "dato": "se la vuelven a preguntar en la próxima ronda"
       }
      ],
      "bloqueo": {
       "texto": "No lo arranque hasta decir qué pasó",
       "sub": "Si arranca antes, queda como no conformidad."
      },
      "tramo": {
       "choke": "pozo",
       "rotulo": "pozos"
      },
      "libro": {
       "evento": "EP-LC21-261001-01",
       "campoId": "ceiba",
       "equipo": "LC-21"
      }
     },
     {
      "id": "libro:EP-LC08-261001-02",
      "via": "libro",
      "campoId": "ceiba",
      "equipo": "LC-08",
      "sobre": "pozo",
      "contexto": "LC-08 · pozo · paró el 1 de oct a las 22:15 y arrancó hoy a la 01:10 sin identificar",
      "contextoCorto": "LC-08 · pozo · arrancó hoy en la madrugada sin identificar",
      "texto": "¿Qué se dañó?",
      "opciones": [
       {
        "tipo": "parte",
        "texto": "Aislamiento del motor y del cable",
        "parte": "aislamiento",
        "modos": [
         {
          "codigo": "UST",
          "texto": "Se disparó sin daño a la vista"
         },
         {
          "codigo": "BRD",
          "texto": "Se quemó o dio a tierra"
         },
         {
          "codigo": "OTH",
          "texto": "Otra cosa",
          "escribe": true
         }
        ],
        "pregunta": "Aislamiento del motor y del cable: ¿qué vio?"
       },
       {
        "tipo": "parte",
        "texto": "Protector (sello del motor)",
        "parte": "protector",
        "modos": [
         {
          "codigo": "INL",
          "texto": "Fuga interna"
         },
         {
          "codigo": "OHE",
          "texto": "Recalentada"
         },
         {
          "codigo": "OTH",
          "texto": "Otra cosa",
          "escribe": true
         }
        ],
        "pregunta": "Protector (sello del motor): ¿qué vio?"
       },
       {
        "tipo": "parte",
        "texto": "Bomba de fondo (eje y etapas)",
        "parte": "bomba",
        "modos": [
         {
          "codigo": "UST",
          "texto": "Se disparó sin daño a la vista"
         },
         {
          "codigo": "LOO",
          "texto": "Bajó el caudal"
         },
         {
          "codigo": "PLU",
          "texto": "Tapada"
         },
         {
          "codigo": "OTH",
          "texto": "Otra cosa",
          "escribe": true
         }
        ],
        "pregunta": "Bomba de fondo (eje y etapas): ¿qué vio?"
       },
       {
        "tipo": "parte",
        "texto": "Admisión y separador de gas",
        "parte": "admision",
        "modos": [
         {
          "codigo": "UST",
          "texto": "Se disparó sin daño a la vista"
         },
         {
          "codigo": "LOO",
          "texto": "Bajó el caudal"
         },
         {
          "codigo": "OTH",
          "texto": "Otra cosa",
          "escribe": true
         }
        ],
        "pregunta": "Admisión y separador de gas: ¿qué vio?"
       },
       {
        "tipo": "parte",
        "texto": "Motor de fondo",
        "parte": "motor",
        "modos": [
         {
          "codigo": "OHE",
          "texto": "Recalentada"
         },
         {
          "codigo": "UST",
          "texto": "Se disparó sin daño a la vista"
         },
         {
          "codigo": "OTH",
          "texto": "Otra cosa",
          "escribe": true
         }
        ],
        "pregunta": "Motor de fondo: ¿qué vio?"
       },
       {
        "tipo": "causas",
        "texto": "No fue la electrosumergible",
        "dato": "otra causa del pozo",
        "causas": [
         {
          "texto": "Cierre para prueba o intervención del pozo",
          "valor": "Cierre para prueba o intervención del pozo"
         },
         {
          "texto": "Fuga o daño en la línea de flujo",
          "valor": "Fuga o daño en la línea de flujo"
         },
         {
          "texto": "Orden de producción",
          "dato": "nominación o restricción del comprador",
          "valor": "Orden de producción: nominación o restricción del comprador"
         },
         {
          "texto": "Falla del controlador o de un instrumento del pozo",
          "valor": "Falla del controlador o de un instrumento del pozo"
         }
        ]
       },
       {
        "tipo": "no-se",
        "texto": "Todavía no sé",
        "dato": "se la vuelven a preguntar en la próxima ronda"
       }
      ],
      "tramo": {
       "choke": "pozo",
       "rotulo": "pozos"
      },
      "libro": {
       "evento": "EP-LC08-261001-02",
       "campoId": "ceiba",
       "equipo": "LC-08"
      }
     }
    ]
   },
   {
    "campoId": "ceiba",
    "capacidad": "sap:aviso",
    "pide": true,
    "grupo": "barriles",
    "bblSiPara": 9394.199400160593,
    "donde": {
     "equipo": "K-101",
     "marca": "alarma",
     "texto": "aire de instrumentos · ya pasó el límite"
    },
    "id": "orden:ceiba:40012056",
    "tipo": "orden",
    "titulo": "Seguir la orden de K-101",
    "desde": "2026-10-02T09:10:00-05:00",
    "porque": [
     "Si para, hasta ",
     {
      "b": "9.394 bbl/d"
     },
     ". ",
     "Orden 40012056, liberada a Óscar Daza a las 09:10."
    ],
    "porqueCorto": [
     "Si para, hasta ",
     {
      "b": "9.394 bbl/d"
     },
     ". "
    ],
    "ver": {
     "texto": "Ver la orden",
     "destino": {
      "a": "equipo",
      "campoId": "ceiba",
      "equipo": "K-101"
     }
    }
   },
   {
    "id": "planes:ceiba|P-201B",
    "tipo": "planes",
    "campoId": "ceiba",
    "capacidad": "planes:decidir",
    "pide": true,
    "grupo": "demas",
    "titulo": "Decidir 3 planes de P-201B · simulado",
    "tituloCorto": "Decidir planes · simulado",
    "donde": {
     "equipo": "P-201B",
     "marca": "alarma",
     "texto": "volver antes de 39 h"
    },
    "porque": [
     "Simulado: ",
     {
      "b": "2.133 bbl"
     },
     " que se pueden mover si se ejecutan."
    ],
    "ver": {
     "texto": "Ver los planes",
     "destino": {
      "a": "equipo",
      "campoId": "ceiba",
      "equipo": "P-201B"
     }
    }
   },
   {
    "id": "aviso:fragil:ceiba",
    "tipo": "aviso",
    "campoId": "ceiba",
    "pide": false,
    "grupo": "aviso",
    "titulo": "Lo más frágil: el agua.",
    "porque": [
     "Si para otra bomba, cierre primero LC-02, LC-10 y LC-01: dejan de producirse 3.059 bbl/d después de 2 min."
    ],
    "porqueCorto": [
     "Si para otra bomba, cierre primero LC-02, LC-10 y LC-01."
    ],
    "ver": {
     "texto": "Ver el orden",
     "destino": {
      "a": "agua"
     }
    }
   }
  ],
  "campo": {
   "campoId": "ceiba",
   "tramos": [
    {
     "choke": "pozo",
     "rotulo": "pozos",
     "limita": true,
     "trabado": false
    },
    {
     "choke": "planta",
     "rotulo": "planta",
     "limita": false,
     "trabado": true
    },
    {
     "choke": "exportacion",
     "rotulo": "salida",
     "limita": false,
     "trabado": false
    }
   ],
   "frases": [
    [
     "En la planta no pasan ",
     {
      "b": "1.665 bbl/d"
     },
     "; limitan los pozos."
    ],
    [
     "Tanque de agua ",
     {
      "b": "89,6 %"
     },
     ": no sube, P-201A y P-201C toman lo que entra."
    ]
   ]
  }
 },
 "p201b": {
  "campoId": "ceiba",
  "campoNombre": "La Ceiba",
  "equipo": "P-201B",
  "subtitulo": "bomba multietapa de transferencia de agua · tratamiento de agua · criticidad 5 de 5",
  "familia": "bomba de agua",
  "tipo": "bomba",
  "tren": "agua",
  "vecinos": {
   "anterior": "P-201A",
   "siguiente": "P-201C"
  },
  "registrado": true,
  "vigila": true,
  "condicion": "alarma",
  "parado": true,
  "previo": "Alarma · parada desde hoy, 03:52 · hace 10,1 h",
  "cifra": {
   "valor": 1665,
   "frase": "se dejan de producir: cerró LC-07 y LC-16."
  },
  "bloqueo": {
   "texto": "No arrancar hasta identificar qué se dañó",
   "sub": "Si arranca antes, queda como no conformidad."
  },
  "pregunta": {
   "sobre": "bomba",
   "evento": "EV-2011-1002"
  },
  "senales": [
   {
    "tag": "PI-2010",
    "nombre": "Presión de succión",
    "unidad": "psi",
    "valor": 18.2,
    "decimales": 1,
    "escala": [
     0,
     20
    ],
    "banda": [
     10,
     null
    ],
    "alarmas": [
     8
    ],
    "limite": "normal > 10 · alarma 8",
    "serie": [
     12.1,
     12,
     12.2,
     12.1,
     11.9,
     12,
     12.1,
     11.8,
     11.9,
     12,
     13.4,
     18.2
    ],
    "gris": true
   },
   {
    "tag": "FI-2011",
    "nombre": "Caudal",
    "unidad": "bbl/d",
    "valor": 0,
    "decimales": 0,
    "escala": [
     44350,
     111700
    ],
    "banda": [
     66800,
     89250
    ],
    "alarmas": [],
    "limite": "normal 66.800 – 89.250",
    "serie": [
     74220,
     74190,
     74250,
     74200,
     74180,
     74230,
     74210,
     74190,
     74200,
     74160,
     63070,
     0
    ],
    "gris": true,
    "fuera": "abajo"
   },
   {
    "tag": "II-2011",
    "nombre": "Corriente del motor",
    "unidad": "A",
    "valor": 0,
    "decimales": 0,
    "escala": [
     195,
     570
    ],
    "banda": [
     320,
     445
    ],
    "alarmas": [],
    "limite": "normal 320 – 445",
    "serie": [
     398,
     402,
     408,
     405,
     412,
     419,
     425,
     432,
     436,
     429,
     378,
     0
    ],
    "gris": true,
    "fuera": "abajo"
   },
   {
    "tag": "TI-2011",
    "nombre": "Temperatura de cojinete",
    "unidad": "°C",
    "valor": 41,
    "decimales": 0,
    "escala": [
     0,
     170
    ],
    "banda": [
     null,
     85
    ],
    "alarmas": [
     85
    ],
    "limite": "normal < 85 · alarma 85",
    "serie": [
     38,
     39,
     39,
     40,
     40,
     41,
     42,
     43,
     44,
     45,
     43,
     41
    ],
    "gris": true
   },
   {
    "tag": "PDI-2011",
    "nombre": "Presión de descarga",
    "unidad": "psi",
    "valor": 0,
    "decimales": 0,
    "escala": [
     120,
     300
    ],
    "banda": [
     180,
     240
    ],
    "alarmas": [],
    "limite": "normal 180 – 240",
    "serie": [
     214,
     212,
     215,
     211,
     210,
     208,
     205,
     201,
     198,
     194,
     160,
     0
    ],
    "gris": true,
    "fuera": "abajo"
   },
   {
    "tag": "VI-2011",
    "nombre": "Vibración global",
    "unidad": "mm/s",
    "valor": 0,
    "decimales": 1,
    "escala": [
     0,
     7.8
    ],
    "banda": [
     null,
     3.9
    ],
    "alarmas": [
     3.9
    ],
    "limite": "normal < 3,9 · alarma 3,9",
    "serie": [
     2.2,
     2.1,
     2.2,
     2.3,
     2.2,
     2.1,
     2.2,
     2.2,
     2.3,
     2.2,
     2.4,
     0
    ],
    "gris": true
   },
   {
    "tag": "LT-2012",
    "nombre": "Nivel del tanque de agua",
    "unidad": "%",
    "valor": 89.6,
    "decimales": 1,
    "escala": [
     0,
     100
    ],
    "banda": [
     15,
     null
    ],
    "alarmas": [
     15
    ],
    "limite": "normal > 15 · alarma 15",
    "serie": [
     77.8,
     77.1,
     78.4,
     76.9,
     77.6,
     77.2,
     78.3,
     77.9,
     76.8,
     77.4,
     78.7,
     89.6
    ],
    "gris": true
   }
  ],
  "plegadas": [],
  "discretas": [
   {
    "tag": "LSH-2013",
    "nombre": "Fuga del sello",
    "valor": "sin fuga"
   }
  ],
  "sinDisparo": true,
  "esquemaAgua": {
   "tanque": {
    "id": "TK-AG-CE",
    "nivelPct": 89.6,
    "altoAltoPct": 90
   },
   "bombas": [
    {
     "id": "P-201A",
     "instrumentada": false,
     "marcha": "sin-lectura",
     "esta": false
    },
    {
     "id": "P-201B",
     "instrumentada": true,
     "marcha": "parada",
     "esta": true
    },
    {
     "id": "P-201C",
     "instrumentada": false,
     "marcha": "sin-lectura",
     "esta": false
    }
   ],
   "instrumentos": [
    {
     "letras": "PI",
     "tag": "PI-2010",
     "donde": "succion",
     "valor": 18.2,
     "decimales": 1
    },
    {
     "letras": "PDI",
     "tag": "PDI-2011",
     "donde": "descarga",
     "valor": 0,
     "decimales": 0
    },
    {
     "letras": "FI",
     "tag": "FI-2011",
     "donde": "caudal",
     "valor": 0,
     "decimales": 0
    }
   ],
   "entraBpd": 174033,
   "toman": [
    "P-201A",
    "P-201C"
   ]
  },
  "mientras": {
   "titulo": "Mientras esté parada",
   "entraBpd": 174033,
   "cabenBpd": 178500,
   "enMarcha": [
    "P-201A",
    "P-201C"
   ],
   "tanquePct": 89.6,
   "altoAltoPct": 90,
   "sube": false,
   "frase": "El nivel no sube: P-201A y P-201C toman lo que entra.",
   "pasos": [
    {
     "pozo": "LC-02",
     "fraccion": 1
    },
    {
     "pozo": "LC-10",
     "fraccion": 1
    },
    {
     "pozo": "LC-01",
     "fraccion": 1
    },
    {
     "pozo": "LC-17",
     "fraccion": 1
    },
    {
     "pozo": "LC-14",
     "fraccion": 1
    },
    {
     "pozo": "LC-06",
     "fraccion": 0.25
    },
    {
     "pozo": "LC-09",
     "fraccion": 0.25
    },
    {
     "pozo": "LC-11",
     "fraccion": 0.2045580878265703
    }
   ],
   "crudoBpd": 3058.604258286438,
   "parejoBpd": 4576.536678353045,
   "colchon": "2 min"
  },
  "tendencias": {
   "titulo": "Los 12 días antes de parar",
   "desde": "2026-09-21T19:00:00.000Z",
   "hasta": "2026-10-02T19:00:00.000Z",
   "series": [
    {
     "tag": "TI-2011",
     "nombre": "Temperatura de cojinete",
     "unidad": "°C",
     "serie": [
      38,
      39,
      39,
      40,
      40,
      41,
      42,
      43,
      44,
      45,
      43,
      41
     ],
     "escala": [
      0,
      170
     ],
     "banda": [
      null,
      85
     ],
     "alarmas": [
      85
     ],
     "decimales": 0
    },
    {
     "tag": "II-2011",
     "nombre": "Corriente del motor",
     "unidad": "A",
     "serie": [
      398,
      402,
      408,
      405,
      412,
      419,
      425,
      432,
      436,
      429,
      378,
      0
     ],
     "escala": [
      195,
      570
     ],
     "banda": [
      320,
      445
     ],
     "alarmas": [],
     "decimales": 0
    },
    {
     "tag": "PDI-2011",
     "nombre": "Presión de descarga",
     "unidad": "psi",
     "serie": [
      214,
      212,
      215,
      211,
      210,
      208,
      205,
      201,
      198,
      194,
      160,
      0
     ],
     "escala": [
      120,
      300
     ],
     "banda": [
      180,
      240
     ],
     "alarmas": [],
     "decimales": 0
    }
   ],
   "modoFalla": "Lubricación de cojinete"
  },
  "historia": {
   "fallas": 9,
   "que": "fallas",
   "meses": 12.058662280701755,
   "cadaDias": 40.73148148148148,
   "fueraH": 39.98854166666667,
   "bblPorFalla": 4592.701634559297,
   "porParte": [
    {
     "parte": "Sello mecánico",
     "fallas": 5
    },
    {
     "parte": "Rodamientos",
     "fallas": 3
    }
   ],
   "ultimas": [
    {
     "dia": "22 de sept",
     "que": "rodamientos",
     "bbl": 1040.5504307430315
    },
    {
     "dia": "9 de ago",
     "que": "sello mecánico",
     "bbl": 3805.883408039492
    }
   ]
  },
  "repuestos": [
   {
    "descripcion": "Kit de sello mecánico",
    "stock": 0,
    "minimo": 1,
    "plazoDias": 21,
    "llega": "llega 1 el 9 de oct",
    "aviso": false
   },
   {
    "descripcion": "Impulsor y anillos de desgaste",
    "stock": 0,
    "minimo": 1,
    "plazoDias": 45,
    "aviso": true
   }
  ],
  "diagnostico": true
 },
 "k101": {
  "campoId": "ceiba",
  "campoNombre": "La Ceiba",
  "equipo": "K-101",
  "subtitulo": "sistema de aire de instrumentos · servicios industriales · criticidad 5 de 5",
  "familia": "aire de instrumentos",
  "tipo": "superficie",
  "tren": "servicios",
  "vecinos": {
   "siguiente": "SE-2"
  },
  "registrado": true,
  "vigila": true,
  "condicion": "alarma",
  "parado": false,
  "previo": "Alarma · en marcha · degradado",
  "cifra": {
   "valor": 0,
   "frase": "se dejan de producir por él: está en marcha."
  },
  "senales": [
   {
    "tag": "PT-1011",
    "nombre": "Presión de cabezal",
    "unidad": "psi",
    "valor": 112,
    "decimales": 0,
    "escala": [
     100,
     145
    ],
    "banda": [
     115,
     130
    ],
    "alarmas": [],
    "limite": "normal 115 – 130",
    "serie": [
     127,
     126,
     125,
     124,
     123,
     121,
     120,
     118,
     117,
     115,
     114,
     112
    ],
    "condicion": "alarma",
    "gris": false
   },
   {
    "tag": "PDT-1011",
    "nombre": "Derivada de presión",
    "unidad": "psi/h",
    "valor": -0.9,
    "decimales": 2,
    "escala": [
     -0.4,
     0
    ],
    "banda": [
     -0.2,
     null
    ],
    "alarmas": [],
    "limite": "normal > -0,2",
    "serie": [
     -0.05,
     -0.08,
     -0.1,
     -0.15,
     -0.2,
     -0.3,
     -0.4,
     -0.5,
     -0.6,
     -0.7,
     -0.8,
     -0.9
    ],
    "condicion": "alarma",
    "gris": false,
    "fuera": "abajo"
   },
   {
    "tag": "AIT-1011",
    "nombre": "Punto de rocío",
    "unidad": "°C",
    "valor": -38,
    "decimales": 0,
    "escala": [
     -60,
     0
    ],
    "banda": [
     null,
     -30
    ],
    "alarmas": [],
    "limite": "normal < -30",
    "serie": [
     -41,
     -40,
     -40,
     -39,
     -39,
     -38,
     -38,
     -38,
     -37,
     -38,
     -38,
     -38
    ],
    "gris": false
   }
  ],
  "plegadas": [],
  "discretas": [
   {
    "tag": "ZI-1011",
    "nombre": "Unidades en servicio",
    "valor": "2 de 3"
   }
  ],
  "sinDisparo": true,
  "tendencias": {
   "titulo": "Los últimos 12 días",
   "desde": "2026-09-21T19:00:00.000Z",
   "hasta": "2026-10-02T19:00:00.000Z",
   "series": [
    {
     "tag": "PDT-1011",
     "nombre": "Derivada de presión",
     "unidad": "psi/h",
     "serie": [
      -0.05,
      -0.08,
      -0.1,
      -0.15,
      -0.2,
      -0.3,
      -0.4,
      -0.5,
      -0.6,
      -0.7,
      -0.8,
      -0.9
     ],
     "escala": [
      -0.4,
      0
     ],
     "banda": [
      -0.2,
      null
     ],
     "alarmas": [],
     "decimales": 2
    },
    {
     "tag": "PT-1011",
     "nombre": "Presión de cabezal",
     "unidad": "psi",
     "serie": [
      127,
      126,
      125,
      124,
      123,
      121,
      120,
      118,
      117,
      115,
      114,
      112
     ],
     "escala": [
      100,
      145
     ],
     "banda": [
      115,
      130
     ],
     "alarmas": [],
     "decimales": 0
    },
    {
     "tag": "AIT-1011",
     "nombre": "Punto de rocío",
     "unidad": "°C",
     "serie": [
      -41,
      -40,
      -40,
      -39,
      -39,
      -38,
      -38,
      -38,
      -37,
      -38,
      -38,
      -38
     ],
     "escala": [
      -60,
      0
     ],
     "banda": [
      null,
      -30
     ],
     "alarmas": [],
     "decimales": 0
    }
   ]
  },
  "historia": {
   "fallas": 6,
   "que": "eventos",
   "meses": 12.058662280701755,
   "cadaDias": 61.09722222222222,
   "porParte": [],
   "ultimas": [
    {
     "dia": "4 de ago",
     "que": "presión baja del aire de instrumentos",
     "bbl": 2237.542167417988
    },
    {
     "dia": "15 de jul",
     "que": "presión baja del aire de instrumentos",
     "bbl": 2551.6864697986493
    }
   ]
  },
  "repuestos": [],
  "diagnostico": true
 },
 "gerCierre": {
  "titulo": "Cierre proyectado",
  "proyectado": true,
  "produccion": 1222131.4288837465,
  "metaProduccion": 1246200,
  "bajoMeta": true,
  "diferido": 80333.6626721682,
  "maximoDiferido": 71300,
  "sobreMaximo": true,
  "explica": "Si todo sigue como está ahora: lo que va del mes más el ritmo de hoy hasta el último día (31 días)."
 },
 "momentos": {
  "antes": 8,
  "antesUnidad": "equipos avisan",
  "durante": 2650,
  "despues": 2376
 },
 "oper": {
  "inicio": {
   "frase": "Tiene 4 preguntas. Empiece por P-201B: está parada y no se puede arrancar.",
   "cifra": "1 de 4",
   "unidad": "preguntas",
   "remate": "Empiece por P-201B: está parada y no se puede arrancar."
  },
  "pregunta": {
   "id": "libro:EV-2011-1002",
   "via": "libro",
   "campoId": "ceiba",
   "equipo": "P-201B",
   "sobre": "bomba",
   "marca": "alarma",
   "contexto": "P-201B · bomba de agua · paró hoy a las 03:52, hace 10,1 h",
   "contextoCorto": "P-201B · bomba de agua · paró hoy en la madrugada",
   "texto": "¿Qué parte se dañó?",
   "pista": "Lo que más le ha fallado a esta bomba:",
   "opciones": [
    {
     "tipo": "parte",
     "texto": "Sello mecánico",
     "parte": "sello",
     "modos": [
      {
       "codigo": "ELP",
       "texto": "Fuga hacia afuera"
      },
      {
       "codigo": "INL",
       "texto": "Fuga interna"
      },
      {
       "codigo": "OTH",
       "texto": "Otra cosa",
       "escribe": true
      }
     ],
     "pregunta": "Sello mecánico: ¿qué vio?",
     "dato": "5 de sus 8 fallas"
    },
    {
     "tipo": "parte",
     "texto": "Rodamientos y cámara de empuje",
     "parte": "rodamientos",
     "modos": [
      {
       "codigo": "OHE",
       "texto": "Recalentada"
      },
      {
       "codigo": "VIB",
       "texto": "Vibración"
      },
      {
       "codigo": "NOI",
       "texto": "Ruido"
      },
      {
       "codigo": "OTH",
       "texto": "Otra cosa",
       "escribe": true
      }
     ],
     "pregunta": "Rodamientos y cámara de empuje: ¿qué vio?",
     "dato": "3 de sus 8 fallas"
    },
    {
     "tipo": "partes",
     "texto": "Otra parte",
     "dato": "escoja de la lista",
     "partes": [
      {
       "parte": "succion",
       "texto": "Succión y filtro de entrada",
       "modos": [
        {
         "codigo": "UST",
         "texto": "Se disparó sin daño a la vista"
        },
        {
         "codigo": "PLU",
         "texto": "Tapada"
        },
        {
         "codigo": "LOO",
         "texto": "Bajó el caudal"
        },
        {
         "codigo": "OTH",
         "texto": "Otra cosa",
         "escribe": true
        }
       ],
       "pregunta": "Succión y filtro de entrada: ¿qué vio?"
      },
      {
       "parte": "hidraulica",
       "texto": "Impulsores y desgaste interno",
       "modos": [
        {
         "codigo": "LOO",
         "texto": "Bajó el caudal"
        },
        {
         "codigo": "PDE",
         "texto": "Presión o corriente fuera de rango"
        },
        {
         "codigo": "OTH",
         "texto": "Otra cosa",
         "escribe": true
        }
       ],
       "pregunta": "Impulsores y desgaste interno: ¿qué vio?"
      },
      {
       "parte": "motor",
       "texto": "Motor eléctrico",
       "modos": [
        {
         "codigo": "OHE",
         "texto": "Recalentada"
        },
        {
         "codigo": "UST",
         "texto": "Se disparó sin daño a la vista"
        },
        {
         "codigo": "FTS",
         "texto": "No arrancó"
        },
        {
         "codigo": "VIB",
         "texto": "Vibración"
        },
        {
         "codigo": "OTH",
         "texto": "Otra cosa",
         "escribe": true
        }
       ],
       "pregunta": "Motor eléctrico: ¿qué vio?"
      }
     ]
    },
    {
     "tipo": "no-se",
     "texto": "Todavía no sé",
     "dato": "se la vuelven a preguntar en la próxima ronda"
    }
   ],
   "bloqueo": {
    "texto": "No la arranque hasta decir qué se dañó",
    "sub": "Si arranca antes, queda como no conformidad."
   },
   "tramo": {
    "choke": "planta",
    "rotulo": "planta · agua"
   },
   "libro": {
    "evento": "EV-2011-1002",
    "campoId": "ceiba",
    "equipo": "P-201B"
   }
  },
  "tarea": {
   "id": "contestar:ceiba:EV-2011-1002",
   "tipo": "contestar",
   "campoId": "ceiba",
   "capacidad": "causa:declarar",
   "pide": true,
   "grupo": "barriles",
   "bblAhora": 1665.1829227413677,
   "desde": "2026-10-02T08:52:18.000Z",
   "titulo": "Diga qué se dañó en P-201B",
   "donde": {
    "equipo": "P-201B",
    "marca": "alarma",
    "texto": "bomba de agua · paró hoy a las 03:52, hace 10,1 h",
    "corto": "bomba de agua · paró hoy en la madrugada"
   },
   "porque": [
    "Sigue parada."
   ],
   "porqueCorto": [],
   "accion": {
    "tipo": "responder",
    "texto": "Contestar"
   },
   "ver": {
    "texto": "Ver P-201B",
    "destino": {
     "a": "equipo",
     "campoId": "ceiba",
     "equipo": "P-201B"
    }
   },
   "preguntas": [
    {
     "id": "libro:EV-2011-1002",
     "via": "libro",
     "campoId": "ceiba",
     "equipo": "P-201B",
     "sobre": "bomba",
     "marca": "alarma",
     "contexto": "P-201B · bomba de agua · paró hoy a las 03:52, hace 10,1 h",
     "contextoCorto": "P-201B · bomba de agua · paró hoy en la madrugada",
     "texto": "¿Qué parte se dañó?",
     "pista": "Lo que más le ha fallado a esta bomba:",
     "opciones": [
      {
       "tipo": "parte",
       "texto": "Sello mecánico",
       "parte": "sello",
       "modos": [
        {
         "codigo": "ELP",
         "texto": "Fuga hacia afuera"
        },
        {
         "codigo": "INL",
         "texto": "Fuga interna"
        },
        {
         "codigo": "OTH",
         "texto": "Otra cosa",
         "escribe": true
        }
       ],
       "pregunta": "Sello mecánico: ¿qué vio?",
       "dato": "5 de sus 8 fallas"
      },
      {
       "tipo": "parte",
       "texto": "Rodamientos y cámara de empuje",
       "parte": "rodamientos",
       "modos": [
        {
         "codigo": "OHE",
         "texto": "Recalentada"
        },
        {
         "codigo": "VIB",
         "texto": "Vibración"
        },
        {
         "codigo": "NOI",
         "texto": "Ruido"
        },
        {
         "codigo": "OTH",
         "texto": "Otra cosa",
         "escribe": true
        }
       ],
       "pregunta": "Rodamientos y cámara de empuje: ¿qué vio?",
       "dato": "3 de sus 8 fallas"
      },
      {
       "tipo": "partes",
       "texto": "Otra parte",
       "dato": "escoja de la lista",
       "partes": [
        {
         "parte": "succion",
         "texto": "Succión y filtro de entrada",
         "modos": [
          {
           "codigo": "UST",
           "texto": "Se disparó sin daño a la vista"
          },
          {
           "codigo": "PLU",
           "texto": "Tapada"
          },
          {
           "codigo": "LOO",
           "texto": "Bajó el caudal"
          },
          {
           "codigo": "OTH",
           "texto": "Otra cosa",
           "escribe": true
          }
         ],
         "pregunta": "Succión y filtro de entrada: ¿qué vio?"
        },
        {
         "parte": "hidraulica",
         "texto": "Impulsores y desgaste interno",
         "modos": [
          {
           "codigo": "LOO",
           "texto": "Bajó el caudal"
          },
          {
           "codigo": "PDE",
           "texto": "Presión o corriente fuera de rango"
          },
          {
           "codigo": "OTH",
           "texto": "Otra cosa",
           "escribe": true
          }
         ],
         "pregunta": "Impulsores y desgaste interno: ¿qué vio?"
        },
        {
         "parte": "motor",
         "texto": "Motor eléctrico",
         "modos": [
          {
           "codigo": "OHE",
           "texto": "Recalentada"
          },
          {
           "codigo": "UST",
           "texto": "Se disparó sin daño a la vista"
          },
          {
           "codigo": "FTS",
           "texto": "No arrancó"
          },
          {
           "codigo": "VIB",
           "texto": "Vibración"
          },
          {
           "codigo": "OTH",
           "texto": "Otra cosa",
           "escribe": true
          }
         ],
         "pregunta": "Motor eléctrico: ¿qué vio?"
        }
       ]
      },
      {
       "tipo": "no-se",
       "texto": "Todavía no sé",
       "dato": "se la vuelven a preguntar en la próxima ronda"
      }
     ],
     "bloqueo": {
      "texto": "No la arranque hasta decir qué se dañó",
      "sub": "Si arranca antes, queda como no conformidad."
     },
     "tramo": {
      "choke": "planta",
      "rotulo": "planta · agua"
     },
     "libro": {
      "evento": "EV-2011-1002",
      "campoId": "ceiba",
      "equipo": "P-201B"
     }
    }
   ]
  },
  "bloqueo": {
   "campoId": "ceiba",
   "equipos": [
    "P-201B",
    "LC-21"
   ],
   "texto": "No arrancar P-201B ni LC-21 hasta identificar qué se dañó",
   "sub": "Si arranca antes, queda como no conformidad."
  },
  "preguntas": 4
 },
 "jefe": {
  "avisan": 1,
  "avisa": {
   "campoId": "ceiba",
   "campoNombre": "La Ceiba",
   "equipo": "K-101",
   "nombre": "Sistema de aire de instrumentos",
   "tipo": "superficie",
   "tipos": [
    "superficie"
   ],
   "tren": "servicios",
   "familia": "aire de instrumentos",
   "condicion": "alarma",
   "parado": false,
   "vigila": true,
   "vigilaTexto": "sí · 4 señales",
   "palabra": "ya pasó el límite",
   "cifra": {
    "valor": 9394.199400160593,
    "que": "si falla hoy",
    "techo": true
   },
   "filtros": [
    "avisan",
    "todos"
   ],
   "registrado": true
  },
  "porIdentificar": {
   "id": "conseguir-causa:ceiba",
   "tipo": "conseguir-causa",
   "campoId": "ceiba",
   "capacidad": "causa:declarar",
   "pide": true,
   "grupo": "barriles",
   "bblAhora": 1966.0272482539049,
   "desde": "2026-10-02T08:52:18.000Z",
   "titulo": "Conseguir la causa de 3 paradas",
   "donde": {
    "equipo": "P-201B",
    "marca": "alarma",
    "texto": "lleva 10,1 h sin saber qué se dañó; se escaló a las 05:52",
    "corto": "lleva 10,1 h sin causa"
   },
   "porque": [
    {
     "b": "LC-21"
    },
    " lleva 19,7 h sin causa",
    " · ",
    {
     "b": "LC-08"
    },
    " arrancó a la 01:10 sin identificar",
    " · ",
    "Entre las 3: ",
    {
     "b": "219 bbl hoy"
    },
    " · 928 desde que pararon"
   ],
   "porqueCorto": [
    "Entre todas: ",
    {
     "b": "219 bbl hoy"
    }
   ],
   "accion": {
    "tipo": "responder",
    "texto": "Responder yo"
   },
   "ver": {
    "texto": "Ver el chat",
    "destino": {
     "a": "paradas"
    }
   },
   "preguntas": [
    {
     "id": "libro:EV-2011-1002",
     "via": "libro",
     "campoId": "ceiba",
     "equipo": "P-201B",
     "sobre": "bomba",
     "marca": "alarma",
     "contexto": "P-201B · bomba de agua · paró hoy a las 03:52, hace 10,1 h",
     "contextoCorto": "P-201B · bomba de agua · paró hoy en la madrugada",
     "texto": "¿Qué parte se dañó?",
     "pista": "Lo que más le ha fallado a esta bomba:",
     "opciones": [
      {
       "tipo": "parte",
       "texto": "Sello mecánico",
       "parte": "sello",
       "modos": [
        {
         "codigo": "ELP",
         "texto": "Fuga hacia afuera"
        },
        {
         "codigo": "INL",
         "texto": "Fuga interna"
        },
        {
         "codigo": "OTH",
         "texto": "Otra cosa",
         "escribe": true
        }
       ],
       "pregunta": "Sello mecánico: ¿qué vio?",
       "dato": "5 de sus 8 fallas"
      },
      {
       "tipo": "parte",
       "texto": "Rodamientos y cámara de empuje",
       "parte": "rodamientos",
       "modos": [
        {
         "codigo": "OHE",
         "texto": "Recalentada"
        },
        {
         "codigo": "VIB",
         "texto": "Vibración"
        },
        {
         "codigo": "NOI",
         "texto": "Ruido"
        },
        {
         "codigo": "OTH",
         "texto": "Otra cosa",
         "escribe": true
        }
       ],
       "pregunta": "Rodamientos y cámara de empuje: ¿qué vio?",
       "dato": "3 de sus 8 fallas"
      },
      {
       "tipo": "partes",
       "texto": "Otra parte",
       "dato": "escoja de la lista",
       "partes": [
        {
         "parte": "succion",
         "texto": "Succión y filtro de entrada",
         "modos": [
          {
           "codigo": "UST",
           "texto": "Se disparó sin daño a la vista"
          },
          {
           "codigo": "PLU",
           "texto": "Tapada"
          },
          {
           "codigo": "LOO",
           "texto": "Bajó el caudal"
          },
          {
           "codigo": "OTH",
           "texto": "Otra cosa",
           "escribe": true
          }
         ],
         "pregunta": "Succión y filtro de entrada: ¿qué vio?"
        },
        {
         "parte": "hidraulica",
         "texto": "Impulsores y desgaste interno",
         "modos": [
          {
           "codigo": "LOO",
           "texto": "Bajó el caudal"
          },
          {
           "codigo": "PDE",
           "texto": "Presión o corriente fuera de rango"
          },
          {
           "codigo": "OTH",
           "texto": "Otra cosa",
           "escribe": true
          }
         ],
         "pregunta": "Impulsores y desgaste interno: ¿qué vio?"
        },
        {
         "parte": "motor",
         "texto": "Motor eléctrico",
         "modos": [
          {
           "codigo": "OHE",
           "texto": "Recalentada"
          },
          {
           "codigo": "UST",
           "texto": "Se disparó sin daño a la vista"
          },
          {
           "codigo": "FTS",
           "texto": "No arrancó"
          },
          {
           "codigo": "VIB",
           "texto": "Vibración"
          },
          {
           "codigo": "OTH",
           "texto": "Otra cosa",
           "escribe": true
          }
         ],
         "pregunta": "Motor eléctrico: ¿qué vio?"
        }
       ]
      },
      {
       "tipo": "no-se",
       "texto": "Todavía no sé",
       "dato": "se la vuelven a preguntar en la próxima ronda"
      }
     ],
     "bloqueo": {
      "texto": "No la arranque hasta decir qué se dañó",
      "sub": "Si arranca antes, queda como no conformidad."
     },
     "tramo": {
      "choke": "planta",
      "rotulo": "planta · agua"
     },
     "libro": {
      "evento": "EV-2011-1002",
      "campoId": "ceiba",
      "equipo": "P-201B"
     }
    },
    {
     "id": "libro:EP-LC21-261001-01",
     "via": "libro",
     "campoId": "ceiba",
     "equipo": "LC-21",
     "sobre": "pozo",
     "marca": "atencion",
     "contexto": "LC-21 · pozo · paró el 1 de oct a las 18:20, hace 19,7 h",
     "contextoCorto": "LC-21 · pozo · paró ayer en la tarde",
     "texto": "¿Por qué paró?",
     "opciones": [
      {
       "tipo": "texto",
       "texto": "Cierre para prueba o intervención del pozo",
       "valor": "Cierre para prueba o intervención del pozo"
      },
      {
       "tipo": "texto",
       "texto": "Fuga o daño en la línea de flujo",
       "valor": "Fuga o daño en la línea de flujo"
      },
      {
       "tipo": "texto",
       "texto": "Orden de producción",
       "dato": "nominación o restricción del comprador",
       "valor": "Orden de producción: nominación o restricción del comprador"
      },
      {
       "tipo": "texto",
       "texto": "Falla del controlador o de un instrumento del pozo",
       "valor": "Falla del controlador o de un instrumento del pozo"
      },
      {
       "tipo": "no-se",
       "texto": "Todavía no sé",
       "dato": "se la vuelven a preguntar en la próxima ronda"
      }
     ],
     "bloqueo": {
      "texto": "No lo arranque hasta decir qué pasó",
      "sub": "Si arranca antes, queda como no conformidad."
     },
     "tramo": {
      "choke": "pozo",
      "rotulo": "pozos"
     },
     "libro": {
      "evento": "EP-LC21-261001-01",
      "campoId": "ceiba",
      "equipo": "LC-21"
     }
    },
    {
     "id": "libro:EP-LC08-261001-02",
     "via": "libro",
     "campoId": "ceiba",
     "equipo": "LC-08",
     "sobre": "pozo",
     "contexto": "LC-08 · pozo · paró el 1 de oct a las 22:15 y arrancó hoy a la 01:10 sin identificar",
     "contextoCorto": "LC-08 · pozo · arrancó hoy en la madrugada sin identificar",
     "texto": "¿Qué se dañó?",
     "opciones": [
      {
       "tipo": "parte",
       "texto": "Aislamiento del motor y del cable",
       "parte": "aislamiento",
       "modos": [
        {
         "codigo": "UST",
         "texto": "Se disparó sin daño a la vista"
        },
        {
         "codigo": "BRD",
         "texto": "Se quemó o dio a tierra"
        },
        {
         "codigo": "OTH",
         "texto": "Otra cosa",
         "escribe": true
        }
       ],
       "pregunta": "Aislamiento del motor y del cable: ¿qué vio?"
      },
      {
       "tipo": "parte",
       "texto": "Protector (sello del motor)",
       "parte": "protector",
       "modos": [
        {
         "codigo": "INL",
         "texto": "Fuga interna"
        },
        {
         "codigo": "OHE",
         "texto": "Recalentada"
        },
        {
         "codigo": "OTH",
         "texto": "Otra cosa",
         "escribe": true
        }
       ],
       "pregunta": "Protector (sello del motor): ¿qué vio?"
      },
      {
       "tipo": "parte",
       "texto": "Bomba de fondo (eje y etapas)",
       "parte": "bomba",
       "modos": [
        {
         "codigo": "UST",
         "texto": "Se disparó sin daño a la vista"
        },
        {
         "codigo": "LOO",
         "texto": "Bajó el caudal"
        },
        {
         "codigo": "PLU",
         "texto": "Tapada"
        },
        {
         "codigo": "OTH",
         "texto": "Otra cosa",
         "escribe": true
        }
       ],
       "pregunta": "Bomba de fondo (eje y etapas): ¿qué vio?"
      },
      {
       "tipo": "parte",
       "texto": "Admisión y separador de gas",
       "parte": "admision",
       "modos": [
        {
         "codigo": "UST",
         "texto": "Se disparó sin daño a la vista"
        },
        {
         "codigo": "LOO",
         "texto": "Bajó el caudal"
        },
        {
         "codigo": "OTH",
         "texto": "Otra cosa",
         "escribe": true
        }
       ],
       "pregunta": "Admisión y separador de gas: ¿qué vio?"
      },
      {
       "tipo": "parte",
       "texto": "Motor de fondo",
       "parte": "motor",
       "modos": [
        {
         "codigo": "OHE",
         "texto": "Recalentada"
        },
        {
         "codigo": "UST",
         "texto": "Se disparó sin daño a la vista"
        },
        {
         "codigo": "OTH",
         "texto": "Otra cosa",
         "escribe": true
        }
       ],
       "pregunta": "Motor de fondo: ¿qué vio?"
      },
      {
       "tipo": "causas",
       "texto": "No fue la electrosumergible",
       "dato": "otra causa del pozo",
       "causas": [
        {
         "texto": "Cierre para prueba o intervención del pozo",
         "valor": "Cierre para prueba o intervención del pozo"
        },
        {
         "texto": "Fuga o daño en la línea de flujo",
         "valor": "Fuga o daño en la línea de flujo"
        },
        {
         "texto": "Orden de producción",
         "dato": "nominación o restricción del comprador",
         "valor": "Orden de producción: nominación o restricción del comprador"
        },
        {
         "texto": "Falla del controlador o de un instrumento del pozo",
         "valor": "Falla del controlador o de un instrumento del pozo"
        }
       ]
      },
      {
       "tipo": "no-se",
       "texto": "Todavía no sé",
       "dato": "se la vuelven a preguntar en la próxima ronda"
      }
     ],
     "tramo": {
      "choke": "pozo",
      "rotulo": "pozos"
     },
     "libro": {
      "evento": "EP-LC08-261001-02",
      "campoId": "ceiba",
      "equipo": "LC-08"
     }
    }
   ]
  },
  "orden": {
   "campoId": "ceiba",
   "capacidad": "sap:aviso",
   "pide": true,
   "grupo": "barriles",
   "bblSiPara": 9394.199400160593,
   "donde": {
    "equipo": "K-101",
    "marca": "alarma",
    "texto": "aire de instrumentos · ya pasó el límite"
   },
   "id": "orden:ceiba:40012056",
   "tipo": "orden",
   "titulo": "Seguir la orden de K-101",
   "desde": "2026-10-02T09:10:00-05:00",
   "porque": [
    "Si para, hasta ",
    {
     "b": "9.394 bbl/d"
    },
    ". ",
    "Orden 40012056, liberada a Óscar Daza a las 09:10."
   ],
   "porqueCorto": [
    "Si para, hasta ",
    {
     "b": "9.394 bbl/d"
    },
    ". "
   ],
   "ver": {
    "texto": "Ver la orden",
    "destino": {
     "a": "equipo",
     "campoId": "ceiba",
     "equipo": "K-101"
    }
   }
  },
  "esperaD": 7.734796626984128,
  "totalD": 8.068129960317462,
  "fallasHistoria": 14,
  "noIntervenir": "Ojo: P-201A y P-201C valen más mientras P-201B esté parada: no conviene intervenirlas hoy.",
  "fallasCriticasOct": {
   "valor": 1,
   "_fuente": "necesario-por-rol.md §5 (M1, verificado contra historialDeEquipo: P-201B, 2-oct)"
  }
 },
 "prod": {
  "sale": 9394,
  "tramos": [
   {
    "tramo": "pozo",
    "nombre": "Pozos",
    "cabeBpd": 11857,
    "sobraBpd": 0,
    "limita": true,
    "capacidad": null,
    "texto": "dan 11.857 bbl/d",
    "fuente": "La suma de lo que dan los pozos con su prueba vigente. No lleva el factor de asignación del mes: ese sale de lo que ya pasó por la planta y escondería lo que la limita. El libro sí lo usa para valorar lo diferido (unos 11.360 bbl/d hoy): son dos preguntas distintas"
   },
   {
    "tramo": "planta",
    "nombre": "Planta",
    "cabeBpd": 13000,
    "sobraBpd": 1143,
    "limita": false,
    "capacidad": "sin firmar",
    "texto": "caben 13.000 bbl/d · le sobran 1.143",
    "fuente": "El más angosto de sus trenes medidos: el tren de crudo. La capacidad del tren de crudo en el esquema de planta: dato del demo, sin firmar. El agua se pasa a crudo con el corte de las pruebas; el gas no se mide en esta fase"
   },
   {
    "tramo": "exportacion",
    "nombre": "Salida",
    "cabeBpd": 14000,
    "sobraBpd": 2143,
    "limita": false,
    "capacidad": "sin firmar",
    "texto": "caben 14.000 bbl/d · le sobran 2.143",
    "fuente": "La capacidad del oleoducto o del transportador en el esquema de planta: dato del demo, sin firmar"
   }
  ],
  "explica": "Limitan los pozos: a la planta le sobran 1.143 bbl/d. Hoy salen 9.394.",
  "porConfirmar": 2,
  "confirmar": {
   "id": "confirmar:ceiba|op-mantenimiento · planta · diferida · no-planeada · NP_PROC · NP_PROC/parada-estacion-bombeo-afecta-pozos",
   "tipo": "confirmar",
   "campoId": "ceiba",
   "capacidad": "anh:confirmar",
   "pide": true,
   "grupo": "hora",
   "limite": "2026-10-03T07:00:00-05:00",
   "bblAhora": 1665.1829227413677,
   "desde": "2026-10-02T10:43:00.000Z",
   "titulo": "Confirmar 2 paradas iguales",
   "donde": {
    "equipo": "P-201B",
    "marca": "alarma",
    "texto": "cerró LC-07 y LC-16 · 05:43",
    "corto": "cerró LC-07 y LC-16"
   },
   "porque": [
    "TRIM las dedujo: ",
    {
     "b": "en la planta, no planeada"
    },
    ". Falta su confirmación."
   ],
   "porqueCorto": [
    "TRIM las dedujo: ",
    {
     "b": "en la planta, no planeada"
    },
    "."
   ],
   "accion": {
    "tipo": "confirmar",
    "texto": "Confirmar las 2",
    "ids": [
     "EP-LC07-261002-79@2026-10-02#1",
     "EP-LC16-261002-78@2026-10-02#1"
    ],
    "cadena": "op-mantenimiento · planta · diferida · no-planeada · NP_PROC · NP_PROC/parada-estacion-bombeo-afecta-pozos",
    "pozos": [
     "LC-07",
     "LC-16"
    ]
   },
   "ver": {
    "texto": "Ver una por una",
    "destino": {
     "a": "paradas"
    }
   }
  },
  "esteMes": {
   "bbl": 1046,
   "nota": "P-201B, más de la mitad · 355 sin causa",
   "usd": 50
  },
  "siFallaHoy": 3059,
  "siFallaEquipos": [
   "P-201A",
   "P-201C"
  ]
 },
 "reg": {
  "titulo": "No se puede publicar todavía",
  "sinCausa": 2,
  "bbl": 355,
  "paradas": [
   {
    "pozo": "LC-21",
    "bbl": 247,
    "debe": "operador de campo",
    "cuando": "mañana antes de las 07:00",
    "falta": "faltan todos los pasos"
   },
   {
    "pozo": "LC-08",
    "bbl": 108,
    "debe": "operador de campo",
    "cuando": "mañana antes de las 07:00",
    "falta": "faltan todos los pasos"
   }
  ],
  "periodo": "octubre",
  "estado": "provisional"
 }
}
