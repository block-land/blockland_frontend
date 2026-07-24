"use client";

import React, { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import {
  Search,
  Layers,
  X,
  Loader2,
  MapPin,
  Plus,
  Minus,
  BoxSelect,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  RiCheckDoubleLine,
  RiDeleteBin5Line,
  RiFingerprintLine,
  RiSearchLine,
} from "react-icons/ri";
import { Input } from "@/components/ui/input";
import { useWallets } from "@privy-io/react-auth/solana";
import {
  getCell,
  getCellBoundaryGeoJSON,
  getCellCenter,
  buildSoldTilesGeoJSON,
  buildSoldTilesCentroidsGeoJSON,
  generateGridGeoJSON,
  getCellsInBounds,
  isInUsaBounds,
} from "@/lib/solana/h3";
import {
  getTilePrice,
  lamportsToSol,
  mintTile,
  captureMapSnapshotsBatch,
  reverseGeocodePlaceNamesBatch,
  getWalletBalance,
  type TilePrice,
} from "@/lib/solana/mint";
import { withCustomButton } from "@/components/custom/button_custom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import Avatar from "boring-avatars";
import { BACKEND_URL } from "@/lib/api";

const ButtonCustom = withCustomButton("button");

interface MapError {
  type: "token" | "webgl" | "initialization";
  message: string;
}

interface Landmark {
  name: string;
  location: string;
  coordinates: [number, number];
  thumbnail?: string | null;
  fallbackThumbnail?: string | null;
  purchaseDate?: string | null;
  priceSol?: number | null;
}

/**
 * Build a Mapbox Static Images URL for a thumbnail map of a coordinate.
 * Uses dark-v11 to match the Blockland dark theme of the main map.
 */
function buildStaticMapUrl(lng: number, lat: number): string {
  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
  return `https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/${lng},${lat},14,0,0/80x80@2x?access_token=${token}`;
}

/**
 * Older Irys uploads were stored with an Arweave gateway URL even though their
 * transaction IDs are served by Irys. Normalize those rows when they are read.
 */
function normalizeThumbnailUrl(imageUri: unknown): string | null {
  if (typeof imageUri !== "string" || !imageUri.trim()) return null;

  try {
    const url = new URL(imageUri.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (url.hostname === "arweave.net" || url.hostname === "www.arweave.net") {
      url.protocol = "https:";
      url.hostname = "gateway.irys.xyz";
      url.port = "";
    }
    return url.toString();
  } catch {
    return null;
  }
}

function selectedTilesGeoJSON(cells: string[]) {
  return {
    type: "FeatureCollection" as const,
    features: cells.map((cell) => ({
      type: "Feature" as const,
      geometry: getCellBoundaryGeoJSON(cell),
      properties: { cell, status: "selected" },
    })),
  };
}

function updateSelectedTilesSource(map: mapboxgl.Map, cells: string[]) {
  // Only require the source to exist — not a fully loaded style. The previous
  // isStyleLoaded() guard caused selections to be dropped when clicks happened
  // during/after a camera jump (style briefly reported as not loaded), leaving
  // the React state out of sync with the rendered polygons.
  const source = map.getSource("selected-tiles") as
    | mapboxgl.GeoJSONSource
    | undefined;
  if (!source) return;
  source.setData(selectedTilesGeoJSON(cells));
}

// H3 tile outlines and purchase selection are only useful once individual
// cells are visible. Keep this aligned with the grid and box-select threshold.
const MIN_TILE_SELECTION_ZOOM = 9;

const LANDMARKS: Landmark[] = [
  {
    name: "Golden Gate Bridge",
    location: "San Francisco, California",
    coordinates: [-122.4783, 37.8199],
  },
  {
    name: "Statue of Liberty",
    location: "New York, New York",
    coordinates: [-74.0445, 40.6892],
  },
  {
    name: "Grand Canyon",
    location: "Arizona",
    coordinates: [-112.1401, 36.0544],
  },
  {
    name: "Times Square",
    location: "New York, New York",
    coordinates: [-73.9855, 40.758],
  },
  {
    name: "Hollywood Sign",
    location: "Los Angeles, California",
    coordinates: [-118.3215, 34.1341],
  },
  {
    name: "Yellowstone National Park",
    location: "Wyoming",
    coordinates: [-110.5885, 44.428],
  },
];

export default function LandmarkPage() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const userInteractedRef = useRef<boolean>(false);
  const [error, setError] = useState<MapError | null>(null);

  // Interactive UI states
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSearchDialogOpen, setIsSearchDialogOpen] = useState(false);
  const [mapStyle, setMapStyle] = useState<"default" | "realistic">("default");

  // User owned landmarks states
  const [userLandmarks, setUserLandmarks] = useState<Landmark[]>([]);
  const [isLoadingLandmarks, setIsLoadingLandmarks] = useState(false);
  const [isLoadingMoreLandmarks, setIsLoadingMoreLandmarks] = useState(false);
  const [hasMoreLandmarks, setHasMoreLandmarks] = useState(true);
  const [landmarksOffset, setLandmarksOffset] = useState(0);
  const [totalLandmarksCount, setTotalLandmarksCount] = useState(0);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Tile multi-select state — array of selected H3 cell IDs available to buy
  const [selectedCells, setSelectedCells] = useState<string[]>([]);
  // The Mapbox event handlers are registered once, so keep their selection
  // input in a ref to make click feedback immediate and avoid stale state.
  const selectedCellsRef = useRef<string[]>([]);

  // Mirror of sold cell IDs fetched from backend. Used by box-select to skip
  // tiles that are already owned (the click handler uses queryRenderedFeatures
  // for a single point, but that API doesn't work for a rectangle drag).
  const soldCellsRef = useRef<Set<string>>(new Set());

  // Box-select (drag a rectangle to select many tiles at once).
  // Toggled on via the "Select" button in the control bar; while active, map
  // drag-pan is disabled and a pointer drag draws a selection rectangle.
  const [selectMode, setSelectMode] = useState(false);
  // Mirror selectMode into a ref so the map event handlers (bound once on
  // mount) always see the latest value without re-binding listeners.
  const selectModeRef = useRef(false);
  useEffect(() => {
    selectModeRef.current = selectMode;
    // Toggle drag-pan based on mode whenever the map exists
    if (mapRef.current) {
      const canvasEl = mapRef.current.getCanvas();
      if (selectMode) {
        mapRef.current.dragPan?.disable();
        mapRef.current.boxZoom?.disable();
        canvasEl.style.cursor = "crosshair";
        // Prevent native touch panning/scrolling so a touch drag draws the box
        canvasEl.style.touchAction = "none";
      } else {
        mapRef.current.dragPan?.enable();
        mapRef.current.boxZoom?.enable();
        canvasEl.style.cursor = "";
        canvasEl.style.touchAction = "";
      }
    }
  }, [selectMode]);
  const boxStartRef = useRef<{ x: number; y: number } | null>(null);
  const [boxRect, setBoxRect] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);
  // True briefly after a box-select drag completes, so the map's click handler
  // can skip the synthetic click that Mapbox fires right after the drag.
  const boxJustFinishedRef = useRef(false);

  // Mint progress state (inline, no global dialog)
  const [isMinting, setIsMinting] = useState(false);
  const [mintProgress, setMintProgress] = useState(0);
  const [mintError, setMintError] = useState<string | null>(null);

  // Custom confirm/transaction dialog state
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [mintStatus, setMintStatus] = useState<
    "idle" | "minting" | "success" | "error"
  >("idle");
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [successCount, setSuccessCount] = useState<number>(0);
  const [successPriceSol, setSuccessPriceSol] = useState<number>(0);
  const [initialToMintCount, setInitialToMintCount] = useState<number>(0);

  // Tile price (fetched from backend — $0.2 at live SOL rate)
  const [tilePrice, setTilePrice] = useState<TilePrice | null>(null);
  useEffect(() => {
    getTilePrice().then(setTilePrice);
  }, []);

  // Wallet for minting
  const { wallets } = useWallets();
  const wallet = wallets[0];

  // Fetch user landmarks when wallet is connected and dialog is opened
  const fetchUserLandmarks = async (offsetVal: number, replace: boolean = false, currentSearch: string = "") => {
    if (!wallet?.address) return;
    if (offsetVal === 0) {
      setIsLoadingLandmarks(true);
    } else {
      setIsLoadingMoreLandmarks(true);
    }

    try {
      // Build search query param
      const searchParam = currentSearch.trim() ? `&search=${encodeURIComponent(currentSearch.trim())}` : "";

      // Fetch user landmarks using pagination (limit = 10)
      const res = await fetch(
        `${BACKEND_URL}/api/tiles/owner/${wallet.address}?limit=10&offset=${offsetVal}${searchParam}`,
      );
      const data = await res.json();
      if (data.ok && Array.isArray(data.tiles)) {
        const mapped: Landmark[] = data.tiles.map((t: any) => {
          const latNum = parseFloat(t.lat);
          const lngNum = parseFloat(t.lng);
          // Format purchase date (createdAt ISO → "Jul 12, 2026")
          const createdAt = t.createdAt ? new Date(t.createdAt) : null;
          const purchaseDate = createdAt
            ? createdAt.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
            : null;
          // priceLamports comes back as a string from the backend
          const lamports = t.priceLamports ? Number(t.priceLamports) : null;
          const fallbackThumbnail = buildStaticMapUrl(lngNum, latNum);
          return {
            name: purchaseDate ?? "Blockland Tile",
            purchaseDate,
            priceSol: lamports !== null ? lamportsToSol(lamports) : null,
            // Place name is reverse-geocoded once at mint time and stored in
            // the DB, so we read it directly here (no per-view Mapbox call).
            // Fall back to coordinates for legacy tiles that haven't been
            // backfilled yet.
            location:
              typeof t.placeName === "string" && t.placeName.trim()
                ? t.placeName
                : `${latNum.toFixed(4)}, ${lngNum.toFixed(4)}`,
            coordinates: [lngNum, latNum] as [number, number],
            // Use the stored Irys image (uploaded once at mint) instead of
            // hitting Mapbox Static API for every thumbnail view. Fall back to
            // Mapbox for legacy, invalid, expired, or unavailable images.
            thumbnail: normalizeThumbnailUrl(t.imageUri) ?? fallbackThumbnail,
            fallbackThumbnail,
          };
        });

        if (replace) {
          setUserLandmarks(mapped);
        } else {
          setUserLandmarks((prev) => [...prev, ...mapped]);
        }

        const totalCount = data.total ?? data.tiles.length;
        setTotalLandmarksCount(totalCount);
        setHasMoreLandmarks(offsetVal + data.tiles.length < totalCount);
        setLandmarksOffset(offsetVal + data.tiles.length);
      } else {
        if (replace) setUserLandmarks([]);
        setHasMoreLandmarks(false);
      }
    } catch (err) {
      console.error("Failed to fetch user landmarks:", err);
      if (replace) setUserLandmarks([]);
    } finally {
      setIsLoadingLandmarks(false);
      setIsLoadingMoreLandmarks(false);
    }
  };

  // Reset offset and fetch first page when dialog is opened, wallet address changes, or search query changes
  useEffect(() => {
    if (isDialogOpen && wallet?.address) {
      setUserLandmarks([]);
      setLandmarksOffset(0);
      setHasMoreLandmarks(true);
      fetchUserLandmarks(0, true, "");
    } else if (!isDialogOpen) {
      setUserLandmarks([]);
      setLandmarksOffset(0);
      setHasMoreLandmarks(true);
    }
  }, [wallet?.address, isDialogOpen]);

  // Load more function
  const loadMoreLandmarks = () => {
    if (isLoadingMoreLandmarks || !hasMoreLandmarks) return;
    fetchUserLandmarks(landmarksOffset, false, "");
  };

  // IntersectionObserver for infinite scrolling
  useEffect(() => {
    if (!isDialogOpen || !hasMoreLandmarks || isLoadingLandmarks || isLoadingMoreLandmarks) return;

    const currentSentinel = sentinelRef.current;
    if (!currentSentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMoreLandmarks();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(currentSentinel);
    return () => {
      observer.unobserve(currentSentinel);
    };
  }, [isDialogOpen, hasMoreLandmarks, landmarksOffset, isLoadingLandmarks, isLoadingMoreLandmarks]);

  // Fetch wallet balance when confirm dialog opens
  useEffect(() => {
    if (!wallet?.address || !isConfirmDialogOpen) return;

    const fetchBalance = async () => {
      setIsLoadingBalance(true);
      try {
        const bal = await getWalletBalance(wallet.address);
        setWalletBalance(bal);
      } catch (err) {
        console.error("Failed to fetch balance:", err);
      } finally {
        setIsLoadingBalance(false);
      }
    };

    fetchBalance();
  }, [wallet?.address, isConfirmDialogOpen]);

  // Tile selection + buy state
  const [selectedCoord, setSelectedCoord] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  // Sold tile info shown in the custom Dialog modal when a sold tile is clicked.
  const [soldTileInfo, setSoldTileInfo] = useState<{
    owner: string;
    ownerShort: string;
    username: string | null;
    photoUrl: string | null;
    cell: string;
    placeName: string | null;
    priceLamports: string | null;
  } | null>(null);

  // Mint all selected tiles inline (no global dialog)
  const handleBuyTiles = async () => {
    if (!wallet?.address) {
      setMintError("Connect your wallet first");
      toast.error("Connect your wallet first");
      return;
    }
    if (!mapRef.current || selectedCells.length === 0) return;

    setIsMinting(true);
    setMintStatus("minting");
    setMintError(null);
    setMintProgress(0);
    setSuccessCount(0);
    setSuccessPriceSol(0);

    const rarity = "Common" as const;
    const cellsToProcess = [...selectedCells];
    const totalToMint = cellsToProcess.length;
    setInitialToMintCount(totalToMint);

    try {
      // Capture ALL tile thumbnails in parallel first (one Mapbox Static API
      // call per tile, all concurrent). This used to be done one-at-a-time
      // inside the mint loop with a 2s map fly each — the main cause of slow
      // bulk purchases.
      const centers = cellsToProcess.map((cell) => {
        const c = getCellCenter(cell);
        return { cell, lat: c.lat, lng: c.lng };
      });
      const images = await captureMapSnapshotsBatch(
        centers.map((c) => ({ lat: c.lat, lng: c.lng })),
      );

      // Reverse-geocode each tile ONCE at purchase time (parallel) so the place
      // name can be stored in the DB. This avoids re-geocoding the same tiles
      // on every "Your Landmarks" view (saving Mapbox API quota).
      const placeNames = await reverseGeocodePlaceNamesBatch(
        centers.map((c) => ({ lat: c.lat, lng: c.lng })),
      );

      for (let i = 0; i < totalToMint; i++) {
        const { cell, lat, lng } = centers[i];
        const res = await mintTile({
          buyer: wallet.address,
          lat,
          lng,
          imageBase64: images[i],
          rarity,
          placeName: placeNames[i] ?? undefined,
        });
        if (!res.ok) {
          throw new Error(`Tile ${i + 1} failed: ${res.error || "unknown"}`);
        }

        // Remove successfully minted tile from both the UI state and map source.
        const remainingCells = selectedCellsRef.current.filter(
          (selectedCell) => selectedCell !== cell,
        );
        selectedCellsRef.current = remainingCells;
        if (mapRef.current) {
          updateSelectedTilesSource(mapRef.current, remainingCells);
        }
        setSelectedCells(remainingCells);

        setMintProgress(i + 1);

        // Trigger map update so the freshly minted tile visually converts to Gold (Sold)
        mapRef.current.fire("moveend");
      }

      setSuccessCount(totalToMint);
      setSuccessPriceSol(tilePrice ? tilePrice.sol * totalToMint : 0);
      setMintStatus("success");
      toast.success(
        `Successfully purchased ${totalToMint} Landmark Tile${totalToMint > 1 ? "s" : ""}!`,
      );
    } catch (err) {
      console.error("Mint error:", err);
      const errMsg = err instanceof Error ? err.message : "Unknown error";
      setMintError(errMsg);
      setMintStatus("error");

      // Update toast to inform user about partial success if some tiles were bought
      const count = mintProgress;
      setSuccessCount(count);
      setSuccessPriceSol(tilePrice ? tilePrice.sol * count : 0);
      if (count > 0) {
        toast.error(
          `Purchase partially succeeded: ${count} of ${totalToMint} tiles secured. Error: ${errMsg}`,
        );
      } else {
        toast.error(`Purchase failed: ${errMsg}`);
      }
    } finally {
      setIsMinting(false);
    }
  };

  // Placeholder typing loop animation
  const placeholders = [
    "Search location suggestion..",
    "Find landmarks near you..",
    "Search historic places..",
    "Explore Blockland maps..",
  ];
  const [placeholderText, setPlaceholderText] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [currentPlaceholderIdx, setCurrentPlaceholderIdx] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [typingSpeed, setTypingSpeed] = useState(150);

  useEffect(() => {
    if (isFocused) {
      setPlaceholderText(placeholders[currentPlaceholderIdx]);
      return;
    }

    let timer: NodeJS.Timeout;
    const currentFullText = placeholders[currentPlaceholderIdx];

    const handleTyping = () => {
      if (!isDeleting) {
        setPlaceholderText(
          currentFullText.substring(0, placeholderText.length + 1),
        );

        if (placeholderText === currentFullText) {
          timer = setTimeout(() => setIsDeleting(true), 2000);
          return;
        }
      } else {
        setPlaceholderText(
          currentFullText.substring(0, placeholderText.length - 1),
        );

        if (placeholderText === "") {
          setIsDeleting(false);
          setCurrentPlaceholderIdx((prev) => (prev + 1) % placeholders.length);
          setTypingSpeed(150);
          return;
        }
      }

      setTypingSpeed(isDeleting ? 75 : 150);
    };

    timer = setTimeout(handleTyping, typingSpeed);
    return () => clearTimeout(timer);
  }, [
    placeholderText,
    isDeleting,
    currentPlaceholderIdx,
    typingSpeed,
    isFocused,
  ]);

  useEffect(() => {
    // 1. Get token from environment variables
    const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
    if (!token) {
      setError({
        type: "token",
        message:
          "Mapbox Access Token is not configured. Please set NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN in your environment variables.",
      });
      return;
    }

    // 2. Check WebGL support
    if (!mapboxgl.supported()) {
      setError({
        type: "webgl",
        message:
          "Your browser does not support WebGL, which is required to render Mapbox maps.",
      });
      return;
    }

    mapboxgl.accessToken = token;

    if (!mapContainerRef.current) return;

    // Box-select handlers + canvas element are declared here (outer scope) so
    // the cleanup function below can remove the listeners. They are assigned
    // inside the try block once the map canvas exists.
    let canvas: HTMLElement | null = null;
    let onPointerDown: (e: PointerEvent) => void = () => {};
    let onPointerMove: (e: PointerEvent) => void = () => {};
    let onPointerUp: (e: PointerEvent) => void = () => {};

    try {
      // 3. Initialize Mapbox
      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: "mapbox://styles/mapbox/dark-v11", // Dark map style matching Blockland dark theme
        center: [-98.5, 39.8],
        zoom: 4,
        projection: { name: "mercator" },
        attributionControl: true,
      });

      mapRef.current = map;

      // Disable double-click zoom permanently. Clicking a tile should only
      // select/deselect it — zoom must stay via the +/- buttons or scroll.
      map.doubleClickZoom.disable();

      // Click on map: select/deselect available tiles (multi-select).
      // Sold tiles show popup + cannot be selected.
      map.on("click", (e) => {
        // Guard: layers not ready until map style loads
        if (!map.getLayer("sold-tiles-fill")) return;

        // Skip the synthetic click Mapbox fires right after a box-select drag
        if (boxJustFinishedRef.current) return;

        const sold = map.queryRenderedFeatures(e.point, {
          layers: ["sold-tiles-fill"],
        });

        if (sold.length > 0) {
          const props = (sold[0].properties ?? {}) as {
            owner?: string;
            ownerShort?: string;
            username?: string | null;
            photoUrl?: string | null;
            cell?: string;
            placeName?: string | null;
            priceLamports?: string | null;
          };
          setSoldTileInfo({
            owner: props.owner ?? "",
            ownerShort:
              props.ownerShort ??
              (props.owner
                ? `${props.owner.slice(0, 6)}...${props.owner.slice(-4)}`
                : "Unknown"),
            username: props.username ?? null,
            photoUrl: props.photoUrl ?? null,
            cell: props.cell ?? "",
            placeName: props.placeName ?? null,
            priceLamports: props.priceLamports ?? null,
          });
          return;
        }

        // USA Bound guard: purchases are restricted to USA bounds
        if (!isInUsaBounds(e.lngLat.lat, e.lngLat.lng)) {
          new mapboxgl.Popup({ offset: 25, closeButton: true })
            .setLngLat(e.lngLat)
            .setHTML(
              `<div class="p-2 text-black font-sans max-w-[200px]">
                <h4 class="font-semibold text-sm text-red-600">Restricted Area</h4>
                <p class="text-[10px] text-zinc-500 mt-1">Purchases are temporarily restricted to the United States (USA) bounds only.</p>
              </div>`,
            )
            .addTo(map);
          return;
        }

        // At a wide zoom, jump (no animation) to the clicked area so the H3
        // grid becomes visible immediately, and select the clicked tile in the
        // same action. Animations here were perceived as a delay/error.
        if (map.getZoom() < MIN_TILE_SELECTION_ZOOM) {
          map.jumpTo({
            center: e.lngLat,
            zoom: MIN_TILE_SELECTION_ZOOM,
          });
        }

        // Available tile — toggle in multi-select and update Mapbox immediately
        // instead of waiting for React to commit the state update.
        const cell = getCell(e.lngLat.lat, e.lngLat.lng);
        const nextCells = selectedCellsRef.current.includes(cell)
          ? selectedCellsRef.current.filter((selectedCell) => selectedCell !== cell)
          : [...selectedCellsRef.current, cell];
        selectedCellsRef.current = nextCells;
        updateSelectedTilesSource(map, nextCells);
        setSelectedCells(nextCells);
      });

      // Hover cursor: sold tiles are unavailable; available tiles either focus
      // the map at low zoom or can be selected once the grid is visible.
      map.on("mousemove", (e) => {
        // Guard: layers not ready until map style loads
        if (!map.getStyle() || !map.getLayer("sold-tiles-fill")) return;

        const sold = map.queryRenderedFeatures(e.point, {
          layers: ["sold-tiles-fill"],
        });
        if (sold.length > 0) {
          map.getCanvas().style.cursor = "not-allowed";
        } else if (!isInUsaBounds(e.lngLat.lat, e.lngLat.lng)) {
          map.getCanvas().style.cursor = "not-allowed";
        } else if (map.getZoom() < MIN_TILE_SELECTION_ZOOM) {
          map.getCanvas().style.cursor = "crosshair";
        } else {
          const selected = map.queryRenderedFeatures(e.point, {
            layers: ["selected-tiles-fill"],
          });
          map.getCanvas().style.cursor =
            selected.length > 0 ? "pointer" : "crosshair";
        }
      });

      // --- Box-select: draw a rectangle to select many tiles at once ---
      // Only active while selectMode is ON (toggled from control bar).
      canvas = map.getCanvasContainer();

      onPointerDown = (e: PointerEvent) => {
        if (!selectModeRef.current) return;
        // Only react to primary button / touch
        if (e.button !== 0 && e.pointerType === "mouse") return;
        // Skip when zoomed out (no grid/cells rendered to select)
        if (map.getZoom() < MIN_TILE_SELECTION_ZOOM) return;

        boxStartRef.current = { x: e.clientX, y: e.clientY };
        setBoxRect({ x: e.clientX, y: e.clientY, w: 0, h: 0 });

        // Capture so we keep getting move events outside the canvas
        canvas?.setPointerCapture?.(e.pointerId);
        e.preventDefault();
      };

      onPointerMove = (e: PointerEvent) => {
        if (!boxStartRef.current) return;
        const start = boxStartRef.current;
        const x = Math.min(start.x, e.clientX);
        const y = Math.min(start.y, e.clientY);
        const w = Math.abs(e.clientX - start.x);
        const h = Math.abs(e.clientY - start.y);
        setBoxRect({ x, y, w, h });
      };

      onPointerUp = (e: PointerEvent) => {
        if (!boxStartRef.current) return;
        const start = boxStartRef.current;
        canvas?.releasePointerCapture?.(e.pointerId);

        // Treat as a tiny drag (< 5px) → ignore, let the normal click handler run
        if (
          Math.abs(e.clientX - start.x) < 5 &&
          Math.abs(e.clientY - start.y) < 5
        ) {
          boxStartRef.current = null;
          setBoxRect(null);
          return;
        }

        // Convert the pixel rectangle to geographic bounds.
        const rect = map.getCanvas().getBoundingClientRect();
        const minX = Math.min(start.x, e.clientX) - rect.left;
        const maxX = Math.max(start.x, e.clientX) - rect.left;
        const minY = Math.min(start.y, e.clientY) - rect.top;
        const maxY = Math.max(start.y, e.clientY) - rect.top;

        const sw = map.unproject([minX, maxY]);
        const ne = map.unproject([maxX, minY]);

        boxStartRef.current = null;
        setBoxRect(null);

        // Enumerate H3 cells inside the rectangle and merge into selection.
        // getCellsInBounds returns raw cell IDs with a generous cap (1000),
        // so a moderately-sized box actually selects cells (the grid overlay's
        // tighter 1.5°/2000 guards would return empty for a typical drag box).
        const cells = getCellsInBounds({
          minLng: sw.lng,
          minLat: sw.lat,
          maxLng: ne.lng,
          maxLat: ne.lat,
        });

        const existing = new Set(selectedCellsRef.current);
        const additions: string[] = [];
        for (const cell of cells) {
          if (existing.has(cell)) continue; // already selected
          if (soldCellsRef.current.has(cell)) continue; // owned by someone
          const { lat, lng } = getCellCenter(cell);
          if (isInUsaBounds(lat, lng)) additions.push(cell);
        }
        if (additions.length > 0) {
          const nextCells = [...selectedCellsRef.current, ...additions];
          selectedCellsRef.current = nextCells;
          updateSelectedTilesSource(map, nextCells);
          setSelectedCells(nextCells);
        }

        // Prevent the map's click handler from also toggling a cell at the
        // release point (Mapbox fires a click right after a drag ends).
        boxJustFinishedRef.current = true;
        setTimeout(() => {
          boxJustFinishedRef.current = false;
        }, 50);
      };

      canvas.addEventListener("pointerdown", onPointerDown);
      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);

      // Setup tile grid overlay on map load.
      // NOTE: All sources/layers (grid, sold, selected, and USA boundary) are
      // registered in setupSourcesAndLayers() below — do NOT add them here,
      // otherwise the guard inside that function short-circuits and the USA
      // boundary layers never get added on initial load.
      map.on("load", () => {
        // --- Fetch sold tiles + generate grid on viewport ---
        const refreshOverlay = async () => {
          if (!map.isStyleLoaded()) return;

          const bounds = map.getBounds();
          if (!bounds) return;
          const sw = bounds.getSouthWest();
          const ne = bounds.getNorthEast();
          const b = {
            minLng: sw.lng,
            minLat: sw.lat,
            maxLng: ne.lng,
            maxLat: ne.lat,
          };

          const zoom = map.getZoom();

          // 1. Grid outline — only render when zoomed in.
          // Resolution 7 hexagons are tiny (~5km²); rendering millions of them
          // at low zoom kills performance, so skip the grid until zoom >= 9.
          const gridSource = map.getSource("grid-tiles") as
            | mapboxgl.GeoJSONSource
            | undefined;
          if (gridSource) {
            if (zoom >= MIN_TILE_SELECTION_ZOOM) {
              gridSource.setData(generateGridGeoJSON(b));
            } else {
              gridSource.setData({ type: "FeatureCollection", features: [] });
            }
          }

          // 2. Sold tiles — always fetch regardless of zoom.
          // Sold tiles are user purchases (few in number) and should stay
          // visible so users can see owned tiles even when zoomed out.
          try {
            const res = await fetch(
              `${BACKEND_URL}/api/tiles/bounds?minLng=${b.minLng}&minLat=${b.minLat}&maxLng=${b.maxLng}&maxLat=${b.maxLat}`,
            );
            const data = await res.json();
            if (data.features) {
              const tiles = data.features.map((f: any) => ({
                h3Cell: f.properties.cell,
                owner: f.properties.owner,
                username: f.properties.username ?? null,
                photoUrl: f.properties.photoUrl ?? null,
                assetId: f.properties.assetId,
                placeName: f.properties.placeName ?? null,
                priceLamports: f.properties.priceLamports ?? null,
              }));
              const geojson = buildSoldTilesGeoJSON(tiles);
              const soldSource = map.getSource("sold-tiles") as
                | mapboxgl.GeoJSONSource
                | undefined;
              if (soldSource) {
                soldSource.setData(geojson);
              }
              // Keep the sold-cell ref in sync so box-select can skip owned tiles.
              // Accumulate across viewport moves so tiles seen earlier aren't lost.
              soldCellsRef.current = new Set([
                ...soldCellsRef.current,
                ...tiles.map((t: { h3Cell: string }) => t.h3Cell),
              ]);
              // Feed the dedicated Point source for labels (one point per tile)
              const labelGeojson = buildSoldTilesCentroidsGeoJSON(tiles);
              const labelSource = map.getSource("sold-tiles-labels") as
                | mapboxgl.GeoJSONSource
                | undefined;
              if (labelSource) {
                labelSource.setData(labelGeojson);
              }
            }
          } catch (err) {
            console.error("Failed to fetch sold tiles:", err);
          }
        };

        const setupSourcesAndLayers = () => {
          if (map.getSource("grid-tiles")) return; // Prevent duplicate additions

          // --- Sources ---
          map.addSource("grid-tiles", {
            type: "geojson",
            data: { type: "FeatureCollection", features: [] },
          });
          map.addSource("sold-tiles", {
            type: "geojson",
            data: { type: "FeatureCollection", features: [] },
          });
          // Separate Point source for the owner label. Using a dedicated
          // Point source (one per tile) guarantees Mapbox renders exactly one
          // symbol per tile — reading from the polygon source caused duplicate
          // labels when zooming across internal tile boundaries.
          map.addSource("sold-tiles-labels", {
            type: "geojson",
            data: { type: "FeatureCollection", features: [] },
          });
          map.addSource("selected-tiles", {
            type: "geojson",
            data: { type: "FeatureCollection", features: [] },
          });

          // USA Boundary polygon — real contiguous US coastline/borders.
          // Loaded from a local GeoJSON file in /public/data. Bounds match the
          // H3 USA_BOUNDS geofence used for purchase validation (isInUsaBounds).
          map.addSource("usa-boundary", {
            type: "geojson",
            data: "/data/usa-contiguous.geo.json",
          });

          // --- Layers ---
          // USA Boundary Fill Area (Semi-transparent soft brand orange/gold fill to highlight the valid region)
          map.addLayer({
            id: "usa-boundary-fill",
            type: "fill",
            source: "usa-boundary",
            paint: {
              "fill-color": "#F1C67C",
              "fill-opacity": 0.08,
            },
          });

          // USA Boundary Area Line (Red dashed line showing the restricted coordinate zone)
          map.addLayer({
            id: "usa-boundary-outline",
            type: "line",
            source: "usa-boundary",
            paint: {
              "line-color": "#F1C67C",
              "line-width": 2,
              "line-opacity": 0.5,
              "line-dasharray": [4, 3],
            },
          });

          map.addLayer({
            id: "grid-tiles-line",
            type: "line",
            source: "grid-tiles",
            paint: {
              "line-color": "#ffffff",
              "line-width": 0.5,
              "line-opacity": 0.12,
            },
          });

          map.addLayer({
            id: "sold-tiles-fill",
            type: "fill",
            source: "sold-tiles",
            paint: {
              "fill-color": "#F1C67C",
              "fill-opacity": 0.35,
            },
          });
          map.addLayer({
            id: "sold-tiles-line",
            type: "line",
            source: "sold-tiles",
            paint: {
              "line-color": "#F1C67C",
              "line-width": 1,
              "line-opacity": 0.7,
            },
          });

          // Owner label at the center of each sold tile.
          // Shows "username\naddress" when username exists, else just address.
          map.addLayer({
            id: "sold-tiles-label",
            type: "symbol",
            source: "sold-tiles-labels",
            minzoom: 9,
            layout: {
              "text-field": ["get", "label"],
              "text-size": 11,
              "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
              "text-allow-overlap": false,
              "text-ignore-placement": false,
              "text-letter-spacing": 0.05,
            },
            paint: {
              "text-color": "#0a0a0a",
              "text-halo-color": "#F1C67C",
              "text-halo-width": 1,
              "text-halo-blur": 0.5,
            },
          });

          map.addLayer({
            id: "selected-tiles-fill",
            type: "fill",
            source: "selected-tiles",
            paint: {
              "fill-color": "#F1C67C",
              "fill-opacity": 0.5,
            },
          });
          map.addLayer({
            id: "selected-tiles-line",
            type: "line",
            source: "selected-tiles",
            paint: {
              "line-color": "#F1C67C",
              "line-width": 1.5,
              "line-opacity": 0.9,
            },
          });
        };

        setupSourcesAndLayers();
        updateSelectedTilesSource(map, selectedCellsRef.current);
        refreshOverlay();

        // Listen for style load events to re-apply sources/layers when style changes
        map.on("style.load", () => {
          setupSourcesAndLayers();
          updateSelectedTilesSource(map, selectedCellsRef.current);
          refreshOverlay();
        });

        // "idle" fires when the map has fully settled (style + tiles + data
        // finished rendering). It is far more reliable than the initial "load"
        // event, whose refresh can be skipped if the style isn't fully loaded
        // yet. Re-running refresh on idle guarantees the sold-tile polygons
        // appear without the user having to zoom/click first.
        map.on("idle", () => {
          // Re-add sources/layers if a style change wiped them, then refresh.
          if (!map.getSource("sold-tiles")) {
            setupSourcesAndLayers();
          }
          refreshOverlay();
        });

        let moveTimer: NodeJS.Timeout;
        map.on("moveend", () => {
          clearTimeout(moveTimer);
          moveTimer = setTimeout(refreshOverlay, 300);
        });
      });
    } catch (err) {
      console.error("Mapbox initialization error:", err);
      setError({
        type: "initialization",
        message: "An error occurred while initializing the map.",
      });
    }

    // Cleanup map instance on unmount to prevent canvas duplicates and leaks
    return () => {
      if (canvas) {
        canvas.removeEventListener("pointerdown", onPointerDown);
      }
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      if (markerRef.current) {
        markerRef.current.remove();
      }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Keep React-driven changes (such as clearing the selection) synchronized
  // with the ref and map source. Click handlers update the source earlier for
  // instant feedback; this effect remains the consistency backstop.
  useEffect(() => {
    selectedCellsRef.current = selectedCells;
    if (mapRef.current) {
      updateSelectedTilesSource(mapRef.current, selectedCells);
    }
  }, [selectedCells]);

  // Change map style dynamically
  const handleStyleChange = (styleType: "default" | "realistic") => {
    if (!mapRef.current || mapStyle === styleType) return;

    setMapStyle(styleType);
    const styleUrl =
      styleType === "default"
        ? "mapbox://styles/mapbox/dark-v11"
        : "mapbox://styles/mapbox/satellite-streets-v12";

    // Set style
    mapRef.current.setStyle(styleUrl);
  };

  // Fly to selected landmark, add gold marker and popup, and close dialog
  const flyToLandmark = (landmark: Landmark) => {
    if (!mapRef.current) return;

    userInteractedRef.current = true; // Stop spin on landmark selection

    // Fly to the landmark coordinates
    mapRef.current.flyTo({
      center: landmark.coordinates,
      zoom: 12,
      essential: true,
    });

    // Close the dialog automatically
    setIsDialogOpen(false);
  };

  // Live autocomplete search (Mapbox Geocoding, filtered to USA)
  const [searchResults, setSearchResults] = useState<
    Array<{ id: string; placeName: string; coordinates: [number, number] }>
  >([]);
  const searchTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleSearchInput = (value: string) => {
    setSearchQuery(value);

    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (!value.trim()) {
      setSearchResults([]);
      return;
    }

    searchTimerRef.current = setTimeout(async () => {
      setIsSearching(true);
      const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
      try {
        const res = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
            value,
          )}.json?access_token=${token}&country=us&types=place,address,poi&limit=5`,
        );
        const data = await res.json();
        setSearchResults(
          (data.features ?? []).map((f: any) => ({
            id: f.id,
            placeName: f.place_name,
            coordinates: f.center,
          })),
        );
      } catch (err) {
        console.error("Search failed:", err);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  };

  // Fly to a selected search result, close dialog (no pin marker added)
  const selectSearchResult = (
    placeName: string,
    coordinates: [number, number],
  ) => {
    if (!mapRef.current) return;
    userInteractedRef.current = true;

    if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }

    mapRef.current.flyTo({
      center: coordinates,
      zoom: 12,
      essential: true,
    });

    setSearchQuery(placeName);
    setSearchResults([]);
    setIsSearchDialogOpen(false);
  };

  const clearSearch = () => {
    userInteractedRef.current = true; // Stop spin on search clear
    setSearchQuery("");
    if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [-98.5, 39.8],
        zoom: 4,
        essential: true,
      });
    }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-background">
      {/* Map canvas container */}
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />

      {/* Box-select rectangle overlay (only while dragging in Select mode) */}
      {boxRect && (
        <div
          className="absolute pointer-events-none z-30 border border-dashed"
          style={{
            left: boxRect.x,
            top: boxRect.y,
            width: boxRect.w,
            height: boxRect.h,
            borderColor: "#F1C67C",
            backgroundColor: "rgba(241, 198, 124, 0.12)",
          }}
        />
      )}

      {/* Select mode hint banner */}
      {/* {selectMode && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-full bg-black/85 backdrop-blur-md border border-zinc-800 text-sm text-zinc-200 shadow-lg pointer-events-none">
          Select mode: drag to select tiles · click a tile to toggle
        </div>
      )} */}

      {/* Floating Figma Layout Control Bar */}
      {!error && (
        <>
          {/* Buy tile bar — appears when tiles are selected (multi-select) */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-full max-w-[1440px] z-20 px-6 sm:px-10 lg:px-[68px] space-y-2">
            <div className="flex justify-between items-end gap-4">
              {selectedCells.length > 0 && (
                <div className="">
                  <Card className="bg-primary border-0">
                    <CardContent className="p-4">
                      {/* Summary row */}
                      <div className="flex gap-10">
                        <div className="gap-4 flex items-center divide-x">
                          <div className="flex justify-between items-end gap-4 pe-4">
                            <Layers className="h-6 w-6 text-background" />
                            <h4 className="text-background">
                              {selectedCells.length} Tile
                              {selectedCells.length > 1 ? "s" : ""}
                            </h4>
                          </div>
                          <div className="flex justify-between gap-2">
                            {/* <span className="text-background">Total: </span> */}
                            <h4 className="text-background">
                              {tilePrice
                                ? `${(tilePrice.sol * selectedCells.length).toFixed(5)} SOL`
                                : "…"}{" "}
                            </h4>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Button
                            type="button"
                            size={"lg"}
                            variant="secondary"
                            onClick={() => {
                              if (!wallet?.address) {
                                toast.error("Connect your wallet first");
                                return;
                              }
                              setMintStatus("idle");
                              setMintError(null);
                              setIsConfirmDialogOpen(true);
                            }}
                            disabled={isMinting}
                            className="text-primary font-semibold"
                          >
                            Buy Tiles
                          </Button>
                          <Button
                            type="button"
                            size={"icon"}
                            variant="outline"
                            onClick={() => {
                              selectedCellsRef.current = [];
                              if (mapRef.current) {
                                updateSelectedTilesSource(mapRef.current, []);
                              }
                              setSelectedCells([]);
                              setMintError(null);
                            }}
                            disabled={isMinting}
                            className="bg-transparent text-background"
                          >
                            <RiDeleteBin5Line />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
              <div className="flex flex-col gap-2 ml-auto self-end">
                <ButtonCustom
                  type="button"
                  onClick={() => mapRef.current?.zoomIn()}
                  title="Zoom In"
                  className="!px-4"
                >
                  <Plus className="h-5 w-5" />
                </ButtonCustom>
                <ButtonCustom
                  type="button"
                  onClick={() => mapRef.current?.zoomOut()}
                  title="Zoom Out"
                  className="!px-4"
                >
                  <Minus className="h-5 w-5" />
                </ButtonCustom>
              </div>
            </div>
            <div className="w-full bg-black/85 backdrop-blur-md rounded-2xl border border-zinc-800 p-4 shadow-xl">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                {/* Search input trigger container */}
                <div
                  onClick={() => setIsSearchDialogOpen(true)}
                  className="bg-black flex gap-[16px] h-[48px] items-center pl-[6px] pr-[25px] py-[6px] relative w-full sm:w-[376px] rounded-xl border-0 border-transparent cursor-pointer"
                  data-node-id="45:122"
                  data-name="Input Search Trigger"
                >
                  {/* Search Icon Container */}
                  <div
                    className="flex items-center justify-center shrink-0 size-[36px] text-zinc-400"
                    data-node-id="45:93"
                    data-name="iconoir:search"
                  >
                    {isSearching ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <RiSearchLine className="h-5 w-5" />
                    )}
                  </div>

                  {/* Input Field (Read Only) */}
                  <input
                    type="text"
                    value={searchQuery}
                    readOnly
                    placeholder={placeholderText}
                    className="flex-1 bg-transparent border-0 outline-none ring-0 focus:ring-0 focus:outline-none p-0 text-[16px] font-normal font-sans text-white placeholder-white disabled:opacity-50 cursor-pointer"
                    style={{
                      border: "0",
                      borderWidth: "0",
                      outline: "none",
                      boxShadow: "none",
                    }}
                    data-node-id="45:89"
                  />

                  {/* Clear Button */}
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        clearSearch();
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors z-30"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Map Style selectors (Figma node 46:61) */}
                <div
                  className="flex gap-[26px] items-center shrink-0"
                  data-node-id="46:61"
                >
                  {/* Button 1: Style Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="flex gap-[21px] items-center focus:outline-none group cursor-pointer"
                      >
                        <div className="flex items-center justify-center size-[36px] rounded-xl border bg-zinc-900 border-zinc-800 text-zinc-400 group-hover:text-white group-hover:border-zinc-700">
                          <Layers className="h-5 w-5" />
                        </div>
                        <span className="text-[16px] font-medium transition-colors text-white group-hover:text-primary">
                          {mapStyle === "default" ? "Default" : "Realistic"}
                        </span>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-zinc-900 border-zinc-800 text-white min-w-[140px]">
                      <DropdownMenuItem
                        onClick={() => handleStyleChange("default")}
                        className={cn(
                          "cursor-pointer focus:bg-zinc-800 focus:text-white hover:bg-zinc-800 hover:text-white",
                          mapStyle === "default" && "text-primary",
                        )}
                      >
                        Default (Dark)
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleStyleChange("realistic")}
                        className={cn(
                          "cursor-pointer focus:bg-zinc-800 focus:text-white hover:bg-zinc-800 hover:text-white",
                          mapStyle === "realistic" && "text-primary",
                        )}
                      >
                        Realistic (Satellite)
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Divider Line */}
                  <div className="h-[44px] w-px bg-zinc-800 shrink-0" />

                  {/* Button 2: Your Landmark Dialog */}
                  <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                      <button
                        type="button"
                        className="flex gap-[21px] items-center focus:outline-none group cursor-pointer"
                      >
                        <div className="flex items-center justify-center size-[36px] rounded-xl border bg-zinc-900 border-zinc-800 text-zinc-400 group-hover:text-white group-hover:border-zinc-700">
                          <MapPin className="h-5 w-5" />
                        </div>
                        <span className="text-[16px] font-medium transition-colors text-white group-hover:text-primary hidden md:block">
                          Your Landmark
                        </span>
                        <span className="text-[16px] font-medium transition-colors text-white group-hover:text-primary block md:hidden">
                          Landmark
                        </span>
                      </button>
                    </DialogTrigger>
                    <DialogContent className="w-[calc(100vw-2rem)] max-w-2xl min-w-0 max-h-[calc(100dvh-2rem)] overflow-hidden">
                      <DialogHeader className="min-w-0 pr-6">
                        <DialogTitle >
                          Your Landmarks
                        </DialogTitle>
                        <DialogDescription >
                          Select a landmark <span className="text-primary">{totalLandmarksCount}</span> to fly directly to its location on
                          the map.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="flex min-h-0 min-w-0 flex-col gap-2 mt-4 overflow-hidden">
                        {!wallet?.address ? (
                          <div className="text-center py-8 text-zinc-500 text-sm">
                            Please connect your wallet to view your landmarks.
                          </div>
                        ) : isLoadingLandmarks ? (
                          <div className="flex flex-col items-center justify-center py-8 gap-2 text-zinc-500 text-sm">
                            <Loader2 className="h-5 w-5 animate-spin text-primary" />
                            <span>Loading your landmarks...</span>
                          </div>
                        ) : userLandmarks.length === 0 ? (
                          <div className="text-center py-8 text-zinc-500 text-sm">
                            You don't own any landmarks yet. Choose some tiles
                            on the map to purchase!
                          </div>
                        ) : (
                          <>
                            {userLandmarks.length === 0 ? (
                              <div className="text-center py-8 text-zinc-500 text-sm">
                                No matching landmarks found.
                              </div>
                            ) : (
                              <ScrollArea className="h-[min(300px,calc(100dvh-13rem))] min-h-0 w-full min-w-0 pr-3">
                                <div className="flex min-w-0 flex-col gap-2">
                                  {userLandmarks.map((landmark, idx) => (
                                    <button
                                      key={idx}
                                      onClick={() => flyToLandmark(landmark)}
                                      className="flex w-full min-w-0 items-center gap-3 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-left transition-all hover:border-zinc-700 hover:bg-zinc-800 cursor-pointer group/item"
                                    >
                                      {landmark.thumbnail ? (
                                        <img
                                          src={landmark.thumbnail}
                                          alt=""
                                          loading="lazy"
                                          onError={(event) => {
                                            const image = event.currentTarget;
                                            const fallback = landmark.fallbackThumbnail;
                                            if (fallback && image.src !== fallback) {
                                              image.src = fallback;
                                            } else {
                                              image.style.visibility = "hidden";
                                            }
                                          }}
                                          className="size-12 rounded-lg object-cover border border-zinc-800 shrink-0"
                                        />
                                      ) : (
                                        <div className="size-12 rounded-lg border border-zinc-800 shrink-0 bg-zinc-900" />
                                      )}
                                      <div className="min-w-0 flex-1">
                                        <div className="font-medium text-white group-hover/item:text-primary truncate">
                                          {landmark.name}
                                        </div>
                                        <div className="text-sm text-zinc-550 truncate">
                                          {landmark.location}
                                        </div>
                                      </div>
                                      {landmark.priceSol !== null &&
                                        landmark.priceSol !== undefined && (
                                          <div className="text-right shrink-0">
                                            <div className="text-sm font-semibold text-primary">
                                              {landmark.priceSol.toFixed(5)} SOL
                                            </div>
                                            <div className="text-[10px] text-zinc-600 uppercase tracking-wide">
                                              purchase
                                            </div>
                                          </div>
                                        )}
                                    </button>
                                  ))}
                                  {hasMoreLandmarks && (
                                    <div ref={sentinelRef} className="h-4 flex items-center justify-center">
                                      {isLoadingMoreLandmarks && (
                                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                      )}
                                    </div>
                                  )}
                                </div>
                              </ScrollArea>
                            )}
                          </>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>

                  {/* Divider Line */}
                  <div className="h-[44px] w-px bg-zinc-800 shrink-0 hidden md:block" />

                  {/* Button: Toggle Box-Select mode */}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectMode((prev) => !prev);
                    }}
                    title={selectMode ? "Exit Select mode" : "Select area"}
                    className={cn(
                      "hidden md:flex items-center justify-center size-[36px] rounded-xl border focus:outline-none group cursor-pointer transition-colors me-[16px]",
                      selectMode
                        ? "border-primary bg-primary/15 text-primary"
                        : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700",
                    )}
                  >
                    <BoxSelect className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Nice warning overlay if token/webgl is missing */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/95 p-6 text-center z-10">
          <div className="max-w-md rounded-lg border border-yellow-600/30 bg-yellow-950/20 p-6 shadow-lg backdrop-blur-sm">
            <h3 className="mb-2 text-lg font-semibold text-yellow-500">
              {error.type === "token"
                ? "Mapbox Token Required"
                : error.type === "webgl"
                  ? "WebGL Not Supported"
                  : "Map Loading Error"}
            </h3>
            <p className="text-sm text-zinc-400 font-sans">{error.message}</p>
            {error.type === "token" && (
              <div className="mt-4 text-sm text-zinc-500 font-sans">
                To fix this, create a{" "}
                <code className="bg-zinc-800 px-1 py-0.5 rounded text-zinc-300">
                  .env.local
                </code>{" "}
                file in your frontend directory and add:
                <code className="block mt-2 bg-zinc-800 p-2 rounded text-zinc-300 text-left font-mono break-all whitespace-pre-wrap">
                  NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your_mapbox_access_token
                </code>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Search Location Dialog */}
      <Dialog open={isSearchDialogOpen} onOpenChange={setIsSearchDialogOpen}>
        <DialogContent className="max-w-[90vw] rounded-3xl md:min-w-2xl">
          <DialogHeader>
            <DialogTitle className="">Search Location</DialogTitle>
            <DialogDescription className="">
              Type the name of a place or landmark to search on the map.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 mt-4">
            <ScrollArea className="h-[50vh]">
              <div className="relative bg-black flex gap-[12px] h-[48px] items-center px-4 rounded-xl border border-zinc-800 focus-within:border-zinc-700">
                {isSearching ? (
                  <Loader2 className="h-5 w-5 shrink-0 animate-spin text-primary" />
                ) : (
                  <RiSearchLine className="h-5 w-5 shrink-0" />
                )}
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchInput(e.target.value)}
                  placeholder="Search places in USA..."
                  style={{
                    border: "0",
                    borderWidth: "0",
                    outline: "none",
                    boxShadow: "none",
                  }}
                  autoFocus
                />
              </div>

              {/* Live autocomplete suggestions */}
              {searchResults.length > 0 && (
                <div className="flex flex-col gap-1 mt-2">
                  {searchResults.map((result) => (
                    <button
                      key={result.id}
                      type="button"
                      onClick={() =>
                        selectSearchResult(result.placeName, result.coordinates)
                      }
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-800/60 border border-transparent hover:border-zinc-700 transition-all text-left cursor-pointer group w-full"
                    >
                      <MapPin className="h-4 w-4 text-zinc-500 group-hover:text-primary shrink-0" />
                      <span className="text-sm text-zinc-300 group-hover:text-white">
                        {result.placeName}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {searchQuery.trim() &&
                !isSearching &&
                searchResults.length === 0 && (
                  <p className="text-sm text-zinc-500 p-3">
                    No results found. Try another place name.
                  </p>
                )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation & Transaction Progress Dialog */}
      <Dialog
        open={isConfirmDialogOpen}
        onOpenChange={(open) => {
          // Prevent closing dialog while minting transaction is running
          if (!isMinting) {
            setIsConfirmDialogOpen(open);
          }
        }}
      >
        <DialogContent className="min-w-xl">
          <DialogHeader>
            <DialogTitle>
              {mintStatus === "idle" && "Confirm Purchase"}
              {mintStatus === "minting" && "Transaction in Progress"}
              {mintStatus === "success" && "Transaction Successful"}
              {mintStatus === "error" && "Transaction Failed"}
            </DialogTitle>
            <DialogDescription>
              {mintStatus === "idle" &&
                "Review the details of the coordinates you are about to purchase."}
              {mintStatus === "minting" &&
                "Your transaction is being processed on the blockchain. Please do not close or reload this page."}
              {mintStatus === "success" &&
                "Awesome! You have successfully secured the ownership of these coordinate units."}
              {mintStatus === "error" &&
                "An error occurred while securing your coordinates. Please see details below."}
            </DialogDescription>
          </DialogHeader>

          {/* Details & Live states */}
          <div className="my-5 space-y-4">
            {/* Insufficient Balance warning */}
            {mintStatus === "idle" &&
              !isLoadingBalance &&
              walletBalance !== null &&
              tilePrice &&
              walletBalance < tilePrice.sol * selectedCells.length && (
                <div className="p-3 bg-red-950/20 border border-red-800/30 rounded-lg text-sm text-red-400">
                  Insufficient SOL balance. Please add more SOL to your wallet
                  to continue.
                </div>
              )}

            {/* Progress status (Minting) */}
            {mintStatus === "minting" && (
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-2 text-sm text-primary mt-1">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Processing...</span>
                </div>
                <div className="flex justify-between items-center text-sm text-zinc-400">
                  <span>Minting Progress:</span>
                  <span>
                    {mintProgress} / {initialToMintCount} Tiles
                  </span>
                </div>
                <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300 animate-pulse"
                    style={{
                      width: `${(mintProgress / initialToMintCount) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Error Message */}
            {mintStatus === "error" && mintError && (
              <div className="p-3 bg-red-950/20 border border-red-800/30 rounded-lg text-sm text-red-400 font-mono break-all whitespace-pre-wrap">
                {mintError}
              </div>
            )}

            {mintStatus !== "success" ? (
              <>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-450">Selected Tiles:</span>
                  <span className="font-semibold text-white">
                    {initialToMintCount || selectedCells.length}
                  </span>
                </div>

                <div className="flex justify-between items-center text-sm pt-4 border-t">
                  <span>Total Price:</span>
                  <span className="font-semibold text-primary">
                    {tilePrice
                      ? `${(tilePrice.sol * (initialToMintCount || selectedCells.length)).toFixed(5)} SOL`
                      : "…"}
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-center">
                  <RiCheckDoubleLine className="text-4xl text-primary" />
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-450">Tiles Purchased:</span>
                  <span className="font-semibold text-primary">
                    {successCount}
                  </span>
                </div>

                <div className="flex justify-between items-center text-sm pt-4 border-t">
                  <span className="text-zinc-450">Amount Paid:</span>
                  <span className="font-semibold text-primary">
                    {successPriceSol.toFixed(5)} SOL
                  </span>
                </div>
              </>
            )}

            {mintStatus === "idle" && (
              <div className="flex justify-between items-center text-sm pt-2 border-t">
                <span className="text-zinc-450">Your Balance:</span>
                <span className="font-semibold text-white">
                  {isLoadingBalance ? (
                    <Loader2 className="h-4 w-4 animate-spin text-zinc-450" />
                  ) : walletBalance !== null ? (
                    `${walletBalance.toFixed(5)} SOL`
                  ) : (
                    "0.00000 SOL"
                  )}
                </span>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-3 mt-4">
            {mintStatus === "idle" && (
              <>
                <Button
                  variant="outline"
                  onClick={() => setIsConfirmDialogOpen(false)}
                  className="bg-transparent border-zinc-800 hover:bg-zinc-900 text-white rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleBuyTiles}
                  disabled={
                    isLoadingBalance ||
                    walletBalance === null ||
                    (tilePrice !== null &&
                      walletBalance < tilePrice.sol * selectedCells.length)
                  }
                  className="bg-primary hover:bg-primary/90 text-black font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Confirm Pay
                </Button>
              </>
            )}

            {mintStatus === "success" && (
              <Button
                onClick={() => setIsConfirmDialogOpen(false)}
                className="bg-primary hover:bg-primary/90 text-black font-semibold rounded-xl w-full"
              >
                Close
              </Button>
            )}

            {mintStatus === "error" && (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setMintError(null);
                    setMintStatus("idle");
                  }}
                  className="bg-transparent border-zinc-800 hover:bg-zinc-900 text-white rounded-xl"
                >
                  Try Again
                </Button>
                <Button
                  onClick={() => setIsConfirmDialogOpen(false)}
                  className="bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl"
                >
                  Close
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Sold Tile Info Dialog — shown when clicking an owned tile */}
      <Dialog
        open={soldTileInfo !== null}
        onOpenChange={(open) => {
          if (!open) setSoldTileInfo(null);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Tile Owned</DialogTitle>
            <DialogDescription>
              This coordinate has already been secured.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center gap-4 mt-2">
            {/* Avatar: photo if available, else initials fallback */}
            {soldTileInfo?.photoUrl ? (
              <img
                src={soldTileInfo.photoUrl}
                alt={soldTileInfo.username ?? "owner"}
                className="size-14 rounded-full object-cover border-2 border-primary"
              />
            ) : (
              <div className="rounded-xl overflow-hidden isolate">
                <Avatar
                  colors={[
                    "#f5e1a4",
                    "#d9d593",
                    "#ee7f27",
                    "#bc162a",
                    "#302325",
                  ]}
                  variant="pixel"
                  size={80}
                  square
                />
              </div>
            )}

            <div className="min-w-0">
              {soldTileInfo?.username ? (
                <p className="font-semibold text-white truncate text-center">
                  {soldTileInfo.username}
                </p>
              ) : (
                <p className="font-semibold text-zinc-500 italic">Anonymous</p>
              )}
              <p className="text-sm text-zinc-400 truncate font-mono">
                {soldTileInfo?.ownerShort}
              </p>
            </div>
          </div>

          <div className="flex justify-between items-center text-sm pt-4 border-t border-zinc-800">
            <span>Cell</span>
            <h4 className="font-mono text-zinc-300 text-sm">
              {soldTileInfo?.cell}
            </h4>
          </div>

          <div className="flex justify-between items-center text-sm border-t border-zinc-800 pt-4">
            <span>Last Price</span>
            <h4 className="font-mono text-primary text-sm">
              {soldTileInfo?.priceLamports
                ? `${lamportsToSol(Number(soldTileInfo.priceLamports)).toFixed(5)} SOL`
                : "—"}
            </h4>
          </div>

          <div className="flex justify-between gap-4 text-sm border-t border-zinc-800 pt-4">
            <span className="shrink-0">Address</span>
            <p className="max-w-[220px] text-right text-zinc-300">
              {soldTileInfo?.placeName || "—"}
            </p>
          </div>

          <Button onClick={() => setSoldTileInfo(null)}>Close</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
