import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps';

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

interface WorldMapProps {
  markers?: Array<{
    name: string;
    coordinates: [number, number]; // [lon, lat]
    color?: string;
  }>;
}

export function WorldMap({ markers = [] }: WorldMapProps) {
  // Determine view configuration based on markers
  const hasMarker = markers.length > 0;

  // If we have a marker, zoom in (scale 600) and center on it.
  // Otherwise default to world view.
  const config = hasMarker ? {
    scale: 400,
    center: markers[0].coordinates
  } : {
    scale: 120,
    center: [0, 10] as [number, number]
  };

  return (
    <div className="w-full h-full min-h-50 bg-slate-50 dark:bg-[#1e293b] rounded-lg overflow-hidden relative transition-colors">
      <ComposableMap
        projection="geoMercator"
        projectionConfig={config}
        className="w-full h-full"
      >
        <Geographies geography={geoUrl}>
          {({ geographies }: { geographies: any[] }) =>
            geographies
              .filter((geo: any) => geo.properties.name !== "Antarctica" && geo.id !== "ATA") // Hide Antarctica
              .map((geo: any) => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill="none" // Transparent fill for outline look
                  stroke="currentColor"
                  strokeWidth={0.75}
                  className="text-slate-400 dark:text-slate-500" // Adaptive stroke color
                  style={{
                    default: { outline: "none" },
                    hover: { outline: "none", strokeWidth: 1.5, stroke: "currentColor" },
                    pressed: { outline: "none" },
                  }}
                />
              ))
          }
        </Geographies>
        {markers.map(({ name, coordinates, color }) => (
          <Marker key={name} coordinates={coordinates}>
            {/* Large Green Dot matching the image, scaled up for better visibility */}
            <circle r="48" fill={color || "#34d399"} className="animate-ping" opacity="0.6" />
            <circle r="24" fill={color || "#10b981"} stroke="#064e3b" strokeWidth="3" />

            <text
              textAnchor="middle"
              y={-35}
              className="fill-slate-700 dark:fill-slate-100 font-semibold text-3xl"
              style={{ fontFamily: "system-ui", textShadow: "0px 1px 4px rgba(0,0,0,0.2)" }}
            >
              {name}
            </text>
          </Marker>
        ))}
      </ComposableMap>
    </div>
  );
}
