# GitExplorer

Aplicación web académica que consume la **GitHub REST API** para mostrar perfiles públicos y repositorios.

## Ejecución

1. Abre la carpeta en Visual Studio Code.
2. Ejecuta `index.html` con la extensión **Live Server**, o inicia un servidor local:

```bash
python -m http.server 5500
```

3. Abre `http://localhost:5500`.
4. Escribe un usuario de GitHub, por ejemplo: `octocat`, `microsoft` o `google`.

## Consumo de la API

La función `getLiveResponses()` en `app.js` realiza dos solicitudes con `fetch()`:

- `GET https://api.github.com/users/{usuario}`
- `GET https://api.github.com/users/{usuario}/repos?sort=updated&per_page=12`

La aplicación procesa la respuesta JSON y muestra perfil, estadísticas y repositorios. También presenta el código HTTP, el tiempo de respuesta y el límite restante informado por GitHub.

## Modo demostración sin Internet

Para revisar la interfaz con datos locales documentados:

`http://localhost:5500/?demo=1`

En ese modo utiliza el usuario `octocat`. El modo normal es el que realiza el consumo real de la API.
