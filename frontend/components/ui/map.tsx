"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import type {} from "@maplibre/maplibre-gl-leaflet"
import type {
    DivIconOptions,
    ErrorEvent,
    LatLngExpression,
    Map as LeafletMap,
    LocateOptions,
    LocationEvent,
    MaplibreGL,
    Marker,
    Polyline,
    Popup,
    TileLayer,
} from "leaflet"
import "leaflet.fullscreen/dist/Control.FullScreen.css"
import "leaflet/dist/leaflet.css"
import {
    LoaderCircleIcon,
    MapPinIcon,
    MaximizeIcon,
    MinimizeIcon,
    MinusIcon,
    NavigationIcon,
    PlusIcon,
} from "lucide-react"
import type { Map as MaplibreMap } from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"
import { useTheme } from "next-themes"
import React, {
    Suspense,
    lazy,
    useEffect,
    useRef,
    useState,
    type ComponentType,
    type ReactNode,
    type Ref,
} from "react"
import { renderToString } from "react-dom/server"
import {
    useMap,
    useMapEvents,
    type MapContainerProps,
    type MarkerProps,
    type PolylineProps,
    type PopupProps,
    type TileLayerProps,
} from "react-leaflet"

// Registry source preserves arbitrary component props through the generic.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createLazyComponent<T extends ComponentType<any>>(
    factory: () => Promise<{ default: T }>
) {
    const LazyComponent = lazy(factory)

    return (props: React.ComponentProps<T>) => {
        const [isMounted, setIsMounted] = useState(false)

        useEffect(() => {
            setIsMounted(true)
        }, [])

        if (!isMounted) {
            return null
        }

        return (
            <Suspense>
                <LazyComponent {...props} />
            </Suspense>
        )
    }
}

const LeafletMapContainer = createLazyComponent(() =>
    import("react-leaflet").then((mod) => ({
        default: mod.MapContainer,
    }))
)
const LeafletTileLayer = createLazyComponent(() =>
    import("react-leaflet").then((mod) => ({
        default: mod.TileLayer,
    }))
)
const LeafletMarker = createLazyComponent(() =>
    import("react-leaflet").then((mod) => ({
        default: mod.Marker,
    }))
)
const LeafletPopup = createLazyComponent(() =>
    import("react-leaflet").then((mod) => ({
        default: mod.Popup,
    }))
)
const LeafletPolyline = createLazyComponent(() =>
    import("react-leaflet").then((mod) => ({
        default: mod.Polyline,
    }))
)
function Map({
    zoom = 15,
    minZoom = 1,
    maxZoom = 18,
    maxBounds,
    maxBoundsViscosity = 1,
    className,
    ...props
}: Omit<MapContainerProps, "zoomControl"> & {
    center: LatLngExpression
    ref?: Ref<LeafletMap>
}) {
    return (
        <LeafletMapContainer
            zoom={zoom}
            minZoom={minZoom}
            maxZoom={maxZoom}
            maxBounds={maxBounds}
            maxBoundsViscosity={maxBoundsViscosity}
            attributionControl={false}
            zoomControl={false}
            className={cn(
                "z-50 size-full min-h-96 flex-1 rounded-md",
                className
            )}
            {...props}
        />
    )
}

const DEFAULT_VECTOR_STYLE_URL = "https://tiles.openfreemap.org/styles/positron"
const DEFAULT_DARK_VECTOR_STYLE_URL =
    "https://tiles.openfreemap.org/styles/dark"
const DEFAULT_RASTER_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
const DEFAULT_RASTER_ATTRIBUTION =
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'

interface MapTileSourceProps {
    vectorStyleUrl?: string
    darkVectorStyleUrl?: string
    rasterUrl?: string
    darkRasterUrl?: string
    rasterAttribution?: string
    darkRasterAttribution?: string
}

type MapTileSource =
    // No attribution needed: vector styles define it in their sources
    | { type: "vector"; styleUrl: string }
    | { type: "raster"; url: string; attribution?: string }

function resolveTileSource({
    isDark,
    webglSupported,
    vectorStyleUrl,
    darkVectorStyleUrl,
    rasterUrl,
    darkRasterUrl,
    rasterAttribution,
    darkRasterAttribution,
}: MapTileSourceProps & {
    isDark: boolean
    webglSupported: boolean
}): MapTileSource {
    const userStyleUrl = isDark
        ? (darkVectorStyleUrl ?? vectorStyleUrl)
        : vectorStyleUrl
    const userRasterUrl = isDark ? (darkRasterUrl ?? rasterUrl) : rasterUrl
    const userRasterAttribution = isDark
        ? (darkRasterAttribution ?? rasterAttribution)
        : rasterAttribution

    if (webglSupported && (userStyleUrl || !userRasterUrl)) {
        return {
            type: "vector",
            styleUrl:
                userStyleUrl ??
                (isDark
                    ? DEFAULT_DARK_VECTOR_STYLE_URL
                    : DEFAULT_VECTOR_STYLE_URL),
        }
    }

    return userRasterUrl
        ? {
              type: "raster",
              url: userRasterUrl,
              attribution: userRasterAttribution,
          }
        : {
              type: "raster",
              url: DEFAULT_RASTER_URL,
              attribution: userRasterAttribution ?? DEFAULT_RASTER_ATTRIBUTION,
          }
}

