@echo off
for %%f in (*.shp) do (
    ogr2ogr -f "GeoJSON" "%%~nf.geojson" "%%f"
)
