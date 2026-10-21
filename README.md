# Coppel Guadalajara

Demo de **Tu futuro está en tus manos** para Afore Coppel.

El código fuente, puente PHP, pruebas e instrucciones están en [Projects/coppel_gdl/](Projects/coppel_gdl/README.md).

```bash
cd Projects/coppel_gdl
npm ci
cp .env.example .env
# Configura STATION_TOKEN en .env
npm start
```

El archivo `.env` es local y no se versiona. La integración online requiere instalar el puente PHP y configurar sus credenciales. El demo inicia con datos ficticios.