function getStyleAttribution(glMap: MaplibreMap) {
    return Object.keys(glMap.getStyle()?.sources ?? {})
        .map((sourceId) => glMap.getSource(sourceId)?.attribution)
        .filter(Boolean)
        .join(", ")
}

function MapVectorLayer({
    styleUrl,
    onError,
}: {
    styleUrl: string
    onError: () => void
}) {
    const map = useMap()
    const layerRef = useRef<MaplibreGL | null>(null)
    const styleUrlRef = useRef(styleUrl)
    const onErrorRef = useRef(onError)

    useEffect(() => {
        onErrorRef.current = onError
    }, [onError])

    useEffect(() => {
        styleUrlRef.current = styleUrl
        layerRef.current?.getMaplibreMap()?.setStyle(styleUrl)
    }, [styleUrl])

    useEffect(() => {
        let cancelled = false
        let contextLostTimeout: ReturnType<typeof setTimeout> | undefined
        // The attribution is managed here rather than by maplibre-gl-leaflet,
        // so it updates when the style changes and is removed with the layer
        let attribution = ""

        function removeLayer(layer: MaplibreGL, isBroken = false) {
            if (isBroken) {
                // A layer that failed to initialize has no GL map to clean up
                layer.onRemove = function (this: MaplibreGL) {
                    this.getContainer()?.remove()
                    return this
                }
            }
            map.removeLayer(layer)
        }

        async function addLayer() {
            const [{ maplibreGL }, { getVersion, setWorkerUrl }] =
                await Promise.all([
                    import("@maplibre/maplibre-gl-leaflet"),
                    import("maplibre-gl"),
                ])
            if (cancelled) return

            setWorkerUrl(`/maplibre-gl-worker.mjs?v=${getVersion()}`)

            const layer = maplibreGL({
                style: styleUrlRef.current,
                attributionControl: false,
            })

            try {
                layer.addTo(map)
            } catch {
                removeLayer(layer, true)
                onErrorRef.current()
                return
            }

            const glMap = layer.getMaplibreMap()
            glMap.on("webglcontextlost", () => {
                contextLostTimeout = setTimeout(
                    () => onErrorRef.current(),
                    3000
                )
            })
            glMap.on("webglcontextrestored", () => {
                clearTimeout(contextLostTimeout)
            })
            glMap.on("idle", () => {
                const nextAttribution = getStyleAttribution(glMap)
                if (nextAttribution === attribution) return
                map.attributionControl?.removeAttribution(attribution)
                map.attributionControl?.addAttribution(nextAttribution)
                attribution = nextAttribution
            })
            layerRef.current = layer
        }

        addLayer()

        return () => {
            cancelled = true
            clearTimeout(contextLostTimeout)
            map.attributionControl?.removeAttribution(attribution)
            if (layerRef.current) {
                removeLayer(layerRef.current)
                layerRef.current = null
            }
        }
    }, [map])

    return null
}

function MapTileLayer({
    vectorStyleUrl,
    darkVectorStyleUrl,
    rasterUrl,
    darkRasterUrl,
    rasterAttribution,
    darkRasterAttribution,
    url,
    darkUrl,
    attribution,
    darkAttribution,
    ...props
}: Omit<Partial<TileLayerProps>, "url" | "attribution"> &
    MapTileSourceProps & {
        /** @deprecated Use `rasterUrl` instead. */
        url?: string
        /** @deprecated Use `darkRasterUrl` instead. */
        darkUrl?: string
        /** @deprecated Use `rasterAttribution` instead. */
        attribution?: string
        /** @deprecated Use `darkRasterAttribution` instead. */
        darkAttribution?: string
        /** Only applies to raster tiles. */
        ref?: Ref<TileLayer>
    }) {
    const map = useMap()
    if (map.attributionControl) {
        map.attributionControl.setPrefix("")
    }

    const { resolvedTheme } = useTheme()
    const isWebGLSupported = useWebGLSupport()
    const [isVectorFailed, setIsVectorFailed] = useState(false)

    if (isWebGLSupported === null) {
        return null
    }

    const source = resolveTileSource({
        isDark: resolvedTheme === "dark",
        webglSupported: isWebGLSupported && !isVectorFailed,
        vectorStyleUrl,
        darkVectorStyleUrl,
        rasterUrl: rasterUrl ?? url,
        darkRasterUrl: darkRasterUrl ?? darkUrl,
        rasterAttribution: rasterAttribution ?? attribution,
        darkRasterAttribution: darkRasterAttribution ?? darkAttribution,
    })

    if (source.type === "vector") {
        return (
            <MapVectorLayer
                styleUrl={source.styleUrl}
                onError={() => setIsVectorFailed(true)}
            />
        )
    }

    return (
        <LeafletTileLayer
            url={source.url}
            attribution={source.attribution}
            {...props}
        />
    )
}

