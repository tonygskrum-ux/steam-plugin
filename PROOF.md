# PROOF — live run Sun Oct 18 2026 17:55:44 GMT-0700 (Mountain Standard Time)

Schema validation (ajv 2020-12, run from a temp dir, not a plugin dependency): plugin.json VALID, mcp.json VALID against the agent-plugins.org 1.0.0 schemas.

Spawned via mcp.json: `node ${CURSOR_PLUGIN_ROOT}/server/index.mjs` (${CURSOR_PLUGIN_ROOT} expanded to the plugin dir, as Cursor does; cwd deliberately elsewhere).

## → initialize
```json
{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"proof","version":"0"}},"id":1}
```
← 
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "2025-06-18",
    "capabilities": {
      "tools": {}
    },
    "serverInfo": {
      "name": "steam",
      "version": "0.1.0"
    }
  }
}
```

## → notifications/initialized
```json
{"jsonrpc":"2.0","method":"notifications/initialized"}
```
← 
```json
(notification, no response)
```

## → ping
```json
{"jsonrpc":"2.0","method":"ping","id":2}
```
← 
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {}
}
```

## → tools/list
```json
{"jsonrpc":"2.0","method":"tools/list","id":3}
```
← 
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "result": {
    "tools": [
      {
        "name": "search_games",
        "description": "Search the Steam store by name; returns [{appid,name,price}] (US prices).",
        "inputSchema": {
          "type": "object",
          "properties": {
            "query": {
              "type": "string"
            }
          },
          "required": [
            "query"
          ]
        }
      },
      {
        "name": "get_game",
        "description": "Store details for a Steam app: price (USD), release date, devs, genres, platforms, description.",
        "inputSchema": {
          "type": "object",
          "properties": {
            "appid": {
              "type": "integer",
              "minimum": 1,
              "description": "Steam appid (resolve names with search_games)"
            }
          },
          "required": [
            "appid"
          ]
        }
      },
      {
        "name": "get_player_count",
        "description": "Current concurrent players for a Steam app.",
        "inputSchema": {
          "type": "object",
          "properties": {
            "appid": {
              "type": "integer",
              "minimum": 1,
              "description": "Steam appid (resolve names with search_games)"
            }
          },
          "required": [
            "appid"
          ]
        }
      },
      {
        "name": "get_reviews",
        "description": "Steam user review summary (all languages): score description and positive/negative totals.",
        "inputSchema": {
          "type": "object",
          "properties": {
            "appid": {
              "type": "integer",
              "minimum": 1,
              "description": "Steam appid (resolve names with search_games)"
            }
          },
          "required": [
            "appid"
          ]
        }
      },
      {
        "name": "get_news",
        "description": "Latest news/announcements for a Steam app (excerpts up to 300 chars).",
        "inputSchema": {
          "type": "object",
          "properties": {
            "appid": {
              "type": "integer",
              "minimum": 1,
              "description": "Steam appid (resolve names with search_games)"
            },
            "count": {
              "type": "integer",
              "minimum": 1,
              "maximum": 10,
              "default": 5
            }
          },
          "required": [
            "appid"
          ]
        }
      }
    ]
  }
}
```

## → tools/call search_games {"query":"Hades"}
```json
{"jsonrpc":"2.0","method":"tools/call","params":{"name":"search_games","arguments":{"query":"Hades"}},"id":4}
```
← 
```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "result": {
    "structuredContent": {
      "results": [
        {
          "appid": 1145350,
          "name": "Hades II",
          "price": {
            "final": 29.99,
            "initial": 29.99,
            "currency": "USD"
          }
        },
        {
          "appid": 1145360,
          "name": "Hades",
          "price": {
            "final": 24.99,
            "initial": 24.99,
            "currency": "USD"
          }
        },
        {
          "appid": 2950840,
          "name": "Hades II Original Soundtrack",
          "price": {
            "final": 9.99,
            "initial": 9.99,
            "currency": "USD"
          }
        },
        {
          "appid": 1206340,
          "name": "Hades Original Soundtrack",
          "price": {
            "final": 9.99,
            "initial": 9.99,
            "currency": "USD"
          }
        },
        {
          "appid": 755800,
          "name": "Hades' Star",
          "price": null
        },
        {
          "appid": 3653720,
          "name": "Hades Harem",
          "price": null
        },
        {
          "appid": 3992460,
          "name": "Hearts in Hades: Divine Passion",
          "price": {
            "final": 4.99,
            "initial": 4.99,
            "currency": "USD"
          }
        },
        {
          "appid": 826460,
          "name": "The Road to Hades",
          "price": {
            "final": 0.99,
            "initial": 0.99,
            "currency": "USD"
          }
        },
        {
          "appid": 4516620,
          "name": "Hades Hinderance",
          "price": {
            "final": 10.5,
            "initial": 10.5,
            "currency": "USD"
          }
        },
        {
          "appid": 3135730,
          "name": "Cyborg-Hades",
          "price": null
        }
      ]
    }
  }
}
```

## → tools/call search_games {"query":"zzqqxxnotagame"}
```json
{"jsonrpc":"2.0","method":"tools/call","params":{"name":"search_games","arguments":{"query":"zzqqxxnotagame"}},"id":5}
```
← 
```json
{
  "jsonrpc": "2.0",
  "id": 5,
  "result": {
    "structuredContent": {
      "results": []
    }
  }
}
```

## → tools/call get_game {"appid":1145360}
```json
{"jsonrpc":"2.0","method":"tools/call","params":{"name":"get_game","arguments":{"appid":1145360}},"id":6}
```
← 
```json
{
  "jsonrpc": "2.0",
  "id": 6,
  "result": {
    "structuredContent": {
      "appid": 1145360,
      "name": "Hades",
      "type": "game",
      "isFree": false,
      "price": {
        "final": 24.99,
        "initial": 24.99,
        "discountPercent": 0,
        "currency": "USD",
        "formatted": "$24.99"
      },
      "releaseDate": {
        "comingSoon": false,
        "date": "Sep 17, 2020"
      },
      "developers": [
        "Supergiant Games"
      ],
      "publishers": [
        "Supergiant Games"
      ],
      "genres": [
        "Action",
        "Indie",
        "RPG"
      ],
      "platforms": {
        "windows": true,
        "mac": true,
        "linux": false
      },
      "shortDescription": "Defy the god of the dead as you hack and slash out of the Underworld in this rogue-like dungeon crawler from the creators of Bastion, Transistor, and Pyre.",
      "storeUrl": "https://store.steampowered.com/app/1145360/"
    }
  }
}
```

## → tools/call get_game {"appid":999999999}
```json
{"jsonrpc":"2.0","method":"tools/call","params":{"name":"get_game","arguments":{"appid":999999999}},"id":7}
```
← 
```json
{
  "jsonrpc": "2.0",
  "id": 7,
  "result": {
    "isError": true,
    "content": [
      {
        "type": "text",
        "text": "Unknown appid 999999999: Steam store has no details for it (or it is region-locked/unlisted)."
      }
    ]
  }
}
```

## → tools/call get_player_count {"appid":730}
```json
{"jsonrpc":"2.0","method":"tools/call","params":{"name":"get_player_count","arguments":{"appid":730}},"id":8}
```
← 
```json
{
  "jsonrpc": "2.0",
  "id": 8,
  "result": {
    "structuredContent": {
      "appid": 730,
      "currentPlayers": 473432
    }
  }
}
```

## → tools/call get_player_count {"appid":999999999}
```json
{"jsonrpc":"2.0","method":"tools/call","params":{"name":"get_player_count","arguments":{"appid":999999999}},"id":9}
```
← 
```json
{
  "jsonrpc": "2.0",
  "id": 9,
  "result": {
    "isError": true,
    "content": [
      {
        "type": "text",
        "text": "No player count for appid 999999999 (Steam result=HTTP 404; unknown appid or not a game)."
      }
    ]
  }
}
```

## → tools/call get_reviews {"appid":730}
```json
{"jsonrpc":"2.0","method":"tools/call","params":{"name":"get_reviews","arguments":{"appid":730}},"id":10}
```
← 
```json
{
  "jsonrpc": "2.0",
  "id": 10,
  "result": {
    "structuredContent": {
      "appid": 730,
      "scoreDescription": "Very Positive",
      "totalPositive": 8520407,
      "totalNegative": 1411319,
      "totalReviews": 9931726
    }
  }
}
```

## → tools/call get_reviews {"appid":999999999}
```json
{"jsonrpc":"2.0","method":"tools/call","params":{"name":"get_reviews","arguments":{"appid":999999999}},"id":11}
```
← 
```json
{
  "jsonrpc": "2.0",
  "id": 11,
  "result": {
    "structuredContent": {
      "appid": 999999999,
      "scoreDescription": "No user reviews",
      "totalPositive": 0,
      "totalNegative": 0,
      "totalReviews": 0
    }
  }
}
```

## → tools/call get_news {"appid":730,"count":2}
```json
{"jsonrpc":"2.0","method":"tools/call","params":{"name":"get_news","arguments":{"appid":730,"count":2}},"id":12}
```
← 
```json
{
  "jsonrpc": "2.0",
  "id": 12,
  "result": {
    "structuredContent": {
      "results": [
        {
          "title": "Counter-Strike 2 Update",
          "url": "https://steamstore-a.akamaihd.net/news/externalpost/steam_community_announcements/1846651706675829",
          "author": "Vitaliy",
          "date": "2026-10-14T23:02:48.000Z",
          "excerpt": "\\Demo/Replay viewer improvements:Added a progress bar for demo/replay downloadsCamera controls now use click-and-drag schemeFree and chase camera are usable during a paused demoFixed some minor issues when seeking to a different position in the demo file\\Round backup files now require the game serve..."
        },
        {
          "title": "Valve ускорила перезарядку AUG в Counter-Strike 2 и исправила ошибки на картах Rush в свежем обновлении",
          "url": "https://steamstore-a.akamaihd.net/news/externalpost/PlayGround.ru - официальная группа/1846018067932423",
          "author": null,
          "date": "2026-10-09T07:28:45.000Z",
          "excerpt": "Valve выпустила небольшое обновление для Counter-Strike 2 от 9 октября. Патч затронул баланс оружия, звуковые эффекты и геометрию карт, а также принёс несколько технических исправлений. Размер загрузки составил около 539 МБ. Главное изменение касается AUG: время перезарядки винтовки сократили на пол..."
        }
      ]
    }
  }
}
```

## → tools/call get_news {"appid":999999999}
```json
{"jsonrpc":"2.0","method":"tools/call","params":{"name":"get_news","arguments":{"appid":999999999}},"id":13}
```
← 
```json
{
  "jsonrpc": "2.0",
  "id": 13,
  "result": {
    "isError": true,
    "content": [
      {
        "type": "text",
        "text": "No news for appid 999999999 (Steam HTTP 403; unknown appid)."
      }
    ]
  }
}
```

## → tools/call get_news {"appid":"abc"}
```json
{"jsonrpc":"2.0","method":"tools/call","params":{"name":"get_news","arguments":{"appid":"abc"}},"id":14}
```
← 
```json
{
  "jsonrpc": "2.0",
  "id": 14,
  "result": {
    "isError": true,
    "content": [
      {
        "type": "text",
        "text": "appid must be a positive integer (use search_games to find one)."
      }
    ]
  }
}
```