function MapMarker({
    icon = <MapPinIcon className="size-6" />,
    iconAnchor = [12, 12],
    bgPos,
    popupAnchor,
    tooltipAnchor,
    ...props
}: Omit<MarkerProps, "icon"> &
    Pick<
        DivIconOptions,
        "iconAnchor" | "bgPos" | "popupAnchor" | "tooltipAnchor"
    > & {
        icon?: ReactNode
        ref?: Ref<Marker>
    }) {
    const { L } = useLeaflet()
    if (!L) return null

    return (
        <LeafletMarker
            icon={L.divIcon({
                html: renderToString(icon),
                iconAnchor,
                ...(bgPos ? { bgPos } : {}),
                ...(popupAnchor ? { popupAnchor } : {}),
                ...(tooltipAnchor ? { tooltipAnchor } : {}),
            })}
            riseOnHover
            {...props}
        />
    )
}

function MapPolyline({
    className,
    ...props
}: PolylineProps & { ref?: Ref<Polyline> }) {
    return (
        <LeafletPolyline
            className={cn(
                "fill-none stroke-foreground stroke-2",
                className
            )}
            {...props}
        />
    )
}

function MapPopup({
    className,
    ...props
}: Omit<PopupProps, "content"> & { ref?: Ref<Popup> }) {
    return (
        <LeafletPopup
            className={cn(
                "bg-popover text-popover-foreground animate-in fade-out-0 fade-in-0 zoom-out-95 zoom-in-95 slide-in-from-bottom-2 z-50 w-72 rounded-md border p-4 font-sans shadow-md outline-hidden",
                className
            )}
            {...props}
        />
    )
}

function MapZoomControl({
    position = "top-1 left-1",
    className,
    ...props
}: React.ComponentProps<"div"> & { position?: string }) {
    const map = useMap()
    const [zoomLevel, setZoomLevel] = useState(map.getZoom())

    useMapEvents({
        zoomend: () => {
            setZoomLevel(map.getZoom())
        },
    })

    return (
        <MapControlContainer className={cn(position, className)}>
            <ButtonGroup
                orientation="vertical"
                aria-label="Zoom controls"
                {...props}>
                <Button
                    type="button"
                    size="icon-sm"
                    variant="secondary"
                    aria-label="Zoom in"
                    title="Zoom in"
                    className="border"
                    disabled={zoomLevel >= map.getMaxZoom()}
                    onClick={() => map.zoomIn()}>
                    <PlusIcon />
                </Button>
                <Button
                    type="button"
                    size="icon-sm"
                    variant="secondary"
                    aria-label="Zoom out"
                    title="Zoom out"
                    className="border"
                    disabled={zoomLevel <= map.getMinZoom()}
                    onClick={() => map.zoomOut()}>
                    <MinusIcon />
                </Button>
            </ButtonGroup>
        </MapControlContainer>
    )
}

function MapFullscreenControl({
    position = "top-1 right-1",
    className,
    ...props
}: React.ComponentProps<"button"> & { position?: string }) {
    const map = useMap()
    const [isFullscreen, setIsFullscreen] = useState(false)

    const { L } = useLeaflet()

    useEffect(() => {
        if (!L) return

        const fullscreenControl = new L.Control.FullScreen()
        fullscreenControl.addTo(map)

        const container = fullscreenControl.getContainer()
        if (container) {
            container.style.display = "none"
        }

        const handleEnter = () => setIsFullscreen(true)
        const handleExit = () => setIsFullscreen(false)

        map.on("enterFullscreen", handleEnter)
        map.on("exitFullscreen", handleExit)

        return () => {
            fullscreenControl.remove()
            map.off("enterFullscreen", handleEnter)
            map.off("exitFullscreen", handleExit)
        }
    }, [L, map])

    return (
        <MapControlContainer className={cn(position, className)}>
            <Button
                type="button"
                size="icon-sm"
                variant="secondary"
                onClick={() => map.toggleFullscreen()}
                aria-label={
                    isFullscreen ? "Exit fullscreen" : "Enter fullscreen"
                }
                title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                className="border"
                {...props}>
                {isFullscreen ? <MinimizeIcon /> : <MaximizeIcon />}
            </Button>
        </MapControlContainer>
    )
}

function MapLocatePulseIcon() {
    return (
        <div className="absolute -top-1 -right-1 flex size-3 rounded-full">
            <div className="bg-primary absolute inline-flex size-full animate-ping rounded-full opacity-75" />
            <div className="bg-primary relative inline-flex size-3 rounded-full" />
        </div>
    )
}

function MapLocateControl({
    watch = false,
    onLocationFound,
    onLocationError,
    position = "right-1 bottom-1",
    className,
    ...props
}: React.ComponentProps<"button"> &
    Pick<LocateOptions, "watch"> & {
        onLocationFound?: (location: LocationEvent) => void
        onLocationError?: (error: ErrorEvent) => void
    } & { position?: string }) {
    const map = useMap()
    const [isLocating, setIsLocating] = useDebounceLoadingState(200)
    const [location, setLocation] = useState<LatLngExpression | null>(null)

    function startLocating() {
        setIsLocating(true)
        map.locate({ setView: true, maxZoom: map.getMaxZoom(), watch })
        map.on("locationfound", (location: LocationEvent) => {
            setLocation(location.latlng)
            setIsLocating(false)
            onLocationFound?.(location)
        })
        map.on("locationerror", (error: ErrorEvent) => {
            setLocation(null)
            setIsLocating(false)
            onLocationError?.(error)
        })
    }

    function stopLocating() {
        map.stopLocate()
        map.off("locationfound")
        map.off("locationerror")
        setLocation(null)
        setIsLocating(false)
    }

    useEffect(() => () => stopLocating(), [])

    return (
        <MapControlContainer className={cn(position, className)}>
            <Button
                type="button"
                size="icon-sm"
                variant={location ? "default" : "secondary"}
                onClick={location ? stopLocating : startLocating}
                disabled={isLocating}
                title={
                    isLocating
                        ? "Locating..."
                        : location
                          ? "Stop tracking"
                          : "Track location"
                }
                aria-label={
                    isLocating
                        ? "Locating..."
                        : location
                          ? "Stop location tracking"
                          : "Start location tracking"
                }
                className="border"
                {...props}>
                {isLocating ? (
                    <LoaderCircleIcon className="animate-spin" />
                ) : (
                    <NavigationIcon />
                )}
            </Button>
            {location && (
                <MapMarker position={location} icon={<MapLocatePulseIcon />} />
            )}
        </MapControlContainer>
    )
}

function MapControlContainer({
    className,
    ...props
}: React.ComponentPropsWithoutRef<"div">) {
    const { L } = useLeaflet()
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!L) return
        const element = containerRef.current
        if (!element) return
        L.DomEvent.disableClickPropagation(element)
        L.DomEvent.disableScrollPropagation(element)
    }, [L])

    return (
        <div
            ref={containerRef}
            className={cn("absolute z-1000 size-fit cursor-default", className)}
            {...props}
        />
    )
}

function useLeaflet() {
    const [L, setL] = useState<typeof import("leaflet") | null>(null)

    useEffect(() => {
        async function loadLeaflet() {
            const leaflet = await import("leaflet")
            const leafletFullscreen = await import("leaflet.fullscreen")
            const L_object = leaflet.default
            if (L_object.Control && !L_object.Control.FullScreen) {
                L_object.Control.FullScreen =
                    leafletFullscreen.default || leafletFullscreen
            }

            setL(L_object)
        }

        if (L) return
        if (typeof window === "undefined") return

        loadLeaflet()
    }, [L])

    return { L }
}

let isWebGLSupportedCache: boolean | undefined

function isWebGLSupported() {
    if (isWebGLSupportedCache === undefined) {
        try {
            const canvas = document.createElement("canvas")
            const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl")
            isWebGLSupportedCache = !!gl
            gl?.getExtension("WEBGL_lose_context")?.loseContext()
        } catch {
            isWebGLSupportedCache = false
        }
    }
    return isWebGLSupportedCache
}

function useWebGLSupport() {
    const [isSupported, setIsSupported] = useState<boolean | null>(null)

    useEffect(() => {
        setIsSupported(isWebGLSupported())
    }, [])

    return isSupported
}

function useDebounceLoadingState(delay = 200) {
    const [isLoading, setIsLoading] = useState(false)
    const [showLoading, setShowLoading] = useState(false)
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => {
        if (isLoading) {
            timeoutRef.current = setTimeout(() => {
                setShowLoading(true)
            }, delay)
        } else {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current)
                timeoutRef.current = null
            }
            setShowLoading(false)
        }

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current)
            }
        }
    }, [isLoading, delay])

    return [showLoading, setIsLoading] as const
}

export {
    Map,
    MapFullscreenControl,
    MapLocateControl,
    MapMarker,
    MapPolyline,
    MapPopup,
    MapTileLayer,
    MapZoomControl,
}
